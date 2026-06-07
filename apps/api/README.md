# @creationflow/api

Fastify API server for CreationFlow.

## Features

- REST API for workspaces, products, templates, configurations, render jobs, and assets
- API key authentication for all non-health endpoints
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
- `CREATIONFLOW_API_KEY` — required API key used to authenticate non-public requests
- `CREATIONFLOW_AUTH_DISABLED` — set to `true` to bypass authentication (development only)
- `MAX_UPLOAD_BYTES` — Upload size limit (default: 10 MiB)
- `UPLOAD_DIR` — Local upload directory (default: `./uploads`)
- `DEMO_SEED` — Set to `true` to seed demo data on startup

## Authentication

All endpoints except `GET /health`, `GET /health/db` and `GET /version` require a valid API key.
Clients can authenticate by sending the key in either header:

```http
GET /workspaces HTTP/1.1
Host: api.example.com
X-API-Key: <CREATIONFLOW_API_KEY>
```

```http
GET /workspaces HTTP/1.1
Host: api.example.com
Authorization: Bearer <CREATIONFLOW_API_KEY>
```

The server uses `crypto.timingSafeEqual` to compare keys, and rejects requests with
`401 Unauthorized` when the key is missing or invalid. If `CREATIONFLOW_API_KEY` is not
configured, the server responds with `500` for protected routes so misconfiguration is
visible. Local development can opt out via `CREATIONFLOW_AUTH_DISABLED=true`.
