import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowSurface,
} from "@creationflow/schema";

export interface SelectionState {
  readonly selectedPageId: string | null;
  readonly selectedSurfaceId: string | null;
  readonly selectedElementIds: readonly string[];
}

export function selectPage(pageId: string): SelectionState {
  return {
    selectedPageId: pageId,
    selectedSurfaceId: null,
    selectedElementIds: [],
  };
}

export function selectSurface(surfaceId: string, state: SelectionState): SelectionState {
  return {
    ...state,
    selectedSurfaceId: surfaceId,
    selectedElementIds: [],
  };
}

export function isElementSelected(elementId: string, state: SelectionState): boolean {
  return state.selectedElementIds.includes(elementId);
}

export function clearElementSelection(state: SelectionState): SelectionState {
  if (state.selectedElementIds.length === 0) {
    return state;
  }
  return { ...state, selectedElementIds: [] };
}

export interface SelectionModifier {
  readonly additive: boolean;
  readonly toggle: boolean;
  readonly range: boolean;
}

export const NO_MODIFIER: SelectionModifier = Object.freeze({
  additive: false,
  toggle: false,
  range: false,
});

export function modifierFromEvent(event: {
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
}): SelectionModifier {
  const additive = Boolean(event.shiftKey || event.metaKey || event.ctrlKey);
  return {
    additive,
    toggle: additive,
    range: Boolean(event.shiftKey),
  };
}

export function selectElement(
  elementId: string,
  state: SelectionState,
  modifier: SelectionModifier = NO_MODIFIER,
): SelectionState {
  if (!modifier.additive) {
    if (state.selectedElementIds.length === 1 && state.selectedElementIds[0] === elementId) {
      return state;
    }
    return { ...state, selectedElementIds: [elementId] };
  }

  if (modifier.toggle) {
    if (state.selectedElementIds.includes(elementId)) {
      return {
        ...state,
        selectedElementIds: state.selectedElementIds.filter((id) => id !== elementId),
      };
    }
    return { ...state, selectedElementIds: [...state.selectedElementIds, elementId] };
  }

  if (state.selectedElementIds.includes(elementId)) {
    return state;
  }
  return { ...state, selectedElementIds: [...state.selectedElementIds, elementId] };
}

export interface SelectionRect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export function makeSelectionRect(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): SelectionRect {
  return {
    minX: Math.min(startX, endX),
    minY: Math.min(startY, endY),
    maxX: Math.max(startX, endX),
    maxY: Math.max(startY, endY),
  };
}

export function rectIntersectsElement(rect: SelectionRect, element: CreationFlowElement): boolean {
  const elementRight = element.x + element.width;
  const elementBottom = element.y + element.height;
  return !(
    rect.maxX < element.x ||
    rect.minX > elementRight ||
    rect.maxY < element.y ||
    rect.minY > elementBottom
  );
}

export function rectFullyContainsElement(
  rect: SelectionRect,
  element: CreationFlowElement,
): boolean {
  return (
    element.x >= rect.minX &&
    element.y >= rect.minY &&
    element.x + element.width <= rect.maxX &&
    element.y + element.height <= rect.maxY
  );
}

export function selectElementsInRect(
  surface: CreationFlowSurface,
  rect: SelectionRect,
  state: SelectionState,
  modifier: SelectionModifier = NO_MODIFIER,
  options: { readonly fullyContained?: boolean } = {},
): SelectionState {
  const predicate = options.fullyContained ? rectFullyContainsElement : rectIntersectsElement;
  const matching = surface.elements.filter((el) => predicate(rect, el)).map((el) => el.id);

  if (!modifier.additive) {
    return { ...state, selectedElementIds: matching };
  }

  const merged = new Set<string>(state.selectedElementIds);
  for (const id of matching) {
    if (modifier.toggle) {
      if (merged.has(id)) {
        merged.delete(id);
      } else {
        merged.add(id);
      }
    } else {
      merged.add(id);
    }
  }

  return { ...state, selectedElementIds: Array.from(merged) };
}

function getSurfaceSelectionPriority(surface: CreationFlowSurface): number {
  const role = surface.role ?? "default";
  if (role === "designRegion") return 1;
  if (role === "overlay") return 3;
  return 2;
}

export function selectFirstSurface(document: CreationFlowDocument): SelectionState {
  const firstPage = document.pages[0];
  if (!firstPage) {
    return { selectedPageId: null, selectedSurfaceId: null, selectedElementIds: [] };
  }

  const surfaces = firstPage.surfaces;
  if (!surfaces || surfaces.length === 0) {
    return { selectedPageId: firstPage.id, selectedSurfaceId: null, selectedElementIds: [] };
  }

  let bestSurface = surfaces[0];
  let bestPriority = getSurfaceSelectionPriority(bestSurface);

  for (let i = 1; i < surfaces.length; i++) {
    const priority = getSurfaceSelectionPriority(surfaces[i]);
    if (priority < bestPriority) {
      bestSurface = surfaces[i];
      bestPriority = priority;
    }
  }

  return {
    selectedPageId: firstPage.id,
    selectedSurfaceId: bestSurface.id,
    selectedElementIds: [],
  };
}

export function findFirstDesignRegionSurface(
  document: CreationFlowDocument,
  pageId: string,
): CreationFlowSurface | undefined {
  const page = document.pages.find((p) => p.id === pageId);
  if (!page?.surfaces) return undefined;

  return page.surfaces.find((s) => s.role === "designRegion");
}

export function findFirstNonOverlaySurface(
  document: CreationFlowDocument,
  pageId: string,
): CreationFlowSurface | undefined {
  const page = document.pages.find((p) => p.id === pageId);
  if (!page?.surfaces) return undefined;

  return page.surfaces.find((s) => s.role !== "overlay");
}

export function getSelectionPrimaryElementId(state: SelectionState): string | null {
  if (state.selectedElementIds.length === 0) {
    return null;
  }
  return state.selectedElementIds[0] ?? null;
}
