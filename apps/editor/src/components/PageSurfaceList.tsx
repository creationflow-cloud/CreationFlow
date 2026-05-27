import type { CreationFlowPage } from "@creationflow/schema";

interface PageSurfaceListProps {
  readonly page: CreationFlowPage;
  readonly selectedSurfaceId: string | null;
  readonly onSelectSurface: (surfaceId: string) => void;
}

export function PageSurfaceList({ page, selectedSurfaceId, onSelectSurface }: PageSurfaceListProps) {
  const surfaces = page.surfaces ?? [];

  if (surfaces.length === 0) {
    return <p className="layer-placeholder">No surfaces on this page</p>;
  }

  return (
    <div className="page-surface-list">
      {surfaces.map((surface) => (
        <button
          key={surface.id}
          className={`page-surface-button ${selectedSurfaceId === surface.id ? "selected" : ""}`}
          type="button"
          onClick={() => onSelectSurface(surface.id)}
          title={surface.name}
        >
          <span
            className="surface-role-indicator"
            data-role={surface.role ?? "default"}
          />
          <span className="surface-name-label">{surface.name}</span>
          <span className="surface-dimensions-mini">
            {surface.width}×{surface.height}
          </span>
        </button>
      ))}
    </div>
  );
}
