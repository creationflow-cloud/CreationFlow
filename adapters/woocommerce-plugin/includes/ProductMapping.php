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
    public const WORKSPACE_META_KEY = '_creationflow_workspace_id';

    private const NONCE_ACTION = 'creationflow_product_mapping';

    private ApiClient $api;

    public function __construct(ApiClient $api)
    {
        $this->api = $api;
    }

    public function register(): void
    {
        add_action('woocommerce_product_options_general_product_data', [$this, 'render_product_field']);
        add_action('woocommerce_product_options_inventory_product_data', [$this, 'render_workspace_field']);
        add_action('woocommerce_process_product_meta', [$this, 'save_product_meta']);
        add_action('woocommerce_product_after_variable_attributes', [$this, 'render_variation_field'], 10, 4);
        add_action('woocommerce_save_product_variation', [$this, 'save_variation_field'], 10, 2);

        add_action('wp_ajax_creationflow_search_templates', [$this, 'ajax_search_templates']);
        add_action('wp_ajax_creationflow_validate_template', [$this, 'ajax_validate_template']);
    }

    public function render_product_field(): void
    {
        echo '<div class="options_group creationflow-mapping">';
        echo '<p class="form-field">';
        echo '<label for="' . esc_attr(self::META_KEY) . '">' . esc_html__('CreationFlow Template ID', 'creationflow-woocommerce') . '</label>';
        printf(
            '<input class="short" type="text" id="%1$s" name="%1$s" value="%2$s" placeholder="%3$s" />',
            esc_attr(self::META_KEY),
            esc_attr((string) get_post_meta(get_the_ID(), self::META_KEY, true)),
            esc_attr__('e.g. 7c1f...', 'creationflow-woocommerce')
        );
        echo '<span class="description">';
        echo esc_html__('The CreationFlow product template that this WooCommerce product is mapped to. Use the search button to pick from available templates.', 'creationflow-woocommerce');
        echo '</span>';
        echo '<button type="button" class="button creationflow-search-template" data-target="' . esc_attr(self::META_KEY) . '">' . esc_html__('Search templates…', 'creationflow-woocommerce') . '</button>';
        echo '<span class="creationflow-template-status"></span>';
        echo '</p>';
        echo '</div>';
    }

    public function render_workspace_field(): void
    {
        echo '<div class="options_group creationflow-workspace">';
        echo '<p class="form-field">';
        echo '<label for="' . esc_attr(self::WORKSPACE_META_KEY) . '">' . esc_html__('CreationFlow Workspace ID (override)', 'creationflow-woocommerce') . '</label>';
        printf(
            '<input class="short" type="text" id="%1$s" name="%1$s" value="%2$s" placeholder="%3$s" />',
            esc_attr(self::WORKSPACE_META_KEY),
            esc_attr((string) get_post_meta(get_the_ID(), self::WORKSPACE_META_KEY, true)),
            esc_attr__('Optional: ws-1', 'creationflow-woocommerce')
        );
        echo '<span class="description">' . esc_html__('Optional: overrides the default workspace for this product only.', 'creationflow-woocommerce') . '</span>';
        echo '</p>';
        echo '</div>';
    }

    public function save_product_meta(int $post_id): void
    {
        $template_id = isset($_POST[self::META_KEY])
            ? sanitize_text_field(wp_unslash((string) $_POST[self::META_KEY]))
            : '';
        $workspace   = isset($_POST[self::WORKSPACE_META_KEY])
            ? sanitize_text_field(wp_unslash((string) $_POST[self::WORKSPACE_META_KEY]))
            : '';

        $this->set_template_id($post_id, $template_id);
        $this->set_workspace_id($post_id, $workspace);
    }

    public function render_variation_field(int $loop, array $variation_data, WP_Post $variation): void
    {
        $value = (string) get_post_meta($variation->ID, self::META_KEY, true);
        $ws    = (string) get_post_meta($variation->ID, self::WORKSPACE_META_KEY, true);

        echo '<div class="options_group creationflow-variation">';
        echo '<p class="form-row form-row-full">';
        echo '<label>' . esc_html__('CreationFlow Template ID', 'creationflow-woocommerce') . '</label>';
        printf(
            '<input class="short" type="text" name="%1$s[%2$d]" value="%3$s" />',
            esc_attr(self::META_KEY),
            (int) $loop,
            esc_attr($value)
        );
        echo '</p>';
        echo '<p class="form-row form-row-full">';
        echo '<label>' . esc_html__('Workspace ID (override)', 'creationflow-woocommerce') . '</label>';
        printf(
            '<input class="short" type="text" name="%1$s[%2$d]" value="%3$s" />',
            esc_attr(self::WORKSPACE_META_KEY),
            (int) $loop,
            esc_attr($ws)
        );
        echo '</p>';
        echo '</div>';
    }

    public function save_variation_field(int $variation_id, int $loop_index): void
    {
        if (isset($_POST[self::META_KEY][$loop_index])) {
            $value = sanitize_text_field(wp_unslash((string) $_POST[self::META_KEY][$loop_index]));
            $this->set_template_id($variation_id, $value);
        }
        if (isset($_POST[self::WORKSPACE_META_KEY][$loop_index])) {
            $value = sanitize_text_field(wp_unslash((string) $_POST[self::WORKSPACE_META_KEY][$loop_index]));
            $this->set_workspace_id($variation_id, $value);
        }
    }

    public function set_template_id(int $post_id, string $template_id): void
    {
        if ('' === $template_id) {
            delete_post_meta($post_id, self::META_KEY);
            return;
        }

        update_post_meta($post_id, self::META_KEY, $template_id);
    }

    public function set_workspace_id(int $post_id, string $workspace_id): void
    {
        if ('' === $workspace_id) {
            delete_post_meta($post_id, self::WORKSPACE_META_KEY);
            return;
        }

        update_post_meta($post_id, self::WORKSPACE_META_KEY, $workspace_id);
    }

    public function get_template_id(int $post_id): string
    {
        return (string) get_post_meta($post_id, self::META_KEY, true);
    }

    public function get_workspace_id(int $post_id): string
    {
        $value = (string) get_post_meta($post_id, self::WORKSPACE_META_KEY, true);
        if ('' !== $value) {
            return $value;
        }

        $settings = (new Settings())->get();
        return isset($settings['default_workspace_id']) ? (string) $settings['default_workspace_id'] : '';
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

    /**
     * @return array<int, array<string, mixed>>
     */
    public function list_available_templates(string $workspace_id): array
    {
        return $this->api->list_product_templates($workspace_id);
    }

    public function ajax_search_templates(): void
    {
        if (! current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Insufficient permissions.', 'creationflow-woocommerce')], 403);
        }

        check_ajax_referer(self::NONCE_ACTION, 'nonce');

        $workspace_id = isset($_POST['workspace_id']) ? sanitize_text_field(wp_unslash((string) $_POST['workspace_id'])) : '';
        $search       = isset($_POST['search']) ? sanitize_text_field(wp_unslash((string) $_POST['search'])) : '';

        $templates = $this->list_available_templates($workspace_id);

        if ('' !== $search) {
            $search_lower = strtolower($search);
            $templates = array_values(array_filter($templates, static function ($template) use ($search_lower) {
                if (! is_array($template)) {
                    return false;
                }
                $name = isset($template['name']) ? (string) $template['name'] : '';
                $id   = isset($template['id']) ? (string) $template['id'] : '';
                return false !== strpos(strtolower($name), $search_lower) || false !== strpos(strtolower($id), $search_lower);
            }));
        }

        wp_send_json(['templates' => $templates]);
    }

    public function ajax_validate_template(): void
    {
        if (! current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Insufficient permissions.', 'creationflow-woocommerce')], 403);
        }

        check_ajax_referer(self::NONCE_ACTION, 'nonce');

        $template_id = isset($_POST['template_id']) ? sanitize_text_field(wp_unslash((string) $_POST['template_id'])) : '';
        $workspace_id = isset($_POST['workspace_id']) ? sanitize_text_field(wp_unslash((string) $_POST['workspace_id'])) : '';

        if ('' === $template_id) {
            wp_send_json_error(['message' => __('Template ID is required.', 'creationflow-woocommerce')], 400);
        }

        $template = $this->fetch_template($template_id, $workspace_id);
        if (null === $template) {
            wp_send_json_error(['message' => __('Template not found or API error.', 'creationflow-woocommerce')], 404);
        }

        wp_send_json(['template' => $template]);
    }

    public function get_nonce_action(): string
    {
        return self::NONCE_ACTION;
    }
}
