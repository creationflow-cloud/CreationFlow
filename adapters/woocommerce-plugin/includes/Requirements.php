<?php
/**
 * Plugin runtime requirements check.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class Requirements
{
    /**
     * @return array<string, string>
     */
    public static function missing(): array
    {
        $missing = [];

        if (version_compare(PHP_VERSION, CREATIONFLOW_WOOCOMMERCE_MIN_PHP, '<')) {
            $missing['php'] = sprintf(
                /* translators: %1$s current PHP version, %2$s required version. */
                __('PHP %1$s is required (you are running %2$s).', 'creationflow-woocommerce'),
                CREATIONFLOW_WOOCOMMERCE_MIN_PHP,
                PHP_VERSION
            );
        }

        global $wp_version;
        if (! isset($wp_version) || version_compare($wp_version, CREATIONFLOW_WOOCOMMERCE_MIN_WP, '<')) {
            $missing['wp'] = sprintf(
                /* translators: %1$s current WordPress version, %2$s required version. */
                __('WordPress %1$s is required (you are running %2$s).', 'creationflow-woocommerce'),
                CREATIONFLOW_WOOCOMMERCE_MIN_WP,
                isset($wp_version) ? $wp_version : 'unknown'
            );
        }

        if (! class_exists('WooCommerce') || defined('WC_VERSION') === false) {
            $missing['wc'] = __('WooCommerce must be installed and active.', 'creationflow-woocommerce');
        } else {
            if (version_compare((string) WC_VERSION, CREATIONFLOW_WOOCOMMERCE_MIN_WC, '<')) {
                $missing['wc'] = sprintf(
                    /* translators: %1$s current WooCommerce version, %2$s required version. */
                    __('WooCommerce %1$s is required (you are running %2$s).', 'creationflow-woocommerce'),
                    CREATIONFLOW_WOOCOMMERCE_MIN_WC,
                    (string) WC_VERSION
                );
            }
        }

        return $missing;
    }

    public static function is_satisfied(): bool
    {
        return self::missing() === [];
    }

    public static function render_admin_notice(): void
    {
        if (self::is_satisfied()) {
            return;
        }

        echo '<div class="notice notice-error"><p>';
        echo '<strong>' . esc_html__('CreationFlow WooCommerce could not be activated.', 'creationflow-woocommerce') . '</strong></p>';
        echo '<ul style="list-style: disc; padding-left: 1.5em;">';
        foreach (self::missing() as $message) {
            echo '<li>' . esc_html($message) . '</li>';
        }
        echo '</ul></div>';
    }
}
