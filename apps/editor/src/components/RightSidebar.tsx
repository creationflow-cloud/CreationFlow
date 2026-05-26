import type { CreationFlowElement } from "@creationflow/schema";
import { ElementProperties } from "./ElementProperties.js";
import { DocumentInfo } from "./DocumentInfo.js";
import type { ConfigurationDto } from "../api/configurations.js";
import type { ProductTemplateDto } from "../api/product-templates.js";

interface RightSidebarProps {
  readonly selectedElement: CreationFlowElement | undefined;
  readonly onUpdateElement: (patch: Partial<CreationFlowElement>) => void;
  readonly onDeleteElement: () => void;
  readonly onDuplicateElement: () => void;
  readonly onBringForward: () => void;
  readonly onSendBackward: () => void;
  readonly onBringToFront: () => void;
  readonly onSendToBack: () => void;
  readonly onMoveElement: (dx: number, dy: number) => void;
  readonly onUploadAsset: (file: File) => Promise<string>;
  readonly configuration: ConfigurationDto | null;
  readonly template: ProductTemplateDto | null;
  readonly templateId: string | null;
  readonly loading: boolean;
  readonly configurationCreating: boolean;
  readonly error: string | null;
  readonly configurationError: string | null;
}

export function RightSidebar({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onMoveElement,
  onUploadAsset,
  configuration,
  template,
  templateId,
  loading,
  configurationCreating,
  error,
  configurationError,
}: RightSidebarProps) {
  return (
    <aside className="sidebar right-sidebar" aria-label="Properties panel">
      <section className="sidebar-section">
        <h2 className="sidebar-heading">Properties</h2>
        {selectedElement ? (
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
          />
        ) : (
          <div className="property-card empty-state-card">
            <p className="empty-state-text">No element selected</p>
            <p className="empty-state-hint">Select an element on the canvas or in the layers panel to edit its properties.</p>
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
