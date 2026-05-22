import { useCallback, useEffect, useRef, useState } from "react";

import type { CreationFlowElement, CreationFlowSurface } from "@creationflow/schema";

import { ElementView } from "./ElementView.js";

interface DragState {
  readonly elementId: string;
  readonly startMouseX: number;
  readonly startMouseY: number;
  readonly startElemX: number;
  readonly startElemY: number;
  readonly startElemWidth: number;
  readonly startElemHeight: number;
  readonly mode: "move" | "resize";
}

interface SurfaceCanvasProps {
  readonly surface: CreationFlowSurface;
  readonly selectedElementId: string | null;
  readonly onSelectElement: (elementId: string) => void;
  readonly onUpdateElement: (elementId: string, patch: Partial<CreationFlowElement>) => void;
  readonly onDragStart?: () => void;
  readonly previewScale?: number;
}

export function SurfaceCanvas({
  surface,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDragStart,
  previewScale = 1,
}: SurfaceCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const sortedElements = [...surface.elements].sort((a, b) => a.zIndex - b.zIndex);

  const scaledWidth = surface.width * previewScale;
  const scaledHeight = surface.height * previewScale;

  const getDocCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left) / previewScale,
        y: (clientY - rect.top) / previewScale,
      };
    },
    [previewScale],
  );

  const handleElementMouseDown = useCallback(
    (elementId: string, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const element = surface.elements.find((el) => el.id === elementId);
      if (!element) return;

      onDragStart?.();

      const coords = getDocCoords(e.clientX, e.clientY);

      setDragState({
        elementId,
        startMouseX: coords.x,
        startMouseY: coords.y,
        startElemX: element.x,
        startElemY: element.y,
        startElemWidth: element.width,
        startElemHeight: element.height,
        mode: "move",
      });
    },
    [surface.elements, getDocCoords, onDragStart],
  );

  const handleResizeMouseDown = useCallback(
    (elementId: string, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const element = surface.elements.find((el) => el.id === elementId);
      if (!element) return;

      onDragStart?.();

      const coords = getDocCoords(e.clientX, e.clientY);

      setDragState({
        elementId,
        startMouseX: coords.x,
        startMouseY: coords.y,
        startElemX: element.x,
        startElemY: element.y,
        startElemWidth: Math.max(element.width, 10),
        startElemHeight: Math.max(element.height, 10),
        mode: "resize",
      });
    },
    [surface.elements, getDocCoords, onDragStart],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState) return;

      const coords = getDocCoords(e.clientX, e.clientY);
      const dx = coords.x - dragState.startMouseX;
      const dy = coords.y - dragState.startMouseY;

      if (dragState.mode === "move") {
        onUpdateElement(dragState.elementId, {
          x: dragState.startElemX + dx,
          y: dragState.startElemY + dy,
        });
      } else {
        onUpdateElement(dragState.elementId, {
          width: Math.max(dragState.startElemWidth + dx, 10),
          height: Math.max(dragState.startElemHeight + dy, 10),
        });
      }
    },
    [dragState, getDocCoords, onUpdateElement],
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = "";
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const selectedElement =
    selectedElementId
      ? surface.elements.find((el) => el.id === selectedElementId)
      : undefined;

  return (
    <div
      ref={canvasRef}
      className="surface-canvas"
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
      }}
    >
      {sortedElements.map((element) => (
        <ElementView
          key={element.id}
          element={element}
          isSelected={selectedElementId === element.id}
          onSelect={() => onSelectElement(element.id)}
          onMouseDown={(e) => handleElementMouseDown(element.id, e)}
          previewScale={previewScale}
        />
      ))}

      {selectedElement && selectedElementId && dragState?.mode !== "move" && (
        <div
          className="resize-handle"
          style={{
            left: `${selectedElement.x * previewScale + selectedElement.width * previewScale - 6}px`,
            top: `${selectedElement.y * previewScale + selectedElement.height * previewScale - 6}px`,
          }}
          onMouseDown={(e) => handleResizeMouseDown(selectedElementId, e)}
        />
      )}
    </div>
  );
}
