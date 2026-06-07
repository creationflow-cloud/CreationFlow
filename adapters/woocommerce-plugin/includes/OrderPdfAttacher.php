<?php
/**
 * Order PDF attacher: downloads rendered PDFs and stores them on the WooCommerce order.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class OrderPdfAttacher
{
    public const ORDER_META_PDFS = '_creationflow_pdfs';

    public const ORDER_META_ATTACH_ERRORS = '_creationflow_pdf_attach_errors';

    private ApiClient $api;

    private Settings $settings;

    public function __construct(ApiClient $api, Settings $settings)
    {
        $this->api      = $api;
        $this->settings = $settings;
    }

    public function register(): void
    {
        add_action('creationflow_refresh_render_jobs', [$this, 'on_refresh_render_jobs'], 10, 2);
        add_action('creationflow_attach_pdfs_for_order', [$this, 'handle_scheduled_attach'], 10, 1);
    }

    /**
     * @param int $order_id
     * @param bool $changed
     */
    public function on_refresh_render_jobs($order_id, $changed = false): void
    {
        if (! is_int($order_id) || $order_id <= 0) {
            return;
        }

        $this->attach_for_order($order_id);
    }

    /**
     * @return array<int, array<string, string>>
     */
    public function attach_for_order(int $order_id): array
    {
        $order = wc_get_order($order_id);
        if (! $order instanceof WC_Order) {
            return [];
        }

        $settings = $this->settings->get();
        $debug    = ! empty($settings['debug_mode']);

        $listener = new RenderOrderListener($this->api, $this->settings);
        $jobs     = $listener->get_order_render_jobs($order);

        $existing_pdfs = $this->get_order_pdfs($order);
        $existing_job_ids = array_column($existing_pdfs, 'job_id');

        $errors       = [];
        $new_pdfs     = [];

        foreach ($jobs as $entry) {
            $job_id    = $entry['job_id'];
            $status    = $entry['status'];

            if (in_array($job_id, $existing_job_ids, true)) {
                continue;
            }

            if ('done' !== $status) {
                continue;
            }

            $download_url = $this->api->get_render_job_pdf_url($job_id);
            if (null === $download_url) {
                $errors[] = sprintf(
                    /* translators: %s render job id. */
                    __('Render job %s: missing download URL in API response.', 'creationflow-woocommerce'),
                    $job_id
                );
                continue;
            }

            $binary = $this->api->download_binary($download_url);
            if (! $binary['ok']) {
                $errors[] = sprintf(
                    /* translators: 1: render job id, 2: error message. */
                    __('Render job %1$s: PDF download failed (%2$s).', 'creationflow-woocommerce'),
                    $job_id,
                    $binary['message']
                );
                continue;
            }

            $filename = sprintf('creationflow-%s.pdf', preg_replace('/[^a-zA-Z0-9._-]/', '_', $job_id));
            $attach   = $this->store_binary_for_order($order, $binary['body'], $filename);
            if (is_wp_error($attach)) {
                $errors[] = sprintf(
                    /* translators: 1: render job id, 2: error message. */
                    __('Render job %1$s: storing PDF failed (%2$s).', 'creationflow-woocommerce'),
                    $job_id,
                    $attach->get_error_message()
                );
                continue;
            }

            $new_pdfs[] = [
                'job_id'      => $job_id,
                'config_id'   => $entry['config_id'],
                'workspace_id'=> $entry['workspace_id'],
                'filename'    => $filename,
                'url'         => $attach['url'],
                'file'        => $attach['file'],
                'size'        => $attach['size'],
                'mime'        => $attach['mime'],
                'attached_at' => current_time('mysql', true),
            ];
        }

        if (! empty($new_pdfs)) {
            $combined  = array_merge($existing_pdfs, $new_pdfs);
            $order->update_meta_data(self::ORDER_META_PDFS, wp_json_encode($combined));
        }

        if (! empty($errors)) {
            $order->update_meta_data(self::ORDER_META_ATTACH_ERRORS, wp_json_encode($errors));
            $existing = (string) $order->get_meta(self::ORDER_META_ATTACH_ERRORS, true);
            $combined_errors = empty($existing) ? $errors : array_merge(json_decode($existing, true) ?: [], $errors);
            $order->update_meta_data(self::ORDER_META_ATTACH_ERRORS, wp_json_encode($combined_errors));
        } elseif (empty($new_pdfs) && ! empty($jobs)) {
            $order->delete_meta_data(self::ORDER_META_ATTACH_ERRORS);
        }

        if (! empty($new_pdfs) || ! empty($errors)) {
            $order->save();
        }

        if ($debug) {
            error_log(sprintf(
                '[creationflow] pdf-attach order=%d new=%d errors=%d',
                $order_id,
                count($new_pdfs),
                count($errors)
            ));
        }

        return $new_pdfs;
    }

    /**
     * @return array<int, array<string, string>>
     */
    public function get_order_pdfs(WC_Order $order): array
    {
        $raw = (string) $order->get_meta(self::ORDER_META_PDFS, true);
        if ('' === $raw) {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return [];
        }

        $out = [];
        foreach ($decoded as $entry) {
            if (! is_array($entry) || empty($entry['job_id'])) {
                continue;
            }
            $out[] = [
                'job_id'       => (string) $entry['job_id'],
                'config_id'    => isset($entry['config_id']) ? (string) $entry['config_id'] : '',
                'workspace_id' => isset($entry['workspace_id']) ? (string) $entry['workspace_id'] : '',
                'filename'     => isset($entry['filename']) ? (string) $entry['filename'] : '',
                'url'          => isset($entry['url']) ? (string) $entry['url'] : '',
                'file'         => isset($entry['file']) ? (string) $entry['file'] : '',
                'size'         => isset($entry['size']) ? (int) $entry['size'] : 0,
                'mime'         => isset($entry['mime']) ? (string) $entry['mime'] : 'application/pdf',
                'attached_at'  => isset($entry['attached_at']) ? (string) $entry['attached_at'] : '',
            ];
        }

        return $out;
    }

    public function handle_scheduled_attach(int $order_id): void
    {
        $this->attach_for_order($order_id);
    }

    /**
     * @return array{ok: bool, body: string, message: string}
     */
    public function download_binary(string $url): array
    {
        if ('' === $url) {
            return ['ok' => false, 'body' => '', 'message' => __('Empty URL provided.', 'creationflow-woocommerce')];
        }

        $response = wp_remote_get($url, [
            'timeout' => ApiClient::DEFAULT_TIMEOUT,
            'headers' => [
                'X-API-Key' => (string) $this->settings->get()['api_token'],
                'Accept'    => 'application/pdf,*/*',
            ],
        ]);

        if (is_wp_error($response)) {
            return ['ok' => false, 'body' => '', 'message' => $response->get_error_message()];
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        $body = (string) wp_remote_retrieve_body($response);

        if ($code < 200 || $code >= 300) {
            return [
                'ok'      => false,
                'body'    => '',
                'message' => sprintf(/* translators: %d HTTP code. */ __('HTTP %d'), $code),
            ];
        }

        if ('' === $body) {
            return ['ok' => false, 'body' => '', 'message' => __('Empty response body.', 'creationflow-woocommerce')];
        }

        return ['ok' => true, 'body' => $body, 'message' => ''];
    }

    /**
     * Store a binary blob in the WordPress uploads directory and return a public URL.
     *
     * @return array{url: string, file: string, size: int, mime: string}|WP_Error
     */
    private function store_binary_for_order(WC_Order $order, string $body, string $filename)
    {
        if (! function_exists('wp_upload_dir')) {
            return new WP_Error('wp_missing', __('WordPress upload helpers are not available.', 'creationflow-woocommerce'));
        }

        $uploads = wp_upload_dir();
        if (! empty($uploads['error'])) {
            return new WP_Error('upload_dir', (string) $uploads['error']);
        }

        $base = trailingslashit((string) $uploads['basedir']) . 'creationflow-orders/' . (int) $order->get_id();
        if (! wp_mkdir_p($base)) {
            return new WP_Error('mkdir_failed', __('Could not create upload directory.', 'creationflow-woocommerce'));
        }

        $file = trailingslashit($base) . $filename;
        $written = file_put_contents($file, $body);
        if (false === $written) {
            return new WP_Error('write_failed', __('Could not write the PDF to disk.', 'creationflow-woocommerce'));
        }

        $relative = 'creationflow-orders/' . (int) $order->get_id() . '/' . $filename;
        $url      = trailingslashit((string) $uploads['baseurl']) . $relative;

        return [
            'url'  => $url,
            'file' => $file,
            'size' => (int) $written,
            'mime' => 'application/pdf',
        ];
    }
}
