import { describe, expect, it } from "vitest";

import { applyResize, type ResizeDirection } from "./resize-math.js";

describe("applyResize", () => {
  const start = { x: 100, y: 100, width: 200, height: 100 };

  it("keeps dimensions when there is no movement", () => {
    const next = applyResize(start, "se", 0, 0, false);
    expect(next).toEqual({ x: 100, y: 100, width: 200, height: 100 });
  });

  it("grows the element to the south-east", () => {
    const next = applyResize(start, "se", 50, 25, false);
    expect(next).toEqual({ x: 100, y: 100, width: 250, height: 125 });
  });

  it("anchors the south-west corner when growing west", () => {
    const next = applyResize(start, "sw", -50, 25, false);
    expect(next).toEqual({ x: 50, y: 100, width: 250, height: 125 });
  });

  it("anchors the north-east corner when growing north", () => {
    const next = applyResize(start, "ne", 50, -40, false);
    expect(next).toEqual({ x: 100, y: 60, width: 250, height: 140 });
  });

  it("preserves the start aspect ratio when shift is held on a corner", () => {
    const next = applyResize(start, "se", 100, 0, true);
    expect(next.height).toBe(150);
    expect(next.width).toBe(300);
    expect(next.height / next.width).toBeCloseTo(start.height / start.width);
  });

  it("grows the element to the north-west when the user drags the top-left past the start", () => {
    // The bottom-right anchor is pinned to the start position, so
    // dragging the top-left by (-10000, -10000) just enlarges the box.
    const next = applyResize(start, "nw", -10_000, -10_000, false);
    expect(next.width).toBe(10_200);
    expect(next.height).toBe(10_100);
    expect(next.x).toBe(-9_900);
    expect(next.y).toBe(-9_900);
  });

  it("clamps the dimension when the drag would cross the opposite anchor", () => {
    // Drag the bottom-right corner past the top-left anchor: the new
    // width/height would be negative, so we clamp to MIN and pin the
    // element so it stays visible.
    const next = applyResize(start, "se", -1_000, -1_000, false);
    expect(next.width).toBe(10);
    expect(next.height).toBe(10);
    // The element stays anchored on the start's right edge so it never
    // disappears off canvas.
    expect(next.x + next.width).toBe(start.x + start.width);
    expect(next.y + next.height).toBe(start.y + start.height);
  });

  it.each<
    [ResizeDirection, number, number, { x: number; y: number; width: number; height: number }]
  >([
    ["e", 40, 0, { x: 100, y: 100, width: 240, height: 100 }],
    ["w", -30, 0, { x: 70, y: 100, width: 230, height: 100 }],
    ["n", 0, -25, { x: 100, y: 75, width: 200, height: 125 }],
    ["s", 0, 40, { x: 100, y: 100, width: 200, height: 140 }],
  ])("moves the right edge for direction %s", (direction, dx, dy, expected) => {
    expect(applyResize(start, direction, dx, dy, false)).toEqual(expected);
  });
});
