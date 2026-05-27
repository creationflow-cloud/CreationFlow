import { useCallback, useEffect, useRef, useState, useId } from "react";

import type { CreationFlowElement, CreationFlowSurface } from "@creationflow/schema";
import { getElementZIndex } from "@creationflow/core";

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
  const clipPathId = useId();

  const sortedElements = [...surface.elements].sort(
    (a, b) => getElementZIndex(a) - getElementZIndex(b),
  );

  const scaledWidth = surface.width * previewScale;
  const scaledHeight = surface.height * previewScale;

  const isPathSurface = surface.shape === "path";
  const shouldClipPath = isPathSurface && surface.clipContent && surface.pathData;

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

  const selectedElement = selectedElementId
    ? surface.elements.find((el) => el.id === selectedElementId)
    : undefined;

  const surfaceRole = surface.role ?? "default";

  const getSurfaceStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: "relative",
      width: `${scaledWidth}px`,
      height: `${scaledHeight}px`,
      overflow: surface.clipContent ? "hidden" : "visible",
    };

    if (shouldClipPath) {
      baseStyle.background = "transparent";
      baseStyle.overflow = "visible";
    }

    return baseStyle;
  };

  const getElementLayerStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 1,
    };

    if (shouldClipPath) {
      baseStyle.clipPath = `url(#${clipPathId})`;
    }

    return baseStyle;
  };

  const renderSurfaceBackground = () => {
    if (!surface.pathData || surface.shape !== "path") {
      return null;
    }

    const shouldRenderFill = surface.fillColor &&
      (surface.role === "colorRegion" || surface.role === "overlay");

    const shouldRenderPathFill = surface.role === "designRegion";

    if (!shouldRenderFill && !shouldRenderPathFill) {
      return null;
    }

    const opacity = surface.role === "overlay" ? 0.5 : surface.role === "designRegion" ? 1.0 : 0.3;
    const fill = surface.role === "designRegion" ? "#ffffff" : surface.fillColor;

    return (
      <svg
        className="surface-background"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
          ...(shouldClipPath ? { clipPath: `url(#${clipPathId})` } : {}),
        }}
      >
        <path
          d={surface.pathData}
          fill={fill}
          fillOpacity={opacity}
        />
      </svg>
    );
  };

  const renderPathOverlay = () => {
    if (!isPathSurface || !surface.pathData) {
      return null;
    }

    const strokeColor = surface.role === "designRegion" ? "#243b68" : "none";
    const strokeWidth = surface.role === "designRegion" ? 2 : 0;
    const hasStroke = strokeWidth > 0;

    if (!hasStroke) {
      return null;
    }

    return (
      <svg
        className="surface-path-overlay"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <path
          d={surface.pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  };

  const renderClipPathDefinition = () => {
    if (!shouldClipPath) {
      return null;
    }

    return (
      <svg
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <defs>
          <clipPath
            id={clipPathId}
            clipPathUnits="userSpaceOnUse"
          >
            <path d={surface.pathData!} />
          </clipPath>
        </defs>
      </svg>
    );
  };

  return (
    <div
      ref={canvasRef}
      className="surface-canvas"
      style={getSurfaceStyle()}
    >
      {renderSurfaceBackground()}
      {renderPathOverlay()}
      {renderClipPathDefinition()}

      <div style={getElementLayerStyle()}>
        {sortedElements.map((element) => (
          <ElementView
            key={element.id}
            element={element}
            isSelected={selectedElementId === element.id}
            onSelect={() => onSelectElement(element.id)}
            onMouseDown={(e) => handleElementMouseDown(element.id, e)}
            surfaceWidth={surface.width}
            surfaceHeight={surface.height}
            clipPathId={shouldClipPath ? clipPathId : null}
            previewScale={previewScale}
          />
        ))}
      </div>

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
