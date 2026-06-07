<?php
/**
 * Embeds the CreationFlow editor on WooCommerce product pages.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class EditorEmbed
{
    public const QUERY_PARAM_PRODUCT = 'creationflow_template_id';
    public const QUERY_PARAM_WORKSPACE = 'creationflow_workspace_id';

    private ApiClient $api;

    public function __construct(ApiClient $api)
    {
        $this->api = $api;
    }

    public function register(): void
    {
        add_action('woocommerce_before_add_to_cart_button', [$this, 'render_editor_iframe']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        add_filter('woocommerce_add_to_cart_validation', [$this, 'validate_template_id'], 10, 2);
    }

    public function enqueue_assets(): void
    {
        if (! is_product()) {
            return;
        }

        $product = get_product();
        if (! $product instanceof WC_Product) {
            return;
        }

        $template_id = (string) get_post_meta($product->get_id(), ProductMapping::META_KEY, true);
        if ('' === $template_id) {
            return;
        }

        $settings = (new Settings())->get();
        $editor_base = rtrim((string) $settings['api_url'], '');
        if ('' === $editor_base) {
            return;
        }

        wp_enqueue_style(
            'creationflow-editor-embed',
            CREATIONFLOW_WOOCOMMERCE_URL . 'assets/editor-embed.css',
            [],
            CREATIONFLOW_WOOCOMMERCE_VERSION
        );

        wp_enqueue_script(
            'creationflow-editor-embed',
            CREATIONFLOW_WOOCOMMERCE_URL . 'assets/editor-embed.js',
            [],
            CREATIONFLOW_WOOCOMMERCE_VERSION,
            true
        );

        wp_localize_script(
            'creationflow-editor-embed',
            'CreationFlowEmbed',
            [
                'apiUrl'      => $editor_base,
                'templateId'  => $template_id,
                'workspaceId' => $this->resolve_workspace_id(),
            ]
        );
    }

    public function render_editor_iframe(): void
    {
        global $product;

        if (! $product instanceof WC_Product) {
            return;
        }

        $template_id = (string) get_post_meta($product->get_id(), ProductMapping::META_KEY, true);
        if ('' === $template_id) {
            return;
        }

        $settings = (new Settings())->get();
        $editor_base = rtrim((string) $settings['api_url'], '');
        if ('' === $editor_base) {
            return;
        }

        $iframe_url = sprintf(
            '%s/embed?templateId=%s&workspaceId=%s&apiKey=__PLUGIN__',
            $editor_base,
            rawurlencode($template_id),
            rawurlencode($this->resolve_workspace_id())
        );

        echo '<div class="creationflow-editor" data-template-id="' . esc_attr($template_id) . '">';
        echo '<iframe class="creationflow-editor__frame" src="' . esc_url($iframe_url) . '" title="' . esc_attr__('CreationFlow Editor', 'creationflow-woocommerce') . '" loading="lazy"></iframe>';
        echo '</div>';
    }

    public function validate_template_id(bool $passed, int $product_id): bool
    {
        $template_id = (string) get_post_meta($product_id, ProductMapping::META_KEY, true);
        if ('' === $template_id) {
            return $passed;
        }

        $template = $this->api->request('GET', '/product-templates/' . rawurlencode($template_id));
        if (! $template['ok']) {
            wc_add_notice(
                __('The CreationFlow template for this product is unavailable. Please contact the shop owner.', 'creationflow-woocommerce'),
                'error'
            );
            return false;
        }

        return $passed;
    }

    private function resolve_workspace_id(): string
    {
        $product = get_product();
        if (! $product instanceof WC_Product) {
            return '';
        }

        $workspace_meta = (string) get_post_meta($product->get_id(), '_creationflow_workspace_id', true);
        if ('' !== $workspace_meta) {
            return $workspace_meta;
        }

        return (string) get_option('creationflow_default_workspace_id', '');
    }
}
