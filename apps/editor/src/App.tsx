import { useEffect, useState } from "react";

import { createConfigurationDocument, updateElement } from "@creationflow/core";
import type {
  CreationFlowDocument,
  CreationFlowElement,
  DocumentId,
  ElementId,
  PageId,
  SurfaceId,
} from "@creationflow/schema";

import type { ConfigurationDto } from "./api/configurations.js";
import { createConfigurationFromTemplate, getProductTemplate } from "./api/product-templates.js";
import type { ProductTemplateDto } from "./api/product-templates.js";
import { ElementProperties } from "./components/ElementProperties.js";
import { SurfaceCanvas } from "./components/SurfaceCanvas.js";
import { findElementById, findSurfaceById } from "./helpers/document-helpers.js";
import {
  bringForward,
  deleteElement,
  duplicateElement,
  moveElement,
  sendBackward,
} from "./helpers/element-actions.js";
import { selectElement, selectPage, selectSurface } from "./helpers/selection-helpers.js";
import type { SelectionState } from "./helpers/selection-helpers.js";

const elementTools = ["Text", "Image", "Shape", "Variables"];

const apiUrl = import.meta.env.VITE_CREATIONFLOW_API_URL ?? "http://localhost:3000";

function getQueryParam(param: string): string | null {
  const params = new URLSearchParams(window.location.search);

  return params.get(param);
}

function toDocument(schema: Record<string, unknown>): CreationFlowDocument {
  return schema as unknown as CreationFlowDocument;
}

export function App() {
  const templateId = getQueryParam("templateId");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<ProductTemplateDto | null>(null);
  const [configurationCreating, setConfigurationCreating] = useState(false);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [configuration, setConfiguration] = useState<ConfigurationDto | null>(null);
  const [currentDocument, setCurrentDocument] = useState<CreationFlowDocument | null>(null);
  const [selection, setSelection] = useState<SelectionState>({
    selectedPageId: null,
    selectedSurfaceId: null,
    selectedElementId: null,
  });

  useEffect(() => {
    if (!templateId) {
      return;
    }

    let cancelled = false;

    async function loadTemplate() {
      setLoading(true);
      setError(null);

      try {
        const data = await getProductTemplate(templateId as string);

        if (!cancelled) {
          setTemplate(data);
          setCurrentDocument(toDocument(data.documentSchema));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load template.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const selectedSurface =
    currentDocument && selection.selectedSurfaceId
      ? findSurfaceById(currentDocument, selection.selectedSurfaceId)
      : undefined;

  const selectedElement =
    currentDocument && selection.selectedElementId
      ? findElementById(currentDocument, selection.selectedElementId)
      : undefined;

  const documentName =
    (currentDocument?.metadata as { name?: string } | undefined)?.name ?? "Untitled document";

  function handleUpdateElement(patch: Partial<CreationFlowElement>) {
    if (!currentDocument || !selection.selectedElementId) {
      return;
    }

    const updatedDocument = updateElement(
      currentDocument,
      selection.selectedElementId as ElementId,
      patch,
    );

    setCurrentDocument(updatedDocument);
  }

  function handleDeleteElement() {
    if (!currentDocument || !selection.selectedElementId) {
      return;
    }

    const updatedDocument = deleteElement(
      currentDocument,
      selection.selectedElementId as ElementId,
    );
    setCurrentDocument(updatedDocument);
    setSelection({ ...selection, selectedElementId: null });
  }

  function handleDuplicateElement() {
    if (
      !currentDocument ||
      !selection.selectedElementId ||
      !selection.selectedSurfaceId ||
      !selection.selectedPageId
    ) {
      return;
    }

    const element = findElementById(currentDocument, selection.selectedElementId);
    if (!element) {
      return;
    }

    const result = duplicateElement(
      currentDocument,
      element,
      selection.selectedPageId as PageId,
      selection.selectedSurfaceId as SurfaceId,
    );

    setCurrentDocument(result.document);
    setSelection({ ...selection, selectedElementId: result.newElementId });
  }

  function handleBringForward() {
    if (!currentDocument || !selection.selectedElementId || !selectedElement) {
      return;
    }

    const updatedDocument = bringForward(
      currentDocument,
      selection.selectedElementId as ElementId,
      selectedElement.zIndex,
    );

    setCurrentDocument(updatedDocument);
  }

  function handleSendBackward() {
    if (!currentDocument || !selection.selectedElementId || !selectedElement) {
      return;
    }

    const updatedDocument = sendBackward(
      currentDocument,
      selection.selectedElementId as ElementId,
      selectedElement.zIndex,
    );

    setCurrentDocument(updatedDocument);
  }

  function handleMoveElement(dx: number, dy: number) {
    if (!currentDocument || !selection.selectedElementId || !selectedElement) {
      return;
    }

    const updatedDocument = moveElement(
      currentDocument,
      selection.selectedElementId as ElementId,
      selectedElement.x,
      selectedElement.y,
      dx,
      dy,
    );

    setCurrentDocument(updatedDocument);
  }

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <div>
          <p className="eyebrow">CreationFlow Editor</p>
          <h1>{currentDocument ? documentName : "Untitled document"}</h1>
        </div>
        <span className="document-pill">
          {templateId ? `Template: ${templateId.slice(0, 8)}...` : "Project placeholder"}
        </span>
      </header>

      <section className="editor-workspace" aria-label="Editor workspace">
        <aside className="sidebar left-sidebar" aria-label="Document tree sidebar">
          <h2>Document</h2>
          {currentDocument && currentDocument.pages.length > 0 ? (
            <nav className="document-tree" aria-label="Document structure">
              {currentDocument.pages.map((page) => (
                <div className="tree-group" key={page.id}>
                  <button
                    className={`tree-button ${selection.selectedPageId === page.id ? "selected" : ""}`}
                    type="button"
                    onClick={() => setSelection(selectPage(page.id))}
                  >
                    {page.name}
                  </button>
                  {selection.selectedPageId === page.id && page.surfaces && (
                    <ul className="tree-children">
                      {page.surfaces.map((surface) => (
                        <li className="tree-group" key={surface.id}>
                          <button
                            className={`tree-button ${selection.selectedSurfaceId === surface.id ? "selected" : ""}`}
                            type="button"
                            onClick={() =>
                              setSelection(
                                selectSurface(surface.id, {
                                  selectedPageId: page.id,
                                  selectedSurfaceId: null,
                                  selectedElementId: null,
                                }),
                              )
                            }
                          >
                            {surface.name}
                          </button>
                          {selection.selectedSurfaceId === surface.id &&
                            surface.elements.length > 0 && (
                              <ul className="tree-children">
                                {surface.elements.map((element) => (
                                  <li className="tree-group" key={element.id}>
                                    <button
                                      className={`tree-button ${selection.selectedElementId === element.id ? "selected" : ""}`}
                                      type="button"
                                      onClick={() =>
                                        setSelection(
                                          selectElement(element.id, {
                                            selectedPageId: page.id,
                                            selectedSurfaceId: surface.id,
                                            selectedElementId: null,
                                          }),
                                        )
                                      }
                                    >
                                      [{element.type}] {element.name ?? element.id.slice(0, 8)}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
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

          <h2 className="section-divider">Tools</h2>
          <nav className="tool-list" aria-label="Element tools">
            {elementTools.map((tool) => (
              <button className="tool-button" key={tool} type="button">
                {tool}
              </button>
            ))}
          </nav>
        </aside>

        <section className="canvas-stage" aria-label="Canvas area">
          {selectedSurface ? (
            <div className="canvas-scroll-wrapper">
              <div className="canvas-surface-header">
                <h2>{selectedSurface.name}</h2>
                <span className="surface-dimensions">
                  {selectedSurface.width} × {selectedSurface.height} {selectedSurface.unit}
                </span>
              </div>
              <SurfaceCanvas
                surface={selectedSurface}
                selectedElementId={selection.selectedElementId}
                onSelectElement={(elementId) =>
                  setSelection(
                    selectElement(elementId, {
                      selectedPageId: selection.selectedPageId,
                      selectedSurfaceId: selection.selectedSurfaceId,
                      selectedElementId: null,
                    }),
                  )
                }
              />
            </div>
          ) : (
            <div className="canvas-placeholder">
              <h2>Canvas Area</h2>
              <p>Select a surface to preview elements</p>
            </div>
          )}
        </section>

        <aside className="sidebar right-sidebar" aria-label="Properties sidebar">
          <h2>Properties</h2>

          {selectedElement ? (
            <ElementProperties
              element={selectedElement}
              onUpdate={handleUpdateElement}
              onDelete={handleDeleteElement}
              onDuplicate={handleDuplicateElement}
              onBringForward={handleBringForward}
              onSendBackward={handleSendBackward}
              onMove={handleMoveElement}
            />
          ) : (
            <div className="property-card">
              <p className="document-placeholder">No element selected</p>
            </div>
          )}

          <div className="property-card api-info-card">
            <h3>API Connection</h3>
            <div className="info-row">
              <span className="info-label">API URL</span>
              <span className="info-value">{apiUrl}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Configuration ID</span>
              <span className="info-value">{configuration ? configuration.id : "not set"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="info-value info-status">
                {configuration ? configuration.status : "not loaded"}
              </span>
            </div>
          </div>

          {templateId && (
            <div className="property-card">
              <h3>Template</h3>
              {loading && <p className="template-status">Loading template...</p>}
              {error && <p className="template-status template-error">{error}</p>}
              {template && !loading && (
                <div className="template-info">
                  <div className="info-row">
                    <span className="info-label">ID</span>
                    <span className="info-value">{template.id}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Workspace</span>
                    <span className="info-value">{template.workspaceId}</span>
                  </div>
                  {template.productId && (
                    <div className="info-row">
                      <span className="info-label">Product</span>
                      <span className="info-value">{template.productId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="property-card">
            <h3>Current document</h3>
            {!currentDocument && !loading && (
              <p className="document-placeholder">No document loaded yet.</p>
            )}
            {currentDocument && !configuration && (
              <p className="document-placeholder">
                Template loaded. Configuration not yet created.
              </p>
            )}
            {configuration && (
              <div className="template-info">
                <div className="info-row">
                  <span className="info-label">Configuration</span>
                  <span className="info-value">{configuration.id}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status</span>
                  <span className="info-value">{configuration.status}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Template</span>
                  <span className="info-value">{template?.id}</span>
                </div>
              </div>
            )}
          </div>

          {configurationError && (
            <div className="property-card">
              <h3>Configuration Error</h3>
              <p className="template-status template-error">{configurationError}</p>
            </div>
          )}

          <button
            className="action-button"
            type="button"
            disabled={!template || loading || configurationCreating}
            onClick={async () => {
              if (!template) {
                return;
              }

              if (!template.workspaceId) {
                setConfigurationError("Template has no workspaceId.");

                return;
              }

              setConfigurationCreating(true);
              setConfigurationError(null);

              try {
                const documentId = crypto.randomUUID() as DocumentId;

                const configDocument = createConfigurationDocument({
                  documentId,
                  templateDocument: template.documentSchema,
                });

                const createdConfiguration = await createConfigurationFromTemplate(
                  template.id,
                  configDocument,
                  template.workspaceId,
                  "draft",
                );

                setConfiguration(createdConfiguration);
                setCurrentDocument(
                  createdConfiguration.document as unknown as CreationFlowDocument,
                );
              } catch (err) {
                setConfigurationError(
                  err instanceof Error ? err.message : "Failed to create configuration.",
                );
              } finally {
                setConfigurationCreating(false);
              }
            }}
          >
            {configurationCreating ? "Creating..." : "Create configuration from template"}
          </button>
        </aside>
      </section>

      <footer className="surface-bar" aria-label="Product surfaces">
        {(currentDocument
          ? currentDocument.pages.flatMap((page) => page.surfaces ?? []).map((s) => s.name)
          : ["Front", "Back", "Left sleeve", "Right sleeve"]
        ).map((surface, index) => (
          <button className="surface-tab" key={`${surface}-${index}`} type="button">
            {surface}
          </button>
        ))}
      </footer>
    </main>
  );
}
