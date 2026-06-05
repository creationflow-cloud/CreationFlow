import PDFDocument from "pdfkit";
import { getElementZIndex } from "@creationflow/core";
import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowGroupElement,
  CreationFlowImageElement,
  CreationFlowPatternElement,
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
const STANDARD_FONT_FAMILIES = new Set(["Courier", "Helvetica", "Times"]);

interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface ResolvedPdfAsset {
  readonly data: Uint8Array | Buffer;
  readonly mimeType?: string;
}

export interface ResolvedPdfFont {
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
    | "font_resolver_missing"
    | "font_not_found"
    | "font_resolve_failed"
    | "font_load_failed"
    | "path_render_failed"
    | "pattern_resolver_missing"
    | "pattern_asset_not_found"
    | "pattern_render_failed";
  readonly elementId: ElementId;
  readonly assetId?: AssetId;
  readonly message: string;
}

export interface RenderDocumentToPdfOptions {
  readonly compress?: boolean;
  readonly resolveAsset?: (assetId: AssetId) => Promise<ResolvedPdfAsset | null | undefined>;
  readonly resolveFont?: (fontFamily: string, fontWeight?: string) => Promise<ResolvedPdfFont | null | undefined>;
  readonly onWarning?: (warning: RenderDocumentWarning) => void;
  readonly debugSurfaces?: boolean;
}

interface RenderDocumentState {
  readonly fontCache: Map<string, string>;
}

export function toPdfUnits(value: number, unit: CreationFlowUnit | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  switch (unit) {
    case "mm":
      return (value * 72) / 25.4;
    case "pt":
      return value;
    case "px":
      return (value * 72) / 96;
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

function getPdfTextFontName(fontFamily: string | undefined, fontWeight: string | undefined): string {
  const requestedFamily = (fontFamily ?? "Helvetica").trim();
  const family = STANDARD_FONT_FAMILIES.has(requestedFamily) ? requestedFamily : "Helvetica";
  const normalizedWeight = (fontWeight ?? "").toLowerCase();
  const isBold = normalizedWeight === "bold" || Number(normalizedWeight) >= 600;

  if (!isBold) {
    return family === "Times" ? "Times-Roman" : family;
  }

  if (family === "Times") {
    return "Times-Bold";
  }

  return `${family}-Bold`;
}

function getFontCacheKey(fontFamily: string | undefined, fontWeight: string | undefined): string {
  return `${fontFamily ?? "Helvetica"}:${fontWeight ?? "normal"}`;
}

async function setTextFont(
  doc: PDFKit.PDFDocument,
  element: CreationFlowTextElement,
  options: RenderDocumentToPdfOptions,
  state: RenderDocumentState,
): Promise<void> {
  const requestedFamily = element.fontFamily?.trim() || "Helvetica";

  if (STANDARD_FONT_FAMILIES.has(requestedFamily)) {
    doc.font(getPdfTextFontName(requestedFamily, element.fontWeight));
    return;
  }

  const cacheKey = getFontCacheKey(requestedFamily, element.fontWeight);
  const cachedFontName = state.fontCache.get(cacheKey);

  if (cachedFontName) {
    doc.font(cachedFontName);
    return;
  }

  if (!options.resolveFont) {
    warn(options, {
      code: "font_resolver_missing",
      elementId: element.id,
      message: `Font family "${requestedFamily}" fell back to Helvetica because no font resolver was provided.`,
    });
    doc.font(getPdfTextFontName("Helvetica", element.fontWeight));
    return;
  }

  let font: ResolvedPdfFont | null | undefined;

  try {
    font = await options.resolveFont(requestedFamily, element.fontWeight);
  } catch (error) {
    warn(options, {
      code: "font_resolve_failed",
      elementId: element.id,
      message: error instanceof Error ? error.message : `Font family "${requestedFamily}" could not be resolved.`,
    });
    doc.font(getPdfTextFontName("Helvetica", element.fontWeight));
    return;
  }

  if (!font) {
    warn(options, {
      code: "font_not_found",
      elementId: element.id,
      message: `Font family "${requestedFamily}" was not found and fell back to Helvetica.`,
    });
    doc.font(getPdfTextFontName("Helvetica", element.fontWeight));
    return;
  }

  const fontName = `CreationFlowFont${state.fontCache.size + 1}`;

  try {
    doc.registerFont(fontName, Buffer.from(font.data));
    state.fontCache.set(cacheKey, fontName);
    doc.font(fontName);
  } catch (error) {
    warn(options, {
      code: "font_load_failed",
      elementId: element.id,
      message: error instanceof Error ? error.message : `Font family "${requestedFamily}" could not be loaded.`,
    });
    doc.font(getPdfTextFontName("Helvetica", element.fontWeight));
  }
}

async function renderTextElement(
  doc: PDFKit.PDFDocument,
  element: CreationFlowTextElement,
  unit: CreationFlowUnit | undefined,
  offset: { readonly x: number; readonly y: number },
  options: RenderDocumentToPdfOptions,
  state: RenderDocumentState,
): Promise<void> {
  if (!element.visible) {
    return;
  }

  const x = offset.x + toPdfUnits(element.x, unit);
  const y = offset.y + toPdfUnits(element.y, unit);
  const width = Math.max(toPdfUnits(element.width, unit), 1);
  const height = Math.max(toPdfUnits(element.height, unit), 1);
  const fontSize = Math.max(toPdfUnits(element.fontSize ?? DEFAULT_TEXT_SIZE, unit), 1);

  await setTextFont(doc, element, options, state);
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
  if (!element.visible) {
    return;
  }

  const x = offset.x + toPdfUnits(element.x, unit);
  const y = offset.y + toPdfUnits(element.y, unit);
  const width = Math.max(toPdfUnits(element.width, unit), 1);
  const height = Math.max(toPdfUnits(element.height, unit), 1);
  const hasFill = setFillColor(doc, element.fill);
  const hasStroke = setStrokeColor(doc, element.stroke);
  const strokeWidth = Math.max(toPdfUnits(element.strokeWidth ?? 0, unit), 0);

  doc.save();

  if (element.rotation) {
    doc.rotate(element.rotation, { origin: [x + width / 2, y + height / 2] });
  }

  doc.lineWidth(strokeWidth);

  if (element.shapeType === "line") {
    if (hasStroke && strokeWidth > 0) {
      doc.moveTo(x, y);
      doc.lineTo(x + width, y + height);
      doc.stroke();
    }

    doc.restore();
    return;
  }

  if (element.shapeType === "ellipse") {
    doc.ellipse(x + width / 2, y + height / 2, width / 2, height / 2);
  } else {
    doc.rect(x, y, width, height);
  }

  if (hasFill && hasStroke && strokeWidth > 0) {
    doc.fillAndStroke();
    doc.restore();
    return;
  }

  if (hasFill) {
    doc.fill();
    doc.restore();
    return;
  }

  if (hasStroke && strokeWidth > 0) {
    doc.stroke();
  }

  doc.restore();
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

function renderBuiltinPdfPatternShape(
  doc: PDFKit.PDFDocument,
  patternId: string,
  x: number,
  y: number,
  tileW: number,
  tileH: number,
  color: RgbColor,
): void {
  const halfW = tileW / 2;
  const halfH = tileH / 2;

  doc.fillColor([color.r, color.g, color.b]);

  switch (patternId) {
    case "dots":
      doc.circle(x + halfW, y + halfH, tileW * 0.25);
      doc.fill();
      break;
    case "stripes":
      doc.rect(x, y, tileW, halfH);
      doc.fill();
      break;
    case "diamonds":
      doc.path(`M${x + halfW} ${y} L${x + tileW} ${y + halfH} L${x + halfW} ${y + tileH} L${x} ${y + halfH} Z`);
      doc.fill();
      break;
    case "waves": {
      const sw = Math.max(1, tileW * 0.1);
      doc.strokeColor([color.r, color.g, color.b]);
      doc.lineWidth(sw);
      doc.path(`M${x} ${y + halfH} C${x + tileW * 0.25} ${y} ${x + tileW * 0.75} ${y} ${x + halfW} ${y + halfH} C${x + tileW * 0.75} ${y + tileH} ${x + tileW * 0.25} ${y + tileH} ${x + tileW} ${y + halfH}`);
      doc.stroke();
      break;
    }
    case "zigzag": {
      const sw = Math.max(1, tileW * 0.1);
      doc.strokeColor([color.r, color.g, color.b]);
      doc.lineWidth(sw);
      doc.path(`M${x} ${y + halfH} L${x + tileW * 0.25} ${y + halfH * 0.2} L${x + halfW} ${y + halfH} L${x + tileW * 0.75} ${y + halfH * 0.2} L${x + tileW} ${y + halfH}`);
      doc.stroke();
      break;
    }
    case "crosses": {
      const cw = tileW * 0.15;
      doc.rect(x + halfW - cw, y + quarterH(tileH), cw * 2, halfH);
      doc.fill();
      doc.rect(x + quarterW(tileW), y + halfH - cw, halfW, cw * 2);
      doc.fill();
      break;
    }
    case "stars": {
      const cx = x + halfW;
      const cy = y + halfH;
      const outerR = tileW * 0.4;
      const innerR = tileW * 0.18;
      doc.path(buildStarPath(cx, cy, outerR, innerR, 5));
      doc.fill();
      break;
    }
    case "circles": {
      const sw = Math.max(1, tileW * 0.1);
      doc.strokeColor([color.r, color.g, color.b]);
      doc.lineWidth(sw);
      doc.circle(x + halfW, y + halfH, tileW * 0.35);
      doc.stroke();
      break;
    }
    default:
      doc.rect(x, y, tileW, tileH);
      doc.fill();
      break;
  }
}

function quarterW(w: number): number { return w / 4; }
function quarterH(h: number): number { return h / 4; }

function buildStarPath(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  const segments = points * 2;
  const angleStep = Math.PI / points;
  let path = "";
  for (let i = 0; i < segments; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + i * angleStep;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    path += (i === 0 ? "M" : "L") + `${px} ${py} `;
  }
  return path + "Z";
}

const BUILTIN_PATTERN_IDS = new Set(["dots", "stripes", "crosses", "diamonds", "waves", "zigzag", "stars", "circles"]);

async function renderPatternElement(
  doc: PDFKit.PDFDocument,
  element: CreationFlowPatternElement,
  surface: CreationFlowSurface,
  unit: CreationFlowUnit | undefined,
  offset: { readonly x: number; readonly y: number },
  options: RenderDocumentToPdfOptions,
): Promise<void> {
  if (!element.visible) {
    return;
  }

  const surfaceW = toPdfUnits(surface.width, unit);
  const surfaceH = toPdfUnits(surface.height, unit);
  const tileW = toPdfUnits(element.tileWidth, unit);
  const tileH = toPdfUnits(element.tileHeight, unit);
  const gapX = toPdfUnits(element.gapX, unit);
  const gapY = toPdfUnits(element.gapY, unit);
  const offX = toPdfUnits(element.offsetX, unit);
  const offY = toPdfUnits(element.offsetY, unit);

  const stepX = element.repeatMode === "vertical" ? surfaceW : tileW + gapX;
  const stepY = element.repeatMode === "horizontal" ? surfaceH : tileH + gapY;

  const patternColor = parseHexColor(element.color) ?? { r: 36, g: 59, b: 104 };

  doc.save();
  doc.translate(offset.x, offset.y);

  if (element.rotation) {
    doc.rotate(element.rotation, { origin: [surfaceW / 2, surfaceH / 2] });
  }

  if (element.opacity < 1) {
    doc.opacity(element.opacity);
  }

  const isBuiltin = BUILTIN_PATTERN_IDS.has(element.assetId);

  if (isBuiltin) {
    for (let y = offY; y < surfaceH + tileH; y += stepY) {
      for (let x = offX; x < surfaceW + tileW; x += stepX) {
        renderBuiltinPdfPatternShape(doc, element.assetId, x, y, tileW, tileH, patternColor);
      }
    }
  } else {
    if (!options.resolveAsset) {
      warn(options, {
        code: "pattern_resolver_missing",
        elementId: element.id,
        assetId: element.assetId,
        message: "Pattern element was skipped because no asset resolver was provided.",
      });
      doc.restore();
      return;
    }

    let asset: ResolvedPdfAsset | null | undefined;
    try {
      asset = await options.resolveAsset(element.assetId);
    } catch (error) {
      warn(options, {
        code: "pattern_asset_not_found",
        elementId: element.id,
        assetId: element.assetId,
        message: error instanceof Error ? error.message : "Pattern asset resolution failed.",
      });
      doc.restore();
      return;
    }

    if (!asset) {
      warn(options, {
        code: "pattern_asset_not_found",
        elementId: element.id,
        assetId: element.assetId,
        message: "Pattern asset was not found.",
      });
      doc.restore();
      return;
    }

    if (!isSupportedImageMimeType(asset.mimeType)) {
      warn(options, {
        code: "unsupported_image_type",
        elementId: element.id,
        assetId: element.assetId,
        message: `Unsupported image MIME type: ${asset.mimeType}.`,
      });
      doc.restore();
      return;
    }

    const image = Buffer.from(asset.data);
    try {
      for (let y = offY; y < surfaceH + tileH; y += stepY) {
        for (let x = offX; x < surfaceW + tileW; x += stepX) {
          doc.image(image, x, y, { width: tileW, height: tileH });
        }
      }
    } catch (error) {
      warn(options, {
        code: "pattern_render_failed",
        elementId: element.id,
        assetId: element.assetId,
        message: error instanceof Error ? error.message : "Pattern rendering failed.",
      });
    }
  }

  doc.restore();
}

async function renderElement(
  doc: PDFKit.PDFDocument,
  element: CreationFlowElement,
  surface: CreationFlowSurface,
  unit: CreationFlowUnit | undefined,
  offset: { readonly x: number; readonly y: number },
  options: RenderDocumentToPdfOptions,
  state: RenderDocumentState,
): Promise<void> {
  switch (element.type) {
    case "text":
      await renderTextElement(doc, element, unit, offset, options, state);
      break;
    case "shape":
      renderShapeElement(doc, element, unit, offset);
      break;
    case "image":
      await renderImageElement(doc, element, unit, offset, options);
      break;
    case "pattern":
      await renderPatternElement(doc, element, surface, unit, offset, options);
      break;
    case "group":
      await renderGroupElement(doc, element, surface, unit, offset, options, state);
      break;
    case "variable":
      break;
  }
}

async function renderGroupElement(
  doc: PDFKit.PDFDocument,
  group: CreationFlowGroupElement,
  surface: CreationFlowSurface,
  unit: CreationFlowUnit | undefined,
  offset: { readonly x: number; readonly y: number },
  options: RenderDocumentToPdfOptions,
  state: RenderDocumentState,
): Promise<void> {
  if (group.visible === false) {
    return;
  }

  const childCount = group.children.length;
  if (childCount === 0) {
    return;
  }

  const groupX = toPdfUnits(group.x, unit);
  const groupY = toPdfUnits(group.y, unit);
  const childOffset = { x: offset.x + groupX, y: offset.y + groupY };

  const hasTransform = !!group.rotation || group.opacity < 1;
  if (hasTransform) {
    doc.save();
    doc.translate(childOffset.x, childOffset.y);

    if (group.rotation) {
      doc.rotate(group.rotation, { origin: [0, 0] });
    }

    if (group.opacity < 1) {
      doc.opacity(group.opacity);
    }
  }

  const renderOffset = hasTransform
    ? { x: 0, y: 0 }
    : childOffset;

  const sortedChildren = [...group.children].sort(
    (a, b) => getElementZIndex(a) - getElementZIndex(b),
  );

  for (const child of sortedChildren) {
    await renderElement(doc, child, surface, unit, renderOffset, options, state);
  }

  if (hasTransform) {
    doc.restore();
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

function getPageBleed(surfaces: readonly CreationFlowSurface[], unit: CreationFlowUnit | undefined): number {
  return surfaces.reduce((maxBleed, surface) => {
    const bleed = toPdfUnits(surface.printArea?.bleed ?? 0, unit);

    return Number.isFinite(bleed) && bleed > maxBleed ? bleed : maxBleed;
  }, 0);
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
  pageBleed: number,
): void {
  if (!surfaces.length) return;

  doc.save();

  for (const surface of surfaces) {
    const surfaceOffset = getSurfaceOffset(surface, unit);
    const offset = { x: surfaceOffset.x + pageBleed, y: surfaceOffset.y + pageBleed };
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

    if (surface.printArea?.safeArea) {
      const safeArea = surface.printArea.safeArea;
      doc.strokeColor([255, 153, 0]);
      doc.lineWidth(0.5);
      doc.dash(3, { space: 3 });
      doc.rect(
        toPdfUnits(safeArea.x, unit),
        toPdfUnits(safeArea.y, unit),
        toPdfUnits(safeArea.width, unit),
        toPdfUnits(safeArea.height, unit),
      );
      doc.stroke();
      doc.undash();
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
    const state: RenderDocumentState = {
      fontCache: new Map(),
    };
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
        const surfaces = page.surfaces ?? [];
        const pageBleed = getPageBleed(surfaces, unit);
        const width = toPositivePageSize(page.width, DEFAULT_PAGE_WIDTH, unit) + pageBleed * 2;
        const height = toPositivePageSize(page.height, DEFAULT_PAGE_HEIGHT, unit) + pageBleed * 2;

        doc.addPage({ size: [width, height], margin: 0 });

        for (const surface of surfaces) {
          const surfaceOffset = getSurfaceOffset(surface, unit);
          const offset = { x: surfaceOffset.x + pageBleed, y: surfaceOffset.y + pageBleed };

          if (surface.shape === "path" && surface.pathData) {
            renderPathSurface(doc, surface, unit, offset, options);
          }

          const elements = [...surface.elements].sort(
            (a, b) => getElementZIndex(a) - getElementZIndex(b),
          );

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
            await renderElement(doc, element, surface, unit, elementOffset, options, state);
          }

          if (clipped) {
            doc.restore();
          }
        }

        if (options.debugSurfaces) {
          renderSurfaceDebugOverlays(doc, surfaces, unit, pageBleed);
        }
      }

      doc.end();
    })().catch((error: unknown) => {
      doc.destroy();
      reject(error);
    });
  });
}
