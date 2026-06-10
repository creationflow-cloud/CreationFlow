import { describe, expect, it } from "vitest";

import type { CreationFlowElement, CreationFlowSurface, ElementId } from "@creationflow/schema";

import {
  calculateAlignmentGuides,
  calculateSnapForMove,
  DEFAULT_GRID_SIZE,
  DEFAULT_SNAP_THRESHOLD_PX,
  getElementBounds,
  snapPositionToGrid,
  snapToGrid,
} from "./snap-helpers.js";

const ELEMENT_ID = "00000000-0000-0000-0000-000000000001" as ElementId;
const OTHER_ID = "00000000-0000-0000-0000-000000000002" as ElementId;

function makeElement(overrides: Partial<CreationFlowElement> = {}): CreationFlowElement {
  return {
    id: ELEMENT_ID,
    type: "shape",
    name: "Test",
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 0,
    shapeType: "rect",
    ...overrides,
  } as CreationFlowElement;
}

function makeSurface(elements: CreationFlowElement[]): CreationFlowSurface {
  return {
    id: "surface-1" as unknown as CreationFlowSurface["id"],
    name: "Front",
    width: 800,
    height: 600,
    unit: "px",
    elements,
  } as CreationFlowSurface;
}

describe("snapToGrid", () => {
  it("rounds to the nearest grid multiple", () => {
    expect(snapToGrid(13, 8)).toBe(16);
    expect(snapToGrid(11, 8)).toBe(8);
    expect(snapToGrid(15, 8)).toBe(16);
  });

  it("returns the value unchanged when grid size is invalid", () => {
    expect(snapToGrid(13, 0)).toBe(13);
    expect(snapToGrid(13, -4)).toBe(13);
    expect(snapToGrid(13, Number.NaN)).toBe(13);
  });
});

describe("snapPositionToGrid", () => {
  it("does not snap when disabled", () => {
    const result = snapPositionToGrid(13, 27, 8, false);
    expect(result.x).toBe(13);
    expect(result.y).toBe(27);
    expect(result.gridSnapX).toBe(false);
    expect(result.gridSnapY).toBe(false);
  });

  it("flags the axes that were snapped", () => {
    const result = snapPositionToGrid(13, 32, 8, true);
    expect(result.x).toBe(16);
    expect(result.y).toBe(32);
    expect(result.gridSnapX).toBe(true);
    expect(result.gridSnapY).toBe(false);
  });
});

describe("getElementBounds", () => {
  it("returns the min/max edges and centers", () => {
    const el = makeElement({ x: 10, y: 20, width: 100, height: 50 });
    const bounds = getElementBounds(el);
    expect(bounds).toEqual({
      minX: 10,
      minY: 20,
      maxX: 110,
      maxY: 70,
      centerX: 60,
      centerY: 45,
    });
  });
});

describe("calculateAlignmentGuides", () => {
  it("returns zero offset when no targets align within threshold", () => {
    const moving = getElementBounds(makeElement({ x: 0, y: 0, width: 50, height: 50 }));
    const other = getElementBounds(
      makeElement({ id: OTHER_ID, x: 300, y: 300, width: 40, height: 40 }),
    );
    const result = calculateAlignmentGuides(
      moving,
      [
        {
          bounds: other,
          element: makeElement({ id: OTHER_ID, x: 300, y: 300, width: 40, height: 40 }),
        },
      ],
      { threshold: DEFAULT_SNAP_THRESHOLD_PX },
    );
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
    expect(result.guides.vertical).toEqual([]);
    expect(result.guides.horizontal).toEqual([]);
  });

  it("snaps to the matching edge of a target when within threshold", () => {
    const moving = getElementBounds(makeElement({ x: 0, y: 0, width: 50, height: 50 }));
    const otherBounds = getElementBounds(
      makeElement({ id: OTHER_ID, x: 55, y: 58, width: 50, height: 50 }),
    );
    const result = calculateAlignmentGuides(
      moving,
      [
        {
          bounds: otherBounds,
          element: makeElement({ id: OTHER_ID, x: 55, y: 58, width: 50, height: 50 }),
        },
      ],
      { threshold: 20 },
    );
    expect(result.dx).toBe(5);
    expect(result.dy).toBe(8);
    expect(result.guides.vertical.length).toBeGreaterThan(0);
    expect(result.guides.horizontal.length).toBeGreaterThan(0);
  });
});

describe("calculateSnapForMove", () => {
  it("combines grid snapping with alignment guides", () => {
    const surface = makeSurface([
      makeElement({ id: OTHER_ID, x: 100, y: 200, width: 40, height: 40 }),
    ]);
    const moving = makeElement({ x: 5, y: 5, width: 50, height: 50 });

    const result = calculateSnapForMove({
      surface,
      movingElement: moving,
      movingElementIds: [moving.id],
      proposedX: 50,
      proposedY: 175,
      options: { threshold: 50, snapToGrid: true, gridSize: DEFAULT_GRID_SIZE },
    });

    expect(result.gridSnapped.x).toBe(true);
    expect(result.gridSnapped.y).toBe(true);
    expect(result.x % 8).toBe(0);
    expect(result.y % 8).toBe(0);
  });

  it("skips alignment targets that are part of the moving selection", () => {
    const surface = makeSurface([
      makeElement({ id: ELEMENT_ID, x: 0, y: 0, width: 50, height: 50 }),
      makeElement({ id: OTHER_ID, x: 500, y: 500, width: 50, height: 50 }),
    ]);
    const moving = makeElement({ x: 0, y: 0, width: 50, height: 50 });

    const result = calculateSnapForMove({
      surface,
      movingElement: moving,
      movingElementIds: [ELEMENT_ID, OTHER_ID],
      proposedX: 10,
      proposedY: 10,
      options: { threshold: 100, snapToGrid: false, gridSize: DEFAULT_GRID_SIZE },
    });

    expect(result.guides.vertical).toEqual([]);
    expect(result.guides.horizontal).toEqual([]);
  });

  it("returns the proposed position when no snapping rule applies", () => {
    const surface = makeSurface([]);
    const moving = makeElement({ x: 10, y: 10, width: 50, height: 50 });

    const result = calculateSnapForMove({
      surface,
      movingElement: moving,
      movingElementIds: [moving.id],
      proposedX: 47,
      proposedY: 23,
      options: { threshold: 0, snapToGrid: false, gridSize: DEFAULT_GRID_SIZE },
    });

    expect(result.x).toBe(47);
    expect(result.y).toBe(23);
    expect(result.guides.vertical).toEqual([]);
    expect(result.guides.horizontal).toEqual([]);
  });
});
