# Architecture

CreationFlow is structured as a TypeScript monorepo managed with pnpm workspaces. The architecture follows a clear separation between **apps** (entry points and user interfaces) and **packages** (reusable business logic and shared types).

## Design Principles

- **JSON document model as source of truth** — the document structure in `@creationflow/schema` is renderer-independent and drives all workflows.
- **Apps orchestrate, packages implement** — apps handle user flows and API integration; packages contain domain logic.
- **Self-hosted first** — no external SaaS dependencies; customer data stays with the customer.
- **No license server in this repo** — license validation is handled by a separate private service.

## Apps

### `apps/api` — Fastify API Server

The central backend service providing REST endpoints for all platform operations.

- **Framework**: Fastify with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **API Documentation**: OpenAPI/Swagger at `/docs` and `/openapi.json`
- **Features**:
  - CRUD for workspaces, products, templates, configurations, render jobs, assets
  - File upload for assets (multipart)
  - File serving for uploaded assets
  - CORS enabled for frontend apps
  - Demo data seeding via `DEMO_SEED=true`
- **Dependencies**: `@creationflow/database`, `@creationflow/pdf-engine`, `@creationflow/schema`, `@creationflow/storage`

### `apps/admin` — Admin Dashboard

React/Vite admin UI for managing products, templates, and configurations.

- **Framework**: React 19 with Vite
- **Features**:
  - Load workspace data (products, templates, configurations)
  - Create products, templates, configurations
  - Edit template pages and surfaces (name, dimensions, shape, role, path data, fill color, clip content)
  - Add/delete surfaces (cannot delete last surface on a page)
  - SVG import workflow to add surfaces from SVG files
  - Open configurations in the editor
- **Dependencies**: `@creationflow/importers`, `@creationflow/schema`

### `apps/editor` — 2D Design Editor

React/Vite editor for creating and editing design configurations.

- **Framework**: React 19 with Vite, Canvas-based rendering
- **Features**:
  - Load templates or configurations via URL parameters (`?templateId=` or `?configurationId=`)
  - Add text, shape, and image elements
  - Move and scale elements via canvas interaction
  - Delete and duplicate elements
  - Layer ordering (bring forward/backward, to front/back)
  - Undo/redo via history stack
  - Save configurations back to API
  - Create render jobs
  - Page/surface switching
- **Dependencies**: `@creationflow/core`, `@creationflow/schema`

### `apps/renderer` — Rendering Service (Placeholder)

Minimal placeholder for the rendering service. Not yet connected to the render job workflow.

### `apps/worker` — Background Worker (Placeholder)

Minimal placeholder for background job processing. No queue or Redis integration yet.

## Packages

### `@creationflow/schema` — Shared Types

The central type definitions for the entire platform. All types are renderer-independent.

- **Branded types**: `DocumentId`, `PageId`, `SurfaceId`, `ElementId`, `AssetId`, `VariableId`, `RuleId`, `WorkspaceId`, `ProductId`, `ConfigurationId`
- **Document model**: `CreationFlowDocument` with pages, surfaces, elements, variables, assets, rules
- **Element types**: `text`, `image`, `shape`, `group`, `variable`
- **Surface types**: shape (`rect`/`path`), role (`default`/`colorRegion`/`designRegion`/`overlay`)
- **Units**: `px`, `mm`, `pt`

### `@creationflow/core` — Document Operations

Core logic for manipulating CreationFlow documents.

- `createEmptyDocument()` — create a new empty document
- `createConfigurationDocument()` — create a configuration from a template document
- **Element operations**: `addElement()`, `updateElement()`
- **Layer operations**: `getElementZIndex()`, reorder elements by zIndex
- **Page/surface operations**: page and surface helpers

### `@creationflow/database` — Prisma Database

Prisma schema and database client for PostgreSQL.

- **Entities**: Workspace, Product, ProductTemplate, Configuration, RenderJob, Asset
- **Enums**: ConfigurationStatus, RenderJobStatus, AssetType
- **Workspace-scoped**: all entities belong to a workspace

### `@creationflow/pdf-engine` — PDF Generation

PDF render plan and pdfkit-based PDF generation.

- `createPdfRenderPlan()` — convert a CreationFlowDocument to a render plan with pages, surfaces, and elements sorted by zIndex
- `renderDocumentToPdf()` — generate a PDF using pdfkit (in progress)
- **PDF utilities**: `toPdfUnits()`, `convertTopLeftToPdfY()`

### `@creationflow/rules-engine` — Rule Evaluation (Placeholder)

Basic rule evaluation function. Not yet integrated into the document workflow.

### `@creationflow/importers` — SVG Importer

Parse SVG files into CreationFlow surfaces.

- `importSvgSurfaces()` — analyze SVG markup and extract surfaces with shape, role, path data, and fill color
- `parseSvg()` — low-level SVG parser

### `@creationflow/storage` — Storage Providers

Abstraction for file storage with multiple backends.

- **FileSystemStorageProvider** — store files on local disk
- **MemoryStorageProvider** — in-memory storage for testing
- **StorageProvider interface** — pluggable storage abstraction

### `@creationflow/ui` — Shared UI Components (Placeholder)

Placeholder for shared UI components.

## Adapters

### `adapters/woocommerce-plugin` — WordPress/WooCommerce Adapter

Installable WordPress plugin skeleton for connecting WooCommerce to a CreationFlow server.

- Stores placeholder settings for API URL, API token, debug mode
- No real API connection implemented yet
- Must not contain central editor, renderer, pricing, or license logic

## Deployment

### `deploy/docker` — Docker Compose Setup

Local development infrastructure.

- PostgreSQL on port 5432
- Redis on port 6379
- Placeholder services for api, editor, admin, renderer, worker
