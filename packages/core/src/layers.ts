import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowSurface,
  ElementId,
  PageId,
  SurfaceId,
} from "@creationflow/schema";
import { addElement, updateElement } from "./elements.js";
import type { AddElementInput } from "./types.js";

export function flattenSurfaceElements(
  surface: CreationFlowSurface,
): readonly CreationFlowElement[] {
  const result: CreationFlowElement[] = [];

  function collect(elements: readonly CreationFlowElement[]) {
    for (const element of elements) {
      result.push(element);
      if (element.type === "group") {
        collect(element.children);
      }
    }
  }

  collect(surface.elements);
  return result;
}

function findSurfaceInDocument(
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

export function bringForward(
  document: CreationFlowDocument,
  elementId: ElementId,
  surfaceId: SurfaceId,
): CreationFlowDocument {
  const surface = findSurfaceInDocument(document, surfaceId);
  if (!surface) return document;

  const allElements = flattenSurfaceElements(surface);
  const selected = allElements.find((e) => e.id === elementId);
  if (!selected) return document;

  const higherElements = allElements.filter((e) => e.zIndex > selected.zIndex);
  if (higherElements.length === 0) return document;

  const nextHigher = higherElements.reduce((min, e) => (e.zIndex < min.zIndex ? e : min));

  const doc1 = updateElement(document, elementId, { zIndex: nextHigher.zIndex });
  return updateElement(doc1, nextHigher.id, { zIndex: selected.zIndex });
}

export function sendBackward(
  document: CreationFlowDocument,
  elementId: ElementId,
  surfaceId: SurfaceId,
): CreationFlowDocument {
  const surface = findSurfaceInDocument(document, surfaceId);
  if (!surface) return document;

  const allElements = flattenSurfaceElements(surface);
  const selected = allElements.find((e) => e.id === elementId);
  if (!selected) return document;

  const lowerElements = allElements.filter((e) => e.zIndex < selected.zIndex);
  if (lowerElements.length === 0) return document;

  const nextLower = lowerElements.reduce((max, e) => (e.zIndex > max.zIndex ? e : max));

  const doc1 = updateElement(document, elementId, { zIndex: nextLower.zIndex });
  return updateElement(doc1, nextLower.id, { zIndex: selected.zIndex });
}

export function bringToFront(
  document: CreationFlowDocument,
  elementId: ElementId,
  surfaceId: SurfaceId,
): CreationFlowDocument {
  const surface = findSurfaceInDocument(document, surfaceId);
  if (!surface) return document;

  const allElements = flattenSurfaceElements(surface);
  const selected = allElements.find((e) => e.id === elementId);
  if (!selected) return document;

  const maxZIndex = Math.max(...allElements.map((e) => e.zIndex));
  if (selected.zIndex > maxZIndex) return document;

  return updateElement(document, elementId, { zIndex: maxZIndex + 1 });
}

export function sendToBack(
  document: CreationFlowDocument,
  elementId: ElementId,
  surfaceId: SurfaceId,
): CreationFlowDocument {
  const surface = findSurfaceInDocument(document, surfaceId);
  if (!surface) return document;

  const allElements = flattenSurfaceElements(surface);
  const selected = allElements.find((e) => e.id === elementId);
  if (!selected) return document;

  const minZIndex = Math.min(...allElements.map((e) => e.zIndex));
  if (selected.zIndex < minZIndex) return document;

  return updateElement(document, elementId, { zIndex: minZIndex - 1 });
}

export function duplicateElementOnSurface(
  document: CreationFlowDocument,
  pageId: PageId,
  surfaceId: SurfaceId,
  elementId: ElementId,
  options?: { offsetX?: number; offsetY?: number },
): { document: CreationFlowDocument; newElementId: ElementId } {
  const surface = findSurfaceInDocument(document, surfaceId);
  if (!surface) return { document, newElementId: elementId };

  const allElements = flattenSurfaceElements(surface);
  const element = allElements.find((e) => e.id === elementId);
  if (!element) return { document, newElementId: elementId };

  const newId = crypto.randomUUID() as ElementId;
  const baseName = element.name ?? element.id.slice(0, 8);
  const offsetX = options?.offsetX ?? 10;
  const offsetY = options?.offsetY ?? 10;

  let input: AddElementInput;

  switch (element.type) {
    case "text":
      input = {
        id: newId,
        type: "text",
        name: `${baseName} Copy`,
        x: element.x + offsetX,
        y: element.y + offsetY,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        opacity: element.opacity,
        visible: element.visible,
        locked: element.locked,
        zIndex: element.zIndex + 1,
        text: element.text,
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        color: element.color,
        align: element.align,
      };
      break;
    case "image":
      input = {
        id: newId,
        type: "image",
        name: `${baseName} Copy`,
        x: element.x + offsetX,
        y: element.y + offsetY,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        opacity: element.opacity,
        visible: element.visible,
        locked: element.locked,
        zIndex: element.zIndex + 1,
        assetId: element.assetId,
        fit: element.fit,
      };
      break;
    case "shape":
      input = {
        id: newId,
        type: "shape",
        name: `${baseName} Copy`,
        x: element.x + offsetX,
        y: element.y + offsetY,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        opacity: element.opacity,
        visible: element.visible,
        locked: element.locked,
        zIndex: element.zIndex + 1,
        shapeType: element.shapeType,
        fill: element.fill,
        stroke: element.stroke,
        strokeWidth: element.strokeWidth,
      };
      break;
    case "group":
      input = {
        id: newId,
        type: "group",
        name: `${baseName} Copy`,
        x: element.x + offsetX,
        y: element.y + offsetY,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        opacity: element.opacity,
        visible: element.visible,
        locked: element.locked,
        zIndex: element.zIndex + 1,
        children: element.children,
      };
      break;
    case "variable":
      input = {
        id: newId,
        type: "variable",
        name: `${baseName} Copy`,
        x: element.x + offsetX,
        y: element.y + offsetY,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
        opacity: element.opacity,
        visible: element.visible,
        locked: element.locked,
        zIndex: element.zIndex + 1,
        variableId: element.variableId,
        fallback: element.fallback,
      };
      break;
  }

  const updatedDocument = addElement(document, { pageId, surfaceId }, input);
  return { document: updatedDocument, newElementId: newId };
}
