<?php
/**
 * Tests for the CartMeta lifecycle.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce\Tests\Unit;

use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;
use CreationFlow\WooCommerce\CartMeta;
use CreationFlow\WooCommerce\ProductMapping;
use CreationFlow\WooCommerce\Tests\TestCase;

final class CartMetaTest extends TestCase
{
    public function test_register_attaches_expected_hooks(): void
    {
        Actions\expectAdded('woocommerce_add_cart_item_data')->once();
        Filters\expectAdded('woocommerce_get_cart_item_from_session')->once();
        Actions\expectAdded('woocommerce_checkout_create_order_line_item')->once();
        Actions\expectAdded('woocommerce_checkout_update_order_meta')->once();
        Actions\expectAdded('woocommerce_before_cart_item_quantity_zero')->once();
        Actions\expectAdded('woocommerce_remove_cart_item')->once();
        Actions\expectAdded('woocommerce_admin_order_data_after_billing_address')->once();
        Filters\expectAdded('manage_shop_order_posts_columns')->once();
        Actions\expectAdded('manage_shop_order_posts_custom_column')->once();

        $meta = new CartMeta(new ProductMapping(new \CreationFlow\WooCommerce\ApiClient(new \CreationFlow\WooCommerce\Settings())));
        $meta->register();
    }

    public function test_add_cart_item_data_keeps_payload_when_no_config_id(): void
    {
        $_POST = [];
        Functions\when('wp_rand')->justReturn(123);
        Functions\when('get_post_meta')->justReturn('cfg-template');

        $meta = new CartMeta(new ProductMapping(new \CreationFlow\WooCommerce\ApiClient(new \CreationFlow\WooCommerce\Settings())));
        $result = $meta->add_cart_item_data([], 1, 0);

        $this->assertArrayNotHasKey(CartMeta::CART_ITEM_META_KEY, $result);
    }
}
