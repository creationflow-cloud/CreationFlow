import { useCallback, useEffect, useState } from "react";

import { addElement, createConfigurationDocument, updateElement } from "@creationflow/core";
import type { AddTextElementInput } from "@creationflow/core";
import type {
  CreationFlowDocument,
  CreationFlowElement,
  DocumentId,
  ElementId,
  PageId,
  SurfaceId,
} from "@creationflow/schema";

import type { ConfigurationDto } from "./api/configurations.js";
import { getConfiguration, updateConfiguration } from "./api/configurations.js";
import { createConfigurationFromTemplate, getProductTemplate } from "./api/product-templates.js";
import type { ProductTemplateDto } from "./api/product-templates.js";
import { ElementProperties } from "./components/ElementProperties.js";
import { SurfaceCanvas } from "./components/SurfaceCanvas.js";
import { findElementById, findSurfaceById } from "./helpers/document-helpers.js";
import {
  bringForward,
  bringToFront,
  deleteElement,
  duplicateElement,
  moveElement,
  sendBackward,
  sendToBack,
} from "./helpers/element-actions.js";
import { selectElement, selectPage, selectSurface } from "./helpers/selection-helpers.js";
import type { SelectionState } from "./helpers/selection-helpers.js";

const elementTools = ["Text", "Image", "Shape", "Variables"];

function getQueryParam(param: string): string | null {
  const params = new URLSearchParams(window.location.search);

  return params.get(param);
}

export function App() {
  const templateId = getQueryParam("templateId");
  const configurationId = getQueryParam("configurationId");
  const [loading, setLoading] = useState(false);
  const [configurationLoading, setConfigurationLoading] = useState(false);
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

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!configurationId) {
      return;
    }

    let cancelled = false;

    async function loadConfiguration() {
      setConfigurationLoading(true);
      setError(null);

      try {
        const config = await getConfiguration(configurationId as string);

        if (!cancelled) {
          setConfiguration(config);
          setCurrentDocument(config.document as unknown as CreationFlowDocument);
          setDirty(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load configuration.");
        }
      } finally {
        if (!cancelled) {
          setConfigurationLoading(false);
        }
      }
    }

    void loadConfiguration();

    return () => {
      cancelled = true;
    };
  }, [configurationId]);

  useEffect(() => {
    if (!templateId || configurationId) {
      return;
    }

    let cancelled = false;

    async function loadTemplateAndCreateConfiguration() {
      setLoading(true);
      setError(null);

      try {
        const data = await getProductTemplate(templateId as string);

        if (!cancelled) {
          setTemplate(data);

          if (!data.workspaceId) {
            setConfigurationError("Template has no workspaceId.");
            setLoading(false);

            return;
          }

          setConfigurationCreating(true);

          const documentId = crypto.randomUUID() as DocumentId;

          const configDocument = createConfigurationDocument({
            documentId,
            templateDocument: data.documentSchema,
          });

          const createdConfig = await createConfigurationFromTemplate(
            data.id,
            configDocument,
            data.workspaceId,
            "draft",
          );

          if (!cancelled) {
            setConfiguration(createdConfig);
            setCurrentDocument(createdConfig.document as unknown as CreationFlowDocument);
            setDirty(false);

            const newUrl = `${window.location.pathname}?configurationId=${createdConfig.id}`;
            window.history.replaceState(null, "", newUrl);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load template.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setConfigurationCreating(false);
        }
      }
    }

    void loadTemplateAndCreateConfiguration();

    return () => {
      cancelled = true;
    };
  }, [templateId, configurationId]);

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

  function markDirty() {
    setDirty(true);
    setSaveStatus("idle");
  }

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
    markDirty();
  }

  function handleUpdateElementById(elementId: string, patch: Partial<CreationFlowElement>) {
    if (!currentDocument) {
      return;
    }

    const updatedDocument = updateElement(
      currentDocument,
      elementId as ElementId,
      patch,
    );

    setCurrentDocument(updatedDocument);
    markDirty();
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
    markDirty();
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
    markDirty();
  }

  function handleBringForward() {
    if (!currentDocument || !selection.selectedElementId || !selectedSurface) {
      return;
    }

    setCurrentDocument(
      bringForward(currentDocument, selection.selectedElementId as ElementId, selectedSurface),
    );
    markDirty();
  }

  function handleSendBackward() {
    if (!currentDocument || !selection.selectedElementId || !selectedSurface) {
      return;
    }

    setCurrentDocument(
      sendBackward(currentDocument, selection.selectedElementId as ElementId, selectedSurface),
    );
    markDirty();
  }

  function handleBringToFront() {
    if (!currentDocument || !selection.selectedElementId || !selectedSurface) {
      return;
    }

    setCurrentDocument(
      bringToFront(currentDocument, selection.selectedElementId as ElementId, selectedSurface),
    );
    markDirty();
  }

  function handleSendToBack() {
    if (!currentDocument || !selection.selectedElementId || !selectedSurface) {
      return;
    }

    setCurrentDocument(
      sendToBack(currentDocument, selection.selectedElementId as ElementId, selectedSurface),
    );
    markDirty();
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
    markDirty();
  }

  function handleAddTextElement() {
    if (!currentDocument || !selection.selectedPageId || !selection.selectedSurfaceId) {
      return;
    }

    const elementId = crypto.randomUUID() as ElementId;

    const input: AddTextElementInput = {
      id: elementId,
      type: "text",
      name: "Text",
      x: 50,
      y: 50,
      width: 200,
      height: 40,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: 999,
      text: "Your text here",
      fontFamily: "Inter, sans-serif",
      fontSize: 20,
      fontWeight: "400",
      color: "#1d2738",
      align: "left",
    };

    const updatedDocument = addElement(currentDocument, {
      pageId: selection.selectedPageId as PageId,
      surfaceId: selection.selectedSurfaceId as SurfaceId,
    }, input);

    setCurrentDocument(updatedDocument);
    setSelection({
      selectedPageId: selection.selectedPageId,
      selectedSurfaceId: selection.selectedSurfaceId,
      selectedElementId: elementId,
    });
    markDirty();
  }

  const handleSave = useCallback(async () => {
    if (!configuration || !currentDocument) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await updateConfiguration(configuration.id, {
        document: currentDocument as unknown as Record<string, unknown>,
      });
      setSaveStatus("saved");
      setDirty(false);

      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [configuration, currentDocument]);

  const noIdProvided = !templateId && !configurationId && !loading && !configurationLoading;

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <div>
          <p className="eyebrow">CreationFlow Editor</p>
          <h1>{currentDocument ? documentName : "Untitled document"}</h1>
        </div>

        <div className="header-actions">
          {configuration && currentDocument && (
            <>
              <span
                className={`dirty-indicator ${dirty ? "dirty" : "clean"}`}
              >
                {dirty ? "Unsaved changes" : saveStatus === "saved" ? "Saved" : "No changes"}
              </span>
              <button
                type="button"
                className={`save-btn ${saveStatus}`}
                disabled={!dirty || saving}
                onClick={handleSave}
              >
                {saving
                  ? "Saving..."
                  : saveStatus === "saved"
                    ? "Saved ✓"
                    : saveStatus === "error"
                      ? "Save failed"
                      : "Save"}
              </button>
            </>
          )}
          <span className="document-pill">
            {configuration
              ? `Config: ${configuration.id.slice(0, 8)}...`
              : templateId
                ? `Template: ${templateId.slice(0, 8)}...`
                : "No document"}
          </span>
        </div>
      </header>

      {noIdProvided && (
        <section className="status-banner status-error">
          <p>
            No templateId or configurationId provided. Open with{" "}
            <code>?templateId=&lt;id&gt;</code> or{" "}
            <code>?configurationId=&lt;id&gt;</code>.
          </p>
        </section>
      )}

      {saveError && (
        <section className="status-banner status-error">
          <p>Save error: {saveError}</p>
          <button type="button" className="retry-btn" onClick={() => setSaveError(null)}>
            Dismiss
          </button>
        </section>
      )}

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
            <button
              className="tool-button"
              type="button"
              onClick={handleAddTextElement}
            >
              Text
            </button>
            {elementTools.slice(1).map((tool) => (
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
                onUpdateElement={handleUpdateElementById}
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
              onBringToFront={handleBringToFront}
              onSendToBack={handleSendToBack}
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
              {(loading || configurationCreating) && <p className="template-status">Loading...</p>}
              {error && <p className="template-status template-error">{error}</p>}
              {template && !loading && !configurationCreating && (
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
            {!currentDocument && !loading && !configurationLoading && (
              <p className="document-placeholder">No document loaded yet.</p>
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
