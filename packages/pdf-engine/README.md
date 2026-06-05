# @creationflow/pdf-engine

PDF render plan and PDF generation for CreationFlow.

## Exports

### Render Plan

- `createPdfRenderPlan()` — converts a `CreationFlowDocument` to a `PdfRenderPlan` with pages, surfaces, and elements sorted by zIndex

### PDF Generation

- `renderDocumentToPdf()` — generates a PDF using pdfkit
- `toPdfUnits()` — converts document units to PDF points
- `convertTopLeftToPdfY()` — converts top-left Y coordinates to PDF's bottom-left coordinate system
- `DEFAULT_TARGET_DPI` / `DEFAULT_MIN_ASSET_DPI` — print quality defaults (300 / 150)

### Types

- `PdfRenderPlan` — render plan with pages and elements
- `PdfRenderPlanPage` — page with dimensions and elements
- `PdfRenderPlanElement` — element with position, size, zIndex, visibility
- `RenderDocumentToPdfOptions` — options for PDF generation
- `RenderDocumentWarning` — warning type for rendering issues
- `ResolvedPdfAsset` — resolved asset reference

## Current Status

- Render plan generation is complete
- PDF generation with pdfkit is in place:
  - Page creation, coordinate conversion (pt/mm/px) and Y-axis handling
  - Text, image (fit modes), shape, group, pattern, and surface role rendering
  - Asset resolution from storage via `resolveAsset` / `resolveFont`
  - Bleed / safe area / debug overlays
  - DPI configuration and image resolution checks

## DPI configuration

The engine prints at a target DPI and warns when image assets fall below a
configured minimum:

- `metadata.dpi` / `metadata.minAssetDpi` set the print quality for a document
- `RenderDocumentToPdfOptions.targetDpi` / `minAssetDpi` override the metadata
  for a single render (e.g. a draft vs. production run)
- Defaults: `DEFAULT_TARGET_DPI = 300`, `DEFAULT_MIN_ASSET_DPI = 150`
- Low-resolution assets emit an `image_low_resolution` warning that can be
  surfaced to the operator via `onWarning`
