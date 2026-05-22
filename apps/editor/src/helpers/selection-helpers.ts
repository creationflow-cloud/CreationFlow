import type { CreationFlowDocument } from "@creationflow/schema";

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

export function selectFirstSurface(document: CreationFlowDocument): SelectionState {
  const firstPage = document.pages[0];
  if (!firstPage) {
    return { selectedPageId: null, selectedSurfaceId: null, selectedElementId: null };
  }

  const firstSurface = firstPage.surfaces?.[0];
  if (!firstSurface) {
    return { selectedPageId: firstPage.id, selectedSurfaceId: null, selectedElementId: null };
  }

  return {
    selectedPageId: firstPage.id,
    selectedSurfaceId: firstSurface.id,
    selectedElementId: null,
  };
}
