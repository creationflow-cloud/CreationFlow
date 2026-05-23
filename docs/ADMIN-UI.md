# Admin UI

The Admin UI (`apps/admin`) is a React/Vite dashboard for managing products, templates, and configurations.

## Access

When running locally: http://localhost:5174

## Current Capabilities

### Dashboard

- Displays workspace overview with counts of products, templates, and configurations
- Shows creation dates for all entities
- Lists products, templates, and configurations in tables

### Products

- **List products** — shows all products for the current workspace
- **Create products** — enter a product name and create it via the API
- Products display their ID, name, and creation date

### Templates

- **List templates** — shows all templates for the current workspace
- **Create templates** — creates a new template with a default document structure (one page with one "Front" surface)
- **Link to product** — optionally associate a template with a product during creation
- **Edit template structure** — open the template detail view to manage pages and surfaces
- **Open in editor** — launch the editor with the template to create a configuration

### Template Detail View

The template detail view allows editing the page/surface structure of a template:

- **View pages and surfaces** — displays the hierarchical page → surface structure
- **Add pages** — adds a new page with default dimensions (500×600px) and a default surface
- **Add surfaces** — adds a new surface to a page with default dimensions (500×600px)
- **Edit page properties**:
  - Name
  - Width, height, unit
- **Edit surface properties**:
  - Name
  - Width, height, unit
  - Shape: `rect` or `path`
  - Role: `default`, `colorRegion`, `designRegion`, `overlay`
  - Path data (SVG path string, shown when shape is `path`)
  - Fill color (shown when role is `colorRegion` or `overlay`)
  - Clip content checkbox
- **Delete surfaces** — removes a surface (cannot delete the last surface on a page; requires confirmation if surface has elements)
- **Save template** — persists changes to the API
- **SVG import** — paste SVG markup, analyze it, and import detected surfaces into a page

### SVG Import Workflow

1. Paste SVG markup into the import input field
2. Click "Analyze SVG" to preview detected surfaces
3. Select a target page
4. Click "Apply to Page" to add the detected surfaces
5. The importer extracts surfaces with shape, role, path data, and fill color from the SVG

### Configurations

- **List configurations** — shows all configurations for the current workspace
- **Create configurations** — select a template and optionally a product to create a new configuration from the template's document schema
- **Open in editor** — launch the editor with the configuration for editing
- Displays ID, status, template association, and creation date

## Known Limitations

- **No authentication** — the admin UI has no login or access control
- **Single workspace** — currently uses the first workspace found; no workspace switching UI
- **No product editing** — products can be created but not edited after creation
- **No template deletion** — templates cannot be deleted from the UI
- **No configuration editing** — configurations cannot be edited directly in admin (use the editor)
- **No page deletion** — pages can be added but not deleted
- **No surface reordering** — surfaces cannot be reordered via drag-and-drop
- **No element editing** — template surface elements are not editable in admin (use the editor)
- **No validation feedback** — dimension inputs accept any number without range validation
- **Basic UI** — the interface is functional but not polished

## Dependencies

- `@creationflow/importers` — for SVG import functionality
- `@creationflow/schema` — for type definitions
