# API Reference

The CreationFlow API is built with Fastify and provides REST endpoints for all platform operations.

## OpenAPI Documentation

Interactive API documentation is available when the API server is running:

- **Swagger UI**: http://localhost:3000/docs
- **OpenAPI JSON**: http://localhost:3000/openapi.json

The Swagger UI provides interactive testing of all endpoints with request/response schemas.

## Base URL

```
http://localhost:3000
```

## Resources

### Health

- `GET /health` — Health check (no database)
- `GET /health/db` — Health check with database connectivity

### Version

- `GET /version` — Returns the API version

### Workspaces

Workspaces are the top-level organizational unit. All other entities belong to a workspace.

- `GET /workspaces` — List all workspaces
- `GET /workspaces/:id` — Get a workspace by ID
- `POST /workspaces` — Create a new workspace
- `PUT /workspaces/:id` — Update a workspace
- `DELETE /workspaces/:id` — Delete a workspace

### Products

Products represent customizable items (e.g., t-shirts, mugs, posters).

- `GET /products` — List products (query: `workspaceId`)
- `GET /products/:id` — Get a product by ID
- `POST /products` — Create a product
- `PUT /products/:id` — Update a product
- `DELETE /products/:id` — Delete a product

### Product Templates

Templates define the design structure (pages, surfaces, elements) for a product.

- `GET /product-templates` — List templates (query: `workspaceId`, `productId`)
- `GET /product-templates/:id` — Get a template by ID
- `POST /product-templates` — Create a template
- `PUT /product-templates/:id` — Update a template (including `documentSchema`)
- `DELETE /product-templates/:id` — Delete a template

### Configurations

Configurations are instances of templates with specific element values (user designs).

- `GET /configurations` — List configurations (query: `workspaceId`, `productId`, `templateId`, `status`)
- `GET /configurations/:id` — Get a configuration by ID
- `POST /configurations` — Create a configuration
- `PUT /configurations/:id` — Update a configuration (including `document`)
- `DELETE /configurations/:id` — Delete a configuration

**Configuration statuses**: `draft`, `cart`, `ordered`, `archived`

### Render Jobs

Render jobs request PDF output for a configuration.

- `GET /render-jobs` — List render jobs (query: `workspaceId`, `configurationId`, `status`)
- `GET /render-jobs/:id` — Get a render job by ID
- `POST /render-jobs` — Create a render job
- `POST /render-jobs/:id/render` — Trigger rendering for a job
- `GET /render-jobs/:id/output/pdf` — Download the PDF output (if done)
- `DELETE /render-jobs/:id` — Delete a render job

**Render job statuses**: `pending`, `processing`, `done`, `failed`

### Assets

Assets are uploaded files (images, fonts, vectors, PDFs) used in designs.

- `GET /assets` — List assets (query: `workspaceId`, `type`)
- `GET /assets/:id` — Get an asset by ID
- `POST /assets` — Create an asset record
- `POST /assets/upload` — Upload a file (multipart/form-data)
- `PUT /assets/:id` — Update an asset
- `DELETE /assets/:id` — Delete an asset
- `GET /assets/file/:id` — Download the asset file

**Asset types**: `image`, `font`, `vector`, `pdf`

## Authentication

Authentication is not yet implemented. All endpoints are currently open.

## Error Responses

Errors return a JSON object with:

```json
{
  "status": "error",
  "message": "Description of the error"
}
```

## CORS

CORS is enabled for all origins and standard HTTP methods (GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS).

## File Uploads

Asset uploads use `multipart/form-data` with a file size limit configured via `maxUploadBytes` in the API config.

## Database

The API uses Prisma with PostgreSQL. The database connection is configured via the `DATABASE_URL` environment variable.
