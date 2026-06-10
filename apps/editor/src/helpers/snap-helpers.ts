import type { CreationFlowElement, CreationFlowSurface } from "@creationflow/schema";

export interface SnapBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly centerX: number;
  readonly centerY: number;
}

export function getElementBounds(element: CreationFlowElement): SnapBounds {
  const minX = element.x;
  const minY = element.y;
  const maxX = element.x + element.width;
  const maxY = element.y + element.height;
  return {
    minX,
    minY,
    maxX,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

export function snapToGrid(value: number, gridSize: number): number {
  if (!Number.isFinite(gridSize) || gridSize <= 0) {
    return value;
  }
  return Math.round(value / gridSize) * gridSize;
}

export interface SnapResult {
  readonly x: number;
  readonly y: number;
  readonly gridSnapX: boolean;
  readonly gridSnapY: boolean;
}

export function snapPositionToGrid(
  x: number,
  y: number,
  gridSize: number,
  enabled: boolean,
): SnapResult {
  if (!enabled) {
    return { x, y, gridSnapX: false, gridSnapY: false };
  }
  const snappedX = snapToGrid(x, gridSize);
  const snappedY = snapToGrid(y, gridSize);
  return {
    x: snappedX,
    y: snappedY,
    gridSnapX: snappedX !== x,
    gridSnapY: snappedY !== y,
  };
}

export type GuideOrientation = "vertical" | "horizontal";

export interface AlignmentGuide {
  readonly orientation: GuideOrientation;
  readonly position: number;
  readonly alignment: "min" | "center" | "max";
  readonly targetElementId: string;
}

export interface AlignmentGuides {
  readonly vertical: readonly AlignmentGuide[];
  readonly horizontal: readonly AlignmentGuide[];
}

export interface GuideMatch {
  readonly dx: number;
  readonly dy: number;
  readonly guides: AlignmentGuides;
}

export interface SnapOptions {
  readonly threshold: number;
  readonly snapToGrid: boolean;
  readonly gridSize: number;
}

const DEFAULT_SNAP_THRESHOLD = 4;

export function collectGuideTargets(
  surface: CreationFlowSurface,
  excludeIds: readonly string[],
): { readonly element: CreationFlowElement; readonly bounds: SnapBounds }[] {
  const excluded = new Set(excludeIds);
  const targets: { element: CreationFlowElement; bounds: SnapBounds }[] = [];
  for (const element of surface.elements) {
    if (excluded.has(element.id)) continue;
    targets.push({ element, bounds: getElementBounds(element) });
  }
  return targets;
}

export function calculateAlignmentGuides(
  moving: SnapBounds,
  targets: readonly { readonly bounds: SnapBounds; readonly element: CreationFlowElement }[],
  options: { readonly threshold: number },
): GuideMatch {
  const threshold = options.threshold;
  let bestDx = 0;
  let bestDy = 0;
  let bestAbsDx = Number.POSITIVE_INFINITY;
  let bestAbsDy = Number.POSITIVE_INFINITY;
  const matchedVerticalGuides: AlignmentGuide[] = [];
  const matchedHorizontalGuides: AlignmentGuide[] = [];

  const movingEdgesX = [
    { value: moving.minX, alignment: "min" as const },
    { value: moving.centerX, alignment: "center" as const },
    { value: moving.maxX, alignment: "max" as const },
  ];
  const movingEdgesY = [
    { value: moving.minY, alignment: "min" as const },
    { value: moving.centerY, alignment: "center" as const },
    { value: moving.maxY, alignment: "max" as const },
  ];

  for (const target of targets) {
    const targetEdgesX = [
      { value: target.bounds.minX, alignment: "min" as const },
      { value: target.bounds.centerX, alignment: "center" as const },
      { value: target.bounds.maxX, alignment: "max" as const },
    ];
    for (const movingEdge of movingEdgesX) {
      for (const targetEdge of targetEdgesX) {
        const dx = targetEdge.value - movingEdge.value;
        const absDx = Math.abs(dx);
        if (absDx <= threshold && absDx < bestAbsDx) {
          bestAbsDx = absDx;
          bestDx = dx;
          matchedVerticalGuides.length = 0;
        }
      }
    }

    const targetEdgesY = [
      { value: target.bounds.minY, alignment: "min" as const },
      { value: target.bounds.centerY, alignment: "center" as const },
      { value: target.bounds.maxY, alignment: "max" as const },
    ];
    for (const movingEdge of movingEdgesY) {
      for (const targetEdge of targetEdgesY) {
        const dy = targetEdge.value - movingEdge.value;
        const absDy = Math.abs(dy);
        if (absDy <= threshold && absDy < bestAbsDy) {
          bestAbsDy = absDy;
          bestDy = dy;
          matchedHorizontalGuides.length = 0;
        }
      }
    }
  }

  if (bestAbsDx <= threshold) {
    for (const target of targets) {
      const targetEdgesX = [
        { value: target.bounds.minX, alignment: "min" as const },
        { value: target.bounds.centerX, alignment: "center" as const },
        { value: target.bounds.maxX, alignment: "max" as const },
      ];
      for (const movingEdge of movingEdgesX) {
        for (const targetEdge of targetEdgesX) {
          const dx = targetEdge.value - movingEdge.value;
          if (Math.abs(dx - bestDx) < 0.01) {
            matchedVerticalGuides.push({
              orientation: "vertical",
              position: targetEdge.value,
              alignment: targetEdge.alignment,
              targetElementId: target.element.id,
            });
            break;
          }
        }
      }
    }
  }

  if (bestAbsDy <= threshold) {
    for (const target of targets) {
      const targetEdgesY = [
        { value: target.bounds.minY, alignment: "min" as const },
        { value: target.bounds.centerY, alignment: "center" as const },
        { value: target.bounds.maxY, alignment: "max" as const },
      ];
      for (const movingEdge of movingEdgesY) {
        for (const targetEdge of targetEdgesY) {
          const dy = targetEdge.value - movingEdge.value;
          if (Math.abs(dy - bestDy) < 0.01) {
            matchedHorizontalGuides.push({
              orientation: "horizontal",
              position: targetEdge.value,
              alignment: targetEdge.alignment,
              targetElementId: target.element.id,
            });
            break;
          }
        }
      }
    }
  }

  return {
    dx: bestAbsDx <= threshold ? bestDx : 0,
    dy: bestAbsDy <= threshold ? bestDy : 0,
    guides: {
      vertical: matchedVerticalGuides,
      horizontal: matchedHorizontalGuides,
    },
  };
}

export interface CombinedSnapResult {
  readonly x: number;
  readonly y: number;
  readonly guides: AlignmentGuides;
  readonly gridSnapped: { readonly x: boolean; readonly y: boolean };
}

export function calculateSnapForMove({
  surface,
  movingElement,
  movingElementIds,
  proposedX,
  proposedY,
  options,
}: {
  readonly surface: CreationFlowSurface;
  readonly movingElement: CreationFlowElement;
  readonly movingElementIds: readonly string[];
  readonly proposedX: number;
  readonly proposedY: number;
  readonly options: SnapOptions;
}): CombinedSnapResult {
  const dx = proposedX - movingElement.x;
  const dy = proposedY - movingElement.y;
  const movingBounds = getElementBounds(movingElement);
  const movedBounds: SnapBounds = {
    minX: movingBounds.minX + dx,
    minY: movingBounds.minY + dy,
    maxX: movingBounds.maxX + dx,
    maxY: movingBounds.maxY + dy,
    centerX: movingBounds.centerX + dx,
    centerY: movingBounds.centerY + dy,
  };

  const targets = collectGuideTargets(surface, movingElementIds);
  const threshold = options.threshold > 0 ? options.threshold : DEFAULT_SNAP_THRESHOLD;
  const guideMatch = calculateAlignmentGuides(movedBounds, targets, { threshold });

  let snappedX = proposedX + guideMatch.dx;
  let snappedY = proposedY + guideMatch.dy;

  const gridSnapped = { x: false, y: false };
  if (options.snapToGrid) {
    const gridX = snapToGrid(snappedX, options.gridSize);
    const gridY = snapToGrid(snappedY, options.gridSize);
    if (Math.abs(gridX - snappedX) > 0) {
      gridSnapped.x = true;
      snappedX = gridX;
    }
    if (Math.abs(gridY - snappedY) > 0) {
      gridSnapped.y = true;
      snappedY = gridY;
    }
  }

  return {
    x: snappedX,
    y: snappedY,
    guides: guideMatch.guides,
    gridSnapped,
  };
}

export const DEFAULT_GRID_SIZE = 8;
export const DEFAULT_SNAP_THRESHOLD_PX = 4;
