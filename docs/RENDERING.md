# Rendering and PDF Generation

This document describes the current state of the rendering pipeline and PDF generation in CreationFlow.

## Current Render Pipeline

The render pipeline is fully implemented for MVP output. Here is the flow:

1. **Editor creates a render job** — `POST /render-jobs` with a `configurationId`
2. **Editor triggers rendering** — `POST /render-jobs/:id/render`
3. **API processes the render job** — the render route uses the PDF engine to generate output (`apps/api/src/routes/render-jobs.ts`)
4. **PDF output is stored** — the output metadata is saved to the render job
5. **Editor downloads the PDF** — `GET /render-jobs/:id/output/pdf`

The worker (`apps/worker`) implements the same pipeline as a standalone consumer and propagates an `X-API-Key` header (`apps/worker/src/jobs.ts`). It is exercised by integration tests in `apps/worker/src/render-pipeline.test.ts`.

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
- Renders elements based on their type:
  - **Text** — font loading, text layout, styling
  - **Shape** — rectangles, ellipses, lines with fill and stroke
  - **Image** — assets resolved from storage and embedded with fit modes
  - **Group** — recursive rendering of grouped elements
  - **Variable** — variable values resolved during render
- Surface role handling for path-based surfaces, color regions, design regions, and overlays

A bug in `setFillColor` was fixed and the `targetDpi` / `minWidthInches` parameters were removed (the engine now relies on document units directly). See `packages/pdf-engine/src/renderDocumentToPdf.ts`.

### Golden Tests

The PDF engine ships 95 golden tests under `packages/pdf-engine/src/__tests__/golden/` that pin the byte output of the PDF stream. They cover text, shape, image, group, surface-role, and the requireVariable warning path.

## Renderer (`apps/renderer`)

`apps/renderer` is no longer a placeholder. It contains:

- `render-plan-builder.ts` — builds `PdfRenderPlan` from a `CreationFlowDocument`
- `render-job-status.ts` — typed enum/helpers for the `RenderJob` state machine
- Unit tests for both helpers (`apps/renderer/src/*.test.ts`)

The API still handles rendering inline through the PDF engine, but the renderer is in place to take over the render-plan step in worker-driven jobs.

## Worker (`apps/worker`)

`apps/worker` is no longer a placeholder. It contains:

- `jobs.ts` — `RenderWorkerOptions` with `apiKey`, `performRenderRequest` sets `X-API-Key`
- `render-pipeline.test.ts` — integration tests for the end-to-end render flow

The worker entry does not yet connect to a real Redis queue; the queue plumbing is exercised in tests with an in-memory dispatch.

## Storage (`@creationflow/storage`)

Storage providers exist for saving and loading files:

- **FileSystemStorageProvider** — stores files on the local disk
- **MemoryStorageProvider** — in-memory storage for testing
- **StorageProvider interface** — pluggable abstraction

The API registers the storage plugin and uses it for asset file uploads and downloads. Asset uploads run through `apps/api/src/services/asset-upload.ts` which:

- sanitizes SVG uploads with `sanitize-html`
- validates PDF uploads by magic bytes (`%PDF-` header + `%%EOF` trailer, 200-byte minimum)

## Render Job Status

Render jobs track their progress through these statuses:

| Status       | Description                            |
| ------------ | -------------------------------------- |
| `PENDING`    | Job created, not yet processed         |
| `PROCESSING` | Job is being rendered                  |
| `DONE`       | Rendering complete, output available   |
| `FAILED`     | Rendering failed, error message stored |

## Next Steps for Production Hardening

For higher print fidelity and operational maturity, the following work is still open:

1. **Bleed and safe area** — handle print area, bleed, and safe area margins
2. **DPI configuration** — configurable resolution for print-quality output
3. **CMYK color support** — convert RGB to CMYK for print output
4. **Font embedding** — embed fonts in PDF for consistent output
5. **Preflight warnings** — validate image resolution, font availability, bleed violations
6. **Background rendering via real queue** — replace in-memory dispatch with Redis
7. **Output storage provider for PDFs** — save generated PDFs and serve them via the API
