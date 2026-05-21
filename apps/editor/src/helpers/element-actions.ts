import type {
  CreationFlowDocument,
  CreationFlowElement,
  ElementId,
  PageId,
  SurfaceId,
} from "@creationflow/schema";
import { addElement, removeElement, updateElement } from "@creationflow/core";
import type { AddElementInput } from "@creationflow/core";

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
  currentZIndex: number,
): CreationFlowDocument {
  return updateElement(document, elementId, { zIndex: currentZIndex + 1 });
}

export function sendBackward(
  document: CreationFlowDocument,
  elementId: ElementId,
  currentZIndex: number,
): CreationFlowDocument {
  return updateElement(document, elementId, { zIndex: Math.max(0, currentZIndex - 1) });
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
