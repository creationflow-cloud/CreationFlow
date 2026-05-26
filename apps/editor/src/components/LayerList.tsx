import type { CreationFlowElement } from "@creationflow/schema";
import { getElementZIndex } from "@creationflow/core";

interface LayerListProps {
  readonly elements: readonly CreationFlowElement[];
  readonly selectedElementId: string | null;
  readonly onSelectElement: (elementId: string) => void;
  readonly onDuplicateElement: (elementId: string) => void;
  readonly onDeleteElement: (elementId: string) => void;
  readonly onBringForward: (elementId: string) => void;
  readonly onSendBackward: (elementId: string) => void;
  readonly onBringToFront: (elementId: string) => void;
  readonly onSendToBack: (elementId: string) => void;
}

export function LayerList({
  elements,
  selectedElementId,
  onSelectElement,
  onDuplicateElement,
  onDeleteElement,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}: LayerListProps) {
  if (elements.length === 0) {
    return <p className="layer-placeholder">No layers yet. Add an element above.</p>;
  }

  const sortedElements = [...elements].sort((a, b) => getElementZIndex(b) - getElementZIndex(a));

  return (
    <div className="layer-list">
      {sortedElements.map((el) => (
        <div
          className={`layer-item ${selectedElementId === el.id ? "selected" : ""}`}
          key={el.id}
        >
          <button
            className="layer-select-btn"
            type="button"
            onClick={() =>
              onSelectElement(el.id)
            }
            title={el.name ?? el.id.slice(0, 8)}
          >
            <span className="layer-type-badge">{el.type}</span>
            <span className="layer-name">{el.name ?? el.id.slice(0, 8)}</span>
          </button>
          <div className="layer-actions">
            <button
              className="layer-action-btn"
              type="button"
              title="Duplicate layer"
              onClick={() => {
                onSelectElement(el.id);
                onDuplicateElement(el.id);
              }}
            >
              Dup
            </button>
            <button
              className="layer-action-btn layer-action-danger"
              type="button"
              title="Delete layer"
              onClick={() => {
                onSelectElement(el.id);
                onDeleteElement(el.id);
              }}
            >
              Del
            </button>
            <button
              className="layer-action-btn layer-action-icon"
              type="button"
              title="Bring to front"
              onClick={() => {
                onSelectElement(el.id);
                onBringToFront(el.id);
              }}
            >
              ⇈
            </button>
            <button
              className="layer-action-btn layer-action-icon"
              type="button"
              title="Bring forward"
              onClick={() => {
                onSelectElement(el.id);
                onBringForward(el.id);
              }}
            >
              ↑
            </button>
            <button
              className="layer-action-btn layer-action-icon"
              type="button"
              title="Send backward"
              onClick={() => {
                onSelectElement(el.id);
                onSendBackward(el.id);
              }}
            >
              ↓
            </button>
            <button
              className="layer-action-btn layer-action-icon"
              type="button"
              title="Send to back"
              onClick={() => {
                onSelectElement(el.id);
                onSendToBack(el.id);
              }}
            >
              ⇊
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
