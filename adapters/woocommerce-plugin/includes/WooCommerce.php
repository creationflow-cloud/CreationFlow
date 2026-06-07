<?php
/**
 * WooCommerce integration guard.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class WooCommerce
{
    public function is_active(): bool
    {
        return class_exists('WooCommerce') && defined('WC_VERSION');
    }

    public function version(): string
    {
        return defined('WC_VERSION') ? (string) WC_VERSION : '';
    }

    public function register_admin_notice(): void
    {
        add_action('admin_notices', [$this, 'render_admin_notice']);
    }

    public function render_admin_notice(): void
    {
        if ($this->is_active()) {
            return;
        }

        echo '<div class="notice notice-warning"><p>';
        echo esc_html__('CreationFlow WooCommerce is active, but WooCommerce is not detected. The adapter will remain inactive until WooCommerce is available.', 'creationflow-woocommerce');
        echo '</p></div>';
    }
}
