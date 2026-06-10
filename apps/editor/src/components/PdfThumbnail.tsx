import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";

interface PdfThumbnailProps {
  readonly pdfUrl: string;
  readonly pageIndex: number;
  readonly width: number;
  readonly height: number;
}

export function PdfThumbnail({ pdfUrl, pageIndex, width, height }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPdfPage() {
      try {
        setLoading(true);
        setError(null);

        const loadingTask = pdfjs.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        if (cancelled || pageIndex >= pdf.numPages) {
          return;
        }

        const page = await pdf.getPage(pageIndex + 1);

        const viewport = page.getViewport({ scale: 1 });
        const scaleX = width / viewport.width;
        const scaleY = height / viewport.height;
        const scale = Math.min(scaleX, scaleY);

        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render PDF preview");
          setLoading(false);
        }
      }
    }

    renderPdfPage();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, pageIndex, width, height]);

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="pdf-thumbnail-container" style={{ position: "relative" }}>
        {loading && (
          <div
            className="pdf-thumbnail-loading"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f8fafc",
              fontSize: "0.65rem",
              color: "#5f6d82",
            }}
          >
            Loading...
          </div>
        )}
        {error && (
          <div
            className="pdf-thumbnail-error"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fef0f0",
              fontSize: "0.6rem",
              color: "#c0392b",
              padding: "4px",
              textAlign: "center",
            }}
          >
            Preview failed
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{
            display: loading || error ? "none" : "block",
          }}
        />
      </div>
    </div>
  );
}
