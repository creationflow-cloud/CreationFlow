import { describe, expect, it } from "vitest";
import type { CreationFlowDocument, DocumentId, PageId, SurfaceId, WorkspaceId } from "@creationflow/schema";

import { buildRenderPlan } from "./render-plan-builder.js";

function makeDocument(overrides: Partial<CreationFlowDocument> = {}): CreationFlowDocument {
  return {
    id: "doc-1" as DocumentId,
    version: "0.0.0",
    metadata: {
      workspaceId: "ws-1" as WorkspaceId,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    variables: [],
    assets: [],
    rules: [],
    pages: [
      {
        id: "page-1" as PageId,
        name: "Front",
        width: 300,
        height: 200,
        unit: "px",
        surfaces: [
          {
            id: "s-1" as SurfaceId,
            name: "Default",
            kind: "front",
            unit: "px",
            width: 300,
            height: 200,
            elements: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("buildRenderPlan", () => {
  it("counts pages, surfaces, and elements", () => {
    const doc = makeDocument({
      pages: [
        {
          id: "p1" as PageId,
          name: "p1",
          width: 200,
          height: 100,
          unit: "px",
          surfaces: [
            {
              id: "s1" as SurfaceId,
              name: "s1",
              kind: "front" as const,
              unit: "px",
              width: 200,
              height: 100,
              elements: [
                { id: "e1" as never, type: "text" as const, x: 0, y: 0, width: 10, height: 10, text: "a", fontFamily: "Arial", fontSize: 12, color: "#000" } as never,
                { id: "e2" as never, type: "text" as const, x: 0, y: 0, width: 10, height: 10, text: "b", fontFamily: "Arial", fontSize: 12, color: "#000" } as never,
              ],
            },
            {
              id: "s2" as SurfaceId,
              name: "s2",
              kind: "back" as const,
              unit: "px",
              width: 200,
              height: 100,
              elements: [
                { id: "e3" as never, type: "text" as const, x: 0, y: 0, width: 10, height: 10, text: "c", fontFamily: "Arial", fontSize: 12, color: "#000" } as never,
              ],
            },
          ],
        },
      ],
    });
    const plan = buildRenderPlan(doc);
    expect(plan.pageCount).toBe(1);
    expect(plan.surfaceCount).toBe(2);
    expect(plan.elementCount).toBe(3);
  });

  it("uses 300 DPI by default and accepts overrides", () => {
    expect(buildRenderPlan(makeDocument()).estimatedDpi).toBe(300);
    expect(buildRenderPlan(makeDocument(), { dpi: 600 }).estimatedDpi).toBe(600);
  });

  it("warns about empty documents", () => {
    const plan = buildRenderPlan(makeDocument({ pages: [] }));
    expect(plan.ready).toBe(false);
    expect(plan.preflightWarnings.some((w) => w.code === "render-plan.empty-document")).toBe(true);
  });

  it("warns about out-of-range DPI", () => {
    const plan = buildRenderPlan(makeDocument(), { dpi: 30 });
    expect(plan.preflightWarnings.some((w) => w.code === "render-plan.dpi-out-of-range")).toBe(true);
  });

  it("clamps the warning list to maxWarnings", () => {
    const plan = buildRenderPlan(makeDocument(), { maxWarnings: 1, dpi: 30 });
    expect(plan.preflightWarnings.length).toBe(1);
  });

  it("marks plan as ready when at least one page exists", () => {
    expect(buildRenderPlan(makeDocument()).ready).toBe(true);
  });

  it("propagates workspace id from the metadata", () => {
    const plan = buildRenderPlan(makeDocument());
    expect(plan.workspaceId).toBe("ws-1");
    expect(plan.documentId).toBe("doc-1");
  });
});
