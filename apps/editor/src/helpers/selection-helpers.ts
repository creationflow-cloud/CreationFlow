import type { CreationFlowDocument, CreationFlowSurface } from "@creationflow/schema";

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

function getSurfaceSelectionPriority(surface: CreationFlowSurface): number {
  const role = surface.role ?? "default";
  if (role === "designRegion") return 1;
  if (role === "overlay") return 3;
  return 2;
}

export function selectFirstSurface(document: CreationFlowDocument): SelectionState {
  const firstPage = document.pages[0];
  if (!firstPage) {
    return { selectedPageId: null, selectedSurfaceId: null, selectedElementId: null };
  }

  const surfaces = firstPage.surfaces;
  if (!surfaces || surfaces.length === 0) {
    return { selectedPageId: firstPage.id, selectedSurfaceId: null, selectedElementId: null };
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
    selectedElementId: null,
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
