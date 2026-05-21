export interface SelectionState {
  readonly selectedPageId: string | null;
  readonly selectedSurfaceId: string | null;
  readonly selectedElementId: string | null;
}

export function selectPage(pageId: string): SelectionState {
  return {
    selectedPageId: pageId,
    selectedSurfaceId: null,
    selectedElementId: null,
  };
}

export function selectSurface(surfaceId: string, state: SelectionState): SelectionState {
  return {
    ...state,
    selectedSurfaceId: surfaceId,
    selectedElementId: null,
  };
}

export function selectElement(elementId: string, state: SelectionState): SelectionState {
  return {
    ...state,
    selectedElementId: elementId,
  };
}
