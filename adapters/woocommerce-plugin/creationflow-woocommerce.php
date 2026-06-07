<?php
/**
 * Plugin Name: CreationFlow WooCommerce
 * Description: WooCommerce adapter for connecting a shop to a self-hosted CreationFlow server.
 * Version: 0.1.0
 * Requires PHP: 8.1
 * Requires at least: 6.0
 * WC requires at least: 7.0
 * Author: CreationFlow
 * License: GPL-2.0-or-later
 * Text Domain: creationflow-woocommerce
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

define('CREATIONFLOW_WOOCOMMERCE_VERSION', '0.1.0');
define('CREATIONFLOW_WOOCOMMERCE_FILE', __FILE__);
define('CREATIONFLOW_WOOCOMMERCE_PATH', plugin_dir_path(__FILE__));
define('CREATIONFLOW_WOOCOMMERCE_URL', plugin_dir_url(__FILE__));
define('CREATIONFLOW_WOOCOMMERCE_MIN_PHP', '8.1');
define('CREATIONFLOW_WOOCOMMERCE_MIN_WP', '6.0');
define('CREATIONFLOW_WOOCOMMERCE_MIN_WC', '7.0');

require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/Requirements.php';
require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/Settings.php';
require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/WooCommerce.php';
require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/ApiClient.php';
require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/ProductMapping.php';
require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/EditorEmbed.php';
require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/CartMeta.php';
require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/Admin.php';
require_once CREATIONFLOW_WOOCOMMERCE_PATH . 'includes/Plugin.php';

if (! CreationFlow\WooCommerce\Requirements::is_satisfied()) {
    add_action(
        'admin_notices',
        [CreationFlow\WooCommerce\Requirements::class, 'render_admin_notice']
    );

    return;
}

register_activation_hook(__FILE__, [CreationFlow\WooCommerce\Plugin::class, 'on_activate']);
register_deactivation_hook(__FILE__, [CreationFlow\WooCommerce\Plugin::class, 'on_deactivate']);

add_action(
    'plugins_loaded',
    static function (): void {
        (new CreationFlow\WooCommerce\Plugin())->register();
    }
);
