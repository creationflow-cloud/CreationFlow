<?php
/**
 * Main plugin bootstrap.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class Plugin
{
    private Settings $settings;

    private WooCommerce $woocommerce;

    private ApiClient $api;

    private ProductMapping $product_mapping;

    private EditorEmbed $editor_embed;

    private CartMeta $cart_meta;

    private MappingUI $mapping_ui;

    private RenderOrderListener $render_listener;

    private Admin $admin;

    public function __construct()
    {
        $this->settings        = new Settings();
        $this->woocommerce     = new WooCommerce();
        $this->api             = new ApiClient($this->settings);
        $this->product_mapping = new ProductMapping($this->api);
        $this->editor_embed    = new EditorEmbed($this->api);
        $this->cart_meta       = new CartMeta($this->product_mapping);
        $this->mapping_ui      = new MappingUI($this->product_mapping);
        $this->render_listener = new RenderOrderListener($this->api, $this->settings);
        $this->admin           = new Admin($this->settings, $this->woocommerce, $this->api, $this->render_listener);
    }

    public function register(): void
    {
        $this->settings->register();
        $this->product_mapping->register();
        $this->editor_embed->register();
        $this->cart_meta->register();
        $this->mapping_ui->register();
        $this->render_listener->register();

        if (is_admin()) {
            $this->admin->register();
            $this->woocommerce->register_admin_notice();
        }
    }

    public static function on_activate(): void
    {
        if (! Requirements::is_satisfied()) {
            deactivate_plugins(plugin_basename(CREATIONFLOW_WOOCOMMERCE_FILE));

            wp_die(
                esc_html__('CreationFlow WooCommerce could not be activated because required dependencies are missing.', 'creationflow-woocommerce'),
                esc_html__('Plugin activation error', 'creationflow-woocommerce'),
                ['back_link' => true]
            );
        }

        $settings = new Settings();
        $settings->install_defaults();

        flush_rewrite_rules();
    }

    public static function on_deactivate(): void
    {
        flush_rewrite_rules();
    }
}
