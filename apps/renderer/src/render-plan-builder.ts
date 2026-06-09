import type { CreationFlowDocument } from "@creationflow/schema";

export interface RenderPlanWarning {
  readonly code: string;
  readonly message: string;
}

export interface RenderPlanOptions {
  readonly dpi?: number;
  readonly maxWarnings?: number;
  readonly locales?: ReadonlyArray<string>;
  readonly reason?: string;
}

export interface RenderPlan {
  readonly id: string;
  readonly documentId: string;
  readonly workspaceId: string;
  readonly pageCount: number;
  readonly surfaceCount: number;
  readonly elementCount: number;
  readonly estimatedDpi: number;
  readonly locales: ReadonlyArray<string>;
  readonly reason: string;
  readonly preflightWarnings: ReadonlyArray<RenderPlanWarning>;
  readonly ready: boolean;
}

export function buildRenderPlan(
  document: CreationFlowDocument,
  options: RenderPlanOptions = {},
): RenderPlan {
  const dpi = options.dpi ?? 300;
  const maxWarnings = options.maxWarnings ?? 25;
  const locales = options.locales ?? ["en-US"];
  const reason = options.reason ?? "user-requested";

  let pageCount = 0;
  let surfaceCount = 0;
  let elementCount = 0;
  for (const page of document.pages ?? []) {
    pageCount += 1;
    for (const surface of page.surfaces ?? []) {
      surfaceCount += 1;
      elementCount += (surface.elements ?? []).length;
    }
  }

  const preflightWarnings: RenderPlanWarning[] = [];
  if (pageCount === 0) {
    preflightWarnings.push({
      code: "render-plan.empty-document",
      message: "Document has no pages; the resulting PDF will be empty.",
    });
  }
  if (dpi < 72 || dpi > 1200) {
    preflightWarnings.push({
      code: "render-plan.dpi-out-of-range",
      message: `DPI ${dpi} is outside the supported range of 72-1200.`,
    });
  }
  if (elementCount === 0) {
    preflightWarnings.push({
      code: "render-plan.no-elements",
      message: "Document has no elements; nothing visible will be rendered.",
    });
  }

  if (preflightWarnings.length > maxWarnings) {
    preflightWarnings.length = maxWarnings;
  }

  return {
    id: `plan-${document.id}-${Date.now().toString(36)}`,
    documentId: document.id,
    workspaceId: document.metadata.workspaceId,
    pageCount,
    surfaceCount,
    elementCount,
    estimatedDpi: dpi,
    locales,
    reason,
    preflightWarnings,
    ready: pageCount > 0,
  };
}
