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

    public function __construct(Settings $settings)
    {
        $this->settings = $settings;
    }

    /**
     * @return array{ok: bool, status: int, message: string, body?: array<string, mixed>}
     */
    public function request(string $method, string $path, array $args = []): array
    {
        $settings  = $this->settings->get();
        $base_url  = isset($settings['api_url']) ? rtrim((string) $settings['api_url'], '/') : '';
        $api_token = isset($settings['api_token']) ? (string) $settings['api_token'] : '';
        $debug     = ! empty($settings['debug_mode']);

        if ('' === $base_url) {
            return [
                'ok'      => false,
                'status'  => 0,
                'message' => __('CreationFlow API URL is not configured.', 'creationflow-woocommerce'),
            ];
        }

        if ('' === $api_token) {
            return [
                'ok'      => false,
                'status'  => 0,
                'message' => __('CreationFlow API token is not configured.', 'creationflow-woocommerce'),
            ];
        }

        $url = $base_url . '/' . ltrim($path, '/');

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
            return [
                'ok'      => false,
                'status'  => 0,
                'message' => $response->get_error_message(),
            ];
        }

        $status_code = (int) wp_remote_retrieve_response_code($response);
        $raw_body    = (string) wp_remote_retrieve_body($response);
        $body        = json_decode($raw_body, true);

        if (! is_array($body)) {
            $body = [];
        }

        $ok = $status_code >= 200 && $status_code < 300;
        $message_key = isset($body['message']) ? (string) $body['message'] : '';

        return [
            'ok'      => $ok,
            'status'  => $status_code,
            'message' => '' !== $message_key
                ? $message_key
                : ($ok
                    ? __('Connection successful.', 'creationflow-woocommerce')
                    : sprintf(/* translators: %d HTTP status code. */ __('Request failed with status %d.', 'creationflow-woocommerce'), $status_code)),
            'body'    => $body,
        ];
    }

    /**
     * @return array{ok: bool, status: int, message: string}
     */
    public function test_connection(): array
    {
        $result = $this->request('GET', '/version');

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

        return [
            'ok'      => false,
            'status'  => $status,
            'message' => $result['message'],
        ];
    }
}
