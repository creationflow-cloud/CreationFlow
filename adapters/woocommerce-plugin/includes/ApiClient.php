<?php
/**
 * CreationFlow REST API client.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class ApiClient
{
    private Settings $settings;

    public const DEFAULT_TIMEOUT = 10;

    public const TRANSIENT_PREFIX = 'creationflow_api_';

    public function __construct(Settings $settings)
    {
        $this->settings = $settings;
    }

    /**
     * @return array{ok: bool, status: int, message: string, body?: array<string, mixed>}
     */
    public function request(string $method, string $path, array $args = [], bool $use_cache = true): array
    {
        $settings  = $this->settings->get();
        $base_url  = isset($settings['api_url']) ? rtrim((string) $settings['api_url'], '/') : '';
        $api_token = isset($settings['api_token']) ? (string) $settings['api_token'] : '';
        $debug     = ! empty($settings['debug_mode']);

        if ('' === $base_url) {
            return $this->error_response(0, __('CreationFlow API URL is not configured.', 'creationflow-woocommerce'));
        }

        if ('' === $api_token) {
            return $this->error_response(0, __('CreationFlow API token is not configured.', 'creationflow-woocommerce'));
        }

        $url  = $base_url . '/' . ltrim($path, '/');
        $key  = $method . '|' . $url . '|' . wp_json_encode($args);
        $hash = md5($key);

        if ($use_cache && 'GET' === strtoupper($method)) {
            $cached = get_transient(self::TRANSIENT_PREFIX . $hash);
            if (is_array($cached)) {
                return $cached;
            }
        }

        $request_args = [
            'method'  => strtoupper($method),
            'timeout' => self::DEFAULT_TIMEOUT,
            'headers' => [
                'X-API-Key'    => $api_token,
                'Content-Type' => 'application/json',
                'Accept'       => 'application/json',
            ],
        ];

        if ('GET' === $request_args['method']) {
            if (! empty($args)) {
                $url = add_query_arg(array_map(static fn($v) => is_scalar($v) ? (string) $v : '', $args), $url);
            }
        } else {
            $request_args['body'] = wp_json_encode($args);
        }

        if ($debug) {
            error_log(sprintf('[creationflow] %s %s', $request_args['method'], $url));
        }

        $response = wp_remote_request($url, $request_args);

        if (is_wp_error($response)) {
            return $this->error_response(0, $response->get_error_message());
        }

        $status_code = (int) wp_remote_retrieve_response_code($response);
        $raw_body    = (string) wp_remote_retrieve_body($response);
        $body        = json_decode($raw_body, true);

        if (! is_array($body)) {
            $body = [];
        }

        $ok = $status_code >= 200 && $status_code < 300;
        $message_key = isset($body['message']) ? (string) $body['message'] : '';

        $result = [
            'ok'      => $ok,
            'status'  => $status_code,
            'message' => '' !== $message_key
                ? $message_key
                : ($ok
                    ? __('Connection successful.', 'creationflow-woocommerce')
                    : sprintf(/* translators: %d HTTP status code. */ __('Request failed with status %d.', 'creationflow-woocommerce'), $status_code)),
        ];

        if ($ok) {
            $result['body'] = $body;
        }

        if ($use_cache && 'GET' === $request_args['method'] && $ok) {
            set_transient(self::TRANSIENT_PREFIX . $hash, $result, MINUTE_IN_SECONDS * 5);
        }

        return $result;
    }

    /**
     * @return array{ok: bool, status: int, message: string}
     */
    public function test_connection(): array
    {
        $result = $this->request('GET', '/version', [], false);

        if ($result['ok']) {
            return [
                'ok'      => true,
                'status'  => $result['status'],
                'message' => __('Successfully connected to the CreationFlow API.', 'creationflow-woocommerce'),
            ];
        }

        $status = $result['status'];
        if (0 === $status) {
            return [
                'ok'      => false,
                'status'  => 0,
                'message' => sprintf(
                    /* translators: %s error message. */
                    __('Could not reach the CreationFlow API: %s', 'creationflow-woocommerce'),
                    $result['message']
                ),
            ];
        }

        if (401 === $status) {
            return [
                'ok'      => false,
                'status'  => $status,
                'message' => __('The API token was rejected. Please verify the CREATIONFLOW_API_KEY in your settings.', 'creationflow-woocommerce'),
            ];
        }

        if (403 === $status) {
            return [
                'ok'      => false,
                'status'  => $status,
                'message' => __('Access denied. The API token may not have the required role for this operation.', 'creationflow-woocommerce'),
            ];
        }

        return [
            'ok'      => false,
            'status'  => $status,
            'message' => $result['message'],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function list_workspaces(string $workspace_id = ''): array
    {
        $args = [];
        if ('' !== $workspace_id) {
            $args['workspaceId'] = $workspace_id;
        }

        $result = $this->request('GET', '/workspaces', $args);

        if (! $result['ok']) {
            return [];
        }

        $body = $result['body'] ?? [];

        return is_array($body) ? array_values(array_filter($body, 'is_array')) : [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function list_product_templates(string $workspace_id): array
    {
        if ('' === $workspace_id) {
            return [];
        }

        $result = $this->request('GET', '/product-templates', ['workspaceId' => $workspace_id]);

        if (! $result['ok']) {
            return [];
        }

        $body = $result['body'] ?? [];

        return is_array($body) ? array_values(array_filter($body, 'is_array')) : [];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function get_product_template(string $template_id, string $workspace_id = ''): ?array
    {
        $args = [];
        if ('' !== $workspace_id) {
            $args['workspaceId'] = $workspace_id;
        }

        $result = $this->request('GET', '/product-templates/' . rawurlencode($template_id), $args);

        if (! $result['ok']) {
            return null;
        }

        return $result['body'] ?? null;
    }

    public function clear_cache(): void
    {
        // WordPress lacks a wildcard delete, so we rely on transient TTL.
        // This is exposed for future cache management UIs.
    }

    /**
     * @return array{ok: bool, status: int, message: string}
     */
    private function error_response(int $status, string $message): array
    {
        return [
            'ok'      => false,
            'status'  => $status,
            'message' => $message,
        ];
    }
}
