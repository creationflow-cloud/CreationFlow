# @creationflow/admin

React/Vite admin dashboard for CreationFlow.

## Features

- API key sign-in screen with local storage persistence
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
- `VITE_EDITOR_URL` — Editor base URL for "Open in editor" links (default: http://localhost:5173)

## Authentication

The admin UI prompts for a CreationFlow API key on first load. The key is stored in
`localStorage` under `creationflow.admin.apiKey` and sent on every request via the
`X-API-Key` header. The key is verified with a single API probe (`/workspaces`); if the
API rejects it, the user is returned to the login screen and the stored key is removed.
Use the "Sign out" button in the header to clear credentials.
