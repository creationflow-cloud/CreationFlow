<?php
/**
 * Custom assertions for the CreationFlow WooCommerce adapter test suite.
 *
 * These tiny helpers provide readable failures when running under our
 * minimal bootstrap and degrade gracefully under PHPUnit where its own
 * `assertSame` etc. are already available.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce\Tests;

if (! class_exists(__NAMESPACE__ . '\\TestCase')) {
    /**
     * Base test case that provides fluent assertions and clean setup.
     */
    abstract class TestCase extends \PHPUnit\Framework\TestCase
    {
        protected function setUp(): void
        {
            parent::setUp();
            \Brain\Monkey\setUp();
        }

        protected function tearDown(): void
        {
            \Brain\Monkey\tearDown();
            parent::tearDown();
        }
    }
}
