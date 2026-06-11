<?php
/**
 * PHPUnit bootstrap for the CreationFlow WooCommerce adapter.
 *
 * Loads the plugin's include files and the Brain Monkey + WP function stubs
 * that the test cases rely on. The bootstrap keeps the plugin's ABSPATH
 * guard happy so the includes can be loaded outside WordPress.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

if (! defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}

if (! defined('CREATIONFLOW_WOOCOMMERCE_FILE')) {
    define('CREATIONFLOW_WOOCOMMERCE_FILE', __DIR__ . '/../creationflow-woocommerce.php');
}

if (! defined('CREATIONFLOW_WOOCOMMERCE_VERSION')) {
    define('CREATIONFLOW_WOOCOMMERCE_VERSION', '0.1.0-test');
}

if (! defined('CREATIONFLOW_WOOCOMMERCE_PATH')) {
    define('CREATIONFLOW_WOOCOMMERCE_PATH', __DIR__ . '/../');
}

if (! defined('CREATIONFLOW_WOOCOMMERCE_URL')) {
    define('CREATIONFLOW_WOOCOMMERCE_URL', 'https://example.test/wp-content/plugins/creationflow-woocommerce/');
}

if (! defined('CREATIONFLOW_WOOCOMMERCE_MIN_PHP')) {
    define('CREATIONFLOW_WOOCOMMERCE_MIN_PHP', '8.1');
}

if (! defined('CREATIONFLOW_WOOCOMMERCE_MIN_WP')) {
    define('CREATIONFLOW_WOOCOMMERCE_MIN_WP', '6.0');
}

if (! defined('CREATIONFLOW_WOOCOMMERCE_MIN_WC')) {
    define('CREATIONFLOW_WOOCOMMERCE_MIN_WC', '7.0');
}

if (! defined('MINUTE_IN_SECONDS')) {
    define('MINUTE_IN_SECONDS', 60);
}

$autoload = __DIR__ . '/../vendor/autoload.php';
if (file_exists($autoload)) {
    require_once $autoload;
}

require_once __DIR__ . '/Stubs/wordpress.php';

if (function_exists('tests_stub_wordpress')) {
    tests_stub_wordpress();
}

require_once __DIR__ . '/../includes/Requirements.php';
require_once __DIR__ . '/../includes/Settings.php';
require_once __DIR__ . '/../includes/ApiClient.php';
require_once __DIR__ . '/../includes/ProductMapping.php';
require_once __DIR__ . '/../includes/EditorEmbed.php';
require_once __DIR__ . '/../includes/CartMeta.php';
require_once __DIR__ . '/../includes/RenderOrderListener.php';
require_once __DIR__ . '/../includes/OrderPdfAttacher.php';

if (class_exists('\\Brain\\Monkey')) {
    \Brain\Monkey\setUp();
}
