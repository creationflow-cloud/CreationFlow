import type { CreationFlowDocument } from "@creationflow/schema";
import { LayerList } from "./LayerList.js";
import type { SelectionState } from "../helpers/selection-helpers.js";
import { selectElement, selectPage, selectSurface } from "../helpers/selection-helpers.js";

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

  return (
    <aside className="sidebar left-sidebar" aria-label="Document navigation">
      <section className="sidebar-section">
        <h2 className="sidebar-heading">Document</h2>
        {document && document.pages.length > 0 ? (
          <nav className="document-tree" aria-label="Document structure">
            {document.pages.map((page) => (
              <div className="tree-group" key={page.id}>
                <button
                  className={`tree-button tree-page ${selection.selectedPageId === page.id ? "selected" : ""}`}
                  type="button"
                  onClick={() => onSelectionChange(selectPage(page.id))}
                >
                  <span className="tree-icon">📄</span>
                  <span className="tree-label">{page.name}</span>
                </button>
                {selection.selectedPageId === page.id && page.surfaces && (
                  <ul className="tree-children">
                    {page.surfaces.map((surface) => (
                      <li className="tree-group" key={surface.id}>
                        <button
                          className={`tree-button tree-surface ${selection.selectedSurfaceId === surface.id ? "selected" : ""}`}
                          type="button"
                          onClick={() =>
                            onSelectionChange(
                              selectSurface(surface.id, {
                                selectedPageId: page.id,
                                selectedSurfaceId: null,
                                selectedElementId: null,
                              }),
                            )
                          }
                        >
                          <span className="tree-icon">▭</span>
                          <span className="tree-label">{surface.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>
        ) : (
          <p className="tree-placeholder">No pages in document</p>
        )}
      </section>

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
