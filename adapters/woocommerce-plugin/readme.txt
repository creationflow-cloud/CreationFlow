=== CreationFlow WooCommerce ===
Contributors: creationflow
Tags: woocommerce, product customization, print workflow
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 8.1
WC requires at least: 7.0
Stable tag: 0.1.0
License: AGPL-3.0-or-later
License URI: https://www.gnu.org/licenses/agpl-3.0.html

WooCommerce adapter for connecting a shop to a self-hosted CreationFlow server.

== Description ==

CreationFlow WooCommerce connects a self-hosted CreationFlow instance to a WooCommerce shop. It:

* Connects to the CreationFlow REST API over an API key.
* Maps each WooCommerce product (or variation) to a CreationFlow product template.
* Embeds the CreationFlow editor in the product page.
* Stores the customer-specific CreationFlow configuration ID in the cart and order.
* Provides a "Test connection" action in the WordPress admin.

== Installation ==

1. Upload the `creationflow-woocommerce` folder to `/wp-content/plugins/`.
2. Activate `CreationFlow WooCommerce` in WordPress.
3. Open Settings > CreationFlow and configure the API URL and API token.
4. Click "Test connection now" to verify the API key.
5. Edit a product and set the CreationFlow Template ID in the product data panel.
6. The editor is embedded automatically on the product page.

== Frequently Asked Questions ==

= Does this plugin connect to CreationFlow? =
Yes. It uses the API key configured under Settings > CreationFlow.

= Does this plugin require a license? =
No. The adapter is open source under AGPL-3.0-or-later.

= How are configurations tracked? =
The customer-specific configuration ID is stored in cart items and copied to order line item meta so it can be fetched again on order completion.

== Changelog ==

= 0.1.0 =
* Added activation/deactivation hooks, version checks, and requirements guard.
* Added "Test connection" action that hits `/version` and stores the result.
* Added ApiClient class that wraps `wp_remote_request` with API key auth.
* Added product meta field for mapping products to CreationFlow templates.
* Added editor iframe embed on product pages with responsive layout.
* Added cart/order meta for the customer-specific configuration ID.
* Added automatic render job creation on order status `processing` and `completed`.
* Added admin order action "Retry CreationFlow render" for manual re-enqueue.
* Added scheduled retry via Action Scheduler for transient render failures.
* Added "Recent Render Jobs" overview in the admin settings page.
* Added OrderPdfAttacher that downloads finished PDFs and stores them on the order.

= 0.0.0 =
* Initial installable WooCommerce adapter skeleton.
