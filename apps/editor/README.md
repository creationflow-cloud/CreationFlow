# @creationflow/editor

React/Vite 2D design editor for CreationFlow.

## Features

- Load templates or configurations via URL parameters
- Canvas-based surface rendering
- Add text, shape, and image elements
- Move, scale, delete, and duplicate elements
- Layer ordering (bring forward/backward, to front/back)
- Undo/redo via history stack
- Save configurations to API
- Page/surface switching
- Image upload via asset API
- Create and trigger render jobs

## Scripts

```bash
pnpm dev        # Start development server
pnpm build      # Build for production
pnpm preview    # Preview production build
pnpm test       # Run tests
pnpm check      # Type-check
```

## Environment Variables

- `VITE_API_URL` — API base URL (default: http://localhost:3000)

## URL Parameters

- `?templateId=<id>` — Load a template and create a new configuration
- `?configurationId=<id>` — Load an existing configuration for editing
