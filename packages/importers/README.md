# @creationflow/importers

SVG importer for CreationFlow.

## Exports

- `importSvgSurfaces()` — analyze SVG markup and extract surfaces with shape, role, path data, and fill color
- `parseSvg()` — low-level SVG parser

## Types

- `SvgSurfaceImportResult` — result of SVG import with surfaces and warnings
- `ImportedSurface` — surface extracted from SVG
- `ImportWarning` — warning during import

## Usage

Used by the Admin UI to import surfaces from SVG files into template pages.
