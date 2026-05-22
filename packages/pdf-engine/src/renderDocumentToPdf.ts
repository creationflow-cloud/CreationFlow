import PDFDocument from "pdfkit";
import { getElementZIndex } from "@creationflow/core";
import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowShapeElement,
  CreationFlowSurface,
  CreationFlowTextElement,
  CreationFlowUnit,
} from "@creationflow/schema";

const DEFAULT_PAGE_WIDTH = 595.28;
const DEFAULT_PAGE_HEIGHT = 841.89;
const DEFAULT_TEXT_SIZE = 12;

interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface RenderDocumentToPdfOptions {
  readonly compress?: boolean;
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

export function toPdfTopLeftY(y: number, unit: CreationFlowUnit | undefined): number {
  // PDFKit high-level drawing APIs use top-left coordinates, matching the Editor canvas.
  // Do not convert to bottom-left coordinates here.
  return toPdfUnits(y, unit);
}

export function convertTopLeftToPdfY(_pageHeight: number, y: number, _elementHeight: number): number {
  // Backward-compatible alias. PDFKit rendering uses top-left coordinates, so y is unchanged.
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
  const y = offset.y + toPdfTopLeftY(element.y, unit);
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
  const y = offset.y + toPdfTopLeftY(element.y, unit);
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

function renderElement(
  doc: PDFKit.PDFDocument,
  element: CreationFlowElement,
  unit: CreationFlowUnit | undefined,
  offset: { readonly x: number; readonly y: number },
): void {
  switch (element.type) {
    case "text":
      renderTextElement(doc, element, unit, offset);
      break;
    case "shape":
      renderShapeElement(doc, element, unit, offset);
      break;
    case "image":
      // TODO: Render images once the PDF engine receives asset bytes or a storage resolver for assetId.
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

      const elements = (page.surfaces ?? [])
        .flatMap((surface) => {
          const offset = getSurfaceOffset(surface, unit);

          return collectElements(surface.elements).map((element) => ({ element, offset }));
        })
        .sort((a, b) => getElementZIndex(a.element) - getElementZIndex(b.element));

      for (const { element, offset } of elements) {
        renderElement(doc, element, unit, offset);
      }
    }

    doc.end();
  });
}
