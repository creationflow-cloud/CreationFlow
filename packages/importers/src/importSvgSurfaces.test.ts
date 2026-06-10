import { describe, expect, it } from "vitest";
import { importSvgSurfaces, inferRoleFromName } from "./index.js";

describe("inferRoleFromName", () => {
  it("maps color-related names to colorRegion", () => {
    expect(inferRoleFromName("front-color")).toBe("colorRegion");
    expect(inferRoleFromName("body-color")).toBe("colorRegion");
    expect(inferRoleFromName("colour-region")).toBe("colorRegion");
    expect(inferRoleFromName("body")).toBe("colorRegion");
  });

  it("maps design-related names to designRegion", () => {
    expect(inferRoleFromName("design-area")).toBe("designRegion");
    expect(inferRoleFromName("print-area")).toBe("designRegion");
    expect(inferRoleFromName("druck-zone")).toBe("designRegion");
    expect(inferRoleFromName("print")).toBe("designRegion");
  });

  it("maps overlay-related names to overlay", () => {
    expect(inferRoleFromName("seam-overlay")).toBe("overlay");
    expect(inferRoleFromName("shadow")).toBe("overlay");
    expect(inferRoleFromName("fold-line")).toBe("overlay");
    expect(inferRoleFromName("overlay")).toBe("overlay");
  });

  it("maps unknown names to default", () => {
    expect(inferRoleFromName("unknown")).toBe("default");
    expect(inferRoleFromName("")).toBe("default");
    expect(inferRoleFromName(undefined)).toBe("default");
  });
});

describe("importSvgSurfaces", () => {
  it("SVG with viewBox and 3 named paths creates 3 surfaces", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="front-color" d="M0 0 L500 0 L500 600 L0 600 Z" fill="#ffffff"/>
        <path id="design-area" d="M100 100 L400 100 L400 500 L100 500 Z" fill="#ff0000"/>
        <path id="seam-overlay" d="M50 50 L450 50 L450 550 L50 550 Z" fill="#000000"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(3);
    expect(result.width).toBe(500);
    expect(result.height).toBe(600);
    expect(result.viewBox).toEqual({ x: 0, y: 0, width: 500, height: 600 });
  });

  it("color path becomes colorRegion", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="front-color" d="M0 0 L500 0 L500 600 L0 600 Z" fill="#ffffff"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(1);
    expect(result.surfaces[0].role).toBe("colorRegion");
    expect(result.surfaces[0].shape).toBe("path");
    expect(result.surfaces[0].clipContent).toBe(false);
    expect(result.surfaces[0].fillColor).toBe("#ffffff");
  });

  it("design path becomes designRegion with clipContent true", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="design-area" d="M100 100 L400 100 L400 500 L100 500 Z"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(1);
    expect(result.surfaces[0].role).toBe("designRegion");
    expect(result.surfaces[0].clipContent).toBe(true);
    expect(result.surfaces[0].pathData).toBe("M100 100 L400 100 L400 500 L100 500 Z");
  });

  it("print path becomes designRegion with clipContent true", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="print-area" d="M50 50 L450 50 L450 550 L50 550 Z"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(1);
    expect(result.surfaces[0].role).toBe("designRegion");
    expect(result.surfaces[0].clipContent).toBe(true);
  });

  it("overlay path becomes overlay", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="seam-overlay" d="M50 50 L450 50 L450 550 L50 550 Z"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(1);
    expect(result.surfaces[0].role).toBe("overlay");
    expect(result.surfaces[0].clipContent).toBe(false);
  });

  it("unknown path becomes default", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="unknown-surface" d="M50 50 L450 50 L450 550 L50 550 Z"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(1);
    expect(result.surfaces[0].role).toBe("default");
    expect(result.surfaces[0].clipContent).toBe(false);
  });

  it("simple rect is imported as path", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <rect id="color-rect" x="0" y="0" width="500" height="600" fill="#ffffff"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(1);
    expect(result.surfaces[0].shape).toBe("path");
    expect(result.surfaces[0].pathData).toBe("M0 0 L500 0 L500 600 L0 600 Z");
    expect(result.surfaces[0].fillColor).toBe("#ffffff");
  });

  it("transform attributes generate warnings", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="transformed-path" d="M50 50 L450 50 L450 550 L50 550 Z" transform="rotate(45)"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === "ignored_transform")).toBe(true);
  });

  it("unsupported elements generate warnings", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <text id="text-element" x="50" y="50">Hello</text>
        <image id="image-element" href="test.png"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === "unsupported_element")).toBe(true);
  });

  it("missing viewBox generates warning but remains deterministic if width/height exist", () => {
    const svg = `
      <svg width="500" height="600" xmlns="http://www.w3.org/2000/svg">
        <path id="design-area" d="M100 100 L400 100 L400 500 L100 500 Z"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.width).toBe(500);
    expect(result.height).toBe(600);
    expect(result.surfaces).toHaveLength(1);
    expect(result.warnings.some((w) => w.code === "missing_viewbox")).toBe(true);
  });

  it("empty SVG generates warning", () => {
    const svg = `<svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg"></svg>`;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === "empty_svg")).toBe(true);
  });

  it("path without d attribute generates warning", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="no-d-path" fill="#ff0000"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === "missing_path_d")).toBe(true);
  });

  it("uses data-role attribute when present", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="custom-path" d="M50 50 L450 50 L450 550 L50 550 Z" data-role="designRegion"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(1);
    expect(result.surfaces[0].role).toBe("designRegion");
  });

  it("uses data-creationflow-role attribute when present", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="custom-path" d="M50 50 L450 50 L450 550 L50 550 Z" data-creationflow-role="overlay"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(1);
    expect(result.surfaces[0].role).toBe("overlay");
  });

  it("uses inkscape:label for surface name", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape">
        <path id="path-1" d="M50 50 L450 50 L450 550 L50 550 Z" inkscape:label="Design Area"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(1);
    expect(result.surfaces[0].name).toBe("Design Area");
  });

  it("handles multiple paths with mixed roles", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="body-color" d="M0 0 L500 0 L500 600 L0 600 Z" fill="#ffffff"/>
        <path id="design" d="M100 100 L400 100 L400 500 L100 500 Z"/>
        <path id="shadow-overlay" d="M50 50 L450 50 L450 550 L50 550 Z"/>
        <path id="unknown" d="M200 200 L300 200 L300 300 L200 300 Z"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(4);
    expect(result.surfaces[0].role).toBe("colorRegion");
    expect(result.surfaces[1].role).toBe("designRegion");
    expect(result.surfaces[2].role).toBe("overlay");
    expect(result.surfaces[3].role).toBe("default");
  });

  it("rect with transform generates warning and is skipped", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <rect id="transformed-rect" x="0" y="0" width="500" height="600" transform="scale(2)"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(0);
    expect(result.warnings.some((w) => w.code === "ignored_transform")).toBe(true);
  });

  it("polygon generates unsupported warning", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <polygon id="poly" points="50,50 450,50 450,550 50,550"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(0);
    expect(
      result.warnings.some(
        (w) => w.code === "unsupported_element" && w.message.includes("polygon"),
      ),
    ).toBe(true);
  });

  it("polyline generates unsupported warning", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <polyline id="polyline" points="50,50 450,50 450,550 50,550"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces).toHaveLength(0);
    expect(
      result.warnings.some(
        (w) => w.code === "unsupported_element" && w.message.includes("polyline"),
      ),
    ).toBe(true);
  });

  it("surface elements array is empty", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="design-area" d="M100 100 L400 100 L400 500 L100 500 Z"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces[0].elements).toEqual([]);
  });

  it("surface unit is px", () => {
    const svg = `
      <svg viewBox="0 0 500 600" xmlns="http://www.w3.org/2000/svg">
        <path id="design-area" d="M100 100 L400 100 L400 500 L100 500 Z"/>
      </svg>
    `;

    const result = importSvgSurfaces(svg);

    expect(result.surfaces[0].unit).toBe("px");
  });
});
