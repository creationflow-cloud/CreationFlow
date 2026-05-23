# Data Model

CreationFlow uses two complementary data models:

1. **Prisma schema** — persistent database entities in PostgreSQL
2. **JSON document model** — renderer-independent design documents stored as JSON in templates and configurations

## Prisma Schema

Located in `packages/database/prisma/schema.prisma`.

### Workspace

Top-level organizational unit. All other entities belong to a workspace.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `name` | String | Workspace name |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations**: has many Products, Templates, Configurations, RenderJobs, Assets

### Product

Represents a customizable item (e.g., t-shirt, mug, poster).

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `workspaceId` | String | Foreign key to Workspace |
| `externalId` | String? | Optional external system ID (e.g., WooCommerce) |
| `name` | String | Product name |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations**: belongs to Workspace, has many Templates, has many Configurations

**Indexes**: `workspaceId`, `workspaceId + externalId`

### ProductTemplate

Defines the design structure for a product. Stores the document schema as JSON.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `workspaceId` | String | Foreign key to Workspace |
| `productId` | String? | Optional foreign key to Product |
| `documentSchema` | Json | The template document structure |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations**: belongs to Workspace, optionally belongs to Product, has many Configurations

**Indexes**: `workspaceId`, `productId`

### Configuration

A user-created design instance based on a template. Stores the actual document as JSON.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `workspaceId` | String | Foreign key to Workspace |
| `productId` | String? | Optional foreign key to Product |
| `templateId` | String? | Optional foreign key to ProductTemplate |
| `document` | Json | The design document content |
| `status` | ConfigurationStatus | `DRAFT`, `CART`, `ORDERED`, `ARCHIVED` |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations**: belongs to Workspace, optionally belongs to Product, optionally belongs to Template, has many RenderJobs

**Indexes**: `workspaceId`, `productId`, `templateId`, `status`

### RenderJob

Tracks PDF rendering requests for configurations.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `workspaceId` | String | Foreign key to Workspace |
| `configurationId` | String? | Optional foreign key to Configuration |
| `status` | RenderJobStatus | `PENDING`, `PROCESSING`, `DONE`, `FAILED` |
| `output` | Json? | Render output metadata |
| `errorMessage` | String? | Error message if failed |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations**: belongs to Workspace, optionally belongs to Configuration

**Indexes**: `workspaceId`, `configurationId`, `status`

### Asset

Uploaded files (images, fonts, vectors, PDFs) used in designs.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (cuid) | Primary key |
| `workspaceId` | String | Foreign key to Workspace |
| `type` | AssetType | `IMAGE`, `FONT`, `VECTOR`, `PDF` |
| `name` | String | Asset name |
| `source` | String | File source/path |
| `mimeType` | String? | MIME type |
| `width` | Int? | Image width in pixels |
| `height` | Int? | Image height in pixels |
| `sizeBytes` | BigInt? | File size in bytes |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations**: belongs to Workspace

**Indexes**: `workspaceId`, `type`

## JSON Document Model

Located in `packages/schema/src/index.ts`. The document model is renderer-independent — it does not contain Canvas, React, PDF, or 3D-specific types.

### CreationFlowDocument

The root document structure.

```typescript
interface CreationFlowDocument {
  id: DocumentId;
  version: string;
  metadata: CreationFlowDocumentMetadata;
  pages: readonly CreationFlowPage[];
  variables: readonly CreationFlowVariable[];
  assets: readonly CreationFlowAsset[];
  rules: readonly CreationFlowRule[];
}
```

### Metadata

```typescript
interface CreationFlowDocumentMetadata {
  workspaceId: WorkspaceId;
  productId?: ProductId;
  configurationId?: ConfigurationId;
  createdAt: string;
  updatedAt: string;
}
```

### Pages

Documents contain one or more pages, each with dimensions and surfaces.

```typescript
interface CreationFlowPage {
  id: PageId;
  name: string;
  width: number;
  height: number;
  unit: CreationFlowUnit;  // "px" | "mm" | "pt"
  surfaces?: readonly CreationFlowSurface[];
}
```

### Surfaces

Surfaces represent printable areas on a page (e.g., front, back, sleeves). Each surface contains design elements.

```typescript
interface CreationFlowSurface {
  id: SurfaceId;
  name: string;
  pageId?: PageId;
  kind?: CreationFlowSurfaceKind;  // "front" | "back" | "left_sleeve" | "right_sleeve" | "custom"
  width: number;
  height: number;
  unit: CreationFlowUnit;
  printArea?: CreationFlowPrintArea;
  elements: readonly CreationFlowElement[];
  shape?: CreationFlowSurfaceShape;  // "rect" | "path"
  role?: CreationFlowSurfaceRole;    // "default" | "colorRegion" | "designRegion" | "overlay"
  pathData?: string;      // SVG path data for path-shaped surfaces
  fillColor?: string;     // Fill color for color regions and overlays
  clipContent?: boolean;  // Whether to clip elements to surface bounds
}
```

### Elements

Elements are the design objects placed on surfaces. Each element has common properties and type-specific properties.

**Common element properties:**

```typescript
interface CreationFlowElementBase {
  id: ElementId;
  type: CreationFlowElementType;  // "text" | "image" | "shape" | "group" | "variable"
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}
```

**Text Element:**

```typescript
interface CreationFlowTextElement extends CreationFlowElementBase {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight?: string;
  color: string;
  align: "left" | "center" | "right";
}
```

**Image Element:**

```typescript
interface CreationFlowImageElement extends CreationFlowElementBase {
  type: "image";
  assetId: AssetId;
  fit: "contain" | "cover" | "fill";
}
```

**Shape Element:**

```typescript
interface CreationFlowShapeElement extends CreationFlowElementBase {
  type: "shape";
  shapeType: "rect" | "ellipse" | "line";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}
```

**Group Element:**

```typescript
interface CreationFlowGroupElement extends CreationFlowElementBase {
  type: "group";
  children: readonly CreationFlowElement[];
}
```

**Variable Element:**

```typescript
interface CreationFlowVariableElement extends CreationFlowElementBase {
  type: "variable";
  variableId: VariableId;
  fallback?: string;
}
```

### Assets (Document-Level)

References to assets used in the document.

```typescript
interface CreationFlowAsset {
  id: AssetId;
  type: "image" | "font" | "vector" | "pdf";
  name: string;
  source: string;
  mimeType?: string;
  width?: number;
  height?: number;
}
```

### Variables

Variables allow dynamic values in documents.

```typescript
interface CreationFlowVariable {
  id: VariableId;
  name: string;
  type: "text" | "number" | "boolean" | "image" | "color";
  defaultValue?: CreationFlowVariableValue;
}
```

### Rules

Rules define conditional behavior (not yet fully implemented).

```typescript
interface CreationFlowRule {
  id: RuleId;
  name: string;
  condition: Record<string, unknown>;
  actions: readonly Record<string, unknown>[];
  enabled: boolean;
}
```

## Branded Types

The schema uses branded types for type-safe IDs:

- `DocumentId`, `PageId`, `SurfaceId`, `ElementId`, `AssetId`
- `WorkspaceId`, `ProductId`, `ConfigurationId`
- `VariableId`, `RuleId`

These prevent accidental mixing of different ID types at compile time.
