import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowPage,
  CreationFlowSurface,
} from "@creationflow/schema";

export function findPageById(
  document: CreationFlowDocument,
  pageId: string,
): CreationFlowPage | undefined {
  return document.pages.find((page) => page.id === pageId);
}

export function findSurfaceById(
  document: CreationFlowDocument,
  surfaceId: string,
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

export function findElementById(
  document: CreationFlowDocument,
  elementId: string,
): CreationFlowElement | undefined {
  for (const page of document.pages) {
    for (const surface of page.surfaces ?? []) {
      const found = findElementInSurface(surface, elementId);

      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

function findElementInSurface(
  surface: CreationFlowSurface,
  elementId: string,
): CreationFlowElement | undefined {
  for (const element of surface.elements) {
    if (element.id === elementId) {
      return element;
    }

    if (element.type === "group") {
      const found = findElementInGroup(element.children, elementId);

      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

function findElementInGroup(
  children: readonly CreationFlowElement[],
  elementId: string,
): CreationFlowElement | undefined {
  for (const child of children) {
    if (child.id === elementId) {
      return child;
    }

    if (child.type === "group") {
      const found = findElementInGroup(child.children, elementId);

      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

export function getSurfaceElements(surface: CreationFlowSurface): readonly CreationFlowElement[] {
  return surface.elements;
}
