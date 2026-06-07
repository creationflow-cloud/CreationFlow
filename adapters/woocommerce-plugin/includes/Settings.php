<?php
/**
 * Plugin settings registration.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class Settings
{
    public const OPTION_NAME = 'creationflow_woocommerce_settings';

    public function register(): void
    {
        add_action('admin_init', [$this, 'register_settings']);
    }

    public function register_settings(): void
    {
        register_setting(
            'creationflow_woocommerce',
            self::OPTION_NAME,
            [
                'type'              => 'array',
                'sanitize_callback' => [$this, 'sanitize'],
                'default'           => $this->defaults(),
            ]
        );

        add_settings_section(
            'creationflow_woocommerce_connection',
            __('Connection Settings', 'creationflow-woocommerce'),
            static function (): void {
                echo '<p>' . esc_html__('Configure how this adapter will connect to your self-hosted CreationFlow server. The real API connection will be added later.', 'creationflow-woocommerce') . '</p>';
            },
            'creationflow_woocommerce'
        );

        add_settings_field(
            'api_url',
            __('CreationFlow API URL', 'creationflow-woocommerce'),
            [$this, 'render_api_url_field'],
            'creationflow_woocommerce',
            'creationflow_woocommerce_connection'
        );

        add_settings_field(
            'api_token',
            __('API Token', 'creationflow-woocommerce'),
            [$this, 'render_api_token_field'],
            'creationflow_woocommerce',
            'creationflow_woocommerce_connection'
        );

        add_settings_field(
            'debug_mode',
            __('Debug Mode', 'creationflow-woocommerce'),
            [$this, 'render_debug_mode_field'],
            'creationflow_woocommerce',
            'creationflow_woocommerce_connection'
        );
    }

    /**
     * @param array<string, mixed> $input Raw settings input.
     *
     * @return array{api_url: string, api_token: string, debug_mode: bool}
     */
    public function sanitize(array $input): array
    {
        return [
            'api_url'    => isset($input['api_url']) ? esc_url_raw((string) $input['api_url']) : '',
            'api_token'  => isset($input['api_token']) ? sanitize_text_field((string) $input['api_token']) : '',
            'debug_mode' => ! empty($input['debug_mode']),
        ];
    }

    /**
     * @return array{api_url: string, api_token: string, debug_mode: bool}
     */
    public function get(): array
    {
        $settings = get_option(self::OPTION_NAME, $this->defaults());

        if (! is_array($settings)) {
            return $this->defaults();
        }

        return array_merge($this->defaults(), $settings);
    }

    public function render_api_url_field(): void
    {
        $settings = $this->get();

        printf(
            '<input class="regular-text" type="url" name="%1$s[api_url]" value="%2$s" placeholder="https://creationflow.example.test" />',
            esc_attr(self::OPTION_NAME),
            esc_attr($settings['api_url'])
        );
    }

    public function render_api_token_field(): void
    {
        $settings = $this->get();

        printf(
            '<input class="regular-text" type="password" name="%1$s[api_token]" value="%2$s" autocomplete="off" />',
            esc_attr(self::OPTION_NAME),
            esc_attr($settings['api_token'])
        );
    }

    public function render_debug_mode_field(): void
    {
        $settings = $this->get();

        printf(
            '<label><input type="checkbox" name="%1$s[debug_mode]" value="1" %2$s /> %3$s</label>',
            esc_attr(self::OPTION_NAME),
            checked(true, (bool) $settings['debug_mode'], false),
            esc_html__('Enable debug output for adapter diagnostics.', 'creationflow-woocommerce')
        );
    }

    /**
     * @return array{api_url: string, api_token: string, debug_mode: bool, connection_status: string, last_connection_check: string, plugin_version: string}
     */
    private function defaults(): array
    {
        return [
            'api_url'              => '',
            'api_token'            => '',
            'debug_mode'           => false,
            'connection_status'    => 'unknown',
            'last_connection_check' => '',
            'plugin_version'       => CREATIONFLOW_WOOCOMMERCE_VERSION,
        ];
    }

    public function install_defaults(): void
    {
        $existing = get_option(self::OPTION_NAME);

        if ($existing === false) {
            add_option(self::OPTION_NAME, $this->defaults());
            return;
        }

        $merged = array_merge($this->defaults(), is_array($existing) ? $existing : []);
        $merged['plugin_version'] = CREATIONFLOW_WOOCOMMERCE_VERSION;

        update_option(self::OPTION_NAME, $merged);
    }

    public function update_connection_status(string $status, string $timestamp): void
    {
        $current = $this->get();
        $current['connection_status']     = $status;
        $current['last_connection_check'] = $timestamp;

        update_option(self::OPTION_NAME, $current);
    }
}
