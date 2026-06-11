export { renderDocument } from "./render-plan.js";
export type { RenderDocumentResult } from "./render-plan.js";
export { buildRenderPlan } from "./render-plan-builder.js";
export type { RenderPlan, RenderPlanOptions } from "./render-plan-builder.js";
export { buildRenderJobStatus } from "./render-job-status.js";
export type { RenderJobStatus } from "./render-job-status.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(
    "CreationFlow Renderer ready. Use `renderDocument`, `buildRenderPlan`, " +
      "or `buildRenderJobStatus` from your code.",
  );
}
