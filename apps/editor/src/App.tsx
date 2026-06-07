import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  addElement,
  createConfigurationDocument,
  getElementZIndex,
  updateElement,
} from "@creationflow/core";
import type {
  AddImageElementInput,
  AddPatternElementInput,
  AddShapeElementInput,
  AddTextElementInput,
} from "@creationflow/core";
import { evaluateRules } from "@creationflow/rules-engine";
import type { RuleVariableValue } from "@creationflow/rules-engine";
import type {
  AssetId,
  CreationFlowDocument,
  CreationFlowElement,
  DocumentId,
  ElementId,
  PageId,
  SurfaceId,
} from "@creationflow/schema";

import { uploadAsset } from "./api/assets.js";
import type { ConfigurationDto } from "./api/configurations.js";
import { getConfiguration, updateConfiguration } from "./api/configurations.js";
import { createConfigurationFromTemplate, getProductTemplate } from "./api/product-templates.js";
import type { ProductTemplateDto } from "./api/product-templates.js";
import {
  createRenderJob,
  getRenderJobPdfOutput,
  renderRenderJob,
} from "./api/render-jobs.js";
import type { RenderJobDto } from "./api/render-jobs.js";
import { findElementById, findSurfaceById } from "./helpers/document-helpers.js";
import { canRedo, canUndo, pushHistory, redo, undo } from "./helpers/document-history.js";
import type { HistoryState } from "./helpers/document-history.js";
import { collectEditorVariables } from "./helpers/rule-variables.js";
import {
  bringForward,
  bringToFront,
  deleteElement,
  duplicateElement,
  moveElement,
  sendBackward,
  sendToBack,
} from "./helpers/element-actions.js";
import { PatternGallery } from "./components/PatternGallery.js";
import {
  selectElement,
  selectFirstSurface,
  findFirstDesignRegionSurface,
  findFirstNonOverlaySurface,
} from "./helpers/selection-helpers.js";
import type { SelectionState } from "./helpers/selection-helpers.js";

import { TopBar } from "./components/TopBar.js";
import { LeftSidebar } from "./components/LeftSidebar.js";
import { CanvasWorkspace } from "./components/CanvasWorkspace.js";
import { RightSidebar } from "./components/RightSidebar.js";
import { PageFooter } from "./components/PageFooter.js";
import { RulesValidationPanel } from "./components/RulesValidationPanel.js";

function getQueryParam(param: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
}

export function App({ onSignOut }: { readonly onSignOut?: () => void } = {}) {
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

  const [history, setHistory] = useState<HistoryState>({ undoStack: [], redoStack: [] });
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderJob, setRenderJob] = useState<RenderJobDto | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showPatternGallery, setShowPatternGallery] = useState(false);
  const lastPreviewJobIdRef = useRef<string | null>(null);
  const lastPreviewConfigIdRef = useRef<string | null>(null);

  const dirty =
    currentDocument && lastSavedSnapshot
      ? JSON.stringify(currentDocument) !== lastSavedSnapshot
      : false;

  const editorVariables = useMemo<Record<string, RuleVariableValue>>(() => {
    if (!currentDocument) return {};
    return collectEditorVariables(currentDocument, configuration);
  }, [currentDocument, configuration]);

  const ruleEvaluation = useMemo(() => {
    if (!currentDocument) return null;
    return evaluateRules(currentDocument, {
      variables: editorVariables,
    });
  }, [currentDocument, editorVariables]);

  const hasBlockingIssues = (ruleEvaluation?.mandatoryViolations.length ?? 0) > 0;

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
          const doc = config.document as unknown as CreationFlowDocument;
          setCurrentDocument(doc);
          setHistory({ undoStack: [], redoStack: [] });
          setLastSavedSnapshot(JSON.stringify(doc));
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
            const doc = createdConfig.document as unknown as CreationFlowDocument;
            setCurrentDocument(doc);
            setHistory({ undoStack: [], redoStack: [] });
            setLastSavedSnapshot(JSON.stringify(doc));

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

  useEffect(() => {
    if (selection.selectedElementId && currentDocument) {
      const exists = findElementById(currentDocument, selection.selectedElementId);
      if (!exists) {
        queueMicrotask(() => {
          setSelection((prev) =>
            prev.selectedElementId === selection.selectedElementId
              ? { ...prev, selectedElementId: null }
              : prev,
          );
        });
      }
    }
  }, [currentDocument, selection.selectedElementId]);

  useEffect(() => {
    if (!currentDocument) return;
    if (selection.selectedPageId && selection.selectedSurfaceId) return;

    const first = selectFirstSurface(currentDocument);
    if (
      first.selectedPageId !== selection.selectedPageId ||
      first.selectedSurfaceId !== selection.selectedSurfaceId
    ) {
      queueMicrotask(() => {
        setSelection((prev) =>
          prev.selectedPageId === first.selectedPageId &&
          prev.selectedSurfaceId === first.selectedSurfaceId
            ? prev
            : first,
        );
      });
    }
  }, [currentDocument, selection.selectedPageId, selection.selectedSurfaceId]);

  const selectedSurface =
    currentDocument && selection.selectedSurfaceId
      ? findSurfaceById(currentDocument, selection.selectedSurfaceId)
      : undefined;

  function getTargetSurfaceForElementCreation(): { surfaceId: SurfaceId | null; pageId: PageId | null } {
    if (!currentDocument || !selection.selectedPageId || !selection.selectedSurfaceId) {
      return { surfaceId: null, pageId: null };
    }

    const surface = findSurfaceById(currentDocument, selection.selectedSurfaceId);
    if (!surface) {
      return { surfaceId: null, pageId: null };
    }

    const role = surface.role ?? "default";

    if (role === "overlay") {
      const designRegion = findFirstDesignRegionSurface(currentDocument, selection.selectedPageId);
      if (designRegion) {
        return { surfaceId: designRegion.id, pageId: selection.selectedPageId as PageId };
      }

      const nonOverlay = findFirstNonOverlaySurface(currentDocument, selection.selectedPageId);
      if (nonOverlay) {
        return { surfaceId: nonOverlay.id, pageId: selection.selectedPageId as PageId };
      }

      return { surfaceId: null, pageId: null };
    }

    return {
      surfaceId: selection.selectedSurfaceId as SurfaceId,
      pageId: selection.selectedPageId as PageId,
    };
  }

  const selectedElement =
    currentDocument && selection.selectedElementId
      ? findElementById(currentDocument, selection.selectedElementId)
      : undefined;

  const documentName =
    (currentDocument?.metadata as { name?: string } | undefined)?.name ?? "Untitled document";
  const pdfOutput = getRenderJobPdfOutput(renderJob);

  function commitHistory(doc: CreationFlowDocument) {
    setHistory((prev) => pushHistory(prev, doc));
  }

  function handleUpdateElement(patch: Partial<CreationFlowElement>) {
    if (!currentDocument || !selection.selectedElementId) {
      return;
    }

    commitHistory(currentDocument);

    const updatedDocument = updateElement(
      currentDocument,
      selection.selectedElementId as ElementId,
      patch,
    );

    setCurrentDocument(updatedDocument);
  }

  function handleUpdateElementById(elementId: string, patch: Partial<CreationFlowElement>) {
    if (!currentDocument) {
      return;
    }

    const updatedDocument = updateElement(currentDocument, elementId as ElementId, patch);

    setCurrentDocument(updatedDocument);
  }

  function handleDeleteElement(elementId = selection.selectedElementId) {
    if (!currentDocument || !elementId) {
      return;
    }

    commitHistory(currentDocument);

    const updatedDocument = deleteElement(currentDocument, elementId as ElementId);
    setCurrentDocument(updatedDocument);
    setSelection((prev) =>
      prev.selectedElementId === elementId ? { ...prev, selectedElementId: null } : prev,
    );
  }

  function handleDuplicateElement(elementId = selection.selectedElementId) {
    if (
      !currentDocument ||
      !elementId ||
      !selection.selectedSurfaceId ||
      !selection.selectedPageId
    ) {
      return;
    }

    const element = findElementById(currentDocument, elementId);
    if (!element) {
      return;
    }

    commitHistory(currentDocument);

    const result = duplicateElement(
      currentDocument,
      selection.selectedPageId as PageId,
      selection.selectedSurfaceId as SurfaceId,
      elementId as ElementId,
    );

    setCurrentDocument(result.document);
    setSelection({ ...selection, selectedElementId: result.newElementId });
  }

  function handleBringForward(elementId = selection.selectedElementId) {
    if (!currentDocument || !elementId || !selection.selectedSurfaceId) {
      return;
    }

    commitHistory(currentDocument);

    setCurrentDocument(
      bringForward(
        currentDocument,
        elementId as ElementId,
        selection.selectedSurfaceId as SurfaceId,
      ),
    );
  }

  function handleSendBackward(elementId = selection.selectedElementId) {
    if (!currentDocument || !elementId || !selection.selectedSurfaceId) {
      return;
    }

    commitHistory(currentDocument);

    setCurrentDocument(
      sendBackward(
        currentDocument,
        elementId as ElementId,
        selection.selectedSurfaceId as SurfaceId,
      ),
    );
  }

  function handleBringToFront(elementId = selection.selectedElementId) {
    if (!currentDocument || !elementId || !selection.selectedSurfaceId) {
      return;
    }

    commitHistory(currentDocument);

    setCurrentDocument(
      bringToFront(
        currentDocument,
        elementId as ElementId,
        selection.selectedSurfaceId as SurfaceId,
      ),
    );
  }

  function handleSendToBack(elementId = selection.selectedElementId) {
    if (!currentDocument || !elementId || !selection.selectedSurfaceId) {
      return;
    }

    commitHistory(currentDocument);

    setCurrentDocument(
      sendToBack(currentDocument, elementId as ElementId, selection.selectedSurfaceId as SurfaceId),
    );
  }

  function handleMoveElement(dx: number, dy: number) {
    if (!currentDocument || !selection.selectedElementId || !selectedElement) {
      return;
    }

    commitHistory(currentDocument);

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

  function getNextZIndex(): number {
    if (!selectedSurface) return 0;
    const elements = selectedSurface.elements;
    if (elements.length === 0) return 0;
    return Math.max(...elements.map(getElementZIndex)) + 1;
  }

  function handleAddTextElement() {
    if (!currentDocument) {
      return;
    }

    const target = getTargetSurfaceForElementCreation();
    if (!target.pageId || !target.surfaceId) {
      return;
    }

    commitHistory(currentDocument);

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
      zIndex: getNextZIndex(),
      text: "Your text here",
      fontFamily: "Inter, sans-serif",
      fontSize: 20,
      fontWeight: "400",
      color: "#1d2738",
      align: "left",
    };

    const updatedDocument = addElement(
      currentDocument,
      {
        pageId: target.pageId,
        surfaceId: target.surfaceId,
      },
      input,
    );

    setCurrentDocument(updatedDocument);
    setSelection({
      selectedPageId: target.pageId,
      selectedSurfaceId: target.surfaceId,
      selectedElementId: elementId,
    });
  }

  function handleAddShapeElement() {
    if (!currentDocument) {
      return;
    }

    const target = getTargetSurfaceForElementCreation();
    if (!target.pageId || !target.surfaceId) {
      return;
    }

    commitHistory(currentDocument);

    const elementId = crypto.randomUUID() as ElementId;

    const input: AddShapeElementInput = {
      id: elementId,
      type: "shape",
      name: "Shape",
      x: 80,
      y: 80,
      width: 160,
      height: 100,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: getNextZIndex(),
      shapeType: "rect",
      fill: "#eef1f6",
      stroke: "#243b68",
      strokeWidth: 2,
    };

    const updatedDocument = addElement(
      currentDocument,
      {
        pageId: target.pageId,
        surfaceId: target.surfaceId,
      },
      input,
    );

    setCurrentDocument(updatedDocument);
    setSelection({
      selectedPageId: target.pageId,
      selectedSurfaceId: target.surfaceId,
      selectedElementId: elementId,
    });
  }

  function handleAddImageElement() {
    if (!currentDocument) {
      return;
    }

    const target = getTargetSurfaceForElementCreation();
    if (!target.pageId || !target.surfaceId) {
      return;
    }

    commitHistory(currentDocument);

    const elementId = crypto.randomUUID() as ElementId;

    const input: AddImageElementInput = {
      id: elementId,
      type: "image",
      name: "Image",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      zIndex: getNextZIndex(),
      assetId: crypto.randomUUID() as AssetId,
      fit: "contain",
    };

    const updatedDocument = addElement(
      currentDocument,
      {
        pageId: target.pageId,
        surfaceId: target.surfaceId,
      },
      input,
    );

    setCurrentDocument(updatedDocument);
    setSelection({
      selectedPageId: target.pageId,
      selectedSurfaceId: target.surfaceId,
      selectedElementId: elementId,
    });
  }

  function handleAddPatternElement(patternId: string) {
    if (!currentDocument) {
      return;
    }

    const target = getTargetSurfaceForElementCreation();
    if (!target.pageId || !target.surfaceId) {
      return;
    }

    const targetSurface = findSurfaceById(currentDocument, target.surfaceId);
    if (!targetSurface) {
      return;
    }

    commitHistory(currentDocument);

    const elementId = crypto.randomUUID() as ElementId;

    const input: AddPatternElementInput = {
      id: elementId,
      type: "pattern",
      name: `Muster ${patternId}`,
      x: 0,
      y: 0,
      width: targetSurface.width,
      height: targetSurface.height,
      rotation: 0,
      opacity: 0.4,
      visible: true,
      locked: true,
      zIndex: 0,
      surfaceId: target.surfaceId,
      assetId: patternId as AssetId,
      repeatMode: "both",
      tileWidth: 32,
      tileHeight: 32,
      gapX: 8,
      gapY: 8,
      offsetX: 0,
      offsetY: 0,
      color: undefined,
    };

    const updatedDocument = addElement(
      currentDocument,
      {
        pageId: target.pageId,
        surfaceId: target.surfaceId,
      },
      input,
    );

    setCurrentDocument(updatedDocument);
    setSelection({
      selectedPageId: target.pageId,
      selectedSurfaceId: target.surfaceId,
      selectedElementId: elementId,
    });
    setShowPatternGallery(false);
  }

  const handleUploadAsset = useCallback(
    async (file: File): Promise<string> => {
      if (!configuration) throw new Error("No configuration loaded.");
      const result = await uploadAsset(file, configuration.workspaceId);
      return result.id;
    },
    [configuration],
  );

  const handleUndo = useCallback(() => {
    if (!currentDocument) return;
    const result = undo(history, currentDocument);
    if (!result.previous) return;

    setHistory({ undoStack: result.undoStack, redoStack: result.redoStack });
    setCurrentDocument(result.previous);
  }, [history, currentDocument]);

  const handleRedo = useCallback(() => {
    if (!currentDocument) return;
    const result = redo(history, currentDocument);
    if (!result.next) return;

    setHistory({ undoStack: result.undoStack, redoStack: result.redoStack });
    setCurrentDocument(result.next);
  }, [history, currentDocument]);

  const refreshPdfPreview = useCallback(async () => {
    if (!configuration || previewLoading) {
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const createdJob = await createRenderJob({
        workspaceId: configuration.workspaceId,
        configurationId: configuration.id,
      });

      const renderedJob = await renderRenderJob(createdJob.id);

      if (renderedJob.status === "done") {
        const pdfOutput = getRenderJobPdfOutput(renderedJob);
        if (pdfOutput) {
          if (pdfPreviewUrl && pdfPreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(pdfPreviewUrl);
          }

          const response = await fetch(pdfOutput.downloadUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.status}`);
          }
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          setPdfPreviewUrl(blobUrl);
          lastPreviewJobIdRef.current = renderedJob.id;
        }
      } else if (renderedJob.status === "failed") {
        setPreviewError(renderedJob.errorMessage ?? "Preview rendering failed");
      }
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview refresh failed");
    } finally {
      setPreviewLoading(false);
    }
  }, [configuration, previewLoading]);

  useEffect(() => {
    if (!configuration || !currentDocument || configurationLoading || loading) {
      return;
    }

    if (configuration.id === lastPreviewConfigIdRef.current) {
      return;
    }

    if (previewLoading) {
      return;
    }

    void refreshPdfPreview();
    lastPreviewConfigIdRef.current = configuration.id;
  }, [configuration, currentDocument, configurationLoading, loading, previewLoading, refreshPdfPreview]);

  const handleSave = useCallback(async () => {
    if (!configuration || !currentDocument) {
      return;
    }

    if (hasBlockingIssues) {
      setSaveStatus("error");
      setSaveError(
        `Cannot save: ${ruleEvaluation?.mandatoryViolations.length ?? 0} mandatory rule violation(s) need to be resolved.`,
      );
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await updateConfiguration(configuration.id, {
        document: currentDocument as unknown as Record<string, unknown>,
      });
      setSaveStatus("saved");
      setLastSavedSnapshot(JSON.stringify(currentDocument));

      await refreshPdfPreview();

      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [configuration, currentDocument, refreshPdfPreview, hasBlockingIssues, ruleEvaluation]);

  const handleRenderPdf = useCallback(async () => {
    if (!configuration || !currentDocument) {
      return;
    }

    if (hasBlockingIssues) {
      setRenderError(
        `Cannot render: ${ruleEvaluation?.mandatoryViolations.length ?? 0} mandatory rule violation(s) need to be resolved.`,
      );
      return;
    }

    setRendering(true);
    setRenderError(null);
    setRenderJob(null);

    try {
      if (dirty) {
        await updateConfiguration(configuration.id, {
          document: currentDocument as unknown as Record<string, unknown>,
        });
        setLastSavedSnapshot(JSON.stringify(currentDocument));
      }

      const createdJob = await createRenderJob({
        workspaceId: configuration.workspaceId,
        configurationId: configuration.id,
      });
      const renderedJob = await renderRenderJob(createdJob.id);

      setRenderJob(renderedJob);

      if (renderedJob.status === "failed") {
        setRenderError(renderedJob.errorMessage ?? "PDF rendering failed.");
      }
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : String(err));
    } finally {
      setRendering(false);
    }
  }, [configuration, currentDocument, dirty, hasBlockingIssues, ruleEvaluation]);

  const handleSaveRef = useRef(handleSave);
  const handleUndoRef = useRef(handleUndo);
  const handleRedoRef = useRef(handleRedo);
  const handleDeleteRef = useRef(handleDeleteElement);
  const handleDuplicateRef = useRef(handleDuplicateElement);

  useEffect(() => {
    handleSaveRef.current = handleSave;
    handleUndoRef.current = handleUndo;
    handleRedoRef.current = handleRedo;
    handleDeleteRef.current = handleDeleteElement;
    handleDuplicateRef.current = handleDuplicateElement;
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndoRef.current();
        return;
      }

      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedoRef.current();
        return;
      }

      if (mod && e.key === "s") {
        e.preventDefault();
        handleSaveRef.current();
        return;
      }

      if (mod && e.key === "d") {
        e.preventDefault();
        handleDuplicateRef.current();
        return;
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !isInput &&
        selection.selectedElementId
      ) {
        e.preventDefault();
        handleDeleteRef.current();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection.selectedElementId]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl && pdfPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const noIdProvided = !templateId && !configurationId && !loading && !configurationLoading;

  return (
    <main className="editor-shell">
      <TopBar
        documentName={documentName}
        hasDocument={!!currentDocument}
        configuration={configuration}
        templateId={templateId}
        dirty={dirty}
        saving={saving}
        saveStatus={saveStatus}
        canUndo={canUndo(history)}
        canRedo={canRedo(history)}
        rendering={rendering}
        renderJob={renderJob}
        renderError={renderError}
        pdfOutput={pdfOutput}
        blockingIssues={ruleEvaluation?.mandatoryViolations.length ?? 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
        onRenderPdf={handleRenderPdf}
        onSignOut={onSignOut}
      />

      {noIdProvided && (
        <section className="status-banner status-error">
          <p>
            No templateId or configurationId provided. Open with <code>?templateId=&lt;id&gt;</code>{" "}
            or <code>?configurationId=&lt;id&gt;</code>.
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

      {currentDocument && (
        <RulesValidationPanel
          document={currentDocument}
          variables={editorVariables}
        />
      )}

      <section className="editor-workspace" aria-label="Editor workspace">
        <LeftSidebar
          document={currentDocument}
          selection={selection}
          onSelectionChange={setSelection}
          onAddText={handleAddTextElement}
          onAddShape={handleAddShapeElement}
          onAddImage={handleAddImageElement}
          onAddPattern={() => setShowPatternGallery(true)}
          onDuplicateElement={handleDuplicateElement}
          onDeleteElement={handleDeleteElement}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
        />

        <CanvasWorkspace
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
          onDragStart={() => {
            if (currentDocument) commitHistory(currentDocument);
          }}
        />

        <RightSidebar
          selectedElement={selectedElement}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicateElement}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onMoveElement={handleMoveElement}
          onUploadAsset={handleUploadAsset}
          configuration={configuration}
          template={template}
          templateId={templateId}
          loading={loading}
          configurationCreating={configurationCreating}
          error={error}
          configurationError={configurationError}
        />
      </section>

      {showPatternGallery && selectedSurface && (
        <PatternGallery
          onAddPattern={handleAddPatternElement}
          onClose={() => setShowPatternGallery(false)}
        />
      )}

      <PageFooter
        document={currentDocument}
        selection={selection}
        onSelectionChange={setSelection}
        pdfPreviewUrl={pdfPreviewUrl}
        previewLoading={previewLoading}
        previewError={previewError}
        onRetryPreview={refreshPdfPreview}
      />
    </main>
  );
}
