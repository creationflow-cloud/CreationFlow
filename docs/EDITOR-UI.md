# Editor UI

The Editor UI (`apps/editor`) is a React/Vite 2D design editor for creating and editing configurations.

## Access

When running locally: http://localhost:5173

### Loading Documents

The editor loads documents via URL parameters:

- **Template**: `?templateId=<id>` — loads the template and automatically creates a configuration
- **Configuration**: `?configurationId=<id>` — loads an existing configuration for editing

After loading a template, the URL is updated to use `configurationId` for the newly created configuration.

## Current Capabilities

### Canvas Rendering

- **SurfaceCanvas** — renders the current surface using HTML Canvas
- Displays the surface background with its dimensions
- Renders elements on the canvas based on their type and properties

### Element Types

The editor supports adding three element types:

- **Text elements** — configurable text content, font family, font size, font weight, color, and alignment
- **Shape elements** — rectangles, ellipses, and lines with fill, stroke, and stroke width
- **Image elements** — images from uploaded assets with fit modes (contain, cover, fill)

### Element Manipulation

- **Add elements** — buttons to add text, shape, or image elements to the current surface
- **Select elements** — click on an element to select it
- **Move elements** — drag elements on the canvas to reposition them
- **Scale elements** — resize elements via the properties panel
- **Delete elements** — remove the selected element
- **Duplicate elements** — create a copy of the selected element

### Layer Ordering (zIndex)

Elements can be reordered in the stacking order:

- **Bring Forward** — move element up one layer
- **Send Backward** — move element down one layer
- **Bring to Front** — move element to the top layer
- **Send to Back** — move element to the bottom layer

### Undo/Redo

- **Undo** — revert the last document change
- **Redo** — reapply a reverted change
- History is tracked per document session and cleared on document load

### Properties Panel

The selected element's properties are displayed in a side panel:

- Position (x, y)
- Dimensions (width, height)
- Rotation
- Opacity
- Visibility toggle
- Locked toggle
- Type-specific properties (text content, font, color, shape fill/stroke, image fit)

### Page/Surface Switching

- **PageSurfaceSwitcher** — dropdown to select the active page and surface
- Automatically selects the first surface when a document loads
- Handles surface roles (overlay surfaces redirect element creation to design regions)

### Image Upload

- Upload images via the asset upload API
- Uploaded images can be added as image elements
- Assets are stored via the API's file upload endpoint

### Save

- **Save button** — persists the current document to the API
- **Dirty indicator** — shows when the document has unsaved changes
- **Save status** — displays "Saved" or error feedback after saving
- The last saved snapshot is compared to the current document to detect changes

### Render Jobs

- **Create render job** — request PDF rendering for the current configuration
- **Trigger rendering** — start the rendering process
- **Download PDF** — download the rendered PDF output (when available)
- Render job status is displayed (pending, processing, done, failed)

## Architecture

### Document Helpers

- `document-helpers.ts` — utilities for finding elements and surfaces in the document tree
- `document-history.ts` — undo/redo history management with push/undo/redo operations
- `element-actions.ts` — element manipulation (delete, duplicate, move, layer ordering)
- `selection-helpers.ts` — selection state management, surface selection logic

### Core Integration

The editor uses `@creationflow/core` for document operations:

- `addElement()` — add elements to surfaces
- `updateElement()` — update element properties
- `getElementZIndex()` — get element layer index
- `createConfigurationDocument()` — create a configuration from a template

### State Management

The editor uses React `useState` for all state:

- `currentDocument` — the active CreationFlowDocument
- `selection` — selected page, surface, and element IDs
- `history` — undo/redo stacks
- `lastSavedSnapshot` — JSON string of the last saved document
- `saving`, `saveStatus`, `saveError` — save operation state
- `rendering`, `renderJob`, `renderError` — render operation state

## Known Limitations

- **No multi-select** — only one element can be selected at a time
- **No keyboard shortcuts** — delete, duplicate, undo/redo require button clicks
- **No zoom/pan** — canvas does not support zooming or panning
- **No alignment guides** — no snap-to-grid or alignment guides
- **No element grouping** — group elements exist in the schema but the editor doesn't support creating groups
- **No variable elements** — variable elements exist in the schema but the editor doesn't support them
- **No text editing on canvas** — text content is edited in the properties panel, not inline
- **No image cropping** — images use fit modes but cannot be cropped
- **No real-time collaboration** — no multi-user editing
- **No authentication** — no login or access control
- **Basic canvas rendering** — elements are rendered as simple shapes without advanced styling
- **No element rotation on canvas** — rotation is set via properties panel only
- **No resize handles on canvas** — scaling is done via properties panel

## Dependencies

- `@creationflow/core` — document operations
- `@creationflow/schema` — type definitions
