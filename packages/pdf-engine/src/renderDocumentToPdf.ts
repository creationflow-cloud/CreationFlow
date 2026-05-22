import PDFDocument from "pdfkit";
import { getElementZIndex } from "@creationflow/core";
import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowShapeElement,
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

export function convertTopLeftToPdfY(pageHeight: number, y: number, elementHeight: number): number {
  // CreationFlow UI coordinates start at the top-left. Raw PDF coordinates start at the bottom-left.
  return pageHeight - y - elementHeight;
}

function unitToPoints(value: number, unit: CreationFlowUnit | undefined): number {
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

function toPositivePageSize(value: number | undefined, fallback: number, unit?: CreationFlowUnit): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.max(unitToPoints(value, unit), 1);
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
  pageHeight: number,
  unit: CreationFlowUnit | undefined,
): void {
  if (!element.visible) {
    return;
  }

  const x = unitToPoints(element.x, unit);
  const y = convertTopLeftToPdfY(
    pageHeight,
    unitToPoints(element.y, unit),
    unitToPoints(element.height, unit),
  );
  const width = Math.max(unitToPoints(element.width, unit), 1);
  const height = Math.max(unitToPoints(element.height, unit), 1);
  const fontSize = Math.max(unitToPoints(element.fontSize ?? DEFAULT_TEXT_SIZE, unit), 1);

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
  pageHeight: number,
  unit: CreationFlowUnit | undefined,
): void {
  if (!element.visible || element.shapeType !== "rect") {
    return;
  }

  const x = unitToPoints(element.x, unit);
  const y = convertTopLeftToPdfY(
    pageHeight,
    unitToPoints(element.y, unit),
    unitToPoints(element.height, unit),
  );
  const width = Math.max(unitToPoints(element.width, unit), 1);
  const height = Math.max(unitToPoints(element.height, unit), 1);
  const hasFill = setFillColor(doc, element.fill);
  const hasStroke = setStrokeColor(doc, element.stroke);
  const strokeWidth = Math.max(unitToPoints(element.strokeWidth ?? 0, unit), 0);

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
  pageHeight: number,
  unit: CreationFlowUnit | undefined,
): void {
  switch (element.type) {
    case "text":
      renderTextElement(doc, element, pageHeight, unit);
      break;
    case "shape":
      renderShapeElement(doc, element, pageHeight, unit);
      break;
    case "image":
      // TODO: Render images once the PDF engine receives asset bytes or a storage resolver for assetId.
      break;
    case "group":
    case "variable":
      break;
  }
}

export async function renderDocumentToPdf(document: CreationFlowDocument): Promise<Buffer> {
  const pages = document.pages.length > 0 ? document.pages : [];
  const firstPage = pages[0];
  const firstUnit = firstPage?.unit ?? "pt";
  const firstWidth = toPositivePageSize(firstPage?.width, DEFAULT_PAGE_WIDTH, firstUnit);
  const firstHeight = toPositivePageSize(firstPage?.height, DEFAULT_PAGE_HEIGHT, firstUnit);

  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      autoFirstPage: false,
      size: [firstWidth, firstHeight],
      margin: 0,
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
        .flatMap((surface) => collectElements(surface.elements))
        .sort((a, b) => getElementZIndex(a) - getElementZIndex(b));

      for (const element of elements) {
        renderElement(doc, element, height, unit);
      }
    }

    doc.end();
  });
}
