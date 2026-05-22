import type {
  CreationFlowElement,
  CreationFlowImageElement,
  CreationFlowShapeElement,
  CreationFlowTextElement,
  CreationFlowVariableElement,
} from "@creationflow/schema";

import { ImageElementView } from "./ImageElementView.js";
import { ShapeElementView } from "./ShapeElementView.js";
import { TextElementView } from "./TextElementView.js";

interface ElementViewProps {
  readonly element: CreationFlowElement;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
  readonly onMouseDown: (e: React.MouseEvent) => void;
  readonly previewScale?: number;
}

export function ElementView({ element, isSelected, onSelect, onMouseDown, previewScale = 1 }: ElementViewProps) {
  const rotation = element.rotation ?? 0;
  const opacity = element.visible ? element.opacity : 0.35;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${element.x}px`,
    top: `${element.y}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    zIndex: element.zIndex,
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

  if (element.type === "text") {
    return (
      <div
        style={baseStyle}
        onClick={onSelect}
        onMouseDown={onMouseDown}
        className="canvas-element-absolute"
      >
        <TextElementView element={element as CreationFlowTextElement} />
        {!element.visible && <span className="hidden-badge">hidden</span>}
      </div>
    );
  }

  if (element.type === "image") {
    return (
      <div
        style={baseStyle}
        onClick={onSelect}
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
        onClick={onSelect}
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
        onClick={onSelect}
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
        onClick={onSelect}
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
