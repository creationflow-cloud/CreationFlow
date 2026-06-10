import { describe, expect, it } from "vitest";
import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowPage,
  CreationFlowSurface,
  ElementId,
  PageId,
  SurfaceId,
} from "@creationflow/schema";

import {
  selectFirstSurface,
  findFirstDesignRegionSurface,
  findFirstNonOverlaySurface,
  selectElement,
  selectElementsInRect,
  makeSelectionRect,
  rectIntersectsElement,
  clearElementSelection,
  isElementSelected,
  getSelectionPrimaryElementId,
  NO_MODIFIER,
} from "./selection-helpers.js";

function createSurface(
  id: string,
  role?: "default" | "colorRegion" | "designRegion" | "overlay",
): CreationFlowSurface {
  return {
    id: id as SurfaceId,
    name: id,
    width: 300,
    height: 200,
    unit: "px",
    elements: [],
    role,
  };
}

function createPage(id: string, surfaces: CreationFlowSurface[]): CreationFlowPage {
  return {
    id: id as PageId,
    name: id,
    width: 500,
    height: 600,
    unit: "px",
    surfaces,
  };
}

function createDocument(pages: CreationFlowPage[]): CreationFlowDocument {
  return {
    id: "doc-1" as any,
    version: "1.0.0",
    metadata: {
      workspaceId: "ws-1" as any,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    pages,
    variables: [],
    assets: [],
    rules: [],
  };
}

describe("selectFirstSurface", () => {
  it("selects designRegion over colorRegion", () => {
    const doc = createDocument([
      createPage("page-1", [
        createSurface("color-surface", "colorRegion"),
        createSurface("design-surface", "designRegion"),
      ]),
    ]);

    const result = selectFirstSurface(doc);

    expect(result.selectedPageId).toBe("page-1");
    expect(result.selectedSurfaceId).toBe("design-surface");
  });

  it("selects designRegion over default surface", () => {
    const doc = createDocument([
      createPage("page-1", [
        createSurface("default-surface"),
        createSurface("design-surface", "designRegion"),
      ]),
    ]);

    const result = selectFirstSurface(doc);

    expect(result.selectedPageId).toBe("page-1");
    expect(result.selectedSurfaceId).toBe("design-surface");
  });

  it("selects default surface over overlay", () => {
    const doc = createDocument([
      createPage("page-1", [
        createSurface("overlay-surface", "overlay"),
        createSurface("default-surface"),
      ]),
    ]);

    const result = selectFirstSurface(doc);

    expect(result.selectedPageId).toBe("page-1");
    expect(result.selectedSurfaceId).toBe("default-surface");
  });

  it("selects designRegion over overlay", () => {
    const doc = createDocument([
      createPage("page-1", [
        createSurface("overlay-surface", "overlay"),
        createSurface("design-surface", "designRegion"),
      ]),
    ]);

    const result = selectFirstSurface(doc);

    expect(result.selectedPageId).toBe("page-1");
    expect(result.selectedSurfaceId).toBe("design-surface");
  });

  it("falls back to first surface for legacy templates without roles", () => {
    const doc = createDocument([
      createPage("page-1", [createSurface("front"), createSurface("back")]),
    ]);

    const result = selectFirstSurface(doc);

    expect(result.selectedPageId).toBe("page-1");
    expect(result.selectedSurfaceId).toBe("front");
  });

  it("returns null page and surface for empty document", () => {
    const doc = createDocument([]);

    const result = selectFirstSurface(doc);

    expect(result.selectedPageId).toBeNull();
    expect(result.selectedSurfaceId).toBeNull();
  });

  it("returns page id but null surface for page without surfaces", () => {
    const doc = createDocument([createPage("page-1", [])]);

    const result = selectFirstSurface(doc);

    expect(result.selectedPageId).toBe("page-1");
    expect(result.selectedSurfaceId).toBeNull();
  });
});

describe("findFirstDesignRegionSurface", () => {
  it("returns the first designRegion surface", () => {
    const doc = createDocument([
      createPage("page-1", [
        createSurface("color-surface", "colorRegion"),
        createSurface("design-surface", "designRegion"),
        createSurface("another-design", "designRegion"),
      ]),
    ]);

    const result = findFirstDesignRegionSurface(doc, "page-1");

    expect(result?.id).toBe("design-surface");
  });

  it("returns undefined if no designRegion exists", () => {
    const doc = createDocument([
      createPage("page-1", [
        createSurface("color-surface", "colorRegion"),
        createSurface("overlay-surface", "overlay"),
      ]),
    ]);

    const result = findFirstDesignRegionSurface(doc, "page-1");

    expect(result).toBeUndefined();
  });

  it("returns undefined for non-existent page", () => {
    const doc = createDocument([
      createPage("page-1", [createSurface("design-surface", "designRegion")]),
    ]);

    const result = findFirstDesignRegionSurface(doc, "non-existent-page");

    expect(result).toBeUndefined();
  });
});

describe("findFirstNonOverlaySurface", () => {
  it("returns the first non-overlay surface", () => {
    const doc = createDocument([
      createPage("page-1", [
        createSurface("overlay-1", "overlay"),
        createSurface("color-surface", "colorRegion"),
        createSurface("design-surface", "designRegion"),
      ]),
    ]);

    const result = findFirstNonOverlaySurface(doc, "page-1");

    expect(result?.id).toBe("color-surface");
  });

  it("returns undefined if only overlay surfaces exist", () => {
    const doc = createDocument([
      createPage("page-1", [
        createSurface("overlay-1", "overlay"),
        createSurface("overlay-2", "overlay"),
      ]),
    ]);

    const result = findFirstNonOverlaySurface(doc, "page-1");

    expect(result).toBeUndefined();
  });

  it("returns undefined for non-existent page", () => {
    const doc = createDocument([createPage("page-1", [createSurface("default-surface")])]);

    const result = findFirstNonOverlaySurface(doc, "non-existent-page");
    expect(result).toBeUndefined();
  });
});

function createElement(
  id: string,
  x: number,
  y: number,
  width = 50,
  height = 30,
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
  } as unknown as CreationFlowElement;
}

function createSurfaceWithElements(
  id: string,
  elements: CreationFlowElement[],
): CreationFlowSurface {
  return {
    id: id as SurfaceId,
    name: id,
    width: 600,
    height: 400,
    unit: "px",
    elements,
  };
}

describe("selectElement with modifier", () => {
  it("replaces selection when no modifier is pressed", () => {
    const start = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: ["a"] as readonly string[],
    };
    const next = selectElement("b", start);
    expect(next.selectedElementIds).toEqual(["b"]);
  });

  it("adds to selection when shift is pressed", () => {
    const start = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: ["a"] as readonly string[],
    };
    const next = selectElement("b", start, { additive: true, toggle: true, range: true });
    expect(next.selectedElementIds).toEqual(["a", "b"]);
  });

  it("toggles selection when shift is pressed twice", () => {
    const start = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: ["a", "b"] as readonly string[],
    };
    const next = selectElement("a", start, { additive: true, toggle: true, range: true });
    expect(next.selectedElementIds).toEqual(["b"]);
  });

  it("keeps selection when selecting already selected element without modifier", () => {
    const start = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: ["a"] as readonly string[],
    };
    const next = selectElement("a", start);
    expect(next).toBe(start);
  });
});

describe("clearElementSelection and isElementSelected", () => {
  it("clears selection and returns same state when already empty", () => {
    const start = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: [] as readonly string[],
    };
    expect(clearElementSelection(start)).toBe(start);

    const filled = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: ["a"] as readonly string[],
    };
    const cleared = clearElementSelection(filled);
    expect(cleared.selectedElementIds).toEqual([]);
    expect(isElementSelected("a", cleared)).toBe(false);
  });

  it("isElementSelected returns true for members and false otherwise", () => {
    const state = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: ["a", "b"] as readonly string[],
    };
    expect(isElementSelected("a", state)).toBe(true);
    expect(isElementSelected("c", state)).toBe(false);
  });
});

describe("makeSelectionRect", () => {
  it("normalises direction-independent rect", () => {
    const r = makeSelectionRect(50, 80, 10, 20);
    expect(r).toEqual({ minX: 10, minY: 20, maxX: 50, maxY: 80 });
  });
});

describe("rectIntersectsElement", () => {
  it("returns true for overlapping rects", () => {
    const el = createElement("e", 10, 10, 50, 30);
    const rect = makeSelectionRect(20, 20, 100, 100);
    expect(rectIntersectsElement(rect, el)).toBe(true);
  });

  it("returns false for non-overlapping rects", () => {
    const el = createElement("e", 0, 0, 10, 10);
    const rect = makeSelectionRect(50, 50, 100, 100);
    expect(rectIntersectsElement(rect, el)).toBe(false);
  });
});

describe("selectElementsInRect", () => {
  const elements: CreationFlowElement[] = [
    createElement("a", 0, 0, 40, 40),
    createElement("b", 50, 50, 40, 40),
    createElement("c", 200, 200, 40, 40),
  ];
  const surface = createSurfaceWithElements("s1", elements);

  it("replaces selection with all matching elements", () => {
    const rect = makeSelectionRect(-10, -10, 100, 100);
    const start = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: ["c"] as readonly string[],
    };
    const next = selectElementsInRect(surface, rect, start, NO_MODIFIER);
    expect([...next.selectedElementIds].sort()).toEqual(["a", "b"]);
  });

  it("supports fully-contained mode to exclude partially overlapping", () => {
    const rect = makeSelectionRect(0, 0, 60, 60);
    const start = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: [] as readonly string[],
    };
    const next = selectElementsInRect(surface, rect, start, NO_MODIFIER, { fullyContained: true });
    expect(next.selectedElementIds).toEqual(["a"]);
  });

  it("appends to selection with shift modifier", () => {
    const rect = makeSelectionRect(-10, -10, 100, 100);
    const start = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: ["c"] as readonly string[],
    };
    const next = selectElementsInRect(surface, rect, start, {
      additive: true,
      toggle: true,
      range: false,
    });
    expect([...next.selectedElementIds].sort()).toEqual(["a", "b", "c"]);
  });

  it("toggles off elements when shift modifier is active", () => {
    const rect = makeSelectionRect(-10, -10, 100, 100);
    const start = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: ["a", "b", "c"] as readonly string[],
    };
    const next = selectElementsInRect(surface, rect, start, {
      additive: true,
      toggle: true,
      range: false,
    });
    expect(next.selectedElementIds).toEqual(["c"]);
  });
});

describe("getSelectionPrimaryElementId", () => {
  it("returns null for empty selection", () => {
    const state = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: [] as readonly string[],
    };
    expect(getSelectionPrimaryElementId(state)).toBeNull();
  });

  it("returns the first element id for multi-selection", () => {
    const state = {
      selectedPageId: "p",
      selectedSurfaceId: "s",
      selectedElementIds: ["a", "b"] as readonly string[],
    };
    expect(getSelectionPrimaryElementId(state)).toBe("a");
  });
});
