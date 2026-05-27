import type {
  CreationFlowDocument,
  CreationFlowElement,
  ElementId,
  PageId,
  SurfaceId,
} from "@creationflow/schema";
import type { AddElementInput, ElementPatch } from "./types.js";

function updateElementsRecursive(
  elements: readonly CreationFlowElement[],
  elementId: ElementId,
  updater: (element: CreationFlowElement) => CreationFlowElement,
): { elements: readonly CreationFlowElement[]; found: boolean } {
  const updated = elements.map((element) => {
    if (element.id === elementId) {
      return updater(element);
    }

    if (element.type === "group" && "children" in element) {
      const result = updateElementsRecursive(element.children, elementId, updater);
      if (result.found) {
        return {
          ...element,
          children: result.elements,
        };
      }
    }

    return element;
  });

  let found = false;
  for (let i = 0; i < updated.length; i++) {
    if (updated[i] !== elements[i]) {
      found = true;
      break;
    }
  }

  return { elements: updated, found };
}

function removeElementRecursive(
  elements: readonly CreationFlowElement[],
  elementId: ElementId,
): { elements: readonly CreationFlowElement[]; found: boolean } {
  let found = false;

  const filtered = elements.filter((element) => {
    if (element.id === elementId) {
      found = true;
      return false;
    }
    return true;
  });

  if (found) {
    return { elements: filtered, found: true };
  }

  const updated = filtered.map((element) => {
    if (element.type === "group" && "children" in element) {
      const result = removeElementRecursive(element.children, elementId);
      if (result.found) {
        found = true;
        return {
          ...element,
          children: result.elements,
        };
      }
    }

    return element;
  });

  return { elements: updated, found };
}

function findElementRecursive(
  elements: readonly CreationFlowElement[],
  elementId: ElementId,
): CreationFlowElement | undefined {
  for (const element of elements) {
    if (element.id === elementId) {
      return element;
    }

    if (element.type === "group" && "children" in element) {
      const found = findElementRecursive(element.children, elementId);
      if (found !== undefined) {
        return found;
      }
    }
  }

  return undefined;
}

export function addElement(
  document: CreationFlowDocument,
  target: { pageId: PageId; surfaceId: SurfaceId },
  input: AddElementInput,
): CreationFlowDocument {
  let element: CreationFlowElement;

  switch (input.type) {
    case "text":
      element = {
        id: input.id,
        type: "text",
        name: input.name,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        rotation: input.rotation,
        opacity: input.opacity,
        visible: input.visible,
        locked: input.locked,
        zIndex: input.zIndex,
        text: input.text,
        fontFamily: input.fontFamily,
        fontSize: input.fontSize,
        fontWeight: input.fontWeight,
        color: input.color,
        align: input.align,
      };
      break;
    case "image":
      element = {
        id: input.id,
        type: "image",
        name: input.name,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        rotation: input.rotation,
        opacity: input.opacity,
        visible: input.visible,
        locked: input.locked,
        zIndex: input.zIndex,
        assetId: input.assetId,
        fit: input.fit,
      };
      break;
    case "shape":
      element = {
        id: input.id,
        type: "shape",
        name: input.name,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        rotation: input.rotation,
        opacity: input.opacity,
        visible: input.visible,
        locked: input.locked,
        zIndex: input.zIndex,
        shapeType: input.shapeType,
        fill: input.fill,
        stroke: input.stroke,
        strokeWidth: input.strokeWidth,
      };
      break;
    case "group":
      element = {
        id: input.id,
        type: "group",
        name: input.name,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        rotation: input.rotation,
        opacity: input.opacity,
        visible: input.visible,
        locked: input.locked,
        zIndex: input.zIndex,
        children: input.children,
      };
      break;
    case "variable":
      element = {
        id: input.id,
        type: "variable",
        name: input.name,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        rotation: input.rotation,
        opacity: input.opacity,
        visible: input.visible,
        locked: input.locked,
        zIndex: input.zIndex,
        variableId: input.variableId,
        fallback: input.fallback,
      };
      break;
    case "pattern":
      element = {
        id: input.id,
        type: "pattern",
        name: input.name,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        rotation: input.rotation,
        opacity: input.opacity,
        visible: input.visible,
        locked: input.locked,
        zIndex: input.zIndex,
        surfaceId: input.surfaceId,
        assetId: input.assetId,
        repeatMode: input.repeatMode,
        tileWidth: input.tileWidth,
        tileHeight: input.tileHeight,
        gapX: input.gapX,
        gapY: input.gapY,
        offsetX: input.offsetX,
        offsetY: input.offsetY,
        color: input.color,
      };
      break;
  }

  let pageFound = false;
  let surfaceFound = false;

  const pages = document.pages.map((page) => {
    if (page.id !== target.pageId) {
      return page;
    }

    pageFound = true;

    const surfaces = (page.surfaces ?? []).map((surface) => {
      if (surface.id !== target.surfaceId) {
        return surface;
      }

      surfaceFound = true;

      return {
        ...surface,
        elements: [...surface.elements, element],
      };
    });

    return {
      ...page,
      surfaces,
    };
  });

  if (!pageFound || !surfaceFound) {
    return document;
  }

  return {
    ...document,
    pages,
  };
}

export function removeElement(
  document: CreationFlowDocument,
  elementId: ElementId,
): CreationFlowDocument {
  const pages = document.pages.map((page) => {
    const surfaces = (page.surfaces ?? []).map((surface) => {
      const result = removeElementRecursive(surface.elements, elementId);
      if (!result.found) {
        return surface;
      }

      return {
        ...surface,
        elements: result.elements,
      };
    });

    const changed = surfaces.some((s, i) => s !== (page.surfaces ?? [])[i]);

    if (!changed) {
      return page;
    }

    return {
      ...page,
      surfaces,
    };
  });

  const changed = pages.some((p, i) => p !== document.pages[i]);
  if (!changed) {
    return document;
  }

  return {
    ...document,
    pages,
  };
}

export function findElement(
  document: CreationFlowDocument,
  elementId: ElementId,
): CreationFlowElement | undefined {
  for (const page of document.pages) {
    for (const surface of page.surfaces ?? []) {
      const found = findElementRecursive(surface.elements, elementId);
      if (found !== undefined) {
        return found;
      }
    }
  }

  return undefined;
}

export function updateElement(
  document: CreationFlowDocument,
  elementId: ElementId,
  patch: ElementPatch,
): CreationFlowDocument {
  const pages = document.pages.map((page) => {
    const surfaces = (page.surfaces ?? []).map((surface) => {
      const result = updateElementsRecursive(surface.elements, elementId, (element) => ({
        ...element,
        ...patch,
      }));

      if (!result.found) {
        return surface;
      }

      return {
        ...surface,
        elements: result.elements,
      };
    });

    const changed = surfaces.some((s, i) => s !== (page.surfaces ?? [])[i]);

    if (!changed) {
      return page;
    }

    return {
      ...page,
      surfaces,
    };
  });

  const changed = pages.some((p, i) => p !== document.pages[i]);
  if (!changed) {
    return document;
  }

  return {
    ...document,
    pages,
  };
}
