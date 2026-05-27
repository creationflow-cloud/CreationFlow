# Roadmap

Prioritized tasks for CreationFlow development.

## Phase 1: Complete MVP Rendering

**Goal:** End-to-end PDF generation from a saved configuration.

- [ ] **Text rendering in PDF Engine** — font loading, text layout, styling (font family, size, weight, color, alignment)
- [ ] **Image rendering in PDF Engine** — resolve asset IDs from storage, embed images with fit modes (contain/cover/fill)
- [ ] **Shape rendering in PDF Engine** — rectangles, ellipses, lines with fill and stroke
- [ ] **Group element rendering** — recursive rendering of grouped elements
- [ ] **Storage-to-PDF connection** — resolve asset IDs to file paths during rendering
- [ ] **Coordinate system validation** — ensure top-left Y to PDF bottom-left conversion is correct for all element types

## Phase 2: Print-Ready Output

**Goal:** Production-quality PDFs with print settings.

- [ ] **Bleed and safe area** — handle print area margins in PDF output
- [ ] **DPI configuration** — configurable resolution for print-quality output
- [ ] **CMYK color support** — convert RGB to CMYK for print output
- [ ] **Font embedding** — embed fonts in PDF for consistent output
- [ ] **Surface role handling** — path-based surfaces, color regions, overlays in PDF
- [ ] **Preflight warnings** — validate image resolution, font availability, bleed violations

## Phase 3: Background Processing

**Goal:** Move rendering out of the API request cycle.

- [ ] **Worker service with Redis queue** — implement background job processing
- [ ] **Render job state machine** — PENDING → PROCESSING → DONE/FAILED with proper transitions
- [ ] **PDF output storage** — save generated PDFs to storage provider, serve via API
- [ ] **Renderer service** — connect `apps/renderer` to the render job workflow
- [ ] **Error handling and retries** — failed render jobs with error messages and retry logic

## Phase 4: Rules Engine

**Goal:** Rule-based validation and conditional behavior.

- [ ] **Rules Engine MVP** — implement `evaluateRules()` with condition/action evaluation
- [ ] **Rule types** — visibility rules, mandatory field rules, value dependency rules
- [ ] **Integration into Editor** — validate configurations against rules on save
- [ ] **Integration into PDF Engine** — apply rules during rendering
- [ ] **Rule UI in Admin** — create and manage rules for templates

## Phase 5: Authentication & Access Control

**Goal:** Secure the API and UIs.

- [ ] **API authentication** — API key or JWT-based auth for all endpoints
- [ ] **Workspace scoping** — enforce workspace isolation on all queries
- [ ] **Admin UI login** — basic authentication for admin dashboard
- [ ] **Editor access control** — restrict configuration editing to authorized users
- [ ] **Role-based permissions** — admin, editor, viewer roles

## Phase 6: WooCommerce Integration

**Goal:** Connect CreationFlow to WooCommerce for order-driven rendering.

- [ ] **WordPress plugin structure** — PHP plugin with settings page
- [ ] **API connection** — configure CreationFlow API URL and token in WordPress
- [ ] **Product mapping** — link WooCommerce products to CreationFlow templates
- [ ] **Editor embedding** — iframe or headless integration on product page
- [ ] **Cart/Order meta** — store configuration ID in WooCommerce cart and order
- [ ] **RenderJob on order** — trigger render job when WooCommerce order is placed
- [ ] **PDF delivery** — attach rendered PDF to WooCommerce order for production

## Phase 7: Editor Enhancements

**Goal:** Professional editing experience.

- [ ] **Multi-select** — select and manipulate multiple elements
- [ ] **Keyboard shortcuts** — delete, duplicate, undo/redo via keyboard
- [ ] **Zoom and pan** — canvas zoom and pan controls
- [ ] **Alignment guides** — snap-to-grid and alignment guides
- [ ] **Inline text editing** — edit text directly on canvas
- [ ] **Image cropping** — crop images within element bounds
- [ ] **Variable element support** — dynamic values in elements
- [ ] **Element grouping UI** — create and manage element groups

## Phase 8: Admin UI Enhancements

**Goal:** Complete management interface.

- [ ] **Product editing** — edit product properties after creation
- [ ] **Template deletion** — delete templates with confirmation
- [ ] **Page deletion** — delete pages from templates
- [ ] **Surface reordering** — drag-and-drop surface ordering
- [ ] **Workspace switching** — UI to select workspace in admin
- [ ] **Element editing in admin** — edit template surface elements
- [ ] **Template preview** — improved preview of templates in admin

## Phase 9: Production Readiness

**Goal:** Deployable, stable system.

- [ ] **Production Docker images** — build and deploy production-ready images
- [ ] **Reverse proxy and SSL** — Nginx/Traefik configuration with HTTPS
- [ ] **Database migrations** — robust migration strategy for production
- [ ] **Logging and monitoring** — structured logging, error tracking
- [ ] **Test coverage** — unit and integration tests for critical paths
- [ ] **CI/CD pipeline** — automated testing and deployment
