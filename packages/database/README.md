# @creationflow/database

Prisma database package for CreationFlow.

## Schema

The Prisma schema defines workspace-scoped entities for product customization:

- **Workspace** — top-level organizational unit
- **Product** — customizable items (t-shirts, mugs, etc.)
- **ProductTemplate** — design structure with JSON document schema
- **Configuration** — user-created design instances with JSON document content
- **RenderJob** — PDF rendering job tracking
- **Asset** — uploaded files (images, fonts, vectors, PDFs)

### Enums

- `ConfigurationStatus` — `DRAFT`, `CART`, `ORDERED`, `ARCHIVED`
- `RenderJobStatus` — `PENDING`, `PROCESSING`, `DONE`, `FAILED`
- `AssetType` — `IMAGE`, `FONT`, `VECTOR`, `PDF`

## Scripts

```bash
pnpm prisma migrate dev    # Run migrations
pnpm prisma generate       # Generate Prisma client
pnpm prisma studio         # Open Prisma Studio
```

## Notes

The schema does not include license server tables, billing tables, seed data, or customer examples.
