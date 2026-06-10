# Rendering and PDF Generation

This document describes the current state of the rendering pipeline and PDF generation in CreationFlow.

## Current Render Pipeline

The render pipeline is partially implemented. Here is the flow:

1. **Editor creates a render job** — `POST /render-jobs` with a `configurationId`
2. **Editor triggers rendering** — `POST /render-jobs/:id/render`
3. **API processes the render job** — the render route uses the PDF engine to generate output
4. **PDF output is stored** — the output metadata is saved to the render job
5. **Editor downloads the PDF** — `GET /render-jobs/:id/output/pdf`

## PDF Engine (`@creationflow/pdf-engine`)

### Render Plan

`createPdfRenderPlan()` converts a `CreationFlowDocument` into a `PdfRenderPlan`:

```typescript
interface PdfRenderPlan {
  documentId: DocumentId;
  documentVersion: string;
  pages: PdfRenderPlanPage[];
}

interface PdfRenderPlanPage {
  pageId: PageId;
  name: string;
  width: number;
  height: number;
  unit: CreationFlowUnit;
  elements: PdfRenderPlanElement[];
}

interface PdfRenderPlanElement {
  elementId: ElementId;
  type: CreationFlowElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
}
```

The render plan:

- Iterates through all pages and surfaces
- Collects all elements (including children of group elements)
- Sorts elements by zIndex for correct rendering order
- Does **not** include element-specific properties (text content, colors, image data, etc.)

### PDF Generation

`renderDocumentToPdf()` generates a PDF using **pdfkit**:

- Converts document units to PDF points
- Converts top-left Y coordinates to PDF's bottom-left coordinate system
- Creates pages with the correct dimensions
- Renders elements based on their type

**Current status**: The PDF generation code exists and handles:

- Page creation with proper dimensions
- Coordinate conversion (top-left to PDF Y-axis)
- Unit conversion (px, mm, pt to PDF points)
- Basic element rendering

**What is missing for complete PDF output**:

- **Text rendering** — font loading, text layout, text styling (font family, size, weight, color, alignment)
- **Image rendering** — loading images from assets, embedding images in PDF, fit mode handling
- **Shape rendering** — drawing rectangles, ellipses, lines with fill and stroke
- **Group rendering** — recursively rendering grouped elements
- **Variable rendering** — resolving variable values
- **Bleed and safe area** — handling print area, bleed, and safe area margins
- **Color management** — CMYK color support for print
- **High-resolution output** — DPI settings for print-quality output
- **Surface roles** — handling color regions, design regions, overlays, and path-based surfaces
- **Asset resolution** — loading images from the storage provider

## Renderer (`apps/renderer`)

The renderer app is a **placeholder**. It currently contains:

- `render-plan.ts` — minimal render plan type

It is not yet connected to the render job workflow. The API currently handles rendering inline via the PDF engine.

## Worker (`apps/worker`)

The worker app is a **placeholder**. It currently contains:

- `jobs.ts` — minimal job type

There is no queue system, Redis integration, or background job processing.

## Storage (`@creationflow/storage`)

Storage providers exist for saving and loading files:

- **FileSystemStorageProvider** — stores files on the local disk
- **MemoryStorageProvider** — in-memory storage for testing
- **StorageProvider interface** — pluggable abstraction

The API registers the storage plugin and uses it for asset file uploads and downloads.

## Render Job Status

Render jobs track their progress through these statuses:

| Status       | Description                            |
| ------------ | -------------------------------------- |
| `PENDING`    | Job created, not yet processed         |
| `PROCESSING` | Job is being rendered                  |
| `DONE`       | Rendering complete, output available   |
| `FAILED`     | Rendering failed, error message stored |

## Next Steps for Real PDF Output

To produce print-ready PDFs, the following work is needed:

1. **Text rendering** — integrate font loading and text drawing with pdfkit
2. **Image rendering** — resolve asset IDs to file paths and embed images
3. **Shape rendering** — implement rectangle, ellipse, and line drawing
4. **Group handling** — recursive element rendering for groups
5. **Asset resolution** — connect the storage provider to the PDF engine
6. **Print settings** — bleed, safe area, CMYK colors, DPI
7. **Surface roles** — handle path-based surfaces, color regions, overlays
8. **Background rendering** — move rendering to the worker service
9. **Output storage** — save generated PDFs and serve them via the API
