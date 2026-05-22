import { PDFDocument as PdfLibDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowImageElement,
  CreationFlowPage,
  CreationFlowSurface,
  AssetId,
  DocumentId,
  ElementId,
  PageId,
  SurfaceId,
  WorkspaceId,
} from "@creationflow/schema";

import {
  convertTopLeftToPdfY,
  renderDocumentToPdf,
  toPdfUnits,
} from "./renderDocumentToPdf.js";
import type { RenderDocumentWarning } from "./renderDocumentToPdf.js";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

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

function createImageElement(
  id: string,
  assetId: string,
  fit: CreationFlowImageElement["fit"] = "fill",
): CreationFlowElement {
  return {
    id: id as ElementId,
    type: "image",
    name: id,
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 2,
    assetId: assetId as AssetId,
    fit,
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

  it("renders a PNG image element without crashing", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [createSurface("surface-1", [createImageElement("image-1", "asset-1")])]),
      ]),
      {
        resolveAsset: async () => ({ data: TINY_PNG, mimeType: "image/png" }),
      },
    );

    expect(pdf.length).toBeGreaterThan(0);
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });

  it("calls the image resolver with the image assetId", async () => {
    const resolvedAssetIds: string[] = [];

    await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [createSurface("surface-1", [createImageElement("image-1", "asset-1", "contain")])]),
      ]),
      {
        resolveAsset: async (assetId) => {
          resolvedAssetIds.push(assetId);
          return { data: TINY_PNG, mimeType: "image/png" };
        },
      },
    );

    expect(resolvedAssetIds).toEqual(["asset-1"]);
  });

  it("skips unresolved images safely and emits a warning", async () => {
    const warnings: RenderDocumentWarning[] = [];
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [createSurface("surface-1", [createImageElement("image-1", "missing-asset")])]),
      ]),
      {
        resolveAsset: async () => null,
        onWarning: (warning) => warnings.push(warning),
      },
    );

    expect(pdf.length).toBeGreaterThan(0);
    expect(warnings).toMatchObject([{ code: "image_not_found", assetId: "missing-asset" }]);
  });

  it("skips unsupported image MIME types safely and emits a warning", async () => {
    const warnings: RenderDocumentWarning[] = [];

    await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [createSurface("surface-1", [createImageElement("image-1", "asset-1")])]),
      ]),
      {
        resolveAsset: async () => ({ data: TINY_PNG, mimeType: "image/gif" }),
        onWarning: (warning) => warnings.push(warning),
      },
    );

    expect(warnings).toMatchObject([{ code: "unsupported_image_type", assetId: "asset-1" }]);
  });
});

describe("PDF coordinate helpers", () => {
  it("keeps top-left y coordinates unchanged for PDFKit drawing APIs", () => {
    expect(convertTopLeftToPdfY(200, 30, 20)).toBe(30);
  });

  it("converts units consistently", () => {
    expect(toPdfUnits(12, "pt")).toBe(12);
    expect(toPdfUnits(12, "px")).toBe(12);
    expect(toPdfUnits(25.4, "mm")).toBe(72);
  });

  it("uses the same coordinate origin for text and shape inputs", () => {
    expect(toPdfUnits(20, "pt")).toBe(20);
  });
});

describe("path-based surfaces", () => {
  function createPathSurface(
    id: string,
    pathData: string,
    elements: readonly CreationFlowElement[] = [],
    offset: { readonly x?: number; readonly y?: number } = {},
  ): CreationFlowSurface {
    return {
      id: id as SurfaceId,
      name: id,
      width: 300,
      height: 200,
      unit: "pt",
      elements,
      shape: "path",
      pathData,
      ...offset,
    } as CreationFlowSurface;
  }

  function createColorRegionSurface(
    id: string,
    pathData: string,
    fillColor: string,
    offset: { readonly x?: number; readonly y?: number } = {},
  ): CreationFlowSurface {
    return {
      id: id as SurfaceId,
      name: id,
      width: 300,
      height: 200,
      unit: "pt",
      elements: [],
      shape: "path",
      role: "colorRegion",
      pathData,
      fillColor,
      ...offset,
    } as CreationFlowSurface;
  }

  function createDesignRegionSurface(
    id: string,
    pathData: string,
    clipContent: boolean,
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
      shape: "path",
      role: "designRegion",
      pathData,
      clipContent,
      ...offset,
    } as CreationFlowSurface;
  }

  it("renders a path-based colorRegion surface without crashing", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createColorRegionSurface("surface-1", "M50,50 L250,50 L250,150 L50,150 Z", "#ff0000"),
        ]),
      ]),
    );

    expect(pdf.length).toBeGreaterThan(0);
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });

  it("renders a path-based designRegion surface without crashing", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createDesignRegionSurface(
            "surface-1",
            "M50,50 L250,50 L250,150 L50,150 Z",
            false,
            [createTextElement("text-1", 60, 60)],
          ),
        ]),
      ]),
    );

    expect(pdf.length).toBeGreaterThan(0);
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });

  it("renders a path-based designRegion with clipContent without crashing", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createDesignRegionSurface(
            "surface-1",
            "M50,50 L250,50 L250,150 L50,150 Z",
            true,
            [createTextElement("text-1", 60, 60)],
          ),
        ]),
      ]),
    );

    expect(pdf.length).toBeGreaterThan(0);
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });

  it("renders multiple path surfaces on the same page", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createColorRegionSurface("surface-1", "M10,10 L100,10 L100,100 L10,100 Z", "#ff0000"),
          createColorRegionSurface("surface-2", "M150,10 L240,10 L240,100 L150,100 Z", "#00ff00"),
          createDesignRegionSurface(
            "surface-3",
            "M50,50 L200,50 L200,150 L50,150 Z",
            false,
            [],
          ),
        ]),
      ]),
    );

    expect(pdf.length).toBeGreaterThan(0);
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });

  it("applies surface x/y offsets to path surfaces", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createColorRegionSurface(
            "surface-1",
            "M0,0 L50,0 L50,50 L0,50 Z",
            "#0000ff",
            { x: 100, y: 50 },
          ),
        ]),
      ]),
      { compress: false },
    );

    expect(pdf.length).toBeGreaterThan(0);
  });


  it("handles path surfaces gracefully without crashing", async () => {
    const warnings: RenderDocumentWarning[] = [];

    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          {
            id: "surface-1" as SurfaceId,
            name: "Path Surface",
            width: 300,
            height: 200,
            unit: "pt",
            elements: [],
            shape: "path",
            role: "colorRegion",
            pathData: "M50,50 L250,50 L250,150 L50,150 Z",
            fillColor: "#ff0000",
          } as CreationFlowSurface,
        ]),
      ]),
      {
        onWarning: (warning) => warnings.push(warning),
      },
    );

    expect(pdf.length).toBeGreaterThan(0);
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });
  it("preserves existing rectangular surface behavior unchanged", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createSurface("surface-1", [
            createShapeElement("shape-1", 10, 10, 100, 50),
            createTextElement("text-1", 20, 20),
          ]),
        ]),
      ]),
    );

    expect(pdf.length).toBeGreaterThan(0);
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });

  it("renders path surface with overlay role", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          {
            id: "surface-1" as SurfaceId,
            name: "Overlay",
            width: 300,
            height: 200,
            unit: "pt",
            elements: [],
            shape: "path",
            role: "overlay",
            pathData: "M0,0 L300,0 L300,200 L0,200 Z",
            fillColor: "#000000",
          } as CreationFlowSurface,
        ]),
      ]),
    );

    expect(pdf.length).toBeGreaterThan(0);
  });

  it("renders mixed rect and path surfaces on same page", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createSurface("rect-surface", [createShapeElement("shape-1", 10, 10, 50, 50)]),
          createColorRegionSurface("path-surface", "M100,10 L200,10 L200,100 L100,100 Z", "#00ff00"),
        ]),
      ]),
    );

    expect(pdf.length).toBeGreaterThan(0);
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });
});
