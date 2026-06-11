<?php
/**
 * Tests for the ApiClient URL and credential handling.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce\Tests\Unit;

use Brain\Monkey\Actions;
use Brain\Monkey\Filters;
use Brain\Monkey\Functions;
use CreationFlow\WooCommerce\ApiClient;
use CreationFlow\WooCommerce\Settings;
use CreationFlow\WooCommerce\Tests\TestCase;

final class ApiClientTest extends TestCase
{
    private function make_settings(array $overrides = []): Settings
    {
        $settings = new Settings();
        Functions\when('get_option')->alias(static function (string $option, $default = false) use ($overrides) {
            if (Settings::OPTION_NAME === $option) {
                return array_merge([
                    'api_url'              => 'https://creationflow.example.test',
                    'api_token'            => 'secret-token',
                    'debug_mode'           => false,
                    'default_workspace_id' => 'ws-default',
                ], $overrides);
            }
            return $default;
        });
        return $settings;
    }

    public function test_request_rejects_missing_api_url(): void
    {
        $client = new ApiClient($this->make_settings(['api_url' => '']));

        $result = $client->request('GET', '/workspaces');

        $this->assertFalse($result['ok']);
        $this->assertSame(0, $result['status']);
        $this->assertStringContainsString('API URL is not configured', $result['message']);
    }

    public function test_request_rejects_missing_api_token(): void
    {
        $client = new ApiClient($this->make_settings(['api_token' => '']));

        $result = $client->request('GET', '/workspaces');

        $this->assertFalse($result['ok']);
        $this->assertSame(0, $result['status']);
        $this->assertStringContainsString('API token is not configured', $result['message']);
    }

    public function test_request_encodes_x_api_key_header(): void
    {
        Functions\when('add_query_arg')->returnArg(2);
        Functions\when('wp_json_encode')->alias(static fn($v) => json_encode($v));
        Functions\when('get_transient')->justReturn(false);

        $captured = [];
        Functions\when('wp_remote_request')->alias(static function (string $url, array $args) use (&$captured) {
            $captured = ['url' => $url, 'args' => $args];
            return [
                'response' => ['code' => 200],
                'body'     => json_encode(['ok' => true]),
            ];
        });

        $client = new ApiClient($this->make_settings());
        $client->request('GET', '/workspaces', [], false);

        $this->assertArrayHasKey('headers', $captured['args']);
        $this->assertSame('secret-token', $captured['args']['headers']['X-API-Key']);
        $this->assertSame('GET', $captured['args']['method']);
    }

    public function test_request_returns_ok_for_2xx_responses(): void
    {
        Functions\when('add_query_arg')->returnArg(2);
        Functions\when('wp_json_encode')->alias(static fn($v) => json_encode($v));
        Functions\when('get_transient')->justReturn(false);
        Functions\when('wp_remote_request')->justReturn([
            'response' => ['code' => 200],
            'body'     => json_encode(['ok' => true, 'workspaces' => []]),
        ]);

        $client = new ApiClient($this->make_settings());
        $result = $client->request('GET', '/workspaces', [], false);

        $this->assertTrue($result['ok']);
        $this->assertSame(200, $result['status']);
        $this->assertArrayHasKey('body', $result);
    }

    public function test_request_surfaces_error_for_5xx_responses(): void
    {
        Functions\when('add_query_arg')->returnArg(2);
        Functions\when('wp_json_encode')->alias(static fn($v) => json_encode($v));
        Functions\when('get_transient')->justReturn(false);
        Functions\when('wp_remote_request')->justReturn([
            'response' => ['code' => 503],
            'body'     => json_encode(['message' => 'upstream']),
        ]);

        $client = new ApiClient($this->make_settings());
        $result = $client->request('GET', '/workspaces', [], false);

        $this->assertFalse($result['ok']);
        $this->assertSame(503, $result['status']);
        $this->assertSame('upstream', $result['message']);
    }

    public function test_download_binary_to_disk_rejects_external_hosts(): void
    {
        Functions\when('wp_parse_url')->alias(static function (string $url, int $component = -1) {
            $parts = parse_url($url);
            if (-1 === $component) {
                return $parts;
            }
            $key = [
                PHP_URL_SCHEME   => 'scheme',
                PHP_URL_HOST     => 'host',
                PHP_URL_PORT     => 'port',
                PHP_URL_USER     => 'user',
                PHP_URL_PASS     => 'pass',
                PHP_URL_PATH     => 'path',
                PHP_URL_QUERY    => 'query',
                PHP_URL_FRAGMENT => 'fragment',
            ][$component] ?? null;
            return $key && isset($parts[$key]) ? $parts[$key] : null;
        });

        $client = new ApiClient($this->make_settings());
        $result = $client->download_binary_to_disk(
            'https://attacker.example.test/leak.pdf',
            sys_get_temp_dir() . '/creationflow-test-' . uniqid() . '.pdf',
        );

        $this->assertFalse($result['ok']);
        $this->assertStringContainsString('Refusing to download', $result['message']);
    }

    public function test_download_binary_to_disk_accepts_same_host_urls(): void
    {
        Functions\when('wp_parse_url')->alias(static function (string $url, int $component = -1) {
            $parts = parse_url($url);
            if (-1 === $component) {
                return $parts;
            }
            $key = [
                PHP_URL_SCHEME   => 'scheme',
                PHP_URL_HOST     => 'host',
                PHP_URL_PORT     => 'port',
                PHP_URL_USER     => 'user',
                PHP_URL_PASS     => 'pass',
                PHP_URL_PATH     => 'path',
                PHP_URL_QUERY    => 'query',
                PHP_URL_FRAGMENT => 'fragment',
            ][$component] ?? null;
            return $key && isset($parts[$key]) ? $parts[$key] : null;
        });

        Functions\when('wp_remote_get')->justReturn([
            'response' => ['code' => 200],
            'body'     => '%PDF-1.4 fake pdf body',
        ]);

        $tmp = sys_get_temp_dir() . '/creationflow-test-' . uniqid() . '.pdf';
        $client = new ApiClient($this->make_settings());
        $result = $client->download_binary_to_disk(
            'https://creationflow.example.test/render-jobs/abc/output/pdf',
            $tmp,
        );

        $this->assertTrue($result['ok'], $result['message'] ?? 'unknown');
        $this->assertFileExists($tmp);
        @unlink($tmp);
    }

    public function test_is_same_host_url_rejects_empty_or_external_urls(): void
    {
        Functions\when('wp_parse_url')->alias(static function (string $url, int $component = -1) {
            $parts = parse_url($url);
            if (-1 === $component) {
                return $parts;
            }
            $key = [
                PHP_URL_SCHEME   => 'scheme',
                PHP_URL_HOST     => 'host',
                PHP_URL_PORT     => 'port',
                PHP_URL_USER     => 'user',
                PHP_URL_PASS     => 'pass',
                PHP_URL_PATH     => 'path',
                PHP_URL_QUERY    => 'query',
                PHP_URL_FRAGMENT => 'fragment',
            ][$component] ?? null;
            return $key && isset($parts[$key]) ? $parts[$key] : null;
        });

        $client = new ApiClient($this->make_settings());
        $this->assertFalse($client->is_same_host_url(''));
        $this->assertFalse($client->is_same_host_url('https://attacker.example.test/foo'));
        $this->assertTrue($client->is_same_host_url('https://creationflow.example.test/api'));
    }

    public function test_create_render_job_validates_arguments(): void
    {
        $client = new ApiClient($this->make_settings());

        $this->assertFalse($client->create_render_job('', 'cfg-1')['ok']);
        $this->assertFalse($client->create_render_job('ws-1', '')['ok']);
    }
}
