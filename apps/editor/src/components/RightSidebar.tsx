import type { CreationFlowDocument, CreationFlowElement } from "@creationflow/schema";
import type { RuleVariableValue } from "@creationflow/rules-engine";
import { ElementProperties } from "./ElementProperties.js";
import { DocumentInfo } from "./DocumentInfo.js";
import type { ConfigurationDto } from "../api/configurations.js";
import type { ProductTemplateDto } from "../api/product-templates.js";

interface RightSidebarProps {
  readonly selectedElement: CreationFlowElement | undefined;
  readonly selectedElementCount: number;
  readonly onUpdateElement: (patch: Partial<CreationFlowElement>) => void;
  readonly onUpdateElementsCommon: (patch: Partial<CreationFlowElement>) => void;
  readonly onDeleteElement: () => void;
  readonly onDuplicateElement: () => void;
  readonly onBringForward: () => void;
  readonly onSendBackward: () => void;
  readonly onBringToFront: () => void;
  readonly onSendToBack: () => void;
  readonly onMoveElement: (dx: number, dy: number) => void;
  readonly onMoveSelectedElements: (dx: number, dy: number) => void;
  readonly onUploadAsset: (file: File) => Promise<string>;
  readonly configuration: ConfigurationDto | null;
  readonly template: ProductTemplateDto | null;
  readonly templateId: string | null;
  readonly loading: boolean;
  readonly configurationCreating: boolean;
  readonly error: string | null;
  readonly configurationError: string | null;
  readonly currentDocument: CreationFlowDocument | null;
  readonly editorVariables: Readonly<Record<string, RuleVariableValue>>;
}

function MultiSelectionSummary({
  count,
  onUpdateCommon,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onMoveSelected,
}: {
  count: number;
  onUpdateCommon: (patch: Partial<CreationFlowElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onMoveSelected: (dx: number, dy: number) => void;
}) {
  void count;
  return (
    <div className="property-card">
      <h3>Multiple elements</h3>
      <p className="empty-state-text">{count} elements selected</p>
      <p className="empty-state-hint">
        Common properties are applied to all selected elements. Type-specific properties are
        available when a single element is selected.
      </p>
      <div className="info-row">
        <label className="info-label" htmlFor="multi-opacity">
          Opacity
        </label>
        <input
          id="multi-opacity"
          className="info-input"
          type="number"
          defaultValue={1}
          min={0}
          max={1}
          step={0.1}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (!Number.isFinite(value)) return;
            onUpdateCommon({ opacity: value });
          }}
        />
      </div>
      <div className="info-row">
        <label className="info-label" htmlFor="multi-rotation">
          Rotation
        </label>
        <input
          id="multi-rotation"
          className="info-input"
          type="number"
          defaultValue={0}
          min={0}
          max={360}
          step={1}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (!Number.isFinite(value)) return;
            onUpdateCommon({ rotation: value });
          }}
        />
      </div>
      <div className="info-row">
        <label className="info-label" htmlFor="multi-visible">
          Visible
        </label>
        <input
          id="multi-visible"
          className="info-input"
          type="checkbox"
          defaultChecked
          onChange={(event) => onUpdateCommon({ visible: event.target.checked })}
        />
      </div>

      <div className="element-actions-section">
        <h3>Actions</h3>
        <div className="action-buttons-grid">
          <button className="action-btn" type="button" onClick={onDuplicate}>
            Duplicate all
          </button>
          <button className="action-btn danger" type="button" onClick={onDelete}>
            Delete all
          </button>
          <button className="action-btn" type="button" onClick={onBringForward}>
            Bring forward
          </button>
          <button className="action-btn" type="button" onClick={onSendBackward}>
            Send backward
          </button>
          <button className="action-btn" type="button" onClick={onBringToFront}>
            Bring to front
          </button>
          <button className="action-btn" type="button" onClick={onSendToBack}>
            Send to back
          </button>
        </div>
      </div>

      <div className="position-controls-section">
        <h3>Quick Position</h3>
        <div className="position-controls">
          <button className="position-btn up" type="button" onClick={() => onMoveSelected(0, -5)}>
            ↑
          </button>
          <button className="position-btn left" type="button" onClick={() => onMoveSelected(-5, 0)}>
            ←
          </button>
          <button className="position-btn down" type="button" onClick={() => onMoveSelected(0, 5)}>
            ↓
          </button>
          <button className="position-btn right" type="button" onClick={() => onMoveSelected(5, 0)}>
            →
          </button>
        </div>
      </div>
    </div>
  );
}

export function RightSidebar({
  selectedElement,
  selectedElementCount,
  onUpdateElement,
  onUpdateElementsCommon,
  onDeleteElement,
  onDuplicateElement,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onMoveElement,
  onMoveSelectedElements,
  onUploadAsset,
  configuration,
  template,
  templateId,
  loading,
  configurationCreating,
  error,
  configurationError,
  currentDocument,
  editorVariables,
}: RightSidebarProps) {
  const isMulti = selectedElementCount > 1;

  return (
    <aside className="sidebar right-sidebar" aria-label="Properties panel">
      <section className="sidebar-section">
        <h2 className="sidebar-heading">Properties</h2>
        {isMulti ? (
          <MultiSelectionSummary
            count={selectedElementCount}
            onUpdateCommon={onUpdateElementsCommon}
            onDelete={onDeleteElement}
            onDuplicate={onDuplicateElement}
            onBringForward={onBringForward}
            onSendBackward={onSendBackward}
            onBringToFront={onBringToFront}
            onSendToBack={onSendToBack}
            onMoveSelected={onMoveSelectedElements}
          />
        ) : selectedElement ? (
          <ElementProperties
            element={selectedElement}
            onUpdate={onUpdateElement}
            onDelete={onDeleteElement}
            onDuplicate={onDuplicateElement}
            onBringForward={onBringForward}
            onSendBackward={onSendBackward}
            onBringToFront={onBringToFront}
            onSendToBack={onSendToBack}
            onMove={onMoveElement}
            onUploadAsset={onUploadAsset}
            document={currentDocument ?? undefined}
            variables={editorVariables}
          />
        ) : (
          <div className="property-card empty-state-card">
            <p className="empty-state-text">No element selected</p>
            <p className="empty-state-hint">
              Select an element on the canvas or in the layers panel to edit its properties.
            </p>
          </div>
        )}
      </section>

      <section className="sidebar-section sidebar-section-info">
        <DocumentInfo
          configuration={configuration}
          template={template}
          templateId={templateId}
          loading={loading}
          configurationCreating={configurationCreating}
          error={error}
          configurationError={configurationError}
        />
      </section>
    </aside>
  );
}
