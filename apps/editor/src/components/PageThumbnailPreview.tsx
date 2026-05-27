import type { CreationFlowPage } from "@creationflow/schema";

import { PdfThumbnail } from "./PdfThumbnail.js";

interface PageThumbnailPreviewProps {
  readonly page: CreationFlowPage;
  readonly isSelected: boolean;
  readonly onSelect: (pageId: string) => void;
  readonly pdfUrl?: string | null;
  readonly pageIndex?: number;
}

export function PageThumbnailPreview({
  page,
  isSelected,
  onSelect,
  pdfUrl,
  pageIndex = 0,
}: PageThumbnailPreviewProps) {
  return (
    <div
      className={`page-footer-thumbnail ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(page.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(page.id);
        }
      }}
    >
      {pdfUrl ? (
        <PdfThumbnail
          pdfUrl={pdfUrl}
          pageIndex={pageIndex}
          width={100}
          height={80}
        />
      ) : (
        <div
          style={{
            width: "100px",
            height: "80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            border: "1px dashed #d9dee8",
            borderRadius: "4px",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              color: "#a0aec0",
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            Preview
            <br />
            unavailable
          </span>
        </div>
      )}
      <span className="page-footer-thumbnail-name" title={page.name}>
        {page.name}
      </span>
    </div>
  );
}
