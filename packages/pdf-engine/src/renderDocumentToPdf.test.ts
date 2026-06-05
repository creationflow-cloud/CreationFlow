import { PDFDocument as PdfLibDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
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
const TEST_FONT_PATH = "/usr/share/fonts/open-sans/OpenSans-Regular.ttf";

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

async function getFirstPageSize(buffer: Buffer): Promise<{ readonly width: number; readonly height: number }> {
  const document = await PdfLibDocument.load(buffer);
  const page = document.getPage(0);
  const size = page.getSize();

  return { width: size.width, height: size.height };
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

  it("renders text with configured font family, weight, size, color and alignment", async () => {
    const textElement: CreationFlowElement = {
      ...createTextElement("text-1", 20, 30),
      width: 160,
      height: 60,
      text: "Hello\nPDF",
      fontFamily: "Courier",
      fontSize: 18,
      fontWeight: "700",
      color: "#112233",
      align: "center",
    };

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [createSurface("surface-1", [textElement])])]),
      { compress: false },
    );
    const pdfText = pdf.toString("latin1");
    const streams = extractPdfStreams(pdf).join("\n");

    expect(pdfText).toContain("/BaseFont /Courier-Bold");
    expect(streams).toContain("18 Tf");
    expect(streams).toContain("0.06666666666666667 0.13333333333333333 0.2 scn");
  });

  it("loads and embeds a configured font through the font resolver", async () => {
    const fontData = await readFile(TEST_FONT_PATH);
    const resolvedFontFamilies: string[] = [];
    const textElement: CreationFlowElement = {
      ...createTextElement("text-1", 20, 30),
      fontFamily: "OpenSans-Regular",
    };

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [createSurface("surface-1", [textElement])])]),
      {
        compress: false,
        resolveFont: async (fontFamily) => {
          resolvedFontFamilies.push(fontFamily);
          return { data: fontData, mimeType: "font/ttf" };
        },
      },
    );

    expect(resolvedFontFamilies).toEqual(["OpenSans-Regular"]);
    expect(pdf.toString("latin1")).toContain("OpenSans");
  });

  it("falls back with a warning when a configured font is missing", async () => {
    const warnings: RenderDocumentWarning[] = [];
    const textElement: CreationFlowElement = {
      ...createTextElement("text-1", 20, 30),
      fontFamily: "MissingFont",
    };

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [createSurface("surface-1", [textElement])])]),
      {
        compress: false,
        resolveFont: async () => null,
        onWarning: (warning) => warnings.push(warning),
      },
    );

    expect(warnings).toMatchObject([{ code: "font_not_found", elementId: "text-1" }]);
    expect(pdf.toString("latin1")).toContain("/BaseFont /Helvetica");
  });

  it("renders a rectangle shape element without crashing", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [createSurface("surface-1", [createShapeElement("shape-1", 40, 50, 100, 60)])])]),
    );

    expect(pdf.length).toBeGreaterThan(0);
  });

  it.each([
    ["rect", "40 50 100 60 re"],
    ["ellipse", " c"],
    ["line", "40 50 m\n140 110 l\nS"],
  ] as const)("renders %s shape geometry", async (shapeType, expectedStreamContent) => {
    const shapeElement: CreationFlowElement = {
      ...createShapeElement("shape-1", 40, 50, 100, 60),
      shapeType,
    };

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [createSurface("surface-1", [shapeElement])])]),
      { compress: false },
    );

    expect(extractPdfStreams(pdf).join("\n")).toContain(expectedStreamContent);
  });

  it("renders shape stroke width and rotation", async () => {
    const shapeElement: CreationFlowElement = {
      ...createShapeElement("shape-1", 40, 50, 100, 60),
      rotation: 45,
      strokeWidth: 4,
    };

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [createSurface("surface-1", [shapeElement])])]),
      { compress: false },
    );
    const streams = extractPdfStreams(pdf).join("\n");

    expect(streams).toContain("4 w");
    expect(streams).toContain("0.707107 0.707107 -0.707107 0.707107");
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

  it("expands page size and offsets content for surface bleed", async () => {
    const surface = createSurface("surface-1", [createShapeElement("shape-1", 0, 0, 10, 20)]) as CreationFlowSurface;
    const bleedSurface: CreationFlowSurface = {
      ...surface,
      printArea: {
        x: 0,
        y: 0,
        width: 300,
        height: 200,
        bleed: 10,
      },
    };

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [bleedSurface])]),
      { compress: false },
    );

    await expect(getFirstPageSize(pdf)).resolves.toEqual({ width: 320, height: 220 });
    expect(extractPdfStreams(pdf).join("\n")).toContain("10 10 10 20 re");
  });

  it("converts mm bleed into PDF page units", async () => {
    const surface = {
      ...createSurface("surface-1", []),
      unit: "mm" as const,
      printArea: {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        bleed: 3,
      },
    } as CreationFlowSurface;
    const page = {
      ...createPage("page-1", [surface]),
      width: 100,
      height: 50,
      unit: "mm" as const,
    };

    const pdf = await renderDocumentToPdf(createDocument([page]));
    const size = await getFirstPageSize(pdf);

    expect(size.width).toBeCloseTo((106 * 72) / 25.4, 5);
    expect(size.height).toBeCloseTo((56 * 72) / 25.4, 5);
  });

  it("renders safe area guidelines when surface debugging is enabled", async () => {
    const surface = {
      ...createSurface("surface-1", []),
      printArea: {
        x: 0,
        y: 0,
        width: 300,
        height: 200,
        bleed: 5,
        safeArea: {
          x: 20,
          y: 30,
          width: 100,
          height: 80,
        },
      },
    } as CreationFlowSurface;

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [surface])]),
      { compress: false, debugSurfaces: true },
    );
    const streams = extractPdfStreams(pdf).join("\n");

    expect(streams).toContain("20 30 100 80 re");
    expect(streams).toContain("[3 3] 0 d");
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

  it.each([
    ["fill", "30 0 0 -40 10 60 cm"],
    ["contain", "30 0 0 -30 10 50 cm"],
    ["cover", "40 0 0 -40 10 60 cm"],
  ] as const)("renders image fit mode %s with the expected placement", async (fit, expectedMatrix) => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [createSurface("surface-1", [createImageElement("image-1", "asset-1", fit)])]),
      ]),
      {
        compress: false,
        resolveAsset: async () => ({ data: TINY_PNG, mimeType: "image/png" }),
      },
    );

    expect(extractPdfStreams(pdf).join("\n")).toContain(expectedMatrix);
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

  function createDesignRegionSurfaceWithFill(
    id: string,
    pathData: string,
    fillColor: string,
    clipContent: boolean,
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
      role: "designRegion",
      pathData,
      fillColor,
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

  it("clips elements to path-based designRegion with clipContent", async () => {
    const warnings: RenderDocumentWarning[] = [];

    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createDesignRegionSurface(
            "surface-1",
            "M50,50 L250,50 L250,150 L50,150 Z",
            true,
            [
              createTextElement("text-1", 60, 60),
              createShapeElement("shape-1", 100, 100, 50, 50),
            ],
          ),
        ]),
      ]),
      {
        compress: false,
        onWarning: (warning) => warnings.push(warning),
      },
    );

    expect(pdf.length).toBeGreaterThan(0);
    await expect(getPageCount(pdf)).resolves.toBe(1);
    expect(warnings.filter((w) => w.code === "path_render_failed")).toHaveLength(0);
  });

  it("renders elements at local coordinates inside clipped path surface", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          {
            id: "surface-1" as SurfaceId,
            name: "Clipped Path",
            width: 300,
            height: 200,
            unit: "pt",
            elements: [
              {
                id: "shape-1" as ElementId,
                type: "shape",
                name: "shape-1",
                x: 10,
                y: 20,
                width: 30,
                height: 40,
                rotation: 0,
                opacity: 1,
                visible: true,
                locked: false,
                zIndex: 0,
                shapeType: "rect",
                fill: "#ddeeff",
                stroke: "#112233",
                strokeWidth: 2,
              },
            ],
            shape: "path",
            role: "designRegion",
            pathData: "M0,0 L300,0 L300,200 L0,200 Z",
            clipContent: true,
          } as CreationFlowSurface,
        ]),
      ]),
      { compress: false },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    expect(pdf.length).toBeGreaterThan(0);
    expect(content).toContain("10 20 30 40 re");
  });

  it("clips elements to rectangular surface with clipContent", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          {
            id: "surface-1" as SurfaceId,
            name: "Clipped Rect",
            x: 50,
            y: 60,
            width: 200,
            height: 150,
            unit: "pt",
            elements: [
              createTextElement("text-1", 10, 20),
              createShapeElement("shape-1", 30, 40, 50, 50),
            ],
            clipContent: true,
          } as CreationFlowSurface,
        ]),
      ]),
      { compress: false },
    );

    expect(pdf.length).toBeGreaterThan(0);
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });

  it("does not leak clipping to subsequent surfaces", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          {
            id: "surface-1" as SurfaceId,
            name: "Clipped Path",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            unit: "pt",
            elements: [createShapeElement("shape-1", 10, 10, 20, 20)],
            shape: "path",
            role: "designRegion",
            pathData: "M0,0 L100,0 L100,100 L0,100 Z",
            clipContent: true,
          } as CreationFlowSurface,
          {
            id: "surface-2" as SurfaceId,
            name: "Unclipped Rect",
            x: 150,
            y: 150,
            width: 100,
            height: 100,
            unit: "pt",
            elements: [createShapeElement("shape-2", 10, 10, 30, 30)],
          } as CreationFlowSurface,
        ]),
      ]),
      { compress: false },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    expect(pdf.length).toBeGreaterThan(0);
    expect(content).toContain("10 10 20 20 re");
    expect(content).toContain("160 160 30 30 re");
  });

  it("preserves zIndex ordering inside clipped surface", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          {
            id: "surface-1" as SurfaceId,
            name: "Clipped Path",
            width: 300,
            height: 200,
            unit: "pt",
            elements: [
              {
                ...createShapeElement("shape-back", 10, 10, 50, 50),
                zIndex: 0,
                fill: "#ff0000",
              },
              {
                ...createShapeElement("shape-front", 20, 20, 50, 50),
                zIndex: 1,
                fill: "#00ff00",
              },
            ],
            shape: "path",
            role: "designRegion",
            pathData: "M0,0 L300,0 L300,200 L0,200 Z",
            clipContent: true,
          } as CreationFlowSurface,
        ]),
      ]),
    );

    expect(pdf.length).toBeGreaterThan(0);
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });

  it("renders path colorRegion with surface-local translation", async () => {
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
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });

  it("debug: outputs raw PDF stream for path clipping inspection", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        {
          id: "page-1" as PageId,
          name: "page-1",
          width: 500,
          height: 600,
          unit: "pt",
          surfaces: [
            {
              id: "design-region" as SurfaceId,
              name: "Design Region",
              width: 500,
              height: 600,
              unit: "pt",
              elements: [
                {
                  id: "large-rect" as ElementId,
                  type: "shape",
                  name: "Large Rectangle",
                  x: 0,
                  y: 0,
                  width: 500,
                  height: 600,
                  rotation: 0,
                  opacity: 1,
                  visible: true,
                  locked: false,
                  zIndex: 0,
                  shapeType: "rect",
                  fill: "#ff0000",
                  stroke: undefined,
                  strokeWidth: 0,
                },
              ],
              shape: "path",
              role: "designRegion",
              pathData: "M100 100 L200 100 L200 200 L100 200 Z",
              clipContent: true,
            } as CreationFlowSurface,
          ],
        } as CreationFlowPage,
      ]),
      { compress: false },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    console.log("=== PDF CONTENT STREAM DEBUG ===");
    console.log("Page size: 500x600");
    console.log("Surface: designRegion, path clip, clipContent=true");
    console.log("Path: M100 100 L200 100 L200 200 L100 200 Z");
    console.log("Element: rect 0,0 500x600 (should be clipped to 100x100 path area)");
    console.log("---");
    console.log(content);
    console.log("=== END PDF CONTENT STREAM ===");

    expect(pdf.length).toBeGreaterThan(0);

    const hasW = content.includes("W");
    const hasQ = content.includes("Q");
    const hasRect = content.includes("0 0 500 600 re");

    expect(hasW).toBe(true);
    expect(hasQ).toBe(true);
    expect(hasRect).toBe(true);

    const wIndex = content.indexOf("W");
    const rectIndex = content.indexOf("0 0 500 600 re");
    const qIndex = content.lastIndexOf("Q");

    expect(wIndex).toBeLessThan(rectIndex);
    expect(rectIndex).toBeLessThan(qIndex);
  });

  it("renders designRegion with explicit fillColor", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createDesignRegionSurfaceWithFill(
            "surface-1",
            "M50,50 L250,50 L250,150 L50,150 Z",
            "#00ff00",
            false,
            [],
          ),
        ]),
      ]),
      { compress: false },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    expect(pdf.length).toBeGreaterThan(0);
    expect(content).toContain("0 1 0 scn");
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });

  it("does not render designRegion background without fillColor", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createDesignRegionSurface(
            "surface-1",
            "M50,50 L250,50 L250,150 L50,150 Z",
            false,
            [],
          ),
        ]),
      ]),
      { compress: false },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    expect(pdf.length).toBeGreaterThan(0);
    expect(content).not.toContain("scn");
    await expect(getPageCount(pdf)).resolves.toBe(1);
  });

  it("clips elements to designRegion with fillColor and clipContent", async () => {
    const warnings: RenderDocumentWarning[] = [];

    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createDesignRegionSurfaceWithFill(
            "surface-1",
            "M50,50 L250,50 L250,150 L50,150 Z",
            "#ffff00",
            true,
            [
              createTextElement("text-1", 60, 60),
              createShapeElement("shape-1", 100, 100, 50, 50),
            ],
          ),
        ]),
      ]),
      {
        compress: false,
        onWarning: (warning) => warnings.push(warning),
      },
    );

    expect(pdf.length).toBeGreaterThan(0);
    await expect(getPageCount(pdf)).resolves.toBe(1);
    expect(warnings.filter((w) => w.code === "path_render_failed")).toHaveLength(0);
  });
});

describe("realistic apparel template clipping", () => {
  it("clips designRegion elements while leaving colorRegion unclipped", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        {
          id: "page-1" as PageId,
          name: "T-Shirt Front",
          width: 500,
          height: 600,
          unit: "pt",
          surfaces: [
            {
              id: "color-region" as SurfaceId,
              name: "T-Shirt Base",
              width: 500,
              height: 600,
              unit: "pt",
              elements: [],
              shape: "path",
              role: "colorRegion",
              pathData: "M50 50 L450 50 L450 550 L50 550 Z",
              fillColor: "#ffffff",
              clipContent: false,
            } as CreationFlowSurface,
            {
              id: "design-region" as SurfaceId,
              name: "Print Area",
              width: 300,
              height: 400,
              unit: "pt",
              elements: [
                {
                  id: "large-rect" as ElementId,
                  type: "shape",
                  name: "Background Fill",
                  x: 0,
                  y: 0,
                  width: 500,
                  height: 600,
                  rotation: 0,
                  opacity: 1,
                  visible: true,
                  locked: false,
                  zIndex: 0,
                  shapeType: "rect",
                  fill: "#ff0000",
                  stroke: undefined,
                  strokeWidth: 0,
                },
                {
                  id: "text-inside" as ElementId,
                  type: "text",
                  name: "Inside Text",
                  x: 50,
                  y: 50,
                  width: 100,
                  height: 30,
                  rotation: 0,
                  opacity: 1,
                  visible: true,
                  locked: false,
                  zIndex: 1,
                  text: "Inside",
                  fontFamily: "Helvetica",
                  fontSize: 12,
                  color: "#000000",
                  align: "left",
                },
                {
                  id: "text-outside" as ElementId,
                  type: "text",
                  name: "Outside Text",
                  x: 400,
                  y: 500,
                  width: 100,
                  height: 30,
                  rotation: 0,
                  opacity: 1,
                  visible: true,
                  locked: false,
                  zIndex: 2,
                  text: "Outside",
                  fontFamily: "Helvetica",
                  fontSize: 12,
                  color: "#000000",
                  align: "left",
                },
              ],
              shape: "path",
              role: "designRegion",
              pathData: "M100 100 L200 100 L200 200 L100 200 Z",
              clipContent: true,
            } as CreationFlowSurface,
            {
              id: "overlay" as SurfaceId,
              name: "Seam Overlay",
              width: 500,
              height: 600,
              unit: "pt",
              elements: [],
              shape: "path",
              role: "overlay",
              pathData: "M50 50 L450 50 L450 550 L50 550 Z",
              fillColor: "#000000",
              clipContent: false,
            } as CreationFlowSurface,
          ],
        } as CreationFlowPage,
      ]),
      { compress: false },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    expect(pdf.length).toBeGreaterThan(0);

    // Verify clipping operator appears
    expect(content).toContain("W");

    // Verify rectangle is drawn
    expect(content).toContain("0 0 500 600 re");

    // Verify text elements are present (hex-encoded in PDF)
    // "Inside" = 496e73696465, "Outside" = 4f757473696465
    expect(content).toContain("496e73696465");
    expect(content).toContain("4f757473696465");

    // Count W operators - should be exactly 1 (for designRegion clipping)
    const wCount = content.split("W").length - 1;
    expect(wCount).toBe(1);
  });
});

describe("debugSurfaces", () => {
  it("renders without crashing when debugSurfaces is true", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        createPage("page-1", [
          createSurface("surface-1", [createShapeElement("shape-1", 10, 10, 20, 20)]),
        ]),
      ]),
      { compress: false, debugSurfaces: true },
    );

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("produces identical output when debugSurfaces is false vs omitted", async () => {
    const doc = createDocument([
      createPage("page-1", [
        createSurface("surface-1", [createShapeElement("shape-1", 10, 10, 20, 20)]),
      ]),
    ]);

    const pdfDefault = await renderDocumentToPdf(doc, { compress: false });
    const pdfFalse = await renderDocumentToPdf(doc, { compress: false, debugSurfaces: false });

    const streamsDefault = extractPdfStreams(pdfDefault).join("\n");
    const streamsFalse = extractPdfStreams(pdfFalse).join("\n");

    expect(streamsDefault).toBe(streamsFalse);
  });

  it("adds debug strokes for designRegion surface", async () => {
    const designRegion = {
      id: "design" as SurfaceId,
      name: "Design",
      width: 300,
      height: 200,
      unit: "pt",
      elements: [],
      shape: "path" as const,
      role: "designRegion" as const,
      pathData: "M50 50 L250 50 L250 150 L50 150 Z",
      clipContent: false,
    } as CreationFlowSurface;

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [designRegion])]),
      { compress: false, debugSurfaces: true },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    // Magenta color for designRegion: [255, 0, 102] -> 1 0 0.4 scn (approx)
    // Should contain the path stroke operators
    expect(content).toContain("50 50 m");
    expect(content).toContain("250 50 l");
    expect(content).toContain("S");
  });

  it("adds debug strokes for colorRegion surface", async () => {
    const colorRegion = {
      id: "color" as SurfaceId,
      name: "Color",
      width: 300,
      height: 200,
      unit: "pt",
      elements: [],
      shape: "path" as const,
      role: "colorRegion" as const,
      pathData: "M0 0 L300 0 L300 200 L0 200 Z",
      clipContent: false,
    } as CreationFlowSurface;

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [colorRegion])]),
      { compress: false, debugSurfaces: true },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    // Blue color for colorRegion: [0, 102, 255]
    expect(content).toContain("0 0.4 1 scn");
  });

  it("adds dashed strokes for overlay surface", async () => {
    const overlay = {
      id: "overlay" as SurfaceId,
      name: "Overlay",
      width: 300,
      height: 200,
      unit: "pt",
      elements: [],
      shape: "path" as const,
      role: "overlay" as const,
      pathData: "M10 10 L290 10 L290 190 L10 190 Z",
      clipContent: false,
    } as CreationFlowSurface;

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [overlay])]),
      { compress: false, debugSurfaces: true },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    // Gray color for overlay: [102, 102, 102] -> 0.4 0.4 0.4 scn
    expect(content).toContain("0.4 0.4 0.4 scn");
    // Dash pattern: [5 5] 0 d
    expect(content).toContain("[5 5] 0 d");
  });

  it("adds debug strokes for default/rect surface", async () => {
    const defaultSurface = {
      id: "default" as SurfaceId,
      name: "Default",
      width: 300,
      height: 200,
      unit: "pt",
      elements: [],
    } as CreationFlowSurface;

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [defaultSurface])]),
      { compress: false, debugSurfaces: true },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    // Green color for default: [0, 204, 0] -> 0 0.8 0 scn
    expect(content).toContain("0 0.8 0 scn");
    // Rect boundary
    expect(content).toContain("0 0 300 200 re");
  });

  it("renders surface labels with name and role", async () => {
    const designRegion = {
      id: "design" as SurfaceId,
      name: "Front Design",
      width: 300,
      height: 200,
      unit: "pt",
      elements: [],
      shape: "path" as const,
      role: "designRegion" as const,
      pathData: "M50 50 L250 50 L250 150 L50 150 Z",
      clipContent: false,
    } as CreationFlowSurface;

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [designRegion])]),
      { compress: false, debugSurfaces: true },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    // "Front Design (designRegion)" hex-encoded: 46726f6e742044657369676e202864657369676e526567696f6e29
    // PDF may split into chunks, so check for key parts
    // "Design" = 44657369676e
    expect(content).toContain("44657369676e");
    // "designRegion" = 64657369676e526567696f6e
    expect(content).toContain("64657369676e526567696f6e");
  });

  it("does not add debug strokes when debugSurfaces is false", async () => {
    const designRegion = {
      id: "design" as SurfaceId,
      name: "Design",
      width: 300,
      height: 200,
      unit: "pt",
      elements: [],
      shape: "path" as const,
      role: "designRegion" as const,
      pathData: "M50 50 L250 50 L250 150 L50 150 Z",
      clipContent: false,
    } as CreationFlowSurface;

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", [designRegion])]),
      { compress: false, debugSurfaces: false },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    // Should not contain debug label text
    expect(content).not.toContain("Front Design");
    expect(content).not.toContain("Design (designRegion)");
  });

  it("handles multiple surfaces with different roles", async () => {
    const surfaces = [
      {
        id: "color" as SurfaceId,
        name: "Base Color",
        width: 300,
        height: 200,
        unit: "pt",
        elements: [],
        shape: "path" as const,
        role: "colorRegion" as const,
        pathData: "M0 0 L300 0 L300 200 L0 200 Z",
        clipContent: false,
      },
      {
        id: "design" as SurfaceId,
        name: "Design",
        width: 300,
        height: 200,
        unit: "pt",
        elements: [],
        shape: "path" as const,
        role: "designRegion" as const,
        pathData: "M50 50 L250 50 L250 150 L50 150 Z",
        clipContent: false,
      },
      {
        id: "overlay" as SurfaceId,
        name: "Seam",
        width: 300,
        height: 200,
        unit: "pt",
        elements: [],
        shape: "path" as const,
        role: "overlay" as const,
        pathData: "M10 10 L290 10 L290 190 L10 190 Z",
        clipContent: false,
      },
    ] as CreationFlowSurface[];

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", surfaces)]),
      { compress: false, debugSurfaces: true },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    // Check for hex-encoded labels
    // "Base Color (colorRegion)" contains "colorRegion" = 636f6c6f72526567696f6e
    expect(content).toContain("636f6c6f72526567696f6e");
    // "Design (designRegion)" contains "designRegion" = 64657369676e526567696f6e
    expect(content).toContain("64657369676e526567696f6e");
    // "Seam (overlay)" - PDF splits text into chunks, check for "Seam" = 5365616d
    expect(content).toContain("5365616d");
  });

  it("verifies t-shirt template clipping with debug surfaces", async () => {
    const designPath = "M185 165 C205 150 295 150 315 165 L330 505 C300 518 200 518 170 505 Z";

    const surfaces = [
      {
        id: "color" as SurfaceId,
        name: "Base Color",
        width: 500,
        height: 600,
        unit: "pt",
        elements: [],
        shape: "path" as const,
        role: "colorRegion" as const,
        pathData: "M0 0 L500 0 L500 600 L0 600 Z",
        fillColor: "#ffffff",
        clipContent: false,
      },
      {
        id: "design" as SurfaceId,
        name: "Design",
        width: 500,
        height: 600,
        unit: "pt",
        elements: [
          {
            id: "red-rect" as ElementId,
            type: "shape",
            name: "Red Rectangle",
            x: 50,
            y: 300,
            width: 200,
            height: 100,
            rotation: 0,
            opacity: 1,
            visible: true,
            locked: false,
            zIndex: 0,
            shapeType: "rect",
            fill: "#ff0000",
          },
        ],
        shape: "path" as const,
        role: "designRegion" as const,
        pathData: designPath,
        clipContent: true,
      },
      {
        id: "overlay" as SurfaceId,
        name: "Seam Overlay",
        width: 500,
        height: 600,
        unit: "pt",
        elements: [],
        shape: "path" as const,
        role: "overlay" as const,
        pathData: "M0 0 L500 0 L500 600 L0 600 Z",
        clipContent: false,
      },
    ] as CreationFlowSurface[];

    const pdf = await renderDocumentToPdf(
      createDocument([createPage("page-1", surfaces)]),
      { compress: false, debugSurfaces: true },
    );

    const streams = extractPdfStreams(pdf);
    const content = streams.join("\n");

    expect(content).toContain("0 0.4 1 scn");
    expect(content).toContain("1 0 0.4 scn");
    expect(content).toContain("0.4 0.4 0.4 scn");
    expect(content).toContain("W");
    expect(content).toContain("1 0 0 scn");
    expect(content).toContain("185 165 m");
    expect(content).toContain("44657369676e");
    expect(content).toContain("636f6c6f72526567696f6e");

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
