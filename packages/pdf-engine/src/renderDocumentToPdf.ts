import PDFDocument from "pdfkit";
import { getElementZIndex } from "@creationflow/core";
import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowImageElement,
  CreationFlowShapeElement,
  CreationFlowSurface,
  CreationFlowTextElement,
  CreationFlowUnit,
  AssetId,
  ElementId,
} from "@creationflow/schema";

const DEFAULT_PAGE_WIDTH = 595.28;
const DEFAULT_PAGE_HEIGHT = 841.89;
const DEFAULT_TEXT_SIZE = 12;

interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface ResolvedPdfAsset {
  readonly data: Uint8Array | Buffer;
  readonly mimeType?: string;
}

export interface RenderDocumentWarning {
  readonly code:
    | "image_resolver_missing"
    | "image_not_found"
    | "image_resolve_failed"
    | "unsupported_image_type"
    | "image_render_failed"
    | "path_render_failed";
  readonly elementId: ElementId;
  readonly assetId?: AssetId;
  readonly message: string;
}

export interface RenderDocumentToPdfOptions {
  readonly compress?: boolean;
  readonly resolveAsset?: (assetId: AssetId) => Promise<ResolvedPdfAsset | null | undefined>;
  readonly onWarning?: (warning: RenderDocumentWarning) => void;
  readonly debugSurfaces?: boolean;
}

export function toPdfUnits(value: number, unit: CreationFlowUnit | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  switch (unit) {
    case "mm":
      return (value * 72) / 25.4;
    case "pt":
    case "px":
    default:
      return value;
  }
}

export function convertTopLeftToPdfY(_pageHeight: number, y: number, _elementHeight: number): number {
  return y;
}

function toPositivePageSize(value: number | undefined, fallback: number, unit?: CreationFlowUnit): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.max(toPdfUnits(value, unit), 1);
}

function parseHexColor(color: string | undefined): RgbColor | undefined {
  if (!color) {
    return undefined;
  }

  const normalized = color.trim().replace(/^#/, "");
  const fullHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  if (!/^[\da-f]{6}$/i.test(fullHex)) {
    return undefined;
  }

  return {
    r: Number.parseInt(fullHex.slice(0, 2), 16),
    g: Number.parseInt(fullHex.slice(2, 4), 16),
    b: Number.parseInt(fullHex.slice(4, 6), 16),
  };
}

function collectElements(elements: readonly CreationFlowElement[]): CreationFlowElement[] {
  const collected: CreationFlowElement[] = [];

  for (const element of elements) {
    collected.push(element);

    if (element.type === "group") {
      collected.push(...collectElements(element.children));
    }
  }

  return collected;
}

function warn(options: RenderDocumentToPdfOptions, warning: RenderDocumentWarning): void {
  options.onWarning?.(warning);
}

function isSupportedImageMimeType(mimeType: string | undefined): boolean {
  return !mimeType || mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/jpg";
}

function setFillColor(doc: PDFKit.PDFDocument, color: string | undefined): boolean {
  const parsed = parseHexColor(color);
  if (!parsed) {
    return false;
  }

  doc.fillColor([parsed.r, parsed.g, parsed.b]);
  return true;
}

function setStrokeColor(doc: PDFKit.PDFDocument, color: string | undefined): boolean {
  const parsed = parseHexColor(color);
  if (!parsed) {
    return false;
  }

  doc.strokeColor([parsed.r, parsed.g, parsed.b]);
  return true;
}

function renderTextElement(
  doc: PDFKit.PDFDocument,
  element: CreationFlowTextElement,
  unit: CreationFlowUnit | undefined,
  offset: { readonly x: number; readonly y: number },
): void {
  if (!element.visible) {
    return;
  }

  const x = offset.x + toPdfUnits(element.x, unit);
  const y = offset.y + toPdfUnits(element.y, unit);
  const width = Math.max(toPdfUnits(element.width, unit), 1);
  const height = Math.max(toPdfUnits(element.height, unit), 1);
  const fontSize = Math.max(toPdfUnits(element.fontSize ?? DEFAULT_TEXT_SIZE, unit), 1);

  doc.fontSize(fontSize);
  setFillColor(doc, element.color) || doc.fillColor("black");
  doc.text(element.text ?? "", x, y, {
    width,
    height,
    align: element.align ?? "left",
  });
}

function renderShapeElement(
  doc: PDFKit.PDFDocument,
  element: CreationFlowShapeElement,
  unit: CreationFlowUnit | undefined,
  offset: { readonly x: number; readonly y: number },
): void {
  if (!element.visible || element.shapeType !== "rect") {
    return;
  }

  const x = offset.x + toPdfUnits(element.x, unit);
  const y = offset.y + toPdfUnits(element.y, unit);
  const width = Math.max(toPdfUnits(element.width, unit), 1);
  const height = Math.max(toPdfUnits(element.height, unit), 1);
  const hasFill = setFillColor(doc, element.fill);
  const hasStroke = setStrokeColor(doc, element.stroke);
  const strokeWidth = Math.max(toPdfUnits(element.strokeWidth ?? 0, unit), 0);

  doc.lineWidth(strokeWidth);
  doc.rect(x, y, width, height);

  if (hasFill && hasStroke && strokeWidth > 0) {
    doc.fillAndStroke();
    return;
  }

  if (hasFill) {
    doc.fill();
    return;
  }

  if (hasStroke && strokeWidth > 0) {
    doc.stroke();
  }
}

async function renderImageElement(
  doc: PDFKit.PDFDocument,
  element: CreationFlowImageElement,
  unit: CreationFlowUnit | undefined,
  offset: { readonly x: number; readonly y: number },
  options: RenderDocumentToPdfOptions,
): Promise<void> {
  if (!element.visible) {
    return;
  }

  if (!options.resolveAsset) {
    warn(options, {
      code: "image_resolver_missing",
      elementId: element.id,
      assetId: element.assetId,
      message: "Image element was skipped because no asset resolver was provided.",
    });
    return;
  }

  let asset: ResolvedPdfAsset | null | undefined;

  try {
    asset = await options.resolveAsset(element.assetId);
  } catch (error) {
    warn(options, {
      code: "image_resolve_failed",
      elementId: element.id,
      assetId: element.assetId,
      message: error instanceof Error ? error.message : "Image asset resolution failed.",
    });
    return;
  }

  if (!asset) {
    warn(options, {
      code: "image_not_found",
      elementId: element.id,
      assetId: element.assetId,
      message: "Image asset was not found.",
    });
    return;
  }

  if (!isSupportedImageMimeType(asset.mimeType)) {
    warn(options, {
      code: "unsupported_image_type",
      elementId: element.id,
      assetId: element.assetId,
      message: `Unsupported image MIME type: ${asset.mimeType}.`,
    });
    return;
  }

  const x = offset.x + toPdfUnits(element.x, unit);
  const y = offset.y + toPdfUnits(element.y, unit);
  const width = Math.max(toPdfUnits(element.width, unit), 1);
  const height = Math.max(toPdfUnits(element.height, unit), 1);
  const image = Buffer.from(asset.data);

  try {
    if (element.fit === "contain") {
      doc.image(image, x, y, { fit: [width, height] });
      return;
    }

    if (element.fit === "cover") {
      doc.image(image, x, y, { cover: [width, height] });
      return;
    }

    doc.image(image, x, y, { width, height });
  } catch (error) {
    warn(options, {
      code: "image_render_failed",
      elementId: element.id,
      assetId: element.assetId,
      message: error instanceof Error ? error.message : "Image rendering failed.",
    });
  }
}

async function renderElement(
  doc: PDFKit.PDFDocument,
  element: CreationFlowElement,
  unit: CreationFlowUnit | undefined,
  offset: { readonly x: number; readonly y: number },
  options: RenderDocumentToPdfOptions,
): Promise<void> {
  switch (element.type) {
    case "text":
      renderTextElement(doc, element, unit, offset);
      break;
    case "shape":
      renderShapeElement(doc, element, unit, offset);
      break;
    case "image":
      await renderImageElement(doc, element, unit, offset, options);
      break;
    case "group":
    case "variable":
      break;
  }
}

function getSurfaceOffset(
  surface: CreationFlowSurface,
  unit: CreationFlowUnit | undefined,
): { readonly x: number; readonly y: number } {
  const positionedSurface = surface as CreationFlowSurface & { readonly x?: number; readonly y?: number };

  return {
    x: toPdfUnits(positionedSurface.x ?? 0, unit),
    y: toPdfUnits(positionedSurface.y ?? 0, unit),
  };
}

function renderPathSurface(
  doc: PDFKit.PDFDocument,
  surface: CreationFlowSurface,
  unit: CreationFlowUnit | undefined,
  offset: { readonly x: number; readonly y: number },
  options: RenderDocumentToPdfOptions,
): void {
  if (!surface.pathData || surface.shape !== "path") {
    return;
  }

  const surfaceOffsetX = offset.x;
  const surfaceOffsetY = offset.y;

  try {
    if (surface.fillColor) {
      const hasFill = setFillColor(doc, surface.fillColor);

      doc.save();
      doc.translate(surfaceOffsetX, surfaceOffsetY);

      try {
        const path = doc.path(surface.pathData);

        if (hasFill) {
          path.fill();
        }
      } catch (error) {
        warn(options, {
          code: "path_render_failed",
          elementId: surface.id as unknown as ElementId,
          message: error instanceof Error ? error.message : "Path rendering failed.",
        });
      }

      doc.restore();
    }
  } catch (error) {
    warn(options, {
      code: "path_render_failed",
      elementId: surface.id as unknown as ElementId,
      message: error instanceof Error ? error.message : "Path surface rendering failed.",
    });
  }
}

function clipToPath(
  doc: PDFKit.PDFDocument,
  surface: CreationFlowSurface,
  unit: CreationFlowUnit | undefined,
  offset: { readonly x: number; readonly y: number },
  options: RenderDocumentToPdfOptions,
): boolean {
  if (!surface.pathData || surface.shape !== "path" || !surface.clipContent) {
    return false;
  }

  const surfaceOffsetX = offset.x;
  const surfaceOffsetY = offset.y;

  try {
    doc.save();
    doc.translate(surfaceOffsetX, surfaceOffsetY);
    
    const path = doc.path(surface.pathData);
    path.clip();
    
    return true;
  } catch (error) {
    warn(options, {
      code: "path_render_failed",
      elementId: surface.id as unknown as ElementId,
      message: `Path clipping failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
    return false;
  }
}

function clipToRect(
  doc: PDFKit.PDFDocument,
  surface: CreationFlowSurface,
  unit: CreationFlowUnit | undefined,
  offset: { readonly x: number; readonly y: number },
): boolean {
  if (!surface.clipContent || surface.shape === "path") {
    return false;
  }

  const width = toPdfUnits(surface.width, unit);
  const height = toPdfUnits(surface.height, unit);

  doc.save();
  doc.translate(offset.x, offset.y);
  doc.rect(0, 0, width, height);
  doc.clip();
  
  return true;
}

function renderSurfaceDebugOverlays(
  doc: PDFKit.PDFDocument,
  surfaces: readonly CreationFlowSurface[],
  unit: CreationFlowUnit | undefined,
): void {
  if (!surfaces.length) return;

  doc.save();

  for (const surface of surfaces) {
    const offset = getSurfaceOffset(surface, unit);
    const width = toPdfUnits(surface.width, unit);
    const height = toPdfUnits(surface.height, unit);
    const role = surface.role ?? "default";

    let strokeColor: [number, number, number];
    let strokeWidth = 1;
    let dashPattern: number[] | undefined;

    switch (role) {
      case "colorRegion":
        strokeColor = [0, 102, 255];
        break;
      case "designRegion":
        strokeColor = [255, 0, 102];
        break;
      case "overlay":
        strokeColor = [102, 102, 102];
        strokeWidth = 0.5;
        dashPattern = [5, 5];
        break;
      default:
        strokeColor = [0, 204, 0];
    }

    doc.save();
    doc.translate(offset.x, offset.y);

    if (surface.shape === "path" && surface.pathData) {
      doc.strokeColor(strokeColor);
      doc.lineWidth(strokeWidth);
      if (dashPattern) {
        doc.dash(dashPattern[0], { space: dashPattern[1] });
      }
      const path = doc.path(surface.pathData);
      path.stroke();
      if (dashPattern) {
        doc.undash();
      }
    } else {
      doc.strokeColor(strokeColor);
      doc.lineWidth(strokeWidth);
      if (dashPattern) {
        doc.dash(dashPattern[0], { space: dashPattern[1] });
      }
      doc.rect(0, 0, width, height);
      doc.stroke();
      if (dashPattern) {
        doc.undash();
      }
    }

    doc.fontSize(8);
    doc.fillColor(strokeColor);
    const label = `${surface.name || "Surface"} (${role})`;
    doc.text(label, 2, 2, { width: Math.max(width - 4, 50), align: "left" });

    doc.restore();
  }

  doc.restore();
}

export async function renderDocumentToPdf(
  document: CreationFlowDocument,
  options: RenderDocumentToPdfOptions = {},
): Promise<Buffer> {
  const pages = document.pages.length > 0 ? document.pages : [];
  const firstPage = pages[0];
  const firstUnit = firstPage?.unit ?? "pt";
  const firstWidth = toPositivePageSize(firstPage?.width, DEFAULT_PAGE_WIDTH, firstUnit);
  const firstHeight = toPositivePageSize(firstPage?.height, DEFAULT_PAGE_HEIGHT, firstUnit);

  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      autoFirstPage: false,
      margin: 0,
      compress: options.compress ?? true,
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    void (async () => {
      if (pages.length === 0) {
        doc.addPage({ size: [firstWidth, firstHeight], margin: 0 });
        doc.end();
        return;
      }

      for (const page of pages) {
        const unit = page.unit ?? "pt";
        const width = toPositivePageSize(page.width, DEFAULT_PAGE_WIDTH, unit);
        const height = toPositivePageSize(page.height, DEFAULT_PAGE_HEIGHT, unit);

        doc.addPage({ size: [width, height], margin: 0 });

        const surfaces = page.surfaces ?? [];

        for (const surface of surfaces) {
          const offset = getSurfaceOffset(surface, unit);

          if (surface.shape === "path" && surface.pathData) {
            renderPathSurface(doc, surface, unit, offset, options);
          }

          const elements = collectElements(surface.elements);
          elements.sort((a, b) => getElementZIndex(a) - getElementZIndex(b));

          let clipped = false;
          const isPathClip = surface.shape === "path" && surface.pathData && surface.clipContent;
          const isRectClip = surface.clipContent && surface.shape !== "path";

          if (isPathClip) {
            clipped = clipToPath(doc, surface, unit, offset, options);
          } else if (isRectClip) {
            clipped = clipToRect(doc, surface, unit, offset);
          }

          const elementOffset = clipped
            ? { x: 0, y: 0 }
            : offset;

          for (const element of elements) {
            await renderElement(doc, element, unit, elementOffset, options);
          }

          if (clipped) {
            doc.restore();
          }
        }

        if (options.debugSurfaces) {
          renderSurfaceDebugOverlays(doc, surfaces, unit);
        }
      }

      doc.end();
    })().catch((error: unknown) => {
      doc.destroy();
      reject(error);
    });
  });
}
