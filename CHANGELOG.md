# Changelog

All notable changes to CreationFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Monorepo structure with pnpm workspaces
- Fastify API with CRUD for workspaces, products, templates, configurations, render jobs, assets
- Prisma/PostgreSQL database integration with migrations
- React/Vite Admin UI for managing products, templates, configurations, pages, surfaces
- React/Vite 2D Editor with canvas-based rendering
- Element types: text, shape, image
- Element manipulation: move, scale, delete, duplicate, layer ordering, undo/redo
- SVG import workflow for surfaces
- Asset upload and download via API
- OpenAPI/Swagger documentation at `/docs` and `/openapi.json`
- PDF render plan generation
- PDF generation with pdfkit (coordinate conversion, unit conversion, page creation)
- Storage providers: FileSystem, Memory
- Docker Compose setup for local development (PostgreSQL, Redis)
- Demo data seeding
- Page/surface switching in editor
- Render job creation and trigger from editor
- PDF download from editor

### Changed

- JSON document model is renderer-independent
- TypeScript strict mode across all packages
- ESLint and Prettier configuration

### Known Limitations

- No authentication or authorization
- Single workspace only (no workspace switching UI)
- No product editing after creation
- No template deletion
- No page deletion
- No surface reordering
- No multi-select in editor
- No keyboard shortcuts in editor
- No zoom/pan in editor
- No alignment guides or snap-to-grid
- No inline text editing
- No image cropping
- No variable element support
- No element grouping UI
- PDF Engine: text rendering incomplete
- PDF Engine: image rendering incomplete
- PDF Engine: shape rendering incomplete
- Renderer app is a placeholder
- Worker app is a placeholder (no queue, no Redis)
- Rules Engine is minimal and not integrated
- WooCommerce plugin is a skeleton with no real API connection
- No production-ready deployment setup
- No test coverage for many areas

## [0.0.0] - 2026-05-21

### Added

- Initial repository setup
- Project documentation
- AGENTS.md with working rules and guidelines
- Architecture, data model, API, and development documentation
