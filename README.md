# CreationFlow

Self-hosted platform for product customization and automated print workflows.

## Current Status

CreationFlow is in early development. This repository currently contains a runnable monorepo skeleton, placeholder services, and initial shared TypeScript packages.

Most product features are not implemented yet. The current goal is to keep the architecture clear, buildable, and ready for incremental product logic.

## Architecture Overview

CreationFlow is designed as a self-hosted open core system for:

- product customization
- document-based design workflows
- rule-based layout and production logic
- automated rendering
- print-ready PDF generation

The JSON document model is the central source of truth. It lives in `@creationflow/schema` and must stay renderer-independent. Apps orchestrate workflows, while reusable business logic belongs in `packages/`.

## Repository Structure

- `apps/`: Application entry points.
- `packages/`: Shared schema, core logic, engines, and UI packages.
- `adapters/`: External system adapters.
- `deploy/`: Deployment-related configuration.

```text
apps/
  admin/
  api/
  editor/
  renderer/
  worker/
packages/
  core/
  pdf-engine/
  rules-engine/
  schema/
  ui/
adapters/
  woocommerce-plugin/
deploy/
  docker/
```

## Packages

- `@creationflow/schema`: Shared renderer-independent document, product, element, rule, variable, and metadata types.
- `@creationflow/core`: Minimal core package with `createEmptyDocument()`.
- `@creationflow/rules-engine`: Placeholder rule evaluation package.
- `@creationflow/pdf-engine`: Placeholder PDF render plan package.
- `@creationflow/ui`: Placeholder shared UI package.

## Apps

- `@creationflow/api`: Minimal Fastify API with `GET /health` and `GET /version`.
- `@creationflow/editor`: React/Vite 2D editor UI shell. No real editor logic or Konva integration yet.
- `@creationflow/admin`: React/Vite admin dashboard shell. No real API integration or auth yet.
- `@creationflow/renderer`: TypeScript Node renderer placeholder. No PDF generation yet.
- `@creationflow/worker`: TypeScript Node worker placeholder. No queue, Redis jobs, or database integration yet.

## WooCommerce Adapter

`adapters/woocommerce-plugin` contains an installable WordPress/WooCommerce plugin skeleton.

It is only an adapter for connecting a WooCommerce shop to a self-hosted CreationFlow server later. It must not contain central editor logic, renderer logic, pricing logic, or license validation logic.

The current plugin stores placeholder settings for:

- CreationFlow API URL
- API Token
- Debug Mode

No real API connection is implemented yet.

## Local Development

Install dependencies with pnpm:

```bash
npx pnpm@9.0.0 install
```

Run the API:

```bash
npx pnpm@9.0.0 --filter @creationflow/api dev
```

Run the editor:

```bash
npx pnpm@9.0.0 --filter @creationflow/editor dev
```

Run the admin app:

```bash
npx pnpm@9.0.0 --filter @creationflow/admin dev
```

Run the renderer placeholder:

```bash
npx pnpm@9.0.0 --filter @creationflow/renderer dev
```

Run the worker placeholder:

```bash
npx pnpm@9.0.0 --filter @creationflow/worker dev
```

## Useful Commands

Build all workspaces:

```bash
npx pnpm@9.0.0 build
```

Type-check all workspaces:

```bash
npx pnpm@9.0.0 check
```

or:

```bash
npx pnpm@9.0.0 typecheck
```

Validate the local Docker Compose setup:

```bash
docker compose --env-file deploy/docker/.env.example -f deploy/docker/docker-compose.yml config
```

Start local infrastructure placeholders:

```bash
cd deploy/docker
cp .env.example .env
docker compose --env-file .env up
```

## Local Docker Setup

`deploy/docker` provides an initial local development setup. It is not production-ready.

Prepared services:

- `postgres` on port `5432`
- `redis` on port `6379`
- `api` placeholder on port `3000`
- `editor` placeholder on port `3001`
- `admin` placeholder on port `3002`
- `renderer` placeholder
- `worker` placeholder

No production images, secrets, cloud dependencies, or license server logic are included.

## Licensing

CreationFlow Core is licensed under the AGPL-3.0. See `LICENSE` for the full license text.

A separate private License Server may validate licenses and usage in future commercial/self-hosted deployments. That License Server is not part of this public repository.

Customer data should stay with the customer. No customer data should be sent to the License Server.

## What Is Intentionally Not Included Yet

- No production-ready deployment setup.
- No real database integration.
- No authentication or authorization.
- No license server logic.
- No real WooCommerce API integration.
- No pricing logic in the frontend or WooCommerce adapter.
- No real rendering or PDF generation.
- No Konva integration.
- No 3D viewer.
- No customer data or secrets.
