import type { CreationFlowDocument } from "@creationflow/schema";

export interface RenderJobPlaceholder {
  readonly status: "placeholder";
  readonly document?: CreationFlowDocument;
}

export function createRenderJobPlaceholder(document?: CreationFlowDocument): RenderJobPlaceholder {
  return {
    status: "placeholder",
    document,
  };
}
