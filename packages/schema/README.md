# @creationflow/schema

Shared document and product schema for CreationFlow.

This package defines the renderer-independent type system used across the entire platform.

## Exports

### Branded ID Types

`DocumentId`, `PageId`, `SurfaceId`, `ElementId`, `AssetId`, `VariableId`, `RuleId`, `WorkspaceId`, `ProductId`, `ConfigurationId`

### Document Types

- `CreationFlowDocument` — root document with pages, variables, assets, rules
- `CreationFlowDocumentMetadata` — workspace, product, configuration references
- `CreationFlowPage` — pages with dimensions and surfaces
- `CreationFlowSurface` — printable areas with elements, shape, role, path data
- `CreationFlowElement` — text, image, shape, group, and variable elements
- `CreationFlowAsset` — asset references
- `CreationFlowVariable` — dynamic values
- `CreationFlowRule` — conditional behavior

### Surface Types

- **Kinds**: `front`, `back`, `left_sleeve`, `right_sleeve`, `custom`
- **Shapes**: `rect`, `path`
- **Roles**: `default`, `colorRegion`, `designRegion`, `overlay`

### Element Types

- `text` — text content with font, size, color, alignment
- `image` — image assets with fit modes (contain, cover, fill)
- `shape` — rectangles, ellipses, lines with fill and stroke
- `group` — nested element groups
- `variable` — variable placeholders

### Utilities

- `isTextElement()` — type guard for text elements
- `isImageElement()` — type guard for image elements
