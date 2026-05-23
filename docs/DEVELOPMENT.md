# Development Setup

This guide covers setting up CreationFlow for local development.

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 9+ (`corepack enable` or `npm install -g pnpm`)
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)
- **Git**

## Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd CreationFlow
pnpm install
```

### 2. Start PostgreSQL

The local Docker Compose setup includes PostgreSQL:

```bash
cd deploy/docker
cp .env.example .env
docker compose up -d postgres
```

This starts PostgreSQL on `localhost:5432` with the credentials from `.env.example`.

### 3. Configure Environment Variables

Create a `.env` file in the repository root:

```env
DATABASE_URL=postgresql://creationflow:creationflow_dev_password@localhost:5432/creationflow?schema=public
```

Additional environment variables:
- `DEMO_SEED=true` — seed demo data when starting the API
- `CREATIONFLOW_PDF_DEBUG_SURFACES=true` — enable PDF debug surface output

### 4. Run Database Migrations

```bash
pnpm --filter @creationflow/database prisma migrate dev
```

This creates the database and applies all Prisma migrations. The schema includes:
- Workspace, Product, ProductTemplate, Configuration, RenderJob, Asset

### 5. Seed Demo Data (Optional)

```bash
DEMO_SEED=true pnpm --filter @creationflow/api dev
```

Or run the seed script separately:

```bash
pnpm --filter @creationflow/api seed
```

## Running the Apps

### Start All Apps

```bash
pnpm dev:all
```

This starts the API, Admin, and Editor concurrently.

### Start Individual Apps

```bash
# API (port 3000)
pnpm --filter @creationflow/api dev

# Admin UI (port 5174)
pnpm --filter @creationflow/admin dev

# Editor UI (port 5173)
pnpm --filter @creationflow/editor dev

# Renderer placeholder
pnpm --filter @creationflow/renderer dev

# Worker placeholder
pnpm --filter @creationflow/worker dev
```

## Accessing the Apps

| App | URL | Description |
|-----|-----|-------------|
| API | http://localhost:3000 | REST API |
| Swagger UI | http://localhost:3000/docs | Interactive API documentation |
| OpenAPI JSON | http://localhost:3000/openapi.json | OpenAPI specification |
| Admin UI | http://localhost:5174 | Admin dashboard |
| Editor UI | http://localhost:5173 | 2D design editor |

## Useful Commands

```bash
# Build all workspaces
pnpm build

# Type-check all workspaces
pnpm typecheck
# or
pnpm check

# Lint all workspaces
pnpm lint

# Format code
pnpm format

# Check formatting
pnpm format:check

# Run tests
pnpm --filter @creationflow/api test
pnpm --filter @creationflow/editor test
```

## Docker Compose Full Setup

To start all infrastructure services (not just PostgreSQL):

```bash
cd deploy/docker
cp .env.example .env
docker compose up
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Placeholder services for api (3000), editor (3001), admin (3002)

**Note**: The Docker app services are placeholders and do not use production images yet. For development, use `pnpm dev:all` instead.

## Project Structure

```
CreationFlow/
├── apps/
│   ├── api/           # Fastify API server
│   ├── admin/         # React/Vite admin dashboard
│   ├── editor/        # React/Vite 2D editor
│   ├── renderer/      # Rendering service (placeholder)
│   └── worker/        # Background worker (placeholder)
├── packages/
│   ├── schema/        # Shared document and product types
│   ├── core/          # Document operations
│   ├── database/      # Prisma schema and client
│   ├── pdf-engine/    # PDF generation
│   ├── rules-engine/  # Rule evaluation (placeholder)
│   ├── importers/     # SVG importer
│   ├── storage/       # Storage providers
│   └── ui/            # Shared UI (placeholder)
├── adapters/
│   └── woocommerce-plugin/  # WordPress adapter
├── deploy/
│   └── docker/        # Docker Compose setup
├── docs/              # Documentation
├── .env               # Environment variables
├── package.json       # Root package with workspace scripts
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running:

```bash
docker compose -f deploy/docker/docker-compose.yml ps
```

Reset the database:

```bash
pnpm --filter @creationflow/database prisma migrate reset
```

### Port Conflicts

If ports 3000, 5173, or 5174 are in use, check the respective `package.json` or Vite config for port overrides.

### Type Errors

Run type-checking to catch issues:

```bash
pnpm typecheck
```
