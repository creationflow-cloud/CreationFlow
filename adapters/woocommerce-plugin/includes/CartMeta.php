<?php
/**
 * WooCommerce cart and order meta for CreationFlow configuration IDs.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class CartMeta
{
    public const CART_ITEM_META_KEY = '_creationflow_configuration_id';
    public const CART_ITEM_TEMPLATE_KEY = '_creationflow_template_id';
    public const CART_ITEM_WORKSPACE_KEY = '_creationflow_workspace_id';
    public const ORDER_ITEM_META_KEY = '_creationflow_configuration_id';
    public const ORDER_ITEM_TEMPLATE_KEY = '_creationflow_template_id';
    public const ORDER_ITEM_WORKSPACE_KEY = '_creationflow_workspace_id';
    public const ORDER_META_KEY = '_creationflow_workspace_id';
    public const ORDER_META_CONFIGURATIONS = '_creationflow_configurations';

    private ProductMapping $product_mapping;

    public function __construct(ProductMapping $product_mapping)
    {
        $this->product_mapping = $product_mapping;
    }

    public function register(): void
    {
        add_action('woocommerce_add_cart_item_data', [$this, 'add_cart_item_data'], 10, 3);
        add_filter('woocommerce_get_cart_item_from_session', [$this, 'restore_cart_item_data'], 10, 3);
        add_action('woocommerce_checkout_create_order_line_item', [$this, 'copy_to_order_item'], 10, 4);
        add_action('woocommerce_checkout_update_order_meta', [$this, 'update_order_meta']);
        add_action('woocommerce_before_cart_item_quantity_zero', [$this, 'clear_cart_item_meta'], 10, 2);
        add_action('woocommerce_remove_cart_item', [$this, 'clear_cart_item_meta'], 10, 2);

        add_action('woocommerce_admin_order_data_after_billing_address', [$this, 'render_admin_order_summary']);
        add_filter('manage_shop_order_posts_columns', [$this, 'add_order_column']);
        add_action('manage_shop_order_posts_custom_column', [$this, 'render_order_column'], 10, 2);
    }

    /**
     * @param array<string, mixed> $cart_item_data
     * @return array<string, mixed>
     */
    public function add_cart_item_data(array $cart_item_data, int $product_id, int $variation_id): array
    {
        $config_id = $this->read_posted_config_id();
        if ('' === $config_id) {
            return $cart_item_data;
        }

        $cart_item_data[self::CART_ITEM_META_KEY] = $config_id;
        $cart_item_data[self::CART_ITEM_TEMPLATE_KEY] = (string) get_post_meta($product_id, ProductMapping::META_KEY, true);
        $cart_item_data[self::CART_ITEM_WORKSPACE_KEY] = $this->product_mapping->get_workspace_id($product_id);
        $cart_item_data['_creationflow_unique_key'] = md5($config_id . microtime(true) . wp_rand());

        return $cart_item_data;
    }

    /**
     * @param array<string, mixed> $cart_item
     * @param array<string, mixed> $values
     * @return array<string, mixed>
     */
    public function restore_cart_item_data(array $cart_item, array $values, string $key): array
    {
        if (isset($values[self::CART_ITEM_META_KEY])) {
            $cart_item[self::CART_ITEM_META_KEY] = sanitize_text_field((string) $values[self::CART_ITEM_META_KEY]);
        }
        if (isset($values[self::CART_ITEM_TEMPLATE_KEY])) {
            $cart_item[self::CART_ITEM_TEMPLATE_KEY] = sanitize_text_field((string) $values[self::CART_ITEM_TEMPLATE_KEY]);
        }
        if (isset($values[self::CART_ITEM_WORKSPACE_KEY])) {
            $cart_item[self::CART_ITEM_WORKSPACE_KEY] = sanitize_text_field((string) $values[self::CART_ITEM_WORKSPACE_KEY]);
        }
        return $cart_item;
    }

    /**
     * @param WC_Order_Item_Product $item
     * @param array<string, mixed> $values
     * @param WC_Order $order
     */
    public function copy_to_order_item($item, string $cart_item_key, array $values, $order): void
    {
        if (! isset($values[self::CART_ITEM_META_KEY])) {
            return;
        }
        $config_id = sanitize_text_field((string) $values[self::CART_ITEM_META_KEY]);
        if ('' === $config_id) {
            return;
        }
        $item->update_meta_data(self::ORDER_ITEM_META_KEY, $config_id);

        if (isset($values[self::CART_ITEM_TEMPLATE_KEY])) {
            $item->update_meta_data(self::ORDER_ITEM_TEMPLATE_KEY, sanitize_text_field((string) $values[self::CART_ITEM_TEMPLATE_KEY]));
        }
        if (isset($values[self::CART_ITEM_WORKSPACE_KEY])) {
            $item->update_meta_data(self::ORDER_ITEM_WORKSPACE_KEY, sanitize_text_field((string) $values[self::CART_ITEM_WORKSPACE_KEY]));
        }
        $item->save();
    }

    public function update_order_meta(int $order_id): void
    {
        $order = wc_get_order($order_id);
        if (! $order) {
            return;
        }

        $workspace = '';
        $configurations = [];
        foreach ($order->get_items() as $item) {
            $config_id = (string) $item->get_meta(self::ORDER_ITEM_META_KEY, true);
            if ('' !== $config_id) {
                $configurations[] = [
                    'item_id'      => (int) $item->get_id(),
                    'product_id'   => (int) $item->get_product_id(),
                    'config_id'    => $config_id,
                    'template_id'  => (string) $item->get_meta(self::ORDER_ITEM_TEMPLATE_KEY, true),
                    'workspace_id' => (string) $item->get_meta(self::ORDER_ITEM_WORKSPACE_KEY, true),
                ];

                if ('' === $workspace) {
                    $product_id   = (int) $item->get_product_id();
                    $workspace_meta = (string) get_post_meta($product_id, ProductMapping::WORKSPACE_META_KEY, true);
                    if ('' !== $workspace_meta) {
                        $workspace = $workspace_meta;
                    }
                }
            }
        }

        if ('' === $workspace) {
            $workspace = (string) get_option('creationflow_default_workspace_id', '');
        }

        if ('' !== $workspace) {
            $order->update_meta_data(self::ORDER_META_KEY, $workspace);
        }

        if (! empty($configurations)) {
            $order->update_meta_data(self::ORDER_META_CONFIGURATIONS, wp_json_encode($configurations));
        }

        $order->save();
    }

    public function clear_cart_item_meta(string $cart_item_key, int $cart_item_id = 0): void
    {
        if (! method_exists(WC()->cart, 'get_cart')) {
            return;
        }
        $cart = WC()->cart->get_cart();
        if (isset($cart[$cart_item_key][self::CART_ITEM_META_KEY])) {
            unset($cart[$cart_item_key][self::CART_ITEM_META_KEY]);
        }
        if (isset($cart[$cart_item_key][self::CART_ITEM_TEMPLATE_KEY])) {
            unset($cart[$cart_item_key][self::CART_ITEM_TEMPLATE_KEY]);
        }
        if (isset($cart[$cart_item_key][self::CART_ITEM_WORKSPACE_KEY])) {
            unset($cart[$cart_item_key][self::CART_ITEM_WORKSPACE_KEY]);
        }
    }

    public function render_admin_order_summary($order): void
    {
        if (! $order instanceof WC_Order) {
            return;
        }

        $items = [];
        foreach ($order->get_items() as $item) {
            $config_id = (string) $item->get_meta(self::ORDER_ITEM_META_KEY, true);
            if ('' === $config_id) {
                continue;
            }
            $items[] = [
                'item_name'    => $item->get_name(),
                'config_id'    => $config_id,
                'template_id'  => (string) $item->get_meta(self::ORDER_ITEM_TEMPLATE_KEY, true),
                'workspace_id' => (string) $item->get_meta(self::ORDER_ITEM_WORKSPACE_KEY, true),
                'product_id'   => (int) $item->get_product_id(),
            ];
        }

        if (empty($items)) {
            return;
        }

        echo '<div class="creationflow-order-summary">';
        echo '<h3>' . esc_html__('CreationFlow Configurations', 'creationflow-woocommerce') . '</h3>';
        echo '<table class="widefat striped">';
        echo '<thead><tr>';
        echo '<th>' . esc_html__('Item', 'creationflow-woocommerce') . '</th>';
        echo '<th>' . esc_html__('Template', 'creationflow-woocommerce') . '</th>';
        echo '<th>' . esc_html__('Workspace', 'creationflow-woocommerce') . '</th>';
        echo '<th>' . esc_html__('Configuration ID', 'creationflow-woocommerce') . '</th>';
        echo '</tr></thead><tbody>';
        foreach ($items as $entry) {
            echo '<tr>';
            echo '<td>' . esc_html((string) $entry['item_name']) . '</td>';
            echo '<td>' . ($entry['template_id'] !== '' ? '<code>' . esc_html($entry['template_id']) . '</code>' : '&mdash;') . '</td>';
            echo '<td>' . ($entry['workspace_id'] !== '' ? '<code>' . esc_html($entry['workspace_id']) . '</code>' : '&mdash;') . '</td>';
            echo '<td><code>' . esc_html($entry['config_id']) . '</code></td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
        echo '</div>';
    }

    /**
     * @param array<string, string> $columns
     * @return array<string, string>
     */
    public function add_order_column(array $columns): array
    {
        $new = [];
        foreach ($columns as $key => $label) {
            $new[$key] = $label;
            if ('order_total' === $key) {
                $new['creationflow_configurations'] = __('CreationFlow', 'creationflow-woocommerce');
            }
        }
        return $new;
    }

    public function render_order_column(string $column, int $post_id): void
    {
        if ('creationflow_configurations' !== $column) {
            return;
        }
        $order = wc_get_order($post_id);
        if (! $order) {
            return;
        }
        $count = 0;
        foreach ($order->get_items() as $item) {
            $config_id = (string) $item->get_meta(self::ORDER_ITEM_META_KEY, true);
            if ('' !== $config_id) {
                $count++;
            }
        }
        if ($count > 0) {
            echo '<span class="creationflow-order-pill">' . esc_html(sprintf(
                /* translators: %d configuration count. */
                _n('%d config', '%d configs', $count, 'creationflow-woocommerce'),
                (int) $count
            )) . '</span>';
        } else {
            echo '&mdash;';
        }
    }

    private function read_posted_config_id(): string
    {
        if (! isset($_POST['creationflow_configuration_id'])) {
            return '';
        }
        $value = sanitize_text_field(wp_unslash((string) $_POST['creationflow_configuration_id']));
        return $value;
    }
}
