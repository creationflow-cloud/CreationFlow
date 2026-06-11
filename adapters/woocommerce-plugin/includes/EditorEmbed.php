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

    public const POSTMESSAGE_TYPE_CONFIG = 'creationflow:configuration-changed';
    public const POSTMESSAGE_TYPE_RESIZE = 'creationflow:resize';

    private const EMBED_PATH = '/embed';

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
        add_action('woocommerce_after_add_to_cart_button', [$this, 'render_hidden_configuration_field']);
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
                'workspaceId' => $this->resolve_workspace_id($product->get_id()),
                'productId'   => (int) $product->get_id(),
                'postMessageType' => self::POSTMESSAGE_TYPE_CONFIG,
                'i18n' => [
                    'loading'      => __('Loading editor…', 'creationflow-woocommerce'),
                    'error'        => __('The CreationFlow editor could not be loaded.', 'creationflow-woocommerce'),
                    'retry'        => __('Retry', 'creationflow-woocommerce'),
                    'configurationRequired' => __('Please customize the product before adding it to the cart.', 'creationflow-woocommerce'),
                ],
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
            $this->render_configuration_error(__('The CreationFlow API URL is not configured for this shop.', 'creationflow-woocommerce'));
            return;
        }

        $iframe_url = $this->build_iframe_url($editor_base, $template_id, $this->resolve_workspace_id($product->get_id()), (int) $product->get_id());

        echo '<div class="creationflow-editor" data-template-id="' . esc_attr($template_id) . '" data-product-id="' . esc_attr((string) $product->get_id()) . '">';
        echo '<div class="creationflow-editor__loading">' . esc_html__('Loading editor…', 'creationflow-woocommerce') . '</div>';
        echo '<iframe class="creationflow-editor__frame" src="' . esc_url($iframe_url) . '" title="' . esc_attr__('CreationFlow Editor', 'creationflow-woocommerce') . '" loading="lazy" allow="clipboard-write" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>';
        echo '<noscript>' . esc_html__('The CreationFlow editor requires JavaScript.', 'creationflow-woocommerce') . '</noscript>';
        echo '</div>';
    }

    public function render_hidden_configuration_field(): void
    {
        global $product;
        if (! $product instanceof WC_Product) {
            return;
        }
        $template_id = (string) get_post_meta($product->get_id(), ProductMapping::META_KEY, true);
        if ('' === $template_id) {
            return;
        }
        echo '<input type="hidden" name="creationflow_configuration_id" class="creationflow-configuration-id" value="" />';
        echo '<div class="creationflow-config-required" hidden>' . esc_html__('Please customize the product before adding it to the cart.', 'creationflow-woocommerce') . '</div>';
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

        $configuration_id = isset($_POST['creationflow_configuration_id']) ? sanitize_text_field(wp_unslash((string) $_POST['creationflow_configuration_id'])) : '';
        if ('' === $configuration_id) {
            wc_add_notice(
                __('Please customize the product in the CreationFlow editor before adding it to the cart.', 'creationflow-woocommerce'),
                'error'
            );
            return false;
        }

        if (! self::is_valid_configuration_id($configuration_id)) {
            wc_add_notice(
                __('The configuration ID provided for this product is invalid.', 'creationflow-woocommerce'),
                'error'
            );
            return false;
        }

        return $passed;
    }

    /**
     * A configurationId is a CreationFlow branded ID. It is short, base32
     * (or base32hex) and at most 64 characters. We accept either flavour
     * but enforce shape, length, and an optional prefix separator.
     */
    public static function is_valid_configuration_id(string $value): bool
    {
        if ('' === $value || strlen($value) > 64) {
            return false;
        }

        return (bool) preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{1,63}$/', $value);
    }

    private function build_iframe_url(string $editor_base, string $template_id, string $workspace_id, int $product_id): string
    {
        $args = [
            'templateId' => $template_id,
        ];
        if ('' !== $workspace_id) {
            $args['workspaceId'] = $workspace_id;
        }
        $args['productId'] = (string) $product_id;
        $args['origin'] = home_url('/');
        $args['mode'] = 'embed';

        return $editor_base . self::EMBED_PATH . '?' . http_build_query($args);
    }

    private function resolve_workspace_id(int $product_id = 0): string
    {
        if ($product_id > 0) {
            $value = (string) get_post_meta($product_id, ProductMapping::WORKSPACE_META_KEY, true);
            if ('' !== $value) {
                return $value;
            }
        }

        $settings = (new Settings())->get();
        return isset($settings['default_workspace_id']) ? (string) $settings['default_workspace_id'] : '';
    }

    private function render_configuration_error(string $message): void
    {
        echo '<div class="creationflow-editor creationflow-editor--error" role="alert">';
        echo '<p>' . esc_html($message) . '</p>';
        echo '</div>';
    }
}
