import { describe, expect, it } from "vitest";

import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowGroupElement,
  CreationFlowSurface,
  DocumentId,
  ElementId,
  PageId,
  SurfaceId,
  WorkspaceId,
} from "@creationflow/schema";

import { flattenSurfaceElements } from "./layers.js";
import { groupElements, ungroupElement } from "./grouping.js";

function makeElement(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
): CreationFlowElement {
  return {
    id: id as ElementId,
    type: "text",
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
    text: "",
    fontFamily: "Inter",
    fontSize: 16,
    color: "#000",
    align: "left",
  } as CreationFlowElement;
}

function makeDocument(elements: CreationFlowElement[]): CreationFlowDocument {
  const surface: CreationFlowSurface = {
    id: "surface-1" as unknown as SurfaceId,
    name: "Front",
    width: 800,
    height: 600,
    unit: "px",
    elements,
  } as CreationFlowSurface;

  return {
    id: "doc-1" as unknown as DocumentId,
    version: "0.0.0",
    metadata: {
      workspaceId: "ws-1" as unknown as WorkspaceId,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    pages: [
      {
        id: "page-1" as unknown as PageId,
        name: "Page 1",
        width: 800,
        height: 600,
        unit: "px",
        surfaces: [surface],
      },
    ],
    variables: [],
    assets: [],
    rules: [],
  } as unknown as CreationFlowDocument;
}

function getSurface(doc: CreationFlowDocument): CreationFlowSurface {
  const page = doc.pages[0] as Page & { readonly surfaces: readonly CreationFlowSurface[] };
  return page.surfaces[0];
}

type Page = { readonly id: PageId; readonly surfaces: readonly CreationFlowSurface[] };

describe("groupElements", () => {
  it("returns undefined when fewer than two elements are selected", () => {
    const doc = makeDocument([makeElement("a", 0, 0, 50, 50)]);
    expect(groupElements(doc, "surface-1" as unknown as SurfaceId, ["a"])).toBeUndefined();
  });

  it("groups the selected elements and replaces them with one group element", () => {
    const a = makeElement("a", 10, 20, 30, 40);
    const b = makeElement("b", 100, 50, 40, 30);
    const doc = makeDocument([a, b]);
    const result = groupElements(doc, "surface-1" as unknown as SurfaceId, ["a", "b"]);
    expect(result).toBeDefined();
    const surface = getSurface(result!.document);
    expect(surface.elements).toHaveLength(1);
    const group = surface.elements[0] as CreationFlowGroupElement;
    expect(group.type).toBe("group");
    expect(group.x).toBe(10);
    expect(group.y).toBe(20);
    expect(group.width).toBe(130);
    expect(group.height).toBe(60);
    expect(group.children).toHaveLength(2);
    expect(group.children[0].id).toBe("a");
    expect(group.children[1].id).toBe("b");
    expect(group.children[0].x).toBe(0);
    expect(group.children[0].y).toBe(0);
    expect(group.children[1].x).toBe(90);
    expect(group.children[1].y).toBe(30);
  });

  it("ignores unknown ids when collecting members", () => {
    const a = makeElement("a", 0, 0, 50, 50);
    const b = makeElement("b", 50, 0, 50, 50);
    const doc = makeDocument([a, b]);
    const result = groupElements(doc, "surface-1" as unknown as SurfaceId, ["a", "b", "missing"]);
    expect(result).toBeDefined();
    const surface = getSurface(result!.document);
    expect(surface.elements).toHaveLength(1);
    expect(surface.elements[0].type).toBe("group");
  });
});

describe("ungroupElement", () => {
  it("replaces the group with its children at the group position", () => {
    const a = makeElement("a", 0, 0, 30, 30);
    const b = makeElement("b", 40, 0, 20, 30);
    const doc = makeDocument([a, b]);
    const grouped = groupElements(doc, "surface-1" as unknown as SurfaceId, ["a", "b"]);
    expect(grouped).toBeDefined();
    const ungrouped = ungroupElement(grouped!.document, grouped!.groupId);
    expect(ungrouped).toBeDefined();
    const surface = getSurface(ungrouped!.document);
    const flattened = flattenSurfaceElements(surface);
    expect(flattened).toHaveLength(2);
    const restoredA = flattened.find((el) => el.id === "a")!;
    const restoredB = flattened.find((el) => el.id === "b")!;
    expect(restoredA.x).toBe(0);
    expect(restoredA.y).toBe(0);
    expect(restoredB.x).toBe(40);
    expect(restoredB.y).toBe(0);
  });

  it("returns undefined for an unknown group id", () => {
    const doc = makeDocument([makeElement("a", 0, 0, 10, 10)]);
    expect(ungroupElement(doc, "missing" as unknown as ElementId)).toBeUndefined();
  });

  it("round-trips: group then ungroup preserves element count", () => {
    const doc = makeDocument([
      makeElement("a", 10, 10, 20, 20),
      makeElement("b", 60, 10, 20, 20),
      makeElement("c", 110, 10, 20, 20),
    ]);
    const grouped = groupElements(doc, "surface-1" as unknown as SurfaceId, ["a", "b", "c"]);
    expect(grouped).toBeDefined();
    const ungrouped = ungroupElement(grouped!.document, grouped!.groupId);
    expect(ungrouped).toBeDefined();
    const surface = getSurface(ungrouped!.document);
    const flat = flattenSurfaceElements(surface);
    expect(flat).toHaveLength(3);
    expect(flat.map((el) => el.id).sort()).toEqual(["a", "b", "c"]);
  });
});
