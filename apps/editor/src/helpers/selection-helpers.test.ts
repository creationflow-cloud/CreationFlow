import { describe, expect, it } from "vitest";
import type { CreationFlowDocument, CreationFlowPage, CreationFlowSurface, PageId, SurfaceId } from "@creationflow/schema";

import {
  selectFirstSurface,
  findFirstDesignRegionSurface,
  findFirstNonOverlaySurface,
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
      createPage("page-1", [
        createSurface("front"),
        createSurface("back"),
      ]),
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
    const doc = createDocument([
      createPage("page-1", []),
    ]);

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
      createPage("page-1", [
        createSurface("design-surface", "designRegion"),
      ]),
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
    const doc = createDocument([
      createPage("page-1", [
        createSurface("default-surface"),
      ]),
    ]);

    const result = findFirstNonOverlaySurface(doc, "non-existent-page");

    expect(result).toBeUndefined();
  });
});
