# CreationFlow

Self-hosted platform for product customization and automated print workflows.

## What Is CreationFlow

CreationFlow is a configurable **Web-to-Print** and document rendering system. It provides:

- **Product customization** — define products with templates and configurable design surfaces.
- **Document-based design workflows** — a central JSON document model describes pages, surfaces, and design elements.
- **Rule-based layout and production logic** — a rules engine validates configurations and can block save/render on mandatory violations.
- **Automated rendering** — render designs to print-ready output through the API or the worker.
- **Print-ready PDF generation** — PDF engine with render plan, pdfkit-based output, golden tests, and asset safety (SVG sanitization, PDF magic-byte validation).

The JSON document model is the central source of truth. It lives in `@creationflow/schema` and stays renderer-independent. Apps orchestrate workflows, while reusable business logic belongs in `packages/`.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL and Redis (requires Docker)
cd deploy/docker && cp .env.example .env && docker compose up -d postgres redis

# Run Prisma migrations
pnpm --filter @creationflow/database prisma migrate dev

# Seed demo data (optional)
DEMO_SEED=true pnpm --filter @creationflow/api dev

# Start all apps (API + Admin + Editor)
pnpm dev:all
```

Access the apps:

- **API**: http://localhost:3000
- **API Docs (Swagger)**: http://localhost:3000/docs
- **Admin UI**: http://localhost:5174
- **Editor UI**: http://localhost:5173

When authentication is enabled, both UIs ask for an API key on first load and persist it in `localStorage`. Use the `pnpm dev:all` API key in `.env.example` to log in locally.

## Repository Structure

```
apps/
  api/          Fastify API with Prisma/Postgres, OpenAPI/Swagger, API-key auth
  admin/        React/Vite admin dashboard with login
  editor/       React/Vite 2D design editor with login
  renderer/     Render plan builder and status helpers
  worker/       Background worker (render pipeline)

packages/
  schema/       Shared document and product types (typed, branded IDs)
  core/         Document operations, element management, layering
  database/     Prisma schema and database client
  pdf-engine/   Render plan + pdfkit-based PDF generation (golden tests)
  rules-engine/ Rule evaluation (conditions, actions, mandatory violations)
  importers/    SVG importer for surfaces
  storage/      File system and memory storage providers
  ui/           Shared utilities (cx, clamp, debounce, emitter)

adapters/
  woocommerce-plugin/  WordPress/WooCommerce adapter (skeleton)

deploy/
  docker/       Docker Compose setup for local dev and reverse-proxy profile
```

## What Is Implemented

| Area               | Status                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **API**            | Implemented — workspaces, products, templates, configurations, render jobs, assets (with file upload/download), OpenAPI/Swagger |
| **Auth**           | Implemented — API-key + Bearer auth, role model (`admin`/`editor`/`viewer`), workspace isolation                                |
| **Admin UI**       | Implemented — login, products, templates, configurations, surfaces, SVG import, delete surfaces                                 |
| **Editor UI**      | Implemented — login, elements, move/scale, delete/duplicate, layer ordering, undo/redo, save, render, download, rules panel     |
| **Database**       | Implemented — Prisma schema with Workspace, Product, ProductTemplate, Configuration, RenderJob, Asset                           |
| **Document Model** | Implemented — typed pages, surfaces, elements (text/image/shape/group/variable), assets, variables, rules                       |
| **PDF Engine**     | Implemented — render plan + pdfkit, text/shape/image/group, surface roles, 95 golden tests                                      |
| **SVG Importer**   | Implemented — parse SVG to surfaces with roles/shapes                                                                           |
| **Storage**        | Implemented — file system and memory storage providers                                                                          |
| **Asset Safety**   | Implemented — SVG sanitization (`sanitize-html`), PDF magic-byte validation                                                     |
| **Rules Engine**   | Implemented — `evaluateRules` with mandatory violations, warnings, and errors; editor panel                                     |
| **Renderer**       | Implemented — render-plan builder and status helpers with unit tests                                                            |
| **Worker**         | Implemented — render pipeline with API-key propagation and integration tests                                                    |
| **UI Package**     | Implemented — `cx`, `clamp`, `formatNumber`, `debounce`, `rafThrottle`, typed emitter                                           |
| **CI**             | Implemented — install/lint/typecheck/test/build/docker build (`.github/workflows/ci.yml`)                                       |
| **Docker**         | Implemented — production Dockerfiles for all services, reverse-proxy profile                                                    |
| **WooCommerce**    | Skeleton — plugin structure and settings only; real API connection pending (P2-001)                                             |

For the full code-anchored status, see [`docs/STATUS.md`](docs/STATUS.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — apps, packages, and their responsibilities
- [Development Setup](docs/DEVELOPMENT.md) — local development instructions
- [API Reference](docs/API.md) — API resources and endpoints
- [Data Model](docs/DATA-MODEL.md) — Prisma entities and JSON document model
- [Admin UI](docs/ADMIN-UI.md) — what the admin dashboard can do
- [Editor UI](docs/EDITOR-UI.md) — editor capabilities and limitations
- [Rendering](docs/RENDERING.md) — render pipeline and PDF generation status
- [Current Status](docs/STATUS.md) — code-anchored development status
- [Roadmap](docs/ROADMAP.md) — prioritized next steps

## Licensing

CreationFlow Core is licensed under the AGPL-3.0. See `LICENSE` for the full license text.

A separate private License Server may validate licenses and usage in future commercial/self-hosted deployments. That License Server is not part of this public repository.
