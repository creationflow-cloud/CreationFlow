import type {
  CreationFlowDocument,
  CreationFlowSurface,
  PageId,
  SurfaceId,
} from "@creationflow/schema";
import type { AddSurfaceInput } from "./types.js";

export function addSurface(
  document: CreationFlowDocument,
  pageId: PageId,
  input: AddSurfaceInput,
): CreationFlowDocument {
  const surface: CreationFlowSurface = {
    id: input.id,
    name: input.name,
    pageId: input.pageId,
    width: input.width,
    height: input.height,
    unit: input.unit,
    elements: [],
  };

  const pages = document.pages.map((page) => {
    if (page.id !== pageId) {
      return page;
    }

    return {
      ...page,
      surfaces: [...(page.surfaces ?? []), surface],
    };
  });

  const pageExists = document.pages.some((page) => page.id === pageId);
  if (!pageExists) {
    return document;
  }

  return {
    ...document,
    pages,
  };
}

export function removeSurface(
  document: CreationFlowDocument,
  surfaceId: SurfaceId,
): CreationFlowDocument {
  let found = false;

  const pages = document.pages.map((page) => {
    const surfaces = (page.surfaces ?? []).filter((surface) => {
      if (surface.id === surfaceId) {
        found = true;
        return false;
      }
      return true;
    });

    if (surfaces.length === (page.surfaces ?? []).length) {
      return page;
    }

    return {
      ...page,
      surfaces,
    };
  });

  if (!found) {
    return document;
  }

  return {
    ...document,
    pages,
  };
}

export function findSurface(
  document: CreationFlowDocument,
  surfaceId: SurfaceId,
): CreationFlowSurface | undefined {
  for (const page of document.pages) {
    for (const surface of page.surfaces ?? []) {
      if (surface.id === surfaceId) {
        return surface;
      }
    }
  }

  return undefined;
}
