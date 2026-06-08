import type {
  CreationFlowElement,
  CreationFlowImageElement,
  CreationFlowPatternElement,
  CreationFlowShapeElement,
  CreationFlowTextElement,
  CreationFlowVariableElement,
} from "@creationflow/schema";
import { getElementZIndex } from "@creationflow/core";

import {
  modifierFromEvent,
  NO_MODIFIER,
  type SelectionModifier,
} from "../helpers/selection-helpers.js";

import { ImageElementView } from "./ImageElementView.js";
import { ShapeElementView } from "./ShapeElementView.js";
import { TextElementView, InlineTextEditor } from "./TextElementView.js";
import { PatternElementView } from "./PatternElementView.js";

interface ElementViewProps {
  readonly element: CreationFlowElement;
  readonly isSelected: boolean;
  readonly onSelect: (modifier: SelectionModifier) => void;
  readonly onMouseDown: (e: React.MouseEvent) => void;
  readonly surfaceWidth: number;
  readonly surfaceHeight: number;
  readonly clipPathId: string | null;
  readonly previewScale: number;
  readonly isInlineEditing: boolean;
  readonly onStartInlineTextEdit?: (elementId: string) => void;
  readonly onCommitInlineTextEdit?: (elementId: string, text: string) => void;
  readonly onCancelInlineTextEdit?: (elementId: string) => void;
}

export function ElementView({
  element,
  isSelected,
  onSelect,
  onMouseDown,
  surfaceWidth,
  surfaceHeight,
  clipPathId,
  previewScale,
  isInlineEditing,
  onStartInlineTextEdit,
  onCommitInlineTextEdit,
  onCancelInlineTextEdit,
}: ElementViewProps) {
  const rotation = element.rotation ?? 0;
  const opacity = element.visible ? element.opacity : 0.35;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${element.x}px`,
    top: `${element.y}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    zIndex: getElementZIndex(element),
    opacity,
    transform: `rotate(${rotation}deg)`,
    transformOrigin: "center center",
    cursor: "pointer",
    border: isSelected ? "2px solid #243b68" : "2px solid transparent",
    boxSizing: "border-box",
  };

  if (isSelected) {
    baseStyle.boxShadow = "0 0 0 2px rgba(36, 59, 104, 0.25)";
  }

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect(modifierFromEvent(event));
  };

  if (element.type === "pattern") {
    return (
      <PatternElementView
        element={element as CreationFlowPatternElement}
        surfaceWidth={surfaceWidth}
        surfaceHeight={surfaceHeight}
        clipPathId={clipPathId}
        previewScale={previewScale}
        isSelected={isSelected}
        onSelect={() => onSelect(NO_MODIFIER)}
      />
    );
  }

  if (element.type === "text") {
    const textElement = element as CreationFlowTextElement;
    if (isInlineEditing) {
      return (
        <div
          style={baseStyle}
          className="canvas-element-absolute canvas-element-inline-editing"
        >
          <InlineTextEditor
            element={textElement}
            onCommit={(text) => onCommitInlineTextEdit?.(element.id, text)}
            onCancel={() => onCancelInlineTextEdit?.(element.id)}
          />
        </div>
      );
    }
    return (
      <div
        style={baseStyle}
        onClick={handleClick}
        onMouseDown={onMouseDown}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onStartInlineTextEdit?.(element.id);
        }}
        className="canvas-element-absolute"
      >
        <TextElementView element={textElement} />
        {!element.visible && <span className="hidden-badge">hidden</span>}
      </div>
    );
  }

  if (element.type === "image") {
    return (
      <div
        style={baseStyle}
        onClick={handleClick}
        onMouseDown={onMouseDown}
        className="canvas-element-absolute"
      >
        <ImageElementView element={element as CreationFlowImageElement} />
        {!element.visible && <span className="hidden-badge">hidden</span>}
      </div>
    );
  }

  if (element.type === "shape") {
    return (
      <div
        style={baseStyle}
        onClick={handleClick}
        onMouseDown={onMouseDown}
        className="canvas-element-absolute"
      >
        <ShapeElementView element={element as CreationFlowShapeElement} />
        {!element.visible && <span className="hidden-badge">hidden</span>}
      </div>
    );
  }

  if (element.type === "group") {
    return (
      <div
        style={baseStyle}
        onClick={handleClick}
        onMouseDown={onMouseDown}
        className="canvas-element-absolute canvas-group"
      >
        <span className="group-label">Group ({element.children.length})</span>
        {!element.visible && <span className="hidden-badge">hidden</span>}
      </div>
    );
  }

  if (element.type === "variable") {
    return (
      <div
        style={baseStyle}
        onClick={handleClick}
        onMouseDown={onMouseDown}
        className="canvas-element-absolute"
      >
        <span className="variable-label">
          Variable: {(element as CreationFlowVariableElement).variableId.slice(0, 8)}
        </span>
        {!element.visible && <span className="hidden-badge">hidden</span>}
      </div>
    );
  }

  return null;
}
