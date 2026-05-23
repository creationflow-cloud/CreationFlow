# @creationflow/api

Fastify API server for CreationFlow.

## Features

- REST API for workspaces, products, templates, configurations, render jobs, and assets
- OpenAPI/Swagger documentation at `/docs` and `/openapi.json`
- PostgreSQL database via Prisma
- File upload and download for assets
- CORS enabled for frontend apps
- Demo data seeding

## Scripts

```bash
pnpm dev        # Start development server with hot reload
pnpm build      # Compile TypeScript
pnpm start      # Run compiled server
pnpm seed       # Run demo data seed
pnpm test       # Run tests
pnpm check      # Type-check
```

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — Server port (default: 3000)
- `HOST` — Server host (default: 0.0.0.0)
- `DEMO_SEED` — Set to `true` to seed demo data on startup
