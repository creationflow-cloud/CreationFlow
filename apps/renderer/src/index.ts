import { renderDocument } from "./render-plan.js";

export { renderDocument };
export type { RenderDocumentResult } from "./render-plan.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("CreationFlow Renderer ready (use renderDocument to render documents to PDF).");
}
