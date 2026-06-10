# CreationFlow

Self-hosted platform for product customization and automated print workflows.

## What Is CreationFlow

CreationFlow is a configurable **Web-to-Print** and document rendering system. It provides:

- **Product customization** — define products with templates and configurable design surfaces.
- **Document-based design workflows** — a central JSON document model describes pages, surfaces, and design elements.
- **Rule-based layout and production logic** — rules engine for dynamic layout adjustments (planned).
- **Automated rendering** — render designs to print-ready output (in progress).
- **Print-ready PDF generation** — PDF engine with render plan and pdfkit-based output (in progress).

The JSON document model is the central source of truth. It lives in `@creationflow/schema` and stays renderer-independent. Apps orchestrate workflows, while reusable business logic belongs in `packages/`.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL (requires Docker)
cd deploy/docker && cp .env.example .env && docker compose up -d postgres

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

## Repository Structure

```
apps/
  api/          Fastify API with Prisma/Postgres, OpenAPI/Swagger
  admin/        React/Vite admin dashboard
  editor/       React/Vite 2D design editor
  renderer/     Rendering service (placeholder)
  worker/       Background worker (placeholder)

packages/
  schema/       Shared document and product types (typed)
  core/         Document operations, element management, layering
  database/     Prisma schema and database client
  pdf-engine/   PDF render plan and pdfkit-based PDF generation
  rules-engine/ Rule evaluation engine (placeholder)
  importers/    SVG importer for surfaces
  storage/      File system and memory storage providers
  ui/           Shared UI components (placeholder)

adapters/
  woocommerce-plugin/  WordPress/WooCommerce adapter

deploy/
  docker/       Docker Compose setup for local development
```

## What Is Implemented

| Area               | Status                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **API**            | Implemented — workspaces, products, templates, configurations, render jobs, assets (with file upload/download), OpenAPI/Swagger |
| **Admin UI**       | Implemented — load data, create products/templates/configurations, edit template pages/surfaces, SVG import, delete surfaces    |
| **Editor UI**      | Implemented — add text/shape/image elements, move/scale, delete/duplicate, layer ordering, undo/redo, save                      |
| **Database**       | Implemented — Prisma schema with Workspace, Product, ProductTemplate, Configuration, RenderJob, Asset                           |
| **Document Model** | Implemented — typed pages, surfaces, elements (text/image/shape/group/variable), assets, variables, rules                       |
| **PDF Engine**     | In progress — render plan + pdfkit-based PDF generation exists                                                                  |
| **SVG Importer**   | Implemented — parse SVG to surfaces with roles/shapes                                                                           |
| **Storage**        | Implemented — file system and memory storage providers                                                                          |
| **Rules Engine**   | Placeholder — basic evaluateRules function                                                                                      |
| **Renderer**       | Placeholder                                                                                                                     |
| **Worker**         | Placeholder                                                                                                                     |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — apps, packages, and their responsibilities
- [Development Setup](docs/DEVELOPMENT.md) — local development instructions
- [API Reference](docs/API.md) — API resources and endpoints
- [Data Model](docs/DATA-MODEL.md) — Prisma entities and JSON document model
- [Admin UI](docs/ADMIN-UI.md) — what the admin dashboard can do
- [Editor UI](docs/EDITOR-UI.md) — editor capabilities and limitations
- [Rendering](docs/RENDERING.md) — render pipeline and PDF generation status
- [Current Status](docs/STATUS.md) — development status and roadmap

## Licensing

CreationFlow Core is licensed under the AGPL-3.0. See `LICENSE` for the full license text.

A separate private License Server may validate licenses and usage in future commercial/self-hosted deployments. That License Server is not part of this public repository.
