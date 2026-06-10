import type { CreationFlowElement } from "@creationflow/schema";
import { getElementZIndex } from "@creationflow/core";

import {
  isElementSelected,
  modifierFromEvent,
  NO_MODIFIER,
  type SelectionModifier,
} from "../helpers/selection-helpers.js";

interface LayerListProps {
  readonly elements: readonly CreationFlowElement[];
  readonly selectedElementIds: readonly string[];
  readonly onSelectElement: (elementId: string, modifier: SelectionModifier) => void;
  readonly onDuplicateElement: (elementId: string) => void;
  readonly onDeleteElement: (elementId: string) => void;
  readonly onBringForward: (elementId: string) => void;
  readonly onSendBackward: (elementId: string) => void;
  readonly onBringToFront: (elementId: string) => void;
  readonly onSendToBack: (elementId: string) => void;
}

export function LayerList({
  elements,
  selectedElementIds,
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
  const selectionState = { selectedPageId: null, selectedSurfaceId: null, selectedElementIds };

  return (
    <div className="layer-list">
      {selectedElementIds.length > 1 && (
        <div className="layer-multi-summary">{selectedElementIds.length} layers selected</div>
      )}
      {sortedElements.map((el) => (
        <div
          className={`layer-item ${isElementSelected(el.id, selectionState) ? "selected" : ""}`}
          key={el.id}
        >
          <button
            className="layer-select-btn"
            type="button"
            onClick={(event) => onSelectElement(el.id, modifierFromEvent(event))}
            onMouseDown={(event) => onSelectElement(el.id, modifierFromEvent(event))}
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
                onSelectElement(el.id, NO_MODIFIER);
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
                onSelectElement(el.id, NO_MODIFIER);
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
                onSelectElement(el.id, NO_MODIFIER);
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
                onSelectElement(el.id, NO_MODIFIER);
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
                onSelectElement(el.id, NO_MODIFIER);
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
                onSelectElement(el.id, NO_MODIFIER);
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
