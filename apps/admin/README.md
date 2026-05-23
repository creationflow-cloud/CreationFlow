# @creationflow/admin

React/Vite admin dashboard for CreationFlow.

## Features

- Workspace overview with product, template, and configuration counts
- Create and manage products, templates, and configurations
- Edit template page and surface structure
- SVG import workflow for adding surfaces from SVG files
- Delete surfaces (cannot delete last surface on a page)
- Open configurations in the editor

## Scripts

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm preview    # Preview production build
pnpm check      # Type-check
```

## Environment Variables

- `VITE_API_URL` — API base URL (default: http://localhost:3000)
- `VITE_EDITOR_URL` — Editor base URL (default: http://localhost:5173)
