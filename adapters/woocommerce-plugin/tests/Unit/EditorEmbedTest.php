<?php
/**
 * Tests for EditorEmbed configurationId validation and embed URL building.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce\Tests\Unit;

use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;
use CreationFlow\WooCommerce\EditorEmbed;
use CreationFlow\WooCommerce\Tests\TestCase;

final class EditorEmbedTest extends TestCase
{
    public function test_is_valid_configuration_id_accepts_branded_id(): void
    {
        $this->assertTrue(EditorEmbed::is_valid_configuration_id('cfg-1'));
        $this->assertTrue(EditorEmbed::is_valid_configuration_id('cfg_abc123'));
        $this->assertTrue(EditorEmbed::is_valid_configuration_id(str_repeat('a', 64)));
    }

    public function test_is_valid_configuration_id_rejects_garbage(): void
    {
        $this->assertFalse(EditorEmbed::is_valid_configuration_id(''));
        $this->assertFalse(EditorEmbed::is_valid_configuration_id(' '));
        $this->assertFalse(EditorEmbed::is_valid_configuration_id(str_repeat('a', 65)));
        $this->assertFalse(EditorEmbed::is_valid_configuration_id('<script>alert(1)</script>'));
        $this->assertFalse(EditorEmbed::is_valid_configuration_id("cfg';DROP TABLE--"));
    }

    public function test_register_attaches_woocommerce_hooks(): void
    {
        Actions\expectAdded('woocommerce_before_add_to_cart_button')->once();
        Actions\expectAdded('wp_enqueue_scripts')->once();
        Filters\expectAdded('woocommerce_add_to_cart_validation')->once();
        Actions\expectAdded('woocommerce_after_add_to_cart_button')->once();

        $embed = new EditorEmbed(new \CreationFlow\WooCommerce\ApiClient(new \CreationFlow\WooCommerce\Settings()));
        $embed->register();
    }
}
