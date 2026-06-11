<?php
/**
 * Tests for the OrderPdfAttacher public/ACL behaviour.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce\Tests\Unit;

use Brain\Monkey\Actions;
use Brain\Monkey\Functions;
use CreationFlow\WooCommerce\ApiClient;
use CreationFlow\WooCommerce\OrderPdfAttacher;
use CreationFlow\WooCommerce\Settings;
use CreationFlow\WooCommerce\Tests\TestCase;

final class OrderPdfAttacherTest extends TestCase
{
    public function test_register_attaches_expected_hooks(): void
    {
        Actions\expectAdded('creationflow_refresh_render_jobs')->once();
        Actions\expectAdded('creationflow_attach_pdfs_for_order')->once();

        $attacher = new OrderPdfAttacher(new ApiClient(new Settings()), new Settings());
        $attacher->register();
    }

    public function test_download_binary_rejects_empty_url(): void
    {
        $attacher = new OrderPdfAttacher(new ApiClient(new Settings()), new Settings());
        $result = $attacher->download_binary('');

        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('Empty URL', $result['message']);
    }

    public function test_download_binary_surfaces_http_errors(): void
    {
        Functions\when('wp_remote_get')->justReturn([
            'response' => ['code' => 500],
            'body'     => 'server error',
        ]);

        $attacher = new OrderPdfAttacher(new ApiClient(new Settings()), new Settings());
        $result = $attacher->download_binary('https://creationflow.example.test/file.pdf');

        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('500', $result['message']);
    }

    public function test_download_binary_returns_body_on_success(): void
    {
        Functions\when('wp_remote_get')->justReturn([
            'response' => ['code' => 200],
            'body'     => '%PDF-1.4 hello',
        ]);

        $attacher = new OrderPdfAttacher(new ApiClient(new Settings()), new Settings());
        $result = $attacher->download_binary('https://creationflow.example.test/file.pdf');

        $this->assertTrue($result['ok']);
        $this->assertSame('%PDF-1.4 hello', $result['body']);
    }
}
