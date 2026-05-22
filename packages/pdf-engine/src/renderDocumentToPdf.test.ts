import { describe, expect, it } from "vitest";
import type {
  CreationFlowDocument,
  CreationFlowElement,
  DocumentId,
  PageId,
  SurfaceId,
  WorkspaceId,
  ElementId,
} from "@creationflow/schema";

import { convertTopLeftToPdfY, renderDocumentToPdf } from "./renderDocumentToPdf.js";

function createDocument(elements: readonly CreationFlowElement[]): CreationFlowDocument {
  return {
    id: "doc-1" as DocumentId,
    version: "0.0.0",
    metadata: {
      workspaceId: "workspace-1" as WorkspaceId,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    pages: [
      {
        id: "page-1" as PageId,
        name: "Page 1",
        width: 300,
        height: 200,
        unit: "pt",
        surfaces: [
          {
            id: "surface-1" as SurfaceId,
            name: "Front",
            width: 300,
            height: 200,
            unit: "pt",
            elements,
          },
        ],
      },
    ],
    variables: [],
    assets: [],
    rules: [],
  };
}

function countPdfPages(buffer: Buffer): number {
  const pdfText = buffer.toString("latin1");
  const matches = pdfText.match(/\/Type\s*\/Page\b/g);

  return matches?.length ?? 0;
}

describe("renderDocumentToPdf", () => {
  it("generates a PDF buffer", async () => {
    const pdf = await renderDocumentToPdf(createDocument([]));

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
    expect(pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  it("generates at least one PDF page", async () => {
    const pdf = await renderDocumentToPdf(createDocument([]));

    expect(countPdfPages(pdf)).toBeGreaterThanOrEqual(1);
  });

  it("renders a simple text element without crashing", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        {
          id: "text-1" as ElementId,
          type: "text",
          name: "Text",
          x: 20,
          y: 30,
          width: 120,
          height: 30,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          zIndex: 0,
          text: "Hello PDF",
          fontFamily: "Helvetica",
          fontSize: 14,
          color: "#223344",
          align: "left",
        },
      ]),
    );

    expect(pdf.length).toBeGreaterThan(0);
  });

  it("renders a rectangle shape element without crashing", async () => {
    const pdf = await renderDocumentToPdf(
      createDocument([
        {
          id: "shape-1" as ElementId,
          type: "shape",
          name: "Shape",
          x: 40,
          y: 50,
          width: 100,
          height: 60,
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
      ]),
    );

    expect(pdf.length).toBeGreaterThan(0);
  });
});

describe("convertTopLeftToPdfY", () => {
  it("converts top-left UI y coordinates to bottom-left PDF y coordinates", () => {
    expect(convertTopLeftToPdfY(200, 30, 20)).toBe(150);
    expect(convertTopLeftToPdfY(200, 0, 50)).toBe(150);
    expect(convertTopLeftToPdfY(200, 180, 20)).toBe(0);
  });
});
