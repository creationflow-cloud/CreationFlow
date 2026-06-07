import { createRenderJobPlaceholder, renderDocument } from "./render-plan.js";

export { createRenderJobPlaceholder, renderDocument };
export type { RenderDocumentResult, RenderJobPlaceholder } from "./render-plan.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  createRenderJobPlaceholder();
  console.log("CreationFlow Renderer ready (use renderDocument to render documents to PDF).");
}
