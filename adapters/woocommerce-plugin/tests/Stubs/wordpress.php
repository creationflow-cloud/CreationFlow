<?php
/**
 * Minimal WordPress and WooCommerce function stubs for unit tests.
 *
 * The functions here only return deterministic defaults. Test cases that
 * need behaviour override these symbols with closures via Brain Monkey's
 * `Functions\when()` or by re-declaring in a test's `setUp` method.
 *
 * @package CreationFlow\WooCommerce
 */

declare(strict_types=1);

if (! function_exists('tests_stub_wordpress')) {
    function tests_stub_wordpress(): void
    {
        if (function_exists('tests_stub_wordpress') && tests_stub_wordpress_is_loaded()) {
            return;
        }

        tests_stub_wordpress_mark_loaded();

        if (! function_exists('__')) {
            function __(string $text, string $domain = ''): string {
                return $text;
            }
        }

        if (! function_exists('esc_html__')) {
            function esc_html__(string $text, string $domain = ''): string {
                return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
            }
        }

        if (! function_exists('esc_attr__')) {
            function esc_attr__(string $text, string $domain = ''): string {
                return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
            }
        }

        if (! function_exists('esc_html')) {
            function esc_html(string $text): string {
                return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
            }
        }

        if (! function_exists('esc_attr')) {
            function esc_attr(string $text): string {
                return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
            }
        }

        if (! function_exists('esc_url')) {
            function esc_url(string $url): string {
                return filter_var($url, FILTER_SANITIZE_URL) ?: '';
            }
        }

        if (! function_exists('esc_url_raw')) {
            function esc_url_raw(string $url): string {
                return filter_var($url, FILTER_SANITIZE_URL) ?: '';
            }
        }

        if (! function_exists('sanitize_text_field')) {
            function sanitize_text_field(string $text): string {
                $text = strip_tags($text);
                $text = preg_replace('/[\r\n\t\0\x0B]/', '', $text) ?? '';
                return trim($text);
            }
        }

        if (! function_exists('wp_unslash')) {
            function wp_unslash($value) {
                if (is_array($value)) {
                    return array_map('wp_unslash', $value);
                }
                if (is_string($value)) {
                    return stripslashes($value);
                }
                return $value;
            }
        }

        if (! function_exists('wp_json_encode')) {
            function wp_json_encode($data, int $options = 0, int $depth = 512): string {
                return (string) json_encode($data, $options, $depth);
            }
        }

        if (! function_exists('checked')) {
            function checked($checked, $current = true, bool $echo = true) {
                $result = ((string) $checked === (string) $current) ? ' checked="checked"' : '';
                if ($echo) {
                    echo $result;
                }
                return $result;
            }
        }

        if (! function_exists('add_action')) {
            function add_action(string $hook, $callback, int $priority = 10, int $accepted_args = 1): bool {
                \Brain\Monkey\Actions\expectAdded($hook);
                return true;
            }
        }

        if (! function_exists('add_filter')) {
            function add_filter(string $hook, $callback, int $priority = 10, int $accepted_args = 1): bool {
                \Brain\Monkey\Filters\expectAdded($hook);
                return true;
            }
        }

        if (! function_exists('get_transient')) {
            function get_transient(string $key) {
                return \Brain\Monkey\Functions\stubs() ? false : false;
            }
        }

        if (! function_exists('set_transient')) {
            function set_transient(string $key, $value, int $expiration = 0): bool {
                return true;
            }
        }

        if (! function_exists('get_option')) {
            function get_option(string $option, $default = false) {
                return $default;
            }
        }

        if (! function_exists('update_option')) {
            function update_option(string $option, $value, bool $autoload = true): bool {
                return true;
            }
        }

        if (! function_exists('add_option')) {
            function add_option(string $option, $value, string $deprecated = '', string $autoload = 'yes'): bool {
                return true;
            }
        }

        if (! function_exists('delete_post_meta')) {
            function delete_post_meta(int $post_id, string $key, $meta_value = ''): bool {
                return true;
            }
        }

        if (! function_exists('update_post_meta')) {
            function update_post_meta(int $post_id, string $key, $meta_value, $prev_value = ''): int|bool {
                return 1;
            }
        }

        if (! function_exists('get_post_meta')) {
            function get_post_meta(int $post_id, string $key, bool $single = false) {
                return '';
            }
        }

        if (! function_exists('current_time')) {
            function current_time(string $type = 'mysql', bool $gmt = false): string {
                return gmdate('Y-m-d H:i:s');
            }
        }

        if (! function_exists('home_url')) {
            function home_url(string $path = '', string $scheme = null): string {
                return 'https://shop.example.test' . $path;
            }
        }

        if (! function_exists('admin_url')) {
            function admin_url(string $path = '', string $scheme = 'admin'): string {
                return 'https://shop.example.test/wp-admin/' . ltrim($path, '/');
            }
        }

        if (! function_exists('add_query_arg')) {
            function add_query_arg(array $args, string $url): string {
                return $url . (str_contains($url, '?') ? '&' : '?') . http_build_query($args);
            }
        }

        if (! function_exists('is_admin')) {
            function is_admin(): bool {
                return false;
            }
        }

        if (! function_exists('is_product')) {
            function is_product(): bool {
                return false;
            }
        }

        if (! function_exists('get_product')) {
            function get_product($the_product = false) {
                return false;
            }
        }

        if (! function_exists('get_the_ID')) {
            function get_the_ID(): int {
                return 0;
            }
        }

        if (! function_exists('wp_rand')) {
            function wp_rand(int $min = 0, int $max = 0): int {
                return random_int($min, max($min, $max));
            }
        }

        if (! function_exists('wp_mkdir_p')) {
            function wp_mkdir_p(string $target): bool {
                if (is_dir($target)) {
                    return true;
                }
                return @mkdir($target, 0775, true) || is_dir($target);
            }
        }

        if (! function_exists('wp_upload_dir')) {
            function wp_upload_dir() {
                $base = sys_get_temp_dir() . '/creationflow-uploads';
                return [
                    'path'    => $base,
                    'url'     => 'https://shop.example.test/wp-content/uploads',
                    'subdir'  => '',
                    'basedir' => $base,
                    'baseurl' => 'https://shop.example.test/wp-content/uploads',
                    'error'   => false,
                ];
            }
        }

        if (! function_exists('trailingslashit')) {
            function trailingslashit(string $value): string {
                return rtrim($value, '/\\') . '/';
            }
        }

        if (! function_exists('wp_send_json')) {
            function wp_send_json($response, int $status_code = null): void {
                echo json_encode($response);
            }
        }

        if (! function_exists('wp_send_json_error')) {
            function wp_send_json_error($data = null, int $status_code = null): void {
                $payload = ['success' => false];
                if (null !== $data) {
                    $payload['data'] = $data;
                }
                echo json_encode($payload);
            }
        }

        if (! function_exists('current_user_can')) {
            function current_user_can(string $capability, ...$args): bool {
                return true;
            }
        }

        if (! function_exists('check_ajax_referer')) {
            function check_ajax_referer(string $action, string $query_arg = false, bool $die = true) {
                return 1;
            }
        }

        if (! function_exists('register_setting')) {
            function register_setting(string $option_group, string $option_name, array $args = []): void {}
        }

        if (! function_exists('add_settings_section')) {
            function add_settings_section(string $id, string $title, $callback, string $page): void {}
        }

        if (! function_exists('add_settings_field')) {
            function add_settings_field(string $id, string $title, $callback, string $page, string $section, array $args = []): void {}
        }

        if (! function_exists('register_activation_hook')) {
            function register_activation_hook(string $file, $callback): void {}
        }

        if (! function_exists('register_deactivation_hook')) {
            function register_deactivation_hook(string $file, $callback): void {}
        }

        if (! function_exists('deactivate_plugins')) {
            function deactivate_plugins(array|string $plugins, bool $silent = false, bool $network_wide = false): void {}
        }

        if (! function_exists('wp_die')) {
            function wp_die($message = '', $title = '', array $args = []): void {
                throw new \RuntimeException((string) $message);
            }
        }

        if (! function_exists('flush_rewrite_rules')) {
            function flush_rewrite_rules(bool $hard = true): void {}
        }

        if (! class_exists('WP_Error')) {
            class WP_Error
            {
                public function __construct(private string $code = '', private string $message = '', private array $data = []) {}

                public function get_error_code(): string { return $this->code; }
                public function get_error_message(): string { return $this->message; }
                public function get_error_data(): array { return $this->data; }
            }
        }

        if (! function_exists('is_wp_error')) {
            function is_wp_error($thing): bool {
                return $thing instanceof WP_Error;
            }
        }

        if (! function_exists('wp_remote_request')) {
            function wp_remote_request(string $url, array $args = []) {
                return ['response' => ['code' => 0], 'body' => ''];
            }
        }

        if (! function_exists('wp_remote_get')) {
            function wp_remote_get(string $url, array $args = []) {
                return ['response' => ['code' => 0], 'body' => ''];
            }
        }

        if (! function_exists('wp_remote_retrieve_response_code')) {
            function wp_remote_retrieve_response_code($response): int {
                if (is_array($response) && isset($response['response']['code'])) {
                    return (int) $response['response']['code'];
                }
                return 0;
            }
        }

        if (! function_exists('wp_remote_retrieve_body')) {
            function wp_remote_retrieve_body($response): string {
                if (is_array($response) && isset($response['body'])) {
                    return (string) $response['body'];
                }
                return '';
            }
        }

        if (! class_exists('WC_Product')) {
            class WC_Product {
                public function get_id(): int { return 0; }
                public function get_name(): string { return ''; }
            }
        }

        if (! class_exists('WC_Order')) {
            class WC_Order {
                public function get_id(): int { return 0; }
                public function get_items(): iterable { return []; }
                public function update_meta_data(string $key, $value): void {}
                public function delete_meta_data(string $key): void {}
                public function save(): void {}
                public function get_meta(string $key, bool $single = false, string $context = '') {
                    return '';
                }
            }
        }

        if (! class_exists('WC_Order_Item_Product')) {
            class WC_Order_Item_Product extends WC_Order {
                public function get_id(): int { return 0; }
                public function get_product_id(): int { return 0; }
                public function get_name(): string { return ''; }
                public function update_meta_data(string $key, $value): void {}
                public function save(): void {}
                public function get_meta(string $key, bool $single = false, string $context = '') {
                    return '';
                }
            }
        }

        if (! function_exists('wc_get_order')) {
            function wc_get_order($the_order = false) {
                return false;
            }
        }

        if (! function_exists('wc_add_notice')) {
            function wc_add_notice(string $message, string $notice_type = 'success', array $data = []): void {}
        }
    }
}

if (! function_exists('tests_stub_wordpress_is_loaded')) {
    function tests_stub_wordpress_is_loaded(): bool {
        return defined('CREATIONFLOW_TESTS_STUB_LOADED');
    }
}

if (! function_exists('tests_stub_wordpress_mark_loaded')) {
    function tests_stub_wordpress_mark_loaded(): void {
        if (! defined('CREATIONFLOW_TESTS_STUB_LOADED')) {
            define('CREATIONFLOW_TESTS_STUB_LOADED', true);
        }
    }
}
