import { PDFDocument as PdfLibDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowPage,
  CreationFlowSurface,
  DocumentId,
  ElementId,
  PageId,
  SurfaceId,
  WorkspaceId,
} from "@creationflow/schema";

import {
  convertTopLeftToPdfY,
  renderDocumentToPdf,
  toPdfTopLeftY,
  toPdfUnits,
} from "./renderDocumentToPdf.js";

function createSurface(
  id: string,
  elements: readonly CreationFlowElement[],
  offset: { readonly x?: number; readonly y?: number } = {},
): CreationFlowSurface {
  return {
    id: id as SurfaceId,
    name: id,
    width: 300,
    height: 200,
    unit: "pt",
    elements,
    ...offset,
  } as CreationFlowSurface;
}

function createShapeElement(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): CreationFlowElement {
  return {
    id: id as ElementId,
    type: "shape",
    name: id,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 0,
    shapeType: "rect",
    fill: "#ddeeff",
    stroke: "#112233",
    strokeWidth: 2,
  };
}

function createTextElement(id: string, x: number, y: number): CreationFlowElement {
  return {
    id: id as ElementId,
    type: "text",
    name: id,
    x,
    y,
    width: 120,
    height: 30,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 1,
    text: "Hello PDF",
    fontFamily: "Helvetica",
    fontSize: 14,
    color: "#223344",
    align: "left",
  };
}

function createPage(
  id: string,
  surfaces?: readonly CreationFlowSurface[],
): CreationFlowPage {
  return {
    id: id as PageId,
    name: id,
    width: 300,
    height: 200,
    unit: "pt",
    surfaces,
  };
}

function createDocument(pages: readonly CreationFlowPage[]): CreationFlowDocument {
  return {
    id: "doc-1" as DocumentId,
    version: "0.0.0",
    metadata: {
      workspaceId: "workspace-1" as WorkspaceId,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    pages,
    variables: [],
    assets: [],
    rules: [],
  };
}

async function getPageCount(buffer: Buffer): Promise<number> {
  const document = await PdfLibDocument.load(buffer);

  return document.getPageCount();
}

function extractPdfStreams(buffer: Buffer): string[] {
  const pdfText = buffer.toString("latin1");
  const streams: string[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(pdfText)) !== null) {
    streams.push(match[1]);
  }

  return streams;
}

function countOccurrences(input: string, value: string): number {
  return input.split(value).length - 1;
}

describe("renderDocumentToPdf", () => {
  it("generates a PDF buffer", async () => {
    const pdf = await renderDocumentToPdf(createDocument([createPage("page-1", [])]));

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("renders exactly three document pages", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [createSurface("surface-1", [])]),
        createPage("page-2", [createSurface("surface-2", [])]),
        createPage("page-3", [createSurface("surface-3", [])]),
      ]),
    );

    await expect(getPageCount(pdf)).resolves.toBe(3);
  });

  it("preserves an empty middle page", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [createSurface("surface-1", [createShapeElement("shape-1", 10, 10, 20, 20)])]),
        createPage("page-2", []),
        createPage("page-3", [createSurface("surface-3", [createShapeElement("shape-3", 30, 30, 20, 20)])]),
      ]),
    );

    await expect(getPageCount(pdf)).resolves.toBe(3);
  });

  it("renders a simple text element without crashing", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [createSurface("surface-1", [createTextElement("text-1", 20, 30)])])]),
    );

    expect(pdf.length).toBeGreaterThan(0);
  });

  it("renders a rectangle shape element without crashing", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [createSurface("surface-1", [createShapeElement("shape-1", 40, 50, 100, 60)])])]),
    );

    expect(pdf.length).toBeGreaterThan(0);
  });

  it("renders x=0 y=0 at the PDFKit top-left coordinate origin", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [createSurface("surface-1", [createShapeElement("shape-1", 0, 0, 10, 20)])])]),
      { compress: false },
    );

    expect(extractPdfStreams(pdf).join("\n")).toContain("0 0 10 20 re");
  });

  it("renders an element on page 3 only once", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [createSurface("surface-1", [createShapeElement("shape-1", 1, 2, 3, 4)])]),
        createPage("page-2", []),
        createPage("page-3", [createSurface("surface-3", [createShapeElement("shape-3", 33, 44, 55, 66)])]),
      ]),
      { compress: false },
    );

    expect(countOccurrences(extractPdfStreams(pdf).join("\n"), "33 44 55 66 re")).toBe(1);
  });

  it("applies optional surface x/y offsets to element positions", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createSurface("surface-1", [createShapeElement("shape-1", 10, 20, 30, 40)], {
            x: 5,
            y: 7,
          }),
        ]),
      ]),
      { compress: false },
    );

    expect(extractPdfStreams(pdf).join("\n")).toContain("15 27 30 40 re");
  });
});

describe("PDF coordinate helpers", () => {
  it("keeps top-left y coordinates unchanged for PDFKit drawing APIs", () => {
    expect(toPdfTopLeftY(30, "pt")).toBe(30);
    expect(convertTopLeftToPdfY(200, 30, 20)).toBe(30);
  });

  it("converts units consistently", () => {
    expect(toPdfUnits(12, "pt")).toBe(12);
    expect(toPdfUnits(12, "px")).toBe(12);
    expect(toPdfUnits(25.4, "mm")).toBe(72);
  });

  it("uses the same coordinate origin for text and shape inputs", () => {
    expect(toPdfUnits(20, "pt")).toBe(toPdfTopLeftY(20, "pt"));
  });
});
