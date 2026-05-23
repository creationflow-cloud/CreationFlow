# @creationflow/pdf-engine

PDF render plan and PDF generation for CreationFlow.

## Exports

### Render Plan

- `createPdfRenderPlan()` — converts a `CreationFlowDocument` to a `PdfRenderPlan` with pages, surfaces, and elements sorted by zIndex

### PDF Generation

- `renderDocumentToPdf()` — generates a PDF using pdfkit
- `toPdfUnits()` — converts document units to PDF points
- `convertTopLeftToPdfY()` — converts top-left Y coordinates to PDF's bottom-left coordinate system

### Types

- `PdfRenderPlan` — render plan with pages and elements
- `PdfRenderPlanPage` — page with dimensions and elements
- `PdfRenderPlanElement` — element with position, size, zIndex, visibility
- `RenderDocumentToPdfOptions` — options for PDF generation
- `RenderDocumentWarning` — warning type for rendering issues
- `ResolvedPdfAsset` — resolved asset reference

## Current Status

- Render plan generation is complete
- PDF generation with pdfkit exists but is incomplete:
  - Page creation and coordinate conversion work
  - Text, image, and shape rendering are not yet fully implemented
  - Asset resolution from storage is not connected
