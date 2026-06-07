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
    public const ORDER_ITEM_META_KEY = '_creationflow_configuration_id';
    public const ORDER_META_KEY = '_creationflow_workspace_id';

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
    }

    /**
     * @param array<string, mixed> $cart_item_data
     * @return array<string, mixed>
     */
    public function add_cart_item_data(array $cart_item_data, int $product_id, int $variation_id): array
    {
        if (empty($_POST['creationflow_configuration_id'])) {
            return $cart_item_data;
        }

        $config_id = sanitize_text_field(wp_unslash((string) $_POST['creationflow_configuration_id']));
        if ('' === $config_id) {
            return $cart_item_data;
        }

        $cart_item_data[self::CART_ITEM_META_KEY] = $config_id;
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
        return $cart_item;
    }

    /**
     * @param WC_Order_Item_Product $item
     * @param array<string, mixed> $cart_item_key
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
        $item->save();
    }

    public function update_order_meta(int $order_id): void
    {
        $order = wc_get_order($order_id);
        if (! $order) {
            return;
        }

        $workspace = '';
        foreach ($order->get_items() as $item) {
            $value = (string) $item->get_meta(self::ORDER_ITEM_META_KEY, true);
            if ('' !== $value) {
                $product_id = (int) $item->get_product_id();
                $workspace   = (string) get_post_meta($product_id, '_creationflow_workspace_id', true);
                if ('' === $workspace) {
                    $workspace = (string) get_option('creationflow_default_workspace_id', '');
                }
                break;
            }
        }

        if ('' !== $workspace) {
            $order->update_meta_data(self::ORDER_META_KEY, $workspace);
            $order->save();
        }
    }

    public function render_cart_field(): void
    {
        echo '<div class="creationflow-cart-field">';
        echo '<input type="hidden" name="creationflow_configuration_id" value="" />';
        echo '</div>';
    }
}
