import type { CreationFlowPage, CreationFlowSurface } from "@creationflow/schema";

interface PageThumbnailProps {
  readonly page: CreationFlowPage;
  readonly isSelected: boolean;
  readonly onSelect: (pageId: string) => void;
}

const MAX_THUMBNAIL_WIDTH = 240;
const MAX_THUMBNAIL_HEIGHT = 160;

interface ScaledSurface {
  surface: CreationFlowSurface;
  x: number;
  y: number;
  width: number;
  height: number;
}

function calculateSurfacePositions(
  surfaces: readonly CreationFlowSurface[],
  thumbWidth: number,
  thumbHeight: number,
): ScaledSurface[] {
  if (surfaces.length === 0) return [];

  if (surfaces.length === 1) {
    const surface = surfaces[0];
    const padding = 8;
    const availW = thumbWidth - padding * 2;
    const availH = thumbHeight - padding * 2;
    const scale = Math.min(availW / surface.width, availH / surface.height, 1);
    const sw = surface.width * scale;
    const sh = surface.height * scale;
    return [
      {
        surface,
        x: (thumbWidth - sw) / 2,
        y: (thumbHeight - sh) / 2,
        width: sw,
        height: sh,
      },
    ];
  }

  const cols = Math.ceil(Math.sqrt(surfaces.length));
  const rows = Math.ceil(surfaces.length / cols);
  const cellW = thumbWidth / cols;
  const cellH = thumbHeight / rows;

  return surfaces.map((surface, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const padding = 4;
    const availW = cellW - padding * 2;
    const availH = cellH - padding * 2;
    const scale = Math.min(availW / surface.width, availH / surface.height, 1);
    const sw = surface.width * scale;
    const sh = surface.height * scale;
    return {
      surface,
      x: col * cellW + (cellW - sw) / 2,
      y: row * cellH + (cellH - sh) / 2,
      width: sw,
      height: sh,
    };
  });
}

export function PageThumbnail({ page, isSelected, onSelect }: PageThumbnailProps) {
  const scale = Math.min(MAX_THUMBNAIL_WIDTH / page.width, MAX_THUMBNAIL_HEIGHT / page.height, 1);

  const thumbWidth = page.width * scale;
  const thumbHeight = page.height * scale;

  const scaledSurfaces = calculateSurfacePositions(page.surfaces ?? [], thumbWidth, thumbHeight);

  return (
    <div
      className={`page-thumbnail ${isSelected ? "selected" : ""}`}
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
      <div
        className="page-thumbnail-preview"
        style={{ width: `${thumbWidth}px`, height: `${thumbHeight}px` }}
      >
        {scaledSurfaces.length > 0 ? (
          scaledSurfaces.map(({ surface, x, y, width, height }) => (
            <div
              key={surface.id}
              className="page-thumbnail-surface"
              data-role={surface.role ?? "default"}
              title={surface.name}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
                opacity: 0.85,
              }}
            />
          ))
        ) : (
          <div className="page-thumbnail-placeholder">
            <span className="placeholder-dimensions">
              {page.width} × {page.height} {page.unit}
            </span>
          </div>
        )}
      </div>
      <span className="page-thumbnail-name" title={page.name}>
        {page.name}
      </span>
      <span className="page-thumbnail-dimensions">
        {page.width} × {page.height} {page.unit}
      </span>
    </div>
  );
}
