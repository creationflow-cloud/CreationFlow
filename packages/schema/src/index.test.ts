import { describe, expect, it } from "vitest";
import type { CreationFlowSurface, CreationFlowPage, CreationFlowDocument } from "./index.js";

describe("CreationFlowSurface schema", () => {
  it("accepts a backward-compatible rectangular surface without new fields", () => {
    const surface: CreationFlowSurface = {
      id: "surface-1" as any,
      name: "Front",
      width: 500,
      height: 600,
      unit: "px",
      elements: [],
    };

    expect(surface.shape).toBeUndefined();
    expect(surface.role).toBeUndefined();
    expect(surface.pathData).toBeUndefined();
    expect(surface.fillColor).toBeUndefined();
    expect(surface.clipContent).toBeUndefined();
    expect(surface.width).toBe(500);
    expect(surface.height).toBe(600);
  });

  it("accepts a path-based surface with all new optional fields", () => {
    const surface: CreationFlowSurface = {
      id: "surface-1" as any,
      name: "T-Shirt Front",
      width: 400,
      height: 500,
      unit: "px",
      elements: [],
      shape: "path",
      role: "colorRegion",
      pathData: "M50,50 L350,50 L350,450 L50,450 Z",
      fillColor: "#ff0000",
      clipContent: true,
    };

    expect(surface.shape).toBe("path");
    expect(surface.role).toBe("colorRegion");
    expect(surface.pathData).toBe("M50,50 L350,50 L350,450 L50,450 Z");
    expect(surface.fillColor).toBe("#ff0000");
    expect(surface.clipContent).toBe(true);
  });

  it("accepts a path-based designRegion surface", () => {
    const surface: CreationFlowSurface = {
      id: "surface-1" as any,
      name: "Design Area",
      width: 300,
      height: 400,
      unit: "px",
      elements: [],
      shape: "path",
      role: "designRegion",
      pathData: "M10,10 C50,10 50,50 10,50 Z",
      clipContent: true,
    };

    expect(surface.shape).toBe("path");
    expect(surface.role).toBe("designRegion");
    expect(surface.pathData).toBe("M10,10 C50,10 50,50 10,50 Z");
    expect(surface.fillColor).toBeUndefined();
    expect(surface.clipContent).toBe(true);
  });

  it("accepts an overlay surface", () => {
    const surface: CreationFlowSurface = {
      id: "surface-1" as any,
      name: "Seam Overlay",
      width: 400,
      height: 500,
      unit: "px",
      elements: [],
      shape: "path",
      role: "overlay",
      pathData: "M0,0 L400,0 L400,500 L0,500 Z",
      fillColor: "#000000",
      clipContent: false,
    };

    expect(surface.shape).toBe("path");
    expect(surface.role).toBe("overlay");
    expect(surface.fillColor).toBe("#000000");
  });

  it("accepts a rectangular surface with explicit shape field", () => {
    const surface: CreationFlowSurface = {
      id: "surface-1" as any,
      name: "Front",
      width: 500,
      height: 600,
      unit: "px",
      elements: [],
      shape: "rect",
      clipContent: true,
    };

    expect(surface.shape).toBe("rect");
    expect(surface.clipContent).toBe(true);
  });

  it("accepts multiple surfaces on a page", () => {
    const page: CreationFlowPage = {
      id: "page-1" as any,
      name: "T-Shirt",
      width: 600,
      height: 700,
      unit: "px",
      surfaces: [
        {
          id: "surface-1" as any,
          name: "Front Body",
          width: 400,
          height: 500,
          unit: "px",
          elements: [],
          shape: "path",
          role: "colorRegion",
          pathData: "M50,50 L350,50 L350,450 L50,450 Z",
          fillColor: "#ffffff",
        },
        {
          id: "surface-2" as any,
          name: "Left Sleeve",
          width: 150,
          height: 200,
          unit: "px",
          elements: [],
          shape: "path",
          role: "colorRegion",
          pathData: "M0,0 L100,0 L100,150 L0,150 Z",
          fillColor: "#ffffff",
        },
        {
          id: "surface-3" as any,
          name: "Design Area",
          width: 300,
          height: 300,
          unit: "px",
          elements: [],
          shape: "path",
          role: "designRegion",
          pathData: "M100,100 L300,100 L300,300 L100,300 Z",
          clipContent: true,
        },
      ],
    };

    expect(page.surfaces?.length).toBe(3);
    expect(page.surfaces?.[0].role).toBe("colorRegion");
    expect(page.surfaces?.[1].role).toBe("colorRegion");
    expect(page.surfaces?.[2].role).toBe("designRegion");
  });

  it("accepts a full document with path-based surfaces", () => {
    const document: CreationFlowDocument = {
      id: "doc-1" as any,
      version: "1.0.0",
      metadata: {
        workspaceId: "workspace-1" as any,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      pages: [
        {
          id: "page-1" as any,
          name: "T-Shirt Front",
          width: 600,
          height: 700,
          unit: "px",
          surfaces: [
            {
              id: "surface-1" as any,
              name: "Base Layer",
              width: 500,
              height: 600,
              unit: "px",
              elements: [],
              shape: "path",
              role: "colorRegion",
              pathData: "M50,50 L450,50 L450,550 L50,550 Z",
              fillColor: "#ffffff",
            },
            {
              id: "surface-2" as any,
              name: "Print Area",
              width: 300,
              height: 400,
              unit: "px",
              elements: [
                {
                  id: "element-1" as any,
                  type: "text",
                  name: "Custom Text",
                  x: 50,
                  y: 50,
                  width: 200,
                  height: 40,
                  rotation: 0,
                  opacity: 1,
                  visible: true,
                  locked: false,
                  zIndex: 1,
                  text: "Hello World",
                  fontFamily: "Helvetica",
                  fontSize: 24,
                  color: "#000000",
                  align: "center",
                },
              ],
              shape: "path",
              role: "designRegion",
              pathData: "M100,100 L400,100 L400,400 L100,400 Z",
              clipContent: true,
            },
          ],
        },
      ],
      variables: [],
      assets: [],
      rules: [],
    };

    expect(document.pages.length).toBe(1);
    expect(document.pages[0].surfaces?.length).toBe(2);
    expect(document.pages[0].surfaces?.[0].role).toBe("colorRegion");
    expect(document.pages[0].surfaces?.[1].role).toBe("designRegion");
    expect(document.pages[0].surfaces?.[1].elements.length).toBe(1);
  });
});
