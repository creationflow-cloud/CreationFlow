<?php
/**
 * Order status listener that triggers CreationFlow render jobs.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class RenderOrderListener
{
    public const ORDER_META_RENDER_JOBS = '_creationflow_render_jobs';

    public const ORDER_META_LAST_RENDER_ERROR = '_creationflow_render_last_error';

    public const TRIGGER_STATUSES = ['processing', 'completed'];

    private ApiClient $api;

    private Settings $settings;

    public function __construct(ApiClient $api, Settings $settings)
    {
        $this->api      = $api;
        $this->settings = $settings;
    }

    public function register(): void
    {
        foreach (self::TRIGGER_STATUSES as $status) {
            add_action(
                'woocommerce_order_status_' . $status,
                [$this, 'handle_order_status_change'],
                10,
                2
            );
        }

        add_action('creationflow_retry_render_jobs', [$this, 'handle_scheduled_retry']);
        add_filter('woocommerce_order_actions', [$this, 'add_order_action']);
        add_action('woocommerce_order_action_creationflow_retry_render', [$this, 'handle_order_action_retry']);
    }

    /**
     * @param int $order_id
     * @param WC_Order $order
     */
    public function handle_order_status_change($order_id, $order): void
    {
        if (! $order instanceof WC_Order) {
            $order = wc_get_order($order_id);
        }

        if (! $order instanceof WC_Order) {
            return;
        }

        $this->trigger_render_jobs_for_order($order, 'order_status');
    }

    /**
     * Schedule a retry of failed render jobs. Safe to call multiple times.
     */
    public function schedule_retry(int $order_id, int $delay_seconds = 60): void
    {
        if (function_exists('as_schedule_single_action')) {
            as_schedule_single_action(
                time() + max(0, $delay_seconds),
                'creationflow_retry_render_jobs',
                ['order_id' => $order_id],
                'creationflow-woocommerce'
            );
        }
    }

    public function handle_scheduled_retry(int $order_id): void
    {
        $order = wc_get_order($order_id);
        if (! $order instanceof WC_Order) {
            return;
        }

        $this->trigger_render_jobs_for_order($order, 'scheduled_retry');
    }

    /**
     * @param WC_Order $order
     * @return array<string, string>
     */
    public function add_order_action(array $actions): array
    {
        $actions['creationflow_retry_render'] = __('Retry CreationFlow render', 'creationflow-woocommerce');

        return $actions;
    }

    public function handle_order_action_retry($order): void
    {
        if (! $order instanceof WC_Order) {
            return;
        }

        $this->trigger_render_jobs_for_order($order, 'manual_retry');
    }

    /**
     * @return array<int, array<string, string>>
     */
    public function trigger_render_jobs_for_order(WC_Order $order, string $source): array
    {
        $settings  = $this->settings->get();
        $debug     = ! empty($settings['debug_mode']);
        $created   = [];
        $log       = [];

        $existing_jobs = $this->get_order_render_jobs($order);

        foreach ($order->get_items() as $item) {
            $config_id = (string) $item->get_meta(CartMeta::ORDER_ITEM_META_KEY, true);
            if ('' === $config_id) {
                continue;
            }

            $workspace_id = (string) $item->get_meta(CartMeta::ORDER_ITEM_WORKSPACE_KEY, true);
            if ('' === $workspace_id) {
                $workspace_id = isset($settings['default_workspace_id'])
                    ? (string) $settings['default_workspace_id']
                    : '';
            }

            if ('' === $workspace_id) {
                $log[] = sprintf(
                    /* translators: %s configuration id. */
                    __('Skipped render for configuration %s: no workspace assigned.', 'creationflow-woocommerce'),
                    $config_id
                );
                continue;
            }

            $item_id_key = (string) $item->get_id();
            $existing_for_item = isset($existing_jobs[$item_id_key])
                ? $existing_jobs[$item_id_key]
                : null;

            if ($existing_for_item && in_array($existing_for_item['status'], ['pending', 'processing'], true)) {
                $log[] = sprintf(
                    /* translators: 1: configuration id, 2: render job id. */
                    __('Skipped render for configuration %1$s: render job %2$s already in flight.', 'creationflow-woocommerce'),
                    $config_id,
                    $existing_for_item['job_id']
                );
                continue;
            }

            $result = $this->api->create_render_job($workspace_id, $config_id);
            if ($debug) {
                error_log(sprintf(
                    '[creationflow] render-trigger source=%s order=%d item=%s config=%s ok=%s job=%s',
                    $source,
                    (int) $order->get_id(),
                    $item_id_key,
                    $config_id,
                    $result['ok'] ? '1' : '0',
                    isset($result['body']['id']) ? (string) $result['body']['id'] : '-'
                ));
            }

            if (! $result['ok']) {
                $log[] = sprintf(
                    /* translators: 1: configuration id, 2: error message. */
                    __('Failed to enqueue render for %1$s: %2$s', 'creationflow-woocommerce'),
                    $config_id,
                    $result['message']
                );
                continue;
            }

            $body = $result['body'] ?? [];
            $job_id = isset($body['id']) ? (string) $body['id'] : '';
            $status = isset($body['status']) ? (string) $body['status'] : 'pending';

            if ('' === $job_id) {
                $log[] = sprintf(
                    /* translators: %s configuration id. */
                    __('Failed to enqueue render for %s: empty job id in response.', 'creationflow-woocommerce'),
                    $config_id
                );
                continue;
            }

            $existing_jobs[$item_id_key] = [
                'item_id'      => $item_id_key,
                'job_id'       => $job_id,
                'config_id'    => $config_id,
                'workspace_id' => $workspace_id,
                'status'       => $status,
                'created_at'   => current_time('mysql', true),
                'source'       => $source,
            ];
            $created[] = $existing_jobs[$item_id_key];
        }

        $order->update_meta_data(self::ORDER_META_RENDER_JOBS, wp_json_encode(array_values($existing_jobs)));

        if (empty($created) && ! empty($log)) {
            $order->update_meta_data(self::ORDER_META_LAST_RENDER_ERROR, wp_json_encode($log));
            $order->save();
            $this->schedule_retry((int) $order->get_id(), 120);
        } else {
            $order->update_meta_data(self::ORDER_META_LAST_RENDER_ERROR, '');
            $order->save();
        }

        return $created;
    }

    /**
     * @return array<string, array<string, string>>
     */
    public function get_order_render_jobs(WC_Order $order): array
    {
        $raw = (string) $order->get_meta(self::ORDER_META_RENDER_JOBS, true);
        if ('' === $raw) {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return [];
        }

        $out = [];
        foreach ($decoded as $entry) {
            if (! is_array($entry) || ! isset($entry['item_id'], $entry['job_id'])) {
                continue;
            }
            $key = (string) $entry['item_id'];
            $out[$key] = [
                'job_id'       => (string) $entry['job_id'],
                'config_id'    => isset($entry['config_id']) ? (string) $entry['config_id'] : '',
                'workspace_id' => isset($entry['workspace_id']) ? (string) $entry['workspace_id'] : '',
                'status'       => isset($entry['status']) ? (string) $entry['status'] : 'pending',
                'created_at'   => isset($entry['created_at']) ? (string) $entry['created_at'] : '',
                'source'       => isset($entry['source']) ? (string) $entry['source'] : '',
            ];
        }

        return $out;
    }

    /**
     * Refresh render job status entries from the API and persist the latest snapshot.
     *
     * @return bool true when at least one status changed.
     */
    public function refresh_render_jobs(int $order_id): bool
    {
        $order = wc_get_order($order_id);
        if (! $order instanceof WC_Order) {
            return false;
        }

        $jobs = $this->get_order_render_jobs($order);
        if (empty($jobs)) {
            return false;
        }

        $changed = false;
        foreach ($jobs as $item_id_key => $entry) {
            $result = $this->api->get_render_job($entry['job_id']);
            if (! $result['ok']) {
                continue;
            }
            $body = $result['body'] ?? [];
            $new_status = isset($body['status']) ? (string) $body['status'] : $entry['status'];
            if ($new_status !== $entry['status']) {
                $jobs[$item_id_key]['status'] = $new_status;
                $changed = true;
            }
        }

        if ($changed) {
            $order->update_meta_data(self::ORDER_META_RENDER_JOBS, wp_json_encode(array_values($jobs)));
            $order->save();

            do_action('creationflow_refresh_render_jobs', $order_id, $changed);
        }

        return $changed;
    }
}
