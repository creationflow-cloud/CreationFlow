<?php
/**
 * Tests for the RenderOrderListener idempotency and error handling.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce\Tests\Unit;

use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;
use CreationFlow\WooCommerce\ApiClient;
use CreationFlow\WooCommerce\CartMeta;
use CreationFlow\WooCommerce\EditorEmbed;
use CreationFlow\WooCommerce\RenderOrderListener;
use CreationFlow\WooCommerce\Settings;
use CreationFlow\WooCommerce\Tests\TestCase;

final class RenderOrderListenerTest extends TestCase
{
    private function make_listener(): RenderOrderListener
    {
        return new RenderOrderListener(
            new ApiClient(new Settings()),
            new Settings(),
        );
    }

    public function test_register_attaches_order_status_hooks(): void
    {
        Actions\expectAdded('woocommerce_order_status_processing')->once();
        Actions\expectAdded('woocommerce_order_status_completed')->once();
        Actions\expectAdded('creationflow_retry_render_jobs')->once();
        Filters\expectAdded('woocommerce_order_actions')->once();
        Actions\expectAdded('woocommerce_order_action_creationflow_retry_render')->once();

        $this->make_listener()->register();
    }

    public function test_trigger_render_jobs_for_order_skips_items_without_configuration_id(): void
    {
        Functions\when('current_time')->justReturn('2026-06-11 12:00:00');

        $order = $this->createMockOrder([]);
        $listener = $this->make_listener();

        $created = $listener->trigger_render_jobs_for_order($order, 'order_status');

        $this->assertSame([], $created);
    }

    public function test_trigger_render_jobs_for_order_skips_invalid_configuration_ids(): void
    {
        Functions\when('current_time')->justReturn('2026-06-11 12:00:00');

        $item = $this->createMockItem(7, 'cfg-bad', 'ws-1');
        $order = $this->createMockOrder([$item]);
        $listener = $this->make_listener();

        $created = $listener->trigger_render_jobs_for_order($order, 'order_status');

        $this->assertSame([], $created);
    }

    public function test_is_valid_configuration_id_rejects_garbage(): void
    {
        $this->assertTrue(EditorEmbed::is_valid_configuration_id('cfg-abc'));
        $this->assertFalse(EditorEmbed::is_valid_configuration_id('not a real id'));
    }

    private function createMockItem(int $id, string $config_id, string $workspace_id): \WC_Order_Item_Product
    {
        $item = $this->getMockBuilder(\WC_Order_Item_Product::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['get_id', 'get_product_id', 'get_name', 'get_meta', 'update_meta_data', 'save'])
            ->getMock();
        $item->method('get_id')->willReturn($id);
        $item->method('get_product_id')->willReturn(99);
        $item->method('get_name')->willReturn('Test Product');
        $item->method('get_meta')->willReturnCallback(static function (string $key, bool $single = false) use ($config_id, $workspace_id) {
            if ($key === CartMeta::ORDER_ITEM_META_KEY) {
                return $config_id;
            }
            if ($key === CartMeta::ORDER_ITEM_WORKSPACE_KEY) {
                return $workspace_id;
            }
            return '';
        });
        return $item;
    }

    private function createMockOrder(array $items): \WC_Order
    {
        $order = $this->getMockBuilder(\WC_Order::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['get_id', 'get_items', 'update_meta_data', 'delete_meta_data', 'save', 'get_meta'])
            ->getMock();
        $order->method('get_id')->willReturn(123);
        $order->method('get_items')->willReturn($items);
        $order->method('get_meta')->willReturn('');
        return $order;
    }
}
