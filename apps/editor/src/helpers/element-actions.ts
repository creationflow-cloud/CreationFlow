import type { CreationFlowDocument, ElementId, PageId, SurfaceId } from "@creationflow/schema";
import {
  bringForward as coreBringForward,
  bringToFront as coreBringToFront,
  duplicateElementOnSurface,
  removeElement,
  sendBackward as coreSendBackward,
  sendToBack as coreSendToBack,
  updateElement,
} from "@creationflow/core";

export function duplicateElement(
  document: CreationFlowDocument,
  pageId: PageId,
  surfaceId: SurfaceId,
  elementId: ElementId,
): { document: CreationFlowDocument; newElementId: ElementId } {
  return duplicateElementOnSurface(document, pageId, surfaceId, elementId);
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
  surfaceId: SurfaceId,
): CreationFlowDocument {
  return coreBringForward(document, elementId, surfaceId);
}

export function sendBackward(
  document: CreationFlowDocument,
  elementId: ElementId,
  surfaceId: SurfaceId,
): CreationFlowDocument {
  return coreSendBackward(document, elementId, surfaceId);
}

export function bringToFront(
  document: CreationFlowDocument,
  elementId: ElementId,
  surfaceId: SurfaceId,
): CreationFlowDocument {
  return coreBringToFront(document, elementId, surfaceId);
}

export function sendToBack(
  document: CreationFlowDocument,
  elementId: ElementId,
  surfaceId: SurfaceId,
): CreationFlowDocument {
  return coreSendToBack(document, elementId, surfaceId);
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
