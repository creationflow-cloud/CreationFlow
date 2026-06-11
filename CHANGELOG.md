# Changelog

All notable changes to CreationFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Auth and workspace isolation** for the API
  - API-key + Bearer auth via `X-API-Key` / `Authorization` header (`apps/api/src/plugins/auth.ts:80-101`)
  - Role model `admin` / `editor` / `viewer` with per-key role mapping (`apps/api/src/plugins/auth.ts:5-24, 252-274`)
  - Global `preHandler` enforcing workspace scope on all routes (`apps/api/src/plugins/auth.ts:201-222`)
  - Workspace-isolation tests (`apps/api/src/plugins/auth.test.ts`)
- **Admin and editor login** — `AuthGate` (admin: `apps/admin/src/AuthGate.tsx`) and `EditorAuthGate` (editor: `apps/editor/src/EditorAuthGate.tsx`) with `pingWithApiKey` validation
- **Asset safety**
  - SVG sanitization with `sanitize-html` (`apps/api/src/services/asset-upload.ts`)
  - PDF magic-byte validation (`%PDF-` header + `%%EOF` trailer, 200-byte minimum)
  - Asset upload tests for SVG and PDF (`apps/api/src/services/asset-upload.test.ts`)
- **Worker integration** — `RenderWorkerOptions.apiKey` propagated as `X-API-Key` in `performRenderRequest` (`apps/worker/src/jobs.ts`); render-pipeline integration tests (`apps/worker/src/render-pipeline.test.ts`)
- **Renderer plan builder and status helpers** — `apps/renderer/src/render-plan-builder.ts`, `apps/renderer/src/render-job-status.ts` with unit tests
- **Editor rules panel** — `RulesValidationPanel` integrated in the right sidebar (`apps/editor/src/components/RightSidebar.tsx`, `apps/editor/src/components/RulesValidationPanel.tsx`)
- **PDF Engine golden tests** — 95 tests covering text, shape, image, group and surface-role rendering (`packages/pdf-engine/src/__tests__/golden/`)
- **Production Dockerfiles and reverse-proxy profile** for all five services (`deploy/docker/{api,admin,editor,worker,renderer}.Dockerfile`, `deploy/docker/docker-compose.proxy.yml`, `admin.nginx.conf`, `editor.nginx.conf`)
- **CI workflow** — install/lint/typecheck/test/build/docker build (`.github/workflows/ci.yml`)

### Changed

- ESLint baseline reduced — real bugs fixed, `react-hooks/refs` disabled for `apps/{admin,editor}` (legit ref-prop pattern), `eslint.config.mjs` documents remaining 4 warnings
- Prettier baseline applied across the repository (`.prettierignore` excludes `MIGRATIONS.md`)
- Typecheck and build green for all workspaces
- Schema test file uses a single file-level `eslint-disable` instead of 29 inline `as any` (`packages/schema/src/index.test.ts`)
- PDF engine: `setFillColor` bug fixed, `targetDpi` / `minWidthInches` removed (`packages/pdf-engine/src/renderDocumentToPdf.ts`)
- UI event bus typed with `ReadonlyArray<unknown>` instead of `any[]` (`packages/ui/src/events/index.ts`)

### Known Limitations

- No multi-select in editor
- No keyboard shortcuts in editor
- No zoom/pan in editor
- No alignment guides or snap-to-grid
- No inline text editing
- No image cropping
- No on-canvas resize handles (property-panel scale only) — tracked in #152
- WooCommerce plugin is still a skeleton — real API connection and product mapping pending (P2-001 / #192)
- No structured logging / Prometheus metrics yet — tracked in P2-002 / #193
- No production deployment automation — Dockerfiles are ready but the CI only builds images, it does not push or deploy
- CI workflow is verbose (six jobs) — simplification tracked in P1-008 / #191

## [0.0.0] - 2026-05-21

### Added

- Initial repository setup
- Project documentation
- AGENTS.md with working rules and guidelines
- Architecture, data model, API, and development documentation
