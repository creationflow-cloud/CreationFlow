import { renderDocumentToPdf, runDocumentPreflight } from "@creationflow/pdf-engine";
import type {
  CreationFlowDocument,
} from "@creationflow/schema";
import type { RenderDocumentToPdfOptions, RenderDocumentWarning } from "@creationflow/pdf-engine";

export interface RenderDocumentResult {
  readonly status: "rendered";
  readonly pdf: Buffer;
  readonly warnings: readonly RenderDocumentWarning[];
}

export async function renderDocument(
  document: CreationFlowDocument,
  options: RenderDocumentToPdfOptions = {},
): Promise<RenderDocumentResult> {
  const warnings: RenderDocumentWarning[] = [];

  runDocumentPreflight({ document, options }, (warning) => {
    warnings.push(warning);
  });

  const pdf = await renderDocumentToPdf(document, {
    ...options,
    onWarning: (warning) => {
      warnings.push(warning);
      options.onWarning?.(warning);
    },
  });

  return {
    status: "rendered",
    pdf,
    warnings,
  };
}
