export { createEmptyDocument } from "./createEmptyDocument.js";
export { createConfigurationDocument } from "./createConfigurationDocument.js";
export { addPage, removePage, findPage } from "./pages.js";
export { addSurface, removeSurface, findSurface } from "./surfaces.js";
export { addElement, removeElement, findElement, updateElement } from "./elements.js";
export type {
  AddElementInput,
  AddTextElementInput,
  AddImageElementInput,
  AddShapeElementInput,
  AddGroupElementInput,
  AddVariableElementInput,
  AddPageInput,
  AddSurfaceInput,
  CreateConfigurationDocumentInput,
  CreateEmptyDocumentInput,
  ElementPatch,
  MetadataPatch,
} from "./types.js";
