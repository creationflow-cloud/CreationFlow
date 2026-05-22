import type { CreationFlowDocument } from "@creationflow/schema";

interface PageSurfaceSwitcherProps {
  readonly document: CreationFlowDocument;
  readonly selectedPageId: string | null;
  readonly selectedSurfaceId: string | null;
  readonly onSelectPage: (pageId: string) => void;
  readonly onSelectSurface: (surfaceId: string) => void;
}

export function PageSurfaceSwitcher({
  document,
  selectedPageId,
  selectedSurfaceId,
  onSelectPage,
  onSelectSurface,
}: PageSurfaceSwitcherProps) {
  const pages = document.pages;
  if (pages.length === 0) return null;

  const activePage = pages.find((p) => p.id === selectedPageId) ?? pages[0];
  const surfaces = activePage.surfaces ?? [];

  return (
    <div className="page-surface-switcher">
      <div className="page-tabs">
        {pages.map((page, index) => (
          <button
            key={page.id}
            type="button"
            className={`page-tab ${page.id === selectedPageId ? "active" : ""}`}
            onClick={() => onSelectPage(page.id)}
          >
            {page.name || `Page ${index + 1}`}
          </button>
        ))}
      </div>
      {surfaces.length > 0 && (
        <div className="surface-tabs">
          {surfaces.map((surface, index) => (
            <button
              key={surface.id}
              type="button"
              className={`surface-tab-item ${surface.id === selectedSurfaceId ? "active" : ""}`}
              onClick={() => onSelectSurface(surface.id)}
            >
              {surface.name || `Surface ${index + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
