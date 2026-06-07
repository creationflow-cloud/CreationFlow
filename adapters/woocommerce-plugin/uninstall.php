<?php
/**
 * Removes plugin options when the plugin is uninstalled.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

if (! defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

delete_option('creationflow_woocommerce_settings');
