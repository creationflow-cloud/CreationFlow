import type { CreationFlowDocument, CreationFlowElement } from "@creationflow/schema";
import { getElementZIndex } from "@creationflow/core";

import type { PdfRenderPlan, PdfRenderPlanElement, PdfRenderPlanPage } from "./types.js";

function toRenderPlanElement(element: CreationFlowElement): PdfRenderPlanElement {
  return {
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
}

function collectElements(surfaceElements: readonly CreationFlowElement[]): PdfRenderPlanElement[] {
  const elements: PdfRenderPlanElement[] = [];

  for (const element of surfaceElements) {
    elements.push(toRenderPlanElement(element));

    if (element.type === "group") {
      elements.push(...collectElements(element.children));
    }
  }

  return elements;
}

export function createPdfRenderPlan(document: CreationFlowDocument): PdfRenderPlan {
  const pages = document.pages ?? [];

  const renderPlanPages: PdfRenderPlanPage[] = pages.map((page): PdfRenderPlanPage => {
    const surfaces = page.surfaces ?? [];
    const elements = surfaces.flatMap((surface) => collectElements(surface.elements));

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
