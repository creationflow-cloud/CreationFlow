# Roadmap

Prioritized tasks for CreationFlow development. Items below are derived from
`docs/STATUS.md` and the existing ticket backlog in OpenProject (project
`creationflow`).

## Phase 1: Editor Polish

**Goal:** bring the 2D editor to feature parity with the document model.

- [ ] **Resize handles on canvas** — drag-to-resize handles, replace property-panel scale ([#152](https://openproject.example/work_packages/152))
- [ ] **Multi-select** — select and manipulate multiple elements
- [ ] **Keyboard shortcuts** — delete, duplicate, undo/redo via keyboard
- [ ] **Zoom and pan** — canvas zoom and pan controls
- [ ] **Alignment guides** — snap-to-grid and alignment guides
- [ ] **Inline text editing** — edit text directly on canvas
- [ ] **Image cropping** — crop images within element bounds
- [ ] **Element grouping UI** — create and manage element groups

## Phase 2: Print-Ready Output

**Goal:** Production-quality PDFs with print settings.

- [ ] **Bleed and safe area** — handle print area margins in PDF output
- [ ] **DPI configuration** — configurable resolution for print-quality output
- [ ] **CMYK color support** — convert RGB to CMYK for print output
- [ ] **Font embedding** — embed fonts in PDF for consistent output
- [ ] **Preflight warnings** — validate image resolution, font availability, bleed violations

## Phase 3: WooCommerce Integration

**Goal:** Connect CreationFlow to WooCommerce for order-driven rendering.

- [ ] **API connection** — configure CreationFlow API URL and token in WordPress
- [ ] **Product mapping** — link WooCommerce products to CreationFlow templates
- [ ] **Editor embedding** — iframe or headless integration on product page
- [ ] **Cart/Order meta** — store configuration ID in WooCommerce cart and order
- [ ] **RenderJob on order** — trigger render job when WooCommerce order is placed
- [ ] **PDF delivery** — attach rendered PDF to WooCommerce order for production
- [ ] **Adapter tests** — unit/integration tests for the automation flow (P2-001, #192)

## Phase 4: Observability

**Goal:** structured logging and metrics for production use.

- [ ] **Logging enrichment** — request id, workspace id, role in every log line
- [ ] **Prometheus metrics endpoint** — `/metrics` on the API
- [ ] **Request tracing** — span across API → worker → PDF engine
- [ ] **Dashboard** — Grafana panels for queue depth, render time, error rate
- Tracked in: P2-002 / #193.

## Phase 5: CI/CD Hardening

**Goal:** fast, reliable CI.

- [ ] **Workflow simplification** — collapse the six current jobs (install, lint, typecheck, test, build, docker) into a leaner pipeline (P1-008, #191)
- [ ] **Cache coverage** — ensure pnpm, Prisma, and Docker Buildx caches all use `gha`
- [ ] **Branch protection** — require `typecheck` and `test` for merges to `main`

## Already shipped (see `docs/STATUS.md` for code references)

- Monorepo / pnpm / TS strict / ESLint + Prettier
- Fastify API with full CRUD, OpenAPI/Swagger, health checks, demo seeding
- API-key + role-based auth with workspace isolation
- Admin UI: products, templates, configurations, surfaces, SVG import
- Editor UI: elements, move/scale, undo/redo, save, render, download, rules panel
- Schema + Core: typed branded IDs, document model, operations
- Prisma database with migrations
- PDF Engine: render plan + pdfkit-based PDF (text, shape, image, group, surfaces)
- Storage: FileSystem + Memory providers
- Asset safety: SVG sanitization + PDF magic-byte validation
- Worker integration tests with API key propagation
- Renderer plan-builder + status helpers with tests
- UI package: format, timing, event utilities
- CI: install, lint, typecheck, test (with PG/Redis services), build, docker build
