import type { CreationFlowDocument } from "@creationflow/schema";
import { LayerList } from "./LayerList.js";
import { PageSurfaceList } from "./PageSurfaceList.js";
import type { SelectionState } from "../helpers/selection-helpers.js";
import { selectElement, selectSurface } from "../helpers/selection-helpers.js";

interface LeftSidebarProps {
  readonly document: CreationFlowDocument | null;
  readonly selection: SelectionState;
  readonly onSelectionChange: (selection: SelectionState) => void;
  readonly onAddText: () => void;
  readonly onAddShape: () => void;
  readonly onAddImage: () => void;
  readonly onDuplicateElement: (elementId: string) => void;
  readonly onDeleteElement: (elementId: string) => void;
  readonly onBringForward: (elementId: string) => void;
  readonly onSendBackward: (elementId: string) => void;
  readonly onBringToFront: (elementId: string) => void;
  readonly onSendToBack: (elementId: string) => void;
}

export function LeftSidebar({
  document,
  selection,
  onSelectionChange,
  onAddText,
  onAddShape,
  onAddImage,
  onDuplicateElement,
  onDeleteElement,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}: LeftSidebarProps) {
  const selectedSurface = document
    ? getSelectedSurface(document, selection.selectedSurfaceId)
    : undefined;

  const selectedPage = document
    ? document.pages.find((p) => p.id === selection.selectedPageId)
    : undefined;

  return (
    <aside className="sidebar left-sidebar" aria-label="Document navigation">
      {selectedPage && (
        <section className="sidebar-section sidebar-surfaces-section">
          <h2 className="sidebar-heading">
            Surfaces
            <span className="layer-count">{selectedPage.surfaces?.length ?? 0}</span>
          </h2>
          <PageSurfaceList
            page={selectedPage}
            selectedSurfaceId={selection.selectedSurfaceId}
            onSelectSurface={(surfaceId) =>
              onSelectionChange(
                selectSurface(surfaceId, {
                  selectedPageId: selection.selectedPageId,
                  selectedSurfaceId: null,
                  selectedElementId: null,
                }),
              )
            }
          />
        </section>
      )}

      <section className="sidebar-section">
        <h2 className="sidebar-heading">Tools</h2>
        <nav className="tool-list" aria-label="Element tools">
          <button className="tool-button" type="button" onClick={onAddText}>
            <span className="tool-icon">T</span>
            <span className="tool-label">Add Text</span>
          </button>
          <button className="tool-button" type="button" onClick={onAddShape}>
            <span className="tool-icon">▭</span>
            <span className="tool-label">Add Shape</span>
          </button>
          <button className="tool-button" type="button" onClick={onAddImage}>
            <span className="tool-icon">🖼</span>
            <span className="tool-label">Add Image</span>
          </button>
        </nav>
      </section>

      <section className="sidebar-section">
        <h2 className="sidebar-heading">
          Layers
          {selectedSurface && (
            <span className="layer-count">{selectedSurface.elements.length}</span>
          )}
        </h2>
        {selectedSurface ? (
          <LayerList
            elements={selectedSurface.elements}
            selectedElementId={selection.selectedElementId}
            onSelectElement={(elementId) =>
              onSelectionChange(
                selectElement(elementId, {
                  selectedPageId: selection.selectedPageId,
                  selectedSurfaceId: selection.selectedSurfaceId,
                  selectedElementId: null,
                }),
              )
            }
            onDuplicateElement={onDuplicateElement}
            onDeleteElement={onDeleteElement}
            onBringForward={onBringForward}
            onSendBackward={onSendBackward}
            onBringToFront={onBringToFront}
            onSendToBack={onSendToBack}
          />
        ) : (
          <p className="layer-placeholder">Select a surface to see layers.</p>
        )}
      </section>
    </aside>
  );
}

function getSelectedSurface(
  document: CreationFlowDocument,
  surfaceId: string | null,
) {
  if (!surfaceId) return undefined;
  for (const page of document.pages) {
    for (const surface of page.surfaces ?? []) {
      if (surface.id === surfaceId) return surface;
    }
  }
  return undefined;
}
