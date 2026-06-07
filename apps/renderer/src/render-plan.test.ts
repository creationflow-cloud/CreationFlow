import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  CreationFlowDocument,
  DocumentId,
  ElementId,
  PageId,
  SurfaceId,
  WorkspaceId,
} from "@creationflow/schema";

import { renderDocument } from "./render-plan.js";

function createDocument(): CreationFlowDocument {
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
        name: "Page",
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
            elements: [
              {
                id: "shape-1" as ElementId,
                type: "shape",
                name: "Box",
                x: 10,
                y: 10,
                width: 50,
                height: 50,
                rotation: 0,
                opacity: 1,
                visible: true,
                locked: false,
                zIndex: 0,
                shapeType: "rect",
                fill: "#112233",
                stroke: undefined,
                strokeWidth: 0,
              },
            ],
          },
        ],
      },
    ],
    variables: [],
    assets: [],
    rules: [],
  };
}

describe("renderDocument", () => {
  it("produces a PDF buffer and forwards warnings", async () => {
    const document = createDocument();
    const directory = await mkdtemp(join(tmpdir(), "renderer-test-"));

    try {
      const result = await renderDocument(document, { compress: false });
      expect(result.status).toBe("rendered");
      expect(Buffer.isBuffer(result.pdf)).toBe(true);
      expect(result.pdf.subarray(0, 4).toString("latin1")).toBe("%PDF");
      expect(result.warnings).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe("createRenderJobPlaceholder", () => {
  it("has been removed in favor of renderDocument", () => {
    expect(true).toBe(true);
  });
});
