import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowSurface,
} from "@creationflow/schema";
import { getElementZIndex } from "@creationflow/core";

import type { PdfRenderPlan, PdfRenderPlanElement, PdfRenderPlanPage } from "./types.js";

function toRenderPlanElement(
  element: CreationFlowElement,
  surface?: CreationFlowSurface,
): PdfRenderPlanElement {
  const base = {
    elementId: element.id,
    type: element.type,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    zIndex: getElementZIndex(element),
    visible: element.visible,
  };

  if (element.type === "pattern") {
    const clipPath = surface?.shape === "path" && surface.pathData ? surface.pathData : undefined;
    return {
      ...base,
      assetId: element.assetId,
      repeatMode: element.repeatMode,
      tileWidth: element.tileWidth,
      tileHeight: element.tileHeight,
      gapX: element.gapX,
      gapY: element.gapY,
      offsetX: element.offsetX,
      offsetY: element.offsetY,
      opacity: element.opacity,
      color: element.color,
      clipPath,
    };
  }

  return base;
}

function collectElements(
  surfaceElements: readonly CreationFlowElement[],
  surface?: CreationFlowSurface,
): PdfRenderPlanElement[] {
  const elements: PdfRenderPlanElement[] = [];

  for (const element of surfaceElements) {
    elements.push(toRenderPlanElement(element, surface));

    if (element.type === "group") {
      elements.push(...collectElements(element.children, surface));
    }
  }

  return elements;
}

export function createPdfRenderPlan(document: CreationFlowDocument): PdfRenderPlan {
  const pages = document.pages ?? [];

  const renderPlanPages: PdfRenderPlanPage[] = pages.map((page): PdfRenderPlanPage => {
    const surfaces = page.surfaces ?? [];
    const elements = surfaces.flatMap((surface) => collectElements(surface.elements, surface));

    elements.sort((a, b) => getElementZIndex(a) - getElementZIndex(b));

    return {
      pageId: page.id,
      name: page.name,
      width: page.width,
      height: page.height,
      unit: page.unit,
      elements,
    };
  });

  return {
    documentId: document.id,
    documentVersion: document.version,
    pages: renderPlanPages,
  };
}
