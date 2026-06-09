import type { CreationFlowDocument } from "@creationflow/schema";

interface TemplatePreviewProps {
  readonly document: CreationFlowDocument | Record<string, unknown>;
  readonly maxWidth?: number;
}

interface PreviewSurface {
  readonly id: string;
  readonly name: string;
  readonly kind?: string;
  readonly role?: string;
  readonly shape?: string;
  readonly width: number;
  readonly height: number;
  readonly fillColor?: string;
  readonly elementCount: number;
}

interface PreviewPage {
  readonly id: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly unit: string;
  readonly surfaces: PreviewSurface[];
}

const ROLE_COLORS: Record<string, string> = {
  default: "#d9dee8",
  designRegion: "rgba(36, 59, 104, 0.12)",
  colorRegion: "rgba(95, 109, 130, 0.18)",
  overlay: "rgba(160, 174, 192, 0.18)",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildPages(
  document: CreationFlowDocument | Record<string, unknown>,
): PreviewPage[] {
  const pages = (document as { pages?: unknown }).pages;
  if (!Array.isArray(pages)) {
    return [];
  }
  return pages.flatMap((rawPage) => {
    if (!isObject(rawPage)) return [];
    const id = typeof rawPage.id === "string" ? rawPage.id : crypto.randomUUID();
    const name = typeof rawPage.name === "string" ? rawPage.name : "Untitled";
    const width = Number.isFinite(rawPage.width) ? Number(rawPage.width) : 500;
    const height = Number.isFinite(rawPage.height) ? Number(rawPage.height) : 600;
    const unit = typeof rawPage.unit === "string" ? rawPage.unit : "px";
    const surfaces = Array.isArray(rawPage.surfaces) ? rawPage.surfaces : [];
    const previewSurfaces: PreviewSurface[] = surfaces.flatMap((rawSurface) => {
      if (!isObject(rawSurface)) return [];
      const sid = typeof rawSurface.id === "string" ? rawSurface.id : crypto.randomUUID();
      const sname = typeof rawSurface.name === "string" ? rawSurface.name : "Surface";
      const swidth = Number.isFinite(rawSurface.width) ? Number(rawSurface.width) : 0;
      const sheight = Number.isFinite(rawSurface.height) ? Number(rawSurface.height) : 0;
      const elements = Array.isArray(rawSurface.elements) ? rawSurface.elements : [];
      return [
        {
          id: sid,
          name: sname,
          kind: typeof rawSurface.kind === "string" ? rawSurface.kind : undefined,
          role: typeof rawSurface.role === "string" ? rawSurface.role : undefined,
          shape: typeof rawSurface.shape === "string" ? rawSurface.shape : undefined,
          width: swidth,
          height: sheight,
          fillColor: typeof rawSurface.fillColor === "string" ? rawSurface.fillColor : undefined,
          elementCount: elements.length,
        },
      ];
    });
    return [
      {
        id,
        name,
        width,
        height,
        unit,
        surfaces: previewSurfaces,
      },
    ];
  });
}

export function TemplatePreview({ document, maxWidth = 480 }: TemplatePreviewProps) {
  const pages = buildPages(document);

  if (pages.length === 0) {
    return (
      <div className="template-preview-empty">
        <p>This template has no pages yet.</p>
      </div>
    );
  }

  return (
    <div className="template-preview" role="group" aria-label="Template preview">
      {pages.map((page) => {
        const ratio = page.height === 0 ? 1 : page.width / page.height;
        const previewWidth = Math.min(maxWidth, page.width || maxWidth);
        const previewHeight = previewWidth / (ratio || 1);
        return (
          <div key={page.id} className="template-preview-page">
            <div className="template-preview-page-header">
              <span className="template-preview-page-name">{page.name}</span>
              <span className="template-preview-page-dims">
                {page.width} × {page.height} {page.unit}
              </span>
              <span className="template-preview-page-count">
                {page.surfaces.length} surface{page.surfaces.length === 1 ? "" : "s"}
              </span>
            </div>
            <div
              className="template-preview-page-canvas"
              style={{ width: `${previewWidth}px`, height: `${previewHeight}px` }}
            >
              {page.surfaces.map((surface) => {
                const left = page.width === 0 ? 0 : (surface.width === 0 ? 0 : 0);
                const top = left;
                const surfaceWidthPct = page.width === 0 ? 0 : (surface.width / page.width) * 100;
                const surfaceHeightPct = page.height === 0 ? 0 : (surface.height / page.height) * 100;
                const background =
                  surface.fillColor ?? (surface.role ? ROLE_COLORS[surface.role] : ROLE_COLORS.default);
                return (
                  <div
                    key={surface.id}
                    className={`template-preview-surface role-${surface.role ?? "default"}`}
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${surfaceWidthPct}%`,
                      height: `${surfaceHeightPct}%`,
                      background,
                    }}
                    title={`${surface.name} (${surface.role ?? "default"})${
                      surface.elementCount > 0 ? `, ${surface.elementCount} element(s)` : ""
                    }`}
                  >
                    <span className="template-preview-surface-label">
                      {surface.name}
                      {surface.elementCount > 0 ? ` · ${surface.elementCount}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            {page.surfaces.length > 0 && (
              <div className="template-preview-legend" aria-label="Surface role legend">
                {Object.entries(ROLE_COLORS).map(([role, color]) => (
                  <span key={role} className="template-preview-legend-item">
                    <span
                      className="template-preview-legend-swatch"
                      style={{ background: color }}
                      aria-hidden="true"
                    />
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
