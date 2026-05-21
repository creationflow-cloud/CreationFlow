import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowSurface,
  ElementId,
  PageId,
  SurfaceId,
} from "@creationflow/schema";
import { addElement, removeElement, updateElement } from "@creationflow/core";
import type { AddElementInput } from "@creationflow/core";
import { flattenSurfaceElements } from "./document-helpers.js";

export function duplicateElement(
  document: CreationFlowDocument,
  element: CreationFlowElement,
  pageId: PageId,
  surfaceId: SurfaceId,
): { document: CreationFlowDocument; newElementId: ElementId } {
  const newId = crypto.randomUUID() as ElementId;
  const baseName = element.name ?? element.id.slice(0, 8);

  let input: AddElementInput;

  switch (element.type) {
    case "text":
      input = {
        id: newId,
        type: "text",
        name: `${baseName} Copy`,
        x: element.x + 10,
        y: element.y + 10,
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
        x: element.x + 10,
        y: element.y + 10,
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
        x: element.x + 10,
        y: element.y + 10,
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
        x: element.x + 10,
        y: element.y + 10,
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
        x: element.x + 10,
        y: element.y + 10,
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

export function deleteElement(
  document: CreationFlowDocument,
  elementId: ElementId,
): CreationFlowDocument {
  return removeElement(document, elementId);
}

export function bringForward(
  document: CreationFlowDocument,
  elementId: ElementId,
  surface: CreationFlowSurface,
): CreationFlowDocument {
  const allElements = flattenSurfaceElements(surface);
  const selected = allElements.find((e) => e.id === elementId);
  if (!selected) return document;

  const higherElements = allElements.filter((e) => e.zIndex > selected.zIndex);

  if (higherElements.length === 0) {
    return document;
  }

  const nextHigher = higherElements.reduce((min, e) => (e.zIndex < min.zIndex ? e : min));

  const doc1 = updateElement(document, elementId, { zIndex: nextHigher.zIndex });
  return updateElement(doc1, nextHigher.id, { zIndex: selected.zIndex });
}

export function sendBackward(
  document: CreationFlowDocument,
  elementId: ElementId,
  surface: CreationFlowSurface,
): CreationFlowDocument {
  const allElements = flattenSurfaceElements(surface);
  const selected = allElements.find((e) => e.id === elementId);
  if (!selected) return document;

  const lowerElements = allElements.filter((e) => e.zIndex < selected.zIndex);

  if (lowerElements.length === 0) {
    return document;
  }

  const nextLower = lowerElements.reduce((max, e) => (e.zIndex > max.zIndex ? e : max));

  const doc1 = updateElement(document, elementId, { zIndex: nextLower.zIndex });
  return updateElement(doc1, nextLower.id, { zIndex: selected.zIndex });
}

export function bringToFront(
  document: CreationFlowDocument,
  elementId: ElementId,
  surface: CreationFlowSurface,
): CreationFlowDocument {
  const allElements = flattenSurfaceElements(surface);
  const selected = allElements.find((e) => e.id === elementId);
  if (!selected) return document;

  const maxZIndex = Math.max(...allElements.map((e) => e.zIndex));

  if (selected.zIndex > maxZIndex) {
    return document;
  }

  return updateElement(document, elementId, { zIndex: maxZIndex + 1 });
}

export function sendToBack(
  document: CreationFlowDocument,
  elementId: ElementId,
  surface: CreationFlowSurface,
): CreationFlowDocument {
  const allElements = flattenSurfaceElements(surface);
  const selected = allElements.find((e) => e.id === elementId);
  if (!selected) return document;

  const minZIndex = Math.min(...allElements.map((e) => e.zIndex));

  if (selected.zIndex < minZIndex) {
    return document;
  }

  return updateElement(document, elementId, { zIndex: minZIndex - 1 });
}

export function moveElement(
  document: CreationFlowDocument,
  elementId: ElementId,
  currentX: number,
  currentY: number,
  dx: number,
  dy: number,
): CreationFlowDocument {
  return updateElement(document, elementId, {
    x: currentX + dx,
    y: currentY + dy,
  });
}
