<?php
/**
 * Admin settings page.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class Admin
{
    private Settings $settings;

    private WooCommerce $woocommerce;

    private ApiClient $api;

    private RenderOrderListener $render_listener;

    public function __construct(
        Settings $settings,
        WooCommerce $woocommerce,
        ApiClient $api,
        RenderOrderListener $render_listener
    ) {
        $this->settings        = $settings;
        $this->woocommerce     = $woocommerce;
        $this->api             = $api;
        $this->render_listener = $render_listener;
    }

    public function register(): void
    {
        add_action('admin_menu', [$this, 'register_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('admin_post_creationflow_test_connection', [$this, 'handle_test_connection']);
        add_action('admin_notices', [$this, 'render_test_notice']);
        add_action('wp_ajax_creationflow_test_connection', [$this, 'handle_ajax_test_connection']);
        add_action('wp_ajax_creationflow_list_workspaces', [$this, 'handle_ajax_list_workspaces']);
        add_action('wp_ajax_creationflow_refresh_render_jobs', [$this, 'handle_ajax_refresh_render_jobs']);
        add_action('admin_post_creationflow_sync_mappings', [$this, 'handle_sync_mappings']);
    }

    public function register_menu(): void
    {
        add_options_page(
            __('CreationFlow WooCommerce', 'creationflow-woocommerce'),
            __('CreationFlow', 'creationflow-woocommerce'),
            'manage_options',
            'creationflow-woocommerce',
            [$this, 'render_page']
        );
    }

    public function enqueue_assets(string $hook_suffix): void
    {
        if ('settings_page_creationflow-woocommerce' !== $hook_suffix) {
            return;
        }

        wp_enqueue_style(
            'creationflow-woocommerce-admin',
            CREATIONFLOW_WOOCOMMERCE_URL . 'assets/admin.css',
            [],
            CREATIONFLOW_WOOCOMMERCE_VERSION
        );

        wp_enqueue_script(
            'creationflow-woocommerce-admin',
            CREATIONFLOW_WOOCOMMERCE_URL . 'assets/admin.js',
            ['jquery'],
            CREATIONFLOW_WOOCOMMERCE_VERSION,
            true
        );

        wp_localize_script(
            'creationflow-woocommerce-admin',
            'CreationFlowAdmin',
            [
                'ajaxUrl'      => admin_url('admin-ajax.php'),
                'testNonce'    => wp_create_nonce('creationflow_ajax_test'),
                'workspacesNonce' => wp_create_nonce('creationflow_ajax_workspaces'),
                'i18n'         => [
                    'testing'   => __('Testing connection…', 'creationflow-woocommerce'),
                    'success'   => __('Connection successful.', 'creationflow-woocommerce'),
                    'error'     => __('Connection failed.', 'creationflow-woocommerce'),
                ],
            ]
        );
    }

    public function handle_test_connection(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('Insufficient permissions.', 'creationflow-woocommerce'));
        }

        check_admin_referer('creationflow_test_connection');

        $result = $this->api->test_connection();

        $this->settings->update_connection_status(
            $result['ok'] ? 'ok' : 'error',
            current_time('mysql', true)
        );

        $redirect = add_query_arg(
            [
                'page'                 => 'creationflow-woocommerce',
                'creationflow_test'    => $result['ok'] ? '1' : '0',
                'creationflow_message' => rawurlencode($result['message']),
            ],
            admin_url('options-general.php')
        );

        wp_safe_redirect($redirect);
        exit;
    }

    public function handle_ajax_test_connection(): void
    {
        if (! current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Insufficient permissions.', 'creationflow-woocommerce')], 403);
        }

        check_ajax_referer('creationflow_ajax_test', 'nonce');

        $result = $this->api->test_connection();

        $this->settings->update_connection_status(
            $result['ok'] ? 'ok' : 'error',
            current_time('mysql', true)
        );

        wp_send_json([
            'ok'      => $result['ok'],
            'status'  => $result['status'],
            'message' => $result['message'],
        ]);
    }

    public function handle_ajax_list_workspaces(): void
    {
        if (! current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Insufficient permissions.', 'creationflow-woocommerce')], 403);
        }

        check_ajax_referer('creationflow_ajax_workspaces', 'nonce');

        $workspaces = $this->api->list_workspaces();
        wp_send_json(['workspaces' => $workspaces]);
    }

    public function render_test_notice(): void
    {
        if (! isset($_GET['page']) || 'creationflow-woocommerce' !== $_GET['page']) {
            return;
        }
        if (isset($_GET['creationflow_synced']) && '1' === $_GET['creationflow_synced']) {
            echo '<div class="notice notice-success"><p>';
            echo esc_html__('API cache cleared.', 'creationflow-woocommerce');
            echo '</p></div>';
            return;
        }
        if (! isset($_GET['creationflow_test'])) {
            return;
        }

        $success = '1' === $_GET['creationflow_test'];
        $message = isset($_GET['creationflow_message']) ? sanitize_text_field(wp_unslash((string) $_GET['creationflow_message'])) : '';

        $class = $success ? 'notice-success' : 'notice-error';
        echo '<div class="notice ' . esc_attr($class) . '"><p>';
        echo esc_html($message);
        echo '</p></div>';
    }

    public function render_page(): void
    {
        if (! current_user_can('manage_options')) {
            return;
        }

        $settings          = $this->settings->get();
        $wc_status         = $this->woocommerce->is_active();
        $connection_status = isset($settings['connection_status']) ? (string) $settings['connection_status'] : 'unknown';
        $last_check        = isset($settings['last_connection_check']) ? (string) $settings['last_connection_check'] : '';

        echo '<div class="wrap creationflow-admin">';
        echo '<h1>' . esc_html__('CreationFlow WooCommerce', 'creationflow-woocommerce') . '</h1>';

        echo '<div class="creationflow-admin__status">';
        echo '<h2>' . esc_html__('Status', 'creationflow-woocommerce') . '</h2>';
        echo '<ul>';
        echo '<li>' . esc_html__('Plugin version:', 'creationflow-woocommerce') . ' <code>' . esc_html(CREATIONFLOW_WOOCOMMERCE_VERSION) . '</code></li>';
        echo '<li>' . esc_html__('WooCommerce:', 'creationflow-woocommerce') . ' ' . esc_html($wc_status ? __('detected', 'creationflow-woocommerce') : __('not detected', 'creationflow-woocommerce')) . '</li>';
        echo '<li>' . esc_html__('Connection:', 'creationflow-woocommerce') . ' ' . esc_html($this->format_connection_status($connection_status)) . '</li>';

        if ('' !== $last_check) {
            echo '<li>' . esc_html__('Last connection check:', 'creationflow-woocommerce') . ' <code>' . esc_html($last_check) . '</code></li>';
        }
        echo '</ul>';

        $test_url = wp_nonce_url(
            add_query_arg(['action' => 'creationflow_test_connection'], admin_url('admin-post.php')),
            'creationflow_test_connection'
        );
        $sync_url = wp_nonce_url(
            add_query_arg(['action' => 'creationflow_sync_mappings'], admin_url('admin-post.php')),
            'creationflow_sync_mappings'
        );
        echo '<p>';
        echo '<a class="button" id="creationflow-test-connection" href="' . esc_url($test_url) . '">' . esc_html__('Test connection now', 'creationflow-woocommerce') . '</a> ';
        echo '<a class="button button-secondary" href="' . esc_url($sync_url) . '">' . esc_html__('Clear API cache', 'creationflow-woocommerce') . '</a>';
        echo '</p>';
        echo '</div>';

        $this->render_mappings_overview();
        $this->render_render_jobs_overview();

        echo '<form action="options.php" method="post">';
        settings_fields('creationflow_woocommerce');
        do_settings_sections('creationflow_woocommerce');
        submit_button(__('Save Settings', 'creationflow-woocommerce'));
        echo '</form>';
        echo '</div>';
    }

    private function format_connection_status(string $status): string
    {
        switch ($status) {
            case 'ok':
                return __('OK', 'creationflow-woocommerce');
            case 'error':
                return __('Error', 'creationflow-woocommerce');
            default:
                return __('Not tested', 'creationflow-woocommerce');
        }
    }

    private function render_mappings_overview(): void
    {
        $args = [
            'post_type'      => 'product',
            'post_status'    => 'any',
            'posts_per_page' => 50,
            'meta_query'     => [
                [
                    'key'     => ProductMapping::META_KEY,
                    'compare' => 'EXISTS',
                ],
            ],
        ];

        $query = new WP_Query($args);
        $count = (int) $query->found_posts;

        echo '<div class="creationflow-admin__status">';
        echo '<h2>' . esc_html__('Product Mappings', 'creationflow-woocommerce') . '</h2>';
        echo '<p>' . sprintf(
            /* translators: %d product count. */
            esc_html(_n('%d product is mapped to a CreationFlow template.', '%d products are mapped to a CreationFlow template.', $count, 'creationflow-woocommerce')),
            (int) $count
        ) . '</p>';

        if ($query->have_posts()) {
            echo '<table class="widefat striped creationflow-mappings-table">';
            echo '<thead><tr>';
            echo '<th>' . esc_html__('Product', 'creationflow-woocommerce') . '</th>';
            echo '<th>' . esc_html__('Template ID', 'creationflow-woocommerce') . '</th>';
            echo '<th>' . esc_html__('Workspace', 'creationflow-woocommerce') . '</th>';
            echo '<th>' . esc_html__('Edit', 'creationflow-woocommerce') . '</th>';
            echo '</tr></thead><tbody>';
            while ($query->have_posts()) {
                $query->the_post();
                $product_id   = (int) get_the_ID();
                $template_id  = (string) get_post_meta($product_id, ProductMapping::META_KEY, true);
                $workspace_id = (string) get_post_meta($product_id, ProductMapping::WORKSPACE_META_KEY, true);
                $edit_url     = get_edit_post_link($product_id, 'raw');
                echo '<tr>';
                echo '<td><strong>' . esc_html(get_the_title()) . '</strong></td>';
                echo '<td><code>' . esc_html($template_id) . '</code></td>';
                echo '<td>' . ($workspace_id !== '' ? '<code>' . esc_html($workspace_id) . '</code>' : '&mdash;') . '</td>';
                echo '<td><a class="button button-small" href="' . esc_url($edit_url ?: '') . '">' . esc_html__('Edit', 'creationflow-woocommerce') . '</a></td>';
                echo '</tr>';
            }
            echo '</tbody></table>';
            wp_reset_postdata();
        }
        echo '</div>';
    }

    public function handle_sync_mappings(): void
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('Insufficient permissions.', 'creationflow-woocommerce'));
        }

        check_admin_referer('creationflow_sync_mappings');

        $this->api->clear_cache();

        $redirect = add_query_arg(
            [
                'page'                   => 'creationflow-woocommerce',
                'creationflow_synced'    => '1',
            ],
            admin_url('options-general.php')
        );

        wp_safe_redirect($redirect);
        exit;
    }

    public function handle_ajax_refresh_render_jobs(): void
    {
        if (! current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Insufficient permissions.', 'creationflow-woocommerce')], 403);
        }

        check_ajax_referer('creationflow_ajax_refresh', 'nonce');

        $order_id = isset($_POST['order_id']) ? (int) $_POST['order_id'] : 0;
        if ($order_id <= 0) {
            wp_send_json_error(['message' => __('Missing order id.', 'creationflow-woocommerce')], 400);
        }

        $changed = $this->render_listener->refresh_render_jobs($order_id);
        $order   = wc_get_order($order_id);
        $jobs    = $order instanceof WC_Order ? $this->render_listener->get_order_render_jobs($order) : [];

        wp_send_json([
            'ok'      => true,
            'changed' => $changed,
            'jobs'    => array_values($jobs),
        ]);
    }

    private function render_render_jobs_overview(): void
    {
        $orders = wc_get_orders([
            'limit'   => 25,
            'orderby' => 'date',
            'order'   => 'DESC',
            'meta_key' => RenderOrderListener::ORDER_META_RENDER_JOBS,
        ]);

        echo '<div class="creationflow-admin__status">';
        echo '<h2>' . esc_html__('Recent Render Jobs', 'creationflow-woocommerce') . '</h2>';

        if (empty($orders)) {
            echo '<p>' . esc_html__('No render jobs have been enqueued yet.', 'creationflow-woocommerce') . '</p>';
            echo '</div>';
            return;
        }

        echo '<table class="widefat striped creationflow-render-jobs-table">';
        echo '<thead><tr>';
        echo '<th>' . esc_html__('Order', 'creationflow-woocommerce') . '</th>';
        echo '<th>' . esc_html__('Status', 'creationflow-woocommerce') . '</th>';
        echo '<th>' . esc_html__('Jobs', 'creationflow-woocommerce') . '</th>';
        echo '<th>' . esc_html__('Created', 'creationflow-woocommerce') . '</th>';
        echo '</tr></thead><tbody>';
        foreach ($orders as $order) {
            if (! $order instanceof WC_Order) {
                continue;
            }
            $jobs  = $this->render_listener->get_order_render_jobs($order);
            $error = (string) $order->get_meta(RenderOrderListener::ORDER_META_LAST_RENDER_ERROR, true);
            $status_counts = [
                'pending'    => 0,
                'processing' => 0,
                'done'       => 0,
                'failed'     => 0,
            ];
            foreach ($jobs as $entry) {
                $key = $entry['status'];
                if (isset($status_counts[$key])) {
                    $status_counts[$key]++;
                }
            }
            $summary = [];
            foreach ($status_counts as $key => $count) {
                if ($count > 0) {
                    $summary[] = sprintf('%s: %d', $key, $count);
                }
            }
            $summary_text = $summary ? implode(' · ', $summary) : '—';
            $order_status = $order->get_status();
            echo '<tr>';
            echo '<td><a href="' . esc_url((string) get_edit_post_link((int) $order->get_id(), 'raw')) . '">#' . esc_html((string) $order->get_id()) . '</a></td>';
            echo '<td>' . esc_html($order_status) . ($error !== '' ? ' <span class="creationflow-render-jobs-error" title="' . esc_attr($error) . '">⚠</span>' : '') . '</td>';
            echo '<td>' . esc_html($summary_text) . '</td>';
            echo '<td>' . esc_html((string) $order->get_date_created()) . '</td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
        echo '<p class="description">' . esc_html__('Use the "Retry CreationFlow render" action on any order to re-enqueue failed render jobs.', 'creationflow-woocommerce') . '</p>';
        echo '</div>';
    }
}
