import { describe, expect, it } from "vitest";

import {
  clampZoom,
  defaultViewState,
  fitView,
  zoomAtPoint,
  MIN_ZOOM,
  MAX_ZOOM,
} from "./use-zoom-pan.js";

describe("clampZoom", () => {
  it("returns the same value when within range", () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(0.5)).toBe(0.5);
    expect(clampZoom(4)).toBe(4);
  });

  it("clamps below the minimum", () => {
    expect(clampZoom(0.001)).toBe(MIN_ZOOM);
  });

  it("clamps above the maximum", () => {
    expect(clampZoom(100)).toBe(MAX_ZOOM);
  });
});

describe("defaultViewState", () => {
  it("returns 100% zoom and zero pan", () => {
    expect(defaultViewState()).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });
});

describe("zoomAtPoint", () => {
  it("scales pan to keep the anchor under the cursor", () => {
    const start = { zoom: 1, panX: 0, panY: 0 };
    const next = zoomAtPoint(start, 2, { x: 100, y: 100 });
    expect(next.zoom).toBe(2);
    expect(next.panX).toBe(-100);
    expect(next.panY).toBe(-100);
  });

  it("returns the same state when zoom cannot change", () => {
    const start = { zoom: MAX_ZOOM, panX: 10, panY: 10 };
    const next = zoomAtPoint(start, 2, { x: 0, y: 0 });
    expect(next).toBe(start);
  });
});

describe("fitView", () => {
  it("centers the surface inside the viewport", () => {
    const view = fitView(400, 300, 1000, 800);
    const expectedZoom = Math.min((1000 - 64) / 400, (800 - 64) / 300, 1);
    expect(view.zoom).toBeCloseTo(expectedZoom);
    expect(view.panX).toBeCloseTo((1000 - 400 * view.zoom) / 2);
    expect(view.panY).toBeCloseTo((800 - 300 * view.zoom) / 2);
  });

  it("returns default view for invalid dimensions", () => {
    expect(fitView(0, 0, 100, 100)).toEqual(defaultViewState());
    expect(fitView(100, 100, 0, 0)).toEqual(defaultViewState());
  });
});
