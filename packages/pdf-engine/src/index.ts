import type { CreationFlowDocument } from "@creationflow/schema";

export interface PdfRenderPlan {
  readonly document: CreationFlowDocument;
  readonly pages: readonly {
    readonly pageId: string;
    readonly surfaceCount: number;
  }[];
}

export function createPdfRenderPlan(document: CreationFlowDocument): PdfRenderPlan {
  return {
    document,
    pages: document.pages.map((page) => ({
      pageId: page.id,
      surfaceCount: page.surfaces?.length ?? 0,
    })),
  };
}
