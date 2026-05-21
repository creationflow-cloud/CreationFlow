<?php
/**
 * Plugin Name: CreationFlow WooCommerce
 * Description: WooCommerce adapter skeleton for connecting a shop to a self-hosted CreationFlow server.
 * Version: 0.0.0
 * Requires PHP: 8.1
 * Author: CreationFlow
 * Text Domain: creationflow-woocommerce
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

define('CREATIONFLOW_WOOCOMMERCE_VERSION', '0.0.0');
define('CREATIONFLOW_WOOCOMMERCE_FILE', __FILE__);
define('CREATIONFLOW_WOOCOMMERCE_PATH', plugin_dir_path(__FILE__));
define('CREATIONFLOW_WOOCOMMERCE_URL', plugin_dir_url(__FILE__));

require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/Settings.php';
require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/WooCommerce.php';
require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/Admin.php';
require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/Plugin.php';

add_action(
    'plugins_loaded',
    static function (): void {
        (new CreationFlow\WooCommerce\Plugin())->register();
    }
);
