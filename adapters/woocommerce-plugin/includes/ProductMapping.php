<?php
/**
 * WooCommerce product to CreationFlow template mapping.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class ProductMapping
{
    public const META_KEY = '_creationflow_template_id';

    private ApiClient $api;

    public function __construct(ApiClient $api)
    {
        $this->api = $api;
    }

    public function register(): void
    {
        add_action('woocommerce_product_options_general_product_data', [$this, 'render_product_field']);
        add_action('woocommerce_process_product_meta', [$this, 'save_product_field']);
        add_action('woocommerce_product_after_variable_attributes', [$this, 'render_variation_field'], 10, 4);
        add_action('woocommerce_save_product_variation', [$this, 'save_variation_field'], 10, 2);
    }

    public function render_product_field(): void
    {
        echo '<div class="options_group">';
        woocommerce_wp_text_input(
            [
                'id'          => self::META_KEY,
                'label'       => __('CreationFlow Template ID', 'creationflow-woocommerce'),
                'placeholder' => __('e.g. 7c1f...', 'creationflow-woocommerce'),
                'desc_tip'    => 'true',
                'description' => __('The CreationFlow product template that this WooCommerce product is mapped to.', 'creationflow-woocommerce'),
            ]
        );
        echo '</div>';
    }

    public function save_product_field(int $post_id): void
    {
        $value = isset($_POST[self::META_KEY]) ? sanitize_text_field(wp_unslash((string) $_POST[self::META_KEY])) : '';
        $this->set_template_id($post_id, $value);
    }

    public function render_variation_field(int $loop, array $variation_data, WP_Post $variation): void
    {
        $value = (string) get_post_meta($variation->ID, self::META_KEY, true);
        echo '<div class="options_group">';
        woocommerce_wp_text_input(
            [
                'id'            => self::META_KEY . '[' . $loop . ']',
                'name'          => self::META_KEY . '[' . $loop . ']',
                'label'         => __('CreationFlow Template ID', 'creationflow-woocommerce'),
                'value'         => $value,
                'desc_tip'      => 'true',
                'description'   => __('Optional: override the product template for this variation.', 'creationflow-woocommerce'),
                'wrapper_class' => 'form-row form-row-full',
            ]
        );
        echo '</div>';
    }

    public function save_variation_field(int $variation_id, int $loop_index): void
    {
        if (! isset($_POST[self::META_KEY][$loop_index])) {
            return;
        }
        $value = sanitize_text_field(wp_unslash((string) $_POST[self::META_KEY][$loop_index]));
        $this->set_template_id($variation_id, $value);
    }

    public function set_template_id(int $post_id, string $template_id): void
    {
        if ('' === $template_id) {
            delete_post_meta($post_id, self::META_KEY);
            return;
        }

        update_post_meta($post_id, self::META_KEY, $template_id);
    }

    public function get_template_id(int $post_id): string
    {
        return (string) get_post_meta($post_id, self::META_KEY, true);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function fetch_template(string $template_id, string $workspace_id = ''): ?array
    {
        $args = [];
        if ('' !== $workspace_id) {
            $args['workspaceId'] = $workspace_id;
        }

        $result = $this->api->request('GET', '/product-templates/' . rawurlencode($template_id), $args);

        if (! $result['ok']) {
            return null;
        }

        return $result['body'] ?? null;
    }
}
