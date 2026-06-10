# WordPress / WooCommerce Adapter

Technical specification for the WooCommerce integration plugin.

## Overview

The WooCommerce adapter is a WordPress plugin that connects a WooCommerce shop to a CreationFlow server. It enables product personalization through the CreationFlow editor and automates print-ready PDF generation after order placement.

**License:** GPL-2.0-or-later (compatible with WordPress plugin ecosystem)

**Location:** `adapters/woocommerce-plugin/`

## Architecture

```
WooCommerce Shop                    CreationFlow Server
┌─────────────────────┐             ┌─────────────────────┐
│ WordPress Plugin    │             │ Fastify API         │
│                     │◄───────────►│                     │
│ - Settings Page     │  REST API   │ - Template CRUD     │
│ - Product Meta      │             │ - Configuration CRUD│
│ - Cart/Order Hooks  │             │ - RenderJob CRUD    │
│ - Editor iframe     │             │ - Asset Upload      │
│ - Order Processing  │             │ - PDF Output        │
└─────────────────────┘             └─────────────────────┘
```

## Plugin Structure

```
adapters/woocommerce-plugin/
├── creationflow-woocommerce.php    # Main plugin file
├── includes/
│   ├── class-settings.php          # Admin settings page
│   ├── class-product-meta.php      # Product template mapping
│   ├── class-cart-handler.php      # Cart item meta handling
│   ├── class-order-handler.php     # Order processing and render jobs
│   ├── class-api-client.php        # CreationFlow API client
│   └── class-editor-embed.php      # Editor iframe/embed logic
├── assets/
│   ├── css/admin.css               # Admin styles
│   └── js/product-page.js          # Frontend editor integration
└── templates/
    └── editor-iframe.php           # Editor embed template
```

## Settings Page

Located in WordPress Admin → WooCommerce → CreationFlow.

| Setting     | Type     | Description                                                                     |
| ----------- | -------- | ------------------------------------------------------------------------------- |
| API URL     | text     | Base URL of the CreationFlow API (e.g., `https://api.creationflow.example.com`) |
| API Token   | text     | Authentication token for API access                                             |
| Debug Mode  | checkbox | Enable verbose logging for troubleshooting                                      |
| Editor Mode | select   | `iframe` (embedded) or `link` (redirect to editor)                              |
| Auto Render | checkbox | Automatically create render job on order completion                             |

## API Client

The plugin communicates with the CreationFlow API via a PHP client class.

### Required API Endpoints

| Method | Endpoint                      | Purpose                          |
| ------ | ----------------------------- | -------------------------------- |
| `GET`  | `/workspaces`                 | List available workspaces        |
| `GET`  | `/products`                   | List products for mapping        |
| `GET`  | `/product-templates`          | List templates for mapping       |
| `POST` | `/configurations`             | Create a new configuration       |
| `PUT`  | `/configurations/:id`         | Update an existing configuration |
| `POST` | `/render-jobs`                | Create a render job              |
| `GET`  | `/render-jobs/:id`            | Check render job status          |
| `GET`  | `/render-jobs/:id/output/pdf` | Download rendered PDF            |
| `POST` | `/assets/upload`              | Upload asset files               |

### API Client Methods

```php
class CreationFlow_API_Client {
    public function __construct( string $base_url, string $api_token );
    public function list_templates( string $workspace_id ): array;
    public function create_configuration( array $data ): array;
    public function update_configuration( string $id, array $data ): array;
    public function create_render_job( string $configuration_id ): array;
    public function get_render_job_status( string $job_id ): string;
    public function download_pdf( string $job_id ): string; // returns file path
    public function upload_asset( string $file_path ): array;
}
```

## Product Mapping

### WooCommerce Product Meta

Each WooCommerce product can be linked to a CreationFlow template.

| Meta Key                     | Type   | Description                           |
| ---------------------------- | ------ | ------------------------------------- |
| `_creationflow_enabled`      | bool   | Enable CreationFlow for this product  |
| `_creationflow_workspace_id` | string | Workspace ID                          |
| `_creationflow_template_id`  | string | Template ID in CreationFlow           |
| `_creationflow_product_id`   | string | Product ID in CreationFlow (optional) |

### Admin UI for Product Mapping

On the WooCommerce product edit page (simple/variable products):

- Checkbox: "Enable CreationFlow customization"
- Dropdown: Select workspace (fetched from API)
- Dropdown: Select template (fetched from API based on workspace)
- Optional: Map WooCommerce variations to CreationFlow template options

## Frontend Integration

### Editor Embedding

Two modes supported:

#### Mode 1: iframe (Recommended for MVP)

```html
<iframe
  src="https://editor.creationflow.example.com/?templateId={template_id}&woocommerce=true"
  width="100%"
  height="800"
  frameborder="0"
></iframe>
```

- Embedded directly on the WooCommerce product page
- Editor communicates with CreationFlow API directly
- Configuration ID returned to parent page via `postMessage`

#### Mode 2: Link/Redirect

- "Customize this product" button links to external editor
- User returns to shop after saving configuration
- Configuration ID passed via URL parameter or session

### Data Flow: Frontend

```
1. Customer visits WooCommerce product page
2. Sees "Customize" button or embedded editor
3. Editor loads template from CreationFlow API
4. Customer personalizes the product
5. Configuration is saved to CreationFlow API
6. Configuration ID is stored in:
   - localStorage (iframe mode)
   - WooCommerce session (redirect mode)
7. Customer adds product to cart
8. Configuration ID is attached to cart item as meta
```

## Cart Handler

### Cart Item Meta

When a CreationFlow-enabled product is added to cart:

```php
// Hook: woocommerce_add_cart_item_data
add_filter( 'woocommerce_add_cart_item_data', function( $cart_item_data, $product_id ) {
    if ( get_post_meta( $product_id, '_creationflow_enabled', true ) ) {
        $cart_item_data['creationflow_configuration_id'] = $_POST['cf_configuration_id'] ?? '';
    }
    return $cart_item_data;
}, 10, 2 );
```

### Cart Display

Show configuration preview in cart:

- Thumbnail/preview image from CreationFlow
- Link to view configuration in editor
- "Edit customization" button

## Order Handler

### Order Item Meta

Store configuration ID in order:

```php
// Hook: woocommerce_checkout_create_order_line_item
add_action( 'woocommerce_checkout_create_order_line_item', function( $item, $cart_item_key, $values, $order ) {
    if ( ! empty( $values['creationflow_configuration_id'] ) ) {
        $item->add_meta_data( '_creationflow_configuration_id', $values['creationflow_configuration_id'] );
    }
}, 10, 4 );
```

### Render Job Creation

After order is placed (payment confirmed):

```php
// Hook: woocommerce_order_status_processing (or completed)
add_action( 'woocommerce_order_status_processing', function( $order_id ) {
    $order = wc_get_order( $order_id );

    foreach ( $order->get_items() as $item ) {
        $config_id = $item->get_meta( '_creationflow_configuration_id' );

        if ( $config_id ) {
            // Create render job via API
            $api_client = new CreationFlow_API_Client( ... );
            $render_job = $api_client->create_render_job( $config_id );

            // Store render job ID in order item meta
            $item->add_meta_data( '_creationflow_render_job_id', $render_job['id'] );
            $item->save();
        }
    }
});
```

### Render Job Status Check

Background task to check render job status:

```php
// Hook: wp_cron or custom queue
add_action( 'creationflow_check_render_jobs', function() {
    $api_client = new CreationFlow_API_Client( ... );

    // Get orders with pending render jobs
    $orders = get_orders_with_pending_render_jobs();

    foreach ( $orders as $order ) {
        foreach ( $order->get_items() as $item ) {
            $job_id = $item->get_meta( '_creationflow_render_job_id' );
            $status = $api_client->get_render_job_status( $job_id );

            if ( $status === 'done' ) {
                // Download PDF and attach to order
                $pdf_path = $api_client->download_pdf( $job_id );
                attach_pdf_to_order( $order->get_id(), $pdf_path );

                $item->update_meta_data( '_creationflow_render_job_status', 'done' );
                $item->save();
            }
        }
    }
});
```

## Admin Order View

In WooCommerce admin order detail:

- Show configuration ID with link to CreationFlow editor
- Show render job status (pending/processing/done/failed)
- Download link for rendered PDF
- Manual "Re-render" button

## WooCommerce Variation Mapping

For variable products, map variations to template options:

| WooCommerce Variation | CreationFlow Template Option |
| --------------------- | ---------------------------- |
| Size: S/M/L/XL        | Template variant selection   |
| Color: Red/Blue/Black | Surface color region         |
| Material: Cotton/Poly | Template material preset     |

### Implementation

```php
// Map variation attributes to template configuration
add_filter( 'woocommerce_add_cart_item_data', function( $cart_item_data, $product_id, $variation_id ) {
    $variation = wc_get_product( $variation_id );

    if ( get_post_meta( $product_id, '_creationflow_enabled', true ) ) {
        $cart_item_data['creationflow_variation_attributes'] = $variation->get_attributes();
    }

    return $cart_item_data;
}, 10, 3 );
```

## Security Considerations

- **API Token:** Store encrypted in WordPress options table
- **Configuration ID:** Validate on cart/order to prevent injection
- **iframe Security:** Use `X-Frame-Options` and CSP headers appropriately
- **Data Validation:** Sanitize all inputs from editor/frontend
- **Rate Limiting:** Respect CreationFlow API rate limits

## Error Handling

| Scenario           | Behavior                                     |
| ------------------ | -------------------------------------------- |
| API unreachable    | Show error message, disable customization    |
| Template not found | Log error, fallback to standard product      |
| Render job failed  | Notify admin, allow manual retry             |
| Configuration lost | Show warning in cart, allow re-customization |

## Testing

- [ ] Test API connection with valid/invalid credentials
- [ ] Test product mapping with simple products
- [ ] Test product mapping with variable products
- [ ] Test iframe editor embedding
- [ ] Test cart item meta persistence
- [ ] Test order item meta creation
- [ ] Test render job creation on order completion
- [ ] Test PDF download and order attachment
- [ ] Test error scenarios (API down, invalid template, etc.)
