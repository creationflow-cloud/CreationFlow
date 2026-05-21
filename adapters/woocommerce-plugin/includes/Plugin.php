<?php
/**
 * Main plugin bootstrap.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

namespace CreationFlow\WooCommerce;

if (! defined('ABSPATH')) {
    exit;
}

final class Plugin
{
    private Settings $settings;

    private WooCommerce $woocommerce;

    private Admin $admin;

    public function __construct()
    {
        $this->settings    = new Settings();
        $this->woocommerce = new WooCommerce();
        $this->admin       = new Admin($this->settings, $this->woocommerce);
    }

    public function register(): void
    {
        if (is_admin()) {
            $this->settings->register();
            $this->admin->register();
            $this->woocommerce->register_admin_notice();
        }
    }
}
