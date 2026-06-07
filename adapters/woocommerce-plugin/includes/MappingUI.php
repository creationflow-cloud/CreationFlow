<?php
/**
 * Product mapping UI integration.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class MappingUI
{
    private ProductMapping $product_mapping;

    public function __construct(ProductMapping $product_mapping)
    {
        $this->product_mapping = $product_mapping;
    }

    public function register(): void
    {
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    public function enqueue_assets(string $hook_suffix): void
    {
        if (! in_array($hook_suffix, ['post.php', 'post-new.php', 'woocommerce_page_wc-admin'], true)) {
            return;
        }

        if (! $this->is_product_edit_screen()) {
            return;
        }

        wp_enqueue_style(
            'creationflow-mapping',
            CREATIONFLOW_WOOCOMMERCE_URL . 'assets/product-mapping.css',
            [],
            CREATIONFLOW_WOOCOMMERCE_VERSION
        );

        wp_enqueue_script(
            'creationflow-mapping',
            CREATIONFLOW_WOOCOMMERCE_URL . 'assets/product-mapping.js',
            ['jquery'],
            CREATIONFLOW_WOOCOMMERCE_VERSION,
            true
        );

        wp_localize_script(
            'creationflow-mapping',
            'CreationFlowMapping',
            [
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce'   => wp_create_nonce($this->product_mapping->get_nonce_action()),
                'i18n'    => [
                    'title'         => __('Pick a CreationFlow template', 'creationflow-woocommerce'),
                    'workspaceLabel' => __('Workspace', 'creationflow-woocommerce'),
                    'searchLabel'   => __('Search', 'creationflow-woocommerce'),
                    'search'        => __('Search', 'creationflow-woocommerce'),
                    'close'         => __('Close', 'creationflow-woocommerce'),
                    'noResults'     => __('No templates found.', 'creationflow-woocommerce'),
                    'loading'       => __('Loading…', 'creationflow-woocommerce'),
                    'validating'    => __('Validating…', 'creationflow-woocommerce'),
                    'ok'            => __('Template found.', 'creationflow-woocommerce'),
                    'error'         => __('Could not load templates.', 'creationflow-woocommerce'),
                ],
            ]
        );
    }

    private function is_product_edit_screen(): bool
    {
        if (! function_exists('get_current_screen')) {
            return false;
        }

        $screen = get_current_screen();
        if (! $screen) {
            return false;
        }

        if (isset($screen->post_type) && 'product' === $screen->post_type) {
            return true;
        }

        if (isset($screen->id) && in_array($screen->id, ['product', 'edit-product'], true)) {
            return true;
        }

        return false;
    }
}
