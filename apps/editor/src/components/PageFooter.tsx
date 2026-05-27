import type { CreationFlowDocument } from "@creationflow/schema";

import type { SelectionState } from "../helpers/selection-helpers.js";
import { selectPage } from "../helpers/selection-helpers.js";
import { PageThumbnailPreview } from "./PageThumbnailPreview.js";

interface PageFooterProps {
  readonly document: CreationFlowDocument | null;
  readonly selection: SelectionState;
  readonly onSelectionChange: (selection: SelectionState) => void;
  readonly pdfPreviewUrl: string | null;
  readonly previewLoading: boolean;
  readonly previewError: string | null;
  readonly onRetryPreview: () => void;
}

export function PageFooter({
  document,
  selection,
  onSelectionChange,
  pdfPreviewUrl,
  previewLoading,
  previewError,
  onRetryPreview,
}: PageFooterProps) {
  if (!document || document.pages.length === 0) {
    return null;
  }

  return (
    <footer className="page-footer" aria-label="Page navigation">
      {document.pages.map((page, index) => (
        <PageThumbnailPreview
          key={page.id}
          page={page}
          isSelected={selection.selectedPageId === page.id}
          onSelect={(pageId) => onSelectionChange(selectPage(pageId))}
          pdfUrl={previewError ? null : pdfPreviewUrl}
          pageIndex={index}
        />
      ))}

      {previewError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            background: "#fef0f0",
            border: "1px solid #f5c6cb",
            borderRadius: "6px",
            fontSize: "0.75rem",
            color: "#721c24",
            flexShrink: 0,
          }}
        >
          <span>{previewError}</span>
          <button
            type="button"
            onClick={onRetryPreview}
            disabled={previewLoading}
            style={{
              padding: "2px 8px",
              background: "#c0392b",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: previewLoading ? "not-allowed" : "pointer",
              fontSize: "0.7rem",
              fontWeight: 600,
            }}
          >
            {previewLoading ? "Loading..." : "Retry preview"}
          </button>
        </div>
      )}
    </footer>
  );
}
