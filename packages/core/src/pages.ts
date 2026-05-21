import type { CreationFlowDocument, CreationFlowPage, PageId } from "@creationflow/schema";
import type { AddPageInput } from "./types.js";

export function addPage(document: CreationFlowDocument, input: AddPageInput): CreationFlowDocument {
  const page: CreationFlowPage = {
    id: input.id,
    name: input.name,
    width: input.width,
    height: input.height,
    unit: input.unit,
    surfaces: [],
  };

  return {
    ...document,
    pages: [...document.pages, page],
  };
}

export function removePage(document: CreationFlowDocument, pageId: PageId): CreationFlowDocument {
  const filtered = document.pages.filter((page) => page.id !== pageId);

  if (filtered.length === document.pages.length) {
    return document;
  }

  return {
    ...document,
    pages: filtered,
  };
}

export function findPage(
  document: CreationFlowDocument,
  pageId: PageId,
): CreationFlowPage | undefined {
  return document.pages.find((page) => page.id === pageId);
}
