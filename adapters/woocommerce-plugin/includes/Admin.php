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

    public function __construct(Settings $settings, WooCommerce $woocommerce)
    {
        $this->settings    = $settings;
        $this->woocommerce = $woocommerce;
    }

    public function register(): void
    {
        add_action('admin_menu', [$this, 'register_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
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
    }

    public function render_page(): void
    {
        if (! current_user_can('manage_options')) {
            return;
        }

        $status = $this->woocommerce->is_active()
            ? __('WooCommerce detected', 'creationflow-woocommerce')
            : __('WooCommerce not detected', 'creationflow-woocommerce');

        echo '<div class="wrap creationflow-admin">';
        echo '<h1>' . esc_html__('CreationFlow WooCommerce', 'creationflow-woocommerce') . '</h1>';
        echo '<div class="creationflow-admin__notice">';
        echo '<p><strong>' . esc_html__('Adapter skeleton', 'creationflow-woocommerce') . '</strong></p>';
        echo '<p>' . esc_html__('The real CreationFlow API connection will be added later. This plugin currently stores connection settings only.', 'creationflow-woocommerce') . '</p>';
        echo '<p>' . esc_html__('WooCommerce status:', 'creationflow-woocommerce') . ' ' . esc_html($status) . '</p>';
        echo '</div>';
        echo '<form action="options.php" method="post">';
        settings_fields('creationflow_woocommerce');
        do_settings_sections('creationflow_woocommerce');
        submit_button(__('Save Settings', 'creationflow-woocommerce'));
        echo '</form>';
        echo '</div>';
    }
}
