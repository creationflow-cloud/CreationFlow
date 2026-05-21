export { createEmptyDocument } from "./createEmptyDocument.js";
export { addPage, removePage, findPage } from "./pages.js";
export { addSurface, removeSurface, findSurface } from "./surfaces.js";
export { addElement, removeElement, findElement, updateElement } from "./elements.js";
export type {
  AddElementInput,
  AddPageInput,
  AddSurfaceInput,
  CreateEmptyDocumentInput,
  ElementPatch,
  MetadataPatch,
} from "./types.js";
