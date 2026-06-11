# Current Development Status

This document tracks the implementation status of CreationFlow features. Each entry is anchored to the actual code (`path:line`) so the document stays honest.

## Done

### Infrastructure

- [x] Monorepo structure with pnpm workspaces (`pnpm-workspace.yaml:1-9`)
- [x] TypeScript strict mode across all packages (`tsconfig.base.json:1-25`)
- [x] ESLint flat config and Prettier configuration (`eslint.config.mjs:1-273`, `prettier.config.mjs:1-15`)
- [x] Docker Compose setup for local development (PostgreSQL, Redis) (`deploy/docker/docker-compose.yml:1-58`)
- [x] Production-grade Dockerfiles for all five services and reverse-proxy profile (`deploy/docker/{api,admin,editor,worker,renderer}.Dockerfile`, `deploy/docker/docker-compose.proxy.yml`)
- [x] Environment variable configuration with `.env.example` (`deploy/docker/.env.example`)

### API (`apps/api`)

- [x] Fastify server with CORS and multipart support (`apps/api/src/server.ts:1-260`)
- [x] OpenAPI/Swagger documentation at `/docs` and `/openapi.json` (`apps/api/src/server.ts:120-148`)
- [x] Prisma database integration with PostgreSQL (`apps/api/src/plugins/database.ts:1-69`)
- [x] Workspace CRUD with auth-scoped queries (`apps/api/src/routes/workspaces.ts:1-…`)
- [x] Product / ProductTemplate / Configuration / RenderJob / Asset CRUD with file upload/download
- [x] Render trigger route that uses the PDF engine end-to-end (`apps/api/src/routes/render-jobs.ts:1-…`)
- [x] Health check endpoints (`apps/api/src/routes/health.ts:1-…`)
- [x] Demo data seeding (`apps/api/src/seed.ts:1-…`)

### Auth, Roles, Workspace Isolation (`apps/api`)

- [x] API-key + Bearer auth via `X-API-Key`/`Authorization` header (`apps/api/src/plugins/auth.ts:80-101`)
- [x] Role model `admin` / `editor` / `viewer` with per-key role mapping (`apps/api/src/plugins/auth.ts:5-24, 252-274`)
- [x] Workspace-scope enforcement as global `preHandler` (`apps/api/src/plugins/auth.ts:201-222`)
- [x] Workspace-isolation tests for the auth plugin (`apps/api/src/plugins/auth.test.ts`)

### Admin UI (`apps/admin`)

- [x] React/Vite dashboard (`apps/admin/src/App.tsx:1-…`)
- [x] AuthGate with API-key login + `pingWithApiKey` validation (`apps/admin/src/AuthGate.tsx:1-58`)
- [x] Load workspace data (products, templates, configurations) (`apps/admin/src/workspace/`)
- [x] Create products, templates, configurations
- [x] Edit template pages and surfaces
- [x] Add/delete surfaces, surface properties (name, dimensions, shape, role, path, fill, clip)
- [x] SVG import workflow with sanitize-html sanitization (`apps/api/src/services/asset-upload.ts:1-…`)
- [x] Open configurations in the editor

### Editor UI (`apps/editor`)

- [x] React/Vite 2D editor (`apps/editor/src/App.tsx:1-…`)
- [x] AuthGate (mirrors admin) for editor login (`apps/editor/src/EditorAuthGate.tsx:1-…`)
- [x] Load templates/configurations via URL parameters
- [x] Canvas-based surface rendering (`apps/editor/src/components/SurfaceCanvas.tsx:1-…`)
- [x] Add text, shape, image elements (`apps/editor/src/components/ElementView.tsx`)
- [x] Move, scale, delete, duplicate, layer ordering
- [x] Undo/redo with history stack
- [x] Save configurations to API
- [x] Page/surface switching
- [x] Image upload via asset API
- [x] Create and trigger render jobs
- [x] Download rendered PDF output
- [x] Rules validation panel integrated in the right sidebar (`apps/editor/src/components/RightSidebar.tsx`, `apps/editor/src/components/RulesValidationPanel.tsx`)

### Schema & Core

- [x] Typed document model with branded IDs (`packages/schema/src/index.ts:1-…`)
- [x] Pages, surfaces, elements (text/image/shape/group/variable)
- [x] Surface shapes (rect/path) and roles (default/colorRegion/designRegion/overlay)
- [x] Variables and rules types
- [x] Document operations (create empty, create configuration from template)
- [x] Element operations (add, update)
- [x] Layer/zIndex operations

### Database

- [x] Prisma schema with all entities (`packages/database/prisma/schema.prisma:1-…`)
- [x] Workspace, Product, ProductTemplate, Configuration, RenderJob, Asset
- [x] Enums for configuration status, render job status, asset type
- [x] Migrations (`packages/database/prisma/migrations/`)

### PDF Engine (`packages/pdf-engine`)

- [x] Render plan generation (pages, surfaces, elements sorted by zIndex)
- [x] PDF generation with pdfkit (coordinate conversion, unit conversion, page creation)
- [x] Text, shape, image and group element rendering
- [x] Surface role handling (path surfaces, color regions, overlays)
- [x] Golden tests for the PDF output (95 tests, `packages/pdf-engine/src/__tests__/golden/`)

### Renderer (`apps/renderer`)

- [x] Standalone render-plan builder and render-job-status helpers (`apps/renderer/src/render-plan-builder.ts`, `apps/renderer/src/render-job-status.ts`)
- [x] Unit tests for both helpers (`apps/renderer/src/*.test.ts`)

### Worker (`apps/worker`)

- [x] Standalone worker entry with `RenderWorkerOptions.apiKey` (`apps/worker/src/jobs.ts`)
- [x] Integration tests for the render pipeline (`apps/worker/src/render-pipeline.test.ts`)
- [x] API key propagation: `performRenderRequest` sets `X-API-Key` header (`apps/worker/src/jobs.ts`)

### Importers

- [x] SVG parser (`packages/importers/src/svg/`)
- [x] SVG surface import with role mapping

### Storage

- [x] Storage provider interface
- [x] File system storage provider
- [x] Memory storage provider

### Rules Engine (`packages/rules-engine`)

- [x] `evaluateRules()` with condition/action evaluation (`packages/rules-engine/src/evaluateRules.ts:1-254`)
- [x] `RuleAction`, `RuleCondition`, mandatory-violation, warning and error result types
- [x] Editor integration: panel renders mandatory/warning issues, save/render behaviour documented

### UI Package (`packages/ui`)

- [x] `cx`, `cxWith`, `clamp`, `formatNumber`, `formatPercent` (`packages/ui/src/format/index.ts`)
- [x] `debounce`, `leadingDebounce`, `rafThrottle` (`packages/ui/src/timing/index.ts`)
- [x] Typed event emitter (`packages/ui/src/events/index.ts`)

### Asset Safety (`apps/api/src/services/asset-upload.ts`)

- [x] SVG sanitization with `sanitize-html`
- [x] PDF magic-byte validation (`%PDF-` header + `%%EOF` trailer, 200-byte minimum)

### Tests & Tooling

- [x] Vitest workspaces (`vitest.workspace.ts:1-17`)
- [x] ESLint flat config (0 errors, 4 warnings — all intentional, documented in `eslint.config.mjs`)
- [x] Prettier baseline (entire repo formatted)
- [x] Typecheck green across all workspaces
- [x] CI workflow covering install/lint/typecheck/test/build/docker (`.github/workflows/ci.yml`)

## In Progress / Known Gaps

### Reverse Proxy

- [x] Nginx configs for admin and editor (`deploy/docker/{admin,editor}.nginx.conf`)
- [x] Traefik / proxy profile compose (`deploy/docker/docker-compose.proxy.yml`)

### WooCommerce Adapter

- [x] Plugin skeleton with settings page (`adapters/woocommerce-plugin/creationflow-woocommerce.php`)
- [ ] **Real API connection** — Rest-API calls to CreationFlow core
- [ ] **Product mapping** — link WC products to CreationFlow templates
- [ ] **RenderJob on order** — trigger render job on WC order placement
- [ ] **PDF delivery** — attach rendered PDF to WC order
- Tracked in: P2-001 (WooCommerce automation tests), and the original ticket.

### Observability

- [x] Logging plugin exists (`apps/api/src/plugins/logging.ts`)
- [x] Metrics plugin exists (`apps/api/src/plugins/metrics.ts`)
- [ ] Structured-logging enrichment, Prometheus output, request tracing
- Tracked in: P2-002.

### Editor UX

- [ ] Multi-select, keyboard shortcuts, zoom/pan, alignment guides, image cropping, inline text editing
- [ ] **Resize handles** on canvas (currently scaled via properties panel only) — tracked in #152

## Next Recommended Steps (priority order)

1. **Editor resize handles** — replace property-panel scale with on-canvas drag handles (#152)
2. **WooCommerce automation** — order-driven render triggers (P2-001)
3. **Observability** — structured logs + Prometheus metrics endpoint (P2-002)
4. **CI workflow simplification** — collapse the six jobs to a leaner pipeline (P1-008)

## Restarbeitsliste

| Bereich       | Ticket        | Beschreibung                                                 |
| ------------- | ------------- | ------------------------------------------------------------ |
| Editor UX     | #152          | Resize Handles auf SurfaceCanvas                             |
| WooCommerce   | #192 (P2-001) | Automation / Adapter-Tests                                   |
| Observability | #193 (P2-002) | Logging / Metrics ausbauen                                   |
| CI            | #191 (P1-008) | CI-Workflow vereinfachen                                     |
| Doku-Sync     | #190 (P1-007) | Status / Roadmap / Changelog synchronisieren (dieses Ticket) |
