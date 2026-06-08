import type { CreationFlowDocument } from "@creationflow/schema";
import { LayerList } from "./LayerList.js";
import { PageSurfaceList } from "./PageSurfaceList.js";
import { CanvasSettingsPanel } from "./CanvasSettingsPanel.js";
import type { CanvasSettings } from "./CanvasSettingsPanel.js";
import type { SelectionState } from "../helpers/selection-helpers.js";
import { selectElement, selectSurface } from "../helpers/selection-helpers.js";

interface LeftSidebarProps {
  readonly document: CreationFlowDocument | null;
  readonly selection: SelectionState;
  readonly onSelectionChange: (selection: SelectionState) => void;
  readonly onAddText: () => void;
  readonly onAddShape: () => void;
  readonly onAddImage: () => void;
  readonly onAddVariable: () => void;
  readonly onAddPattern: () => void;
  readonly onDuplicateElement: (elementId: string) => void;
  readonly onDeleteElement: (elementId: string) => void;
  readonly onBringForward: (elementId: string) => void;
  readonly onSendBackward: (elementId: string) => void;
  readonly onBringToFront: (elementId: string) => void;
  readonly onSendToBack: (elementId: string) => void;
  readonly canvasSettings: CanvasSettings;
  readonly onCanvasSettingsChange: (settings: CanvasSettings) => void;
}

export function LeftSidebar({
  document,
  selection,
  onSelectionChange,
  onAddText,
  onAddShape,
  onAddImage,
  onAddVariable,
  onAddPattern,
  onDuplicateElement,
  onDeleteElement,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  canvasSettings,
  onCanvasSettingsChange,
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
                  selectedElementIds: [],
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
          <button className="tool-button" type="button" onClick={onAddVariable}>
            <span className="tool-icon">∑</span>
            <span className="tool-label">Add Variable</span>
          </button>
          <button className="tool-button" type="button" onClick={onAddPattern}>
            <span className="tool-icon">▦</span>
            <span className="tool-label">Add Pattern</span>
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
            selectedElementIds={selection.selectedElementIds}
            onSelectElement={(elementId, modifier) =>
              onSelectionChange(
                selectElement(elementId, {
                  selectedPageId: selection.selectedPageId,
                  selectedSurfaceId: selection.selectedSurfaceId,
                  selectedElementIds: selection.selectedElementIds,
                }, modifier),
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

      <section className="sidebar-section">
        <h2 className="sidebar-heading">Canvas Settings</h2>
        <CanvasSettingsPanel
          settings={canvasSettings}
          onChange={onCanvasSettingsChange}
        />
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
