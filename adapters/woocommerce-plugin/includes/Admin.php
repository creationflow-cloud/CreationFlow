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

    public function __construct(Settings $settings, WooCommerce $woocommerce, ApiClient $api)
    {
        $this->settings    = $settings;
        $this->woocommerce = $woocommerce;
        $this->api         = $api;
    }

    public function register(): void
    {
        add_action('admin_menu', [$this, 'register_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        add_action('admin_post_creationflow_test_connection', [$this, 'handle_test_connection']);
        add_action('admin_notices', [$this, 'render_test_notice']);
        add_action('wp_ajax_creationflow_test_connection', [$this, 'handle_ajax_test_connection']);
        add_action('wp_ajax_creationflow_list_workspaces', [$this, 'handle_ajax_list_workspaces']);
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
        echo '<p>';
        echo '<a class="button" id="creationflow-test-connection" href="' . esc_url($test_url) . '">' . esc_html__('Test connection now', 'creationflow-woocommerce') . '</a> ';
        echo '<a class="button button-secondary" href="' . esc_url($test_url) . '">' . esc_html__('View details (new tab)', 'creationflow-woocommerce') . '</a>';
        echo '</p>';
        echo '</div>';

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
}
