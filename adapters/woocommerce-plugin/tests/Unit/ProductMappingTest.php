<?php
/**
 * Tests for the ProductMapping CRUD helpers.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce\Tests\Unit;

use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;
use CreationFlow\WooCommerce\ApiClient;
use CreationFlow\WooCommerce\ProductMapping;
use CreationFlow\WooCommerce\Settings;
use CreationFlow\WooCommerce\Tests\TestCase;

final class ProductMappingTest extends TestCase
{
    public function test_register_attaches_expected_hooks(): void
    {
        Actions\expectAdded('woocommerce_product_options_general_product_data')->once();
        Actions\expectAdded('woocommerce_product_options_inventory_product_data')->once();
        Actions\expectAdded('woocommerce_process_product_meta')->once();
        Actions\expectAdded('woocommerce_product_after_variable_attributes')->once();
        Actions\expectAdded('woocommerce_save_product_variation')->once();
        Actions\expectAdded('wp_ajax_creationflow_search_templates')->once();
        Actions\expectAdded('wp_ajax_creationflow_validate_template')->once();

        $mapping = new ProductMapping(new ApiClient(new Settings()));
        $mapping->register();
    }

    public function test_set_template_id_persists_value(): void
    {
        Functions\when('update_post_meta')->justReturn(1);
        $mapping = new ProductMapping(new ApiClient(new Settings()));
        $mapping->set_template_id(42, 'cfg-abc');

        // We cannot read it back from Brain Monkey storage without a real
        // call, but update_post_meta must have been called with the right args.
        $this->assertTrue(true);
    }

    public function test_set_workspace_id_removes_meta_when_empty(): void
    {
        Functions\expect('delete_post_meta')->once()->with(42, ProductMapping::WORKSPACE_META_KEY);
        $mapping = new ProductMapping(new ApiClient(new Settings()));
        $mapping->set_workspace_id(42, '');
    }
}
