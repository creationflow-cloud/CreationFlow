import { useCallback, useEffect, useRef, useState, useId } from "react";

import type {
  CreationFlowDocument,
  CreationFlowElement,
  CreationFlowSurface,
} from "@creationflow/schema";
import { getElementZIndex } from "@creationflow/core";
import type { RuleVariableValue } from "@creationflow/rules-engine";

import type { CanvasSettings } from "./CanvasSettingsPanel.js";
import {
  isElementSelected,
  makeSelectionRect,
  modifierFromEvent,
  rectIntersectsElement,
  type SelectionModifier,
  type SelectionRect,
} from "../helpers/selection-helpers.js";
import {
  calculateSnapForMove,
  type AlignmentGuide,
  type AlignmentGuides,
} from "../helpers/snap-helpers.js";

import { ElementView } from "./ElementView.js";
import { applyResize, MIN_DIMENSION, type ResizeDirection } from "./resize-math.js";

interface DragState {
  readonly elementId: string;
  readonly startMouseX: number;
  readonly startMouseY: number;
  readonly startPositions: ReadonlyMap<string, { x: number; y: number }>;
  readonly startSizes: ReadonlyMap<string, { width: number; height: number }>;
  readonly mode: "move" | "resize";
  readonly resizeDirection?: ResizeDirection;
  readonly aspectLocked?: boolean;
}

interface RubberBandState {
  readonly startDocX: number;
  readonly startDocY: number;
  readonly currentDocX: number;
  readonly currentDocY: number;
  readonly modifier: SelectionModifier;
}

interface SurfaceCanvasProps {
  readonly surface: CreationFlowSurface;
  readonly selectedElementIds: readonly string[];
  readonly onSelectElement: (elementId: string, modifier: SelectionModifier) => void;
  readonly onSelectElementsInRect: (rect: SelectionRect, modifier: SelectionModifier) => void;
  readonly onClearElementSelection: () => void;
  readonly onUpdateElements: (patches: ReadonlyMap<string, Partial<CreationFlowElement>>) => void;
  readonly onDragStart?: () => void;
  readonly previewScale?: number;
  readonly canvasSettings: CanvasSettings;
  readonly inlineEditingElementId?: string | null;
  readonly onStartInlineTextEdit?: (elementId: string) => void;
  readonly onCommitInlineTextEdit?: (elementId: string, text: string) => void;
  readonly onCancelInlineTextEdit?: (elementId: string) => void;
  readonly flowDocument: CreationFlowDocument;
  readonly variables: Readonly<Record<string, RuleVariableValue>>;
}

export function SurfaceCanvas({
  surface,
  selectedElementIds,
  onSelectElement,
  onSelectElementsInRect,
  onClearElementSelection,
  onUpdateElements,
  onDragStart,
  previewScale = 1,
  canvasSettings,
  inlineEditingElementId = null,
  onStartInlineTextEdit,
  onCommitInlineTextEdit,
  onCancelInlineTextEdit,
  flowDocument,
  variables,
}: SurfaceCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [rubberBand, setRubberBand] = useState<RubberBandState | null>(null);
  const [snapGuides, setSnapGuides] = useState<AlignmentGuides | null>(null);
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
      if (inlineEditingElementId === elementId) return;
      e.preventDefault();
      e.stopPropagation();

      const element = surface.elements.find((el) => el.id === elementId);
      if (!element) return;

      const modifier = modifierFromEvent(e);
      onSelectElement(elementId, modifier);

      const targetIds = (() => {
        if (modifier.additive && selectedElementIds.includes(elementId)) {
          return selectedElementIds;
        }
        if (modifier.additive) {
          return Array.from(new Set([...selectedElementIds, elementId]));
        }
        return [elementId];
      })();

      const startPositions = new Map<string, { x: number; y: number }>();
      const startSizes = new Map<string, { width: number; height: number }>();
      for (const id of targetIds) {
        const el = surface.elements.find((entry) => entry.id === id);
        if (!el) continue;
        startPositions.set(id, { x: el.x, y: el.y });
        startSizes.set(id, { width: Math.max(el.width, 10), height: Math.max(el.height, 10) });
      }

      onDragStart?.();

      const coords = getDocCoords(e.clientX, e.clientY);

      setDragState({
        elementId,
        startMouseX: coords.x,
        startMouseY: coords.y,
        startPositions,
        startSizes,
        mode: "move",
      });
      setSnapGuides(null);
    },
    [surface.elements, getDocCoords, onDragStart, onSelectElement, selectedElementIds],
  );

  const handleResizeMouseDown = useCallback(
    (elementId: string, direction: ResizeDirection, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      const element = surface.elements.find((el) => el.id === elementId);
      if (!element) return;

      onDragStart?.();

      const coords = getDocCoords(e.clientX, e.clientY);

      const startPositions = new Map<string, { x: number; y: number }>();
      const startSizes = new Map<string, { width: number; height: number }>();
      startPositions.set(elementId, { x: element.x, y: element.y });
      startSizes.set(elementId, {
        width: Math.max(element.width, MIN_DIMENSION),
        height: Math.max(element.height, MIN_DIMENSION),
      });

      setDragState({
        elementId,
        startMouseX: coords.x,
        startMouseY: coords.y,
        startPositions,
        startSizes,
        mode: "resize",
        resizeDirection: direction,
        aspectLocked: e.shiftKey,
      });
      setSnapGuides(null);
    },
    [surface.elements, getDocCoords, onDragStart],
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (e.target !== canvasRef.current) return;
      const modifier = modifierFromEvent(e);
      if (!modifier.additive) {
        onClearElementSelection();
      }
      const coords = getDocCoords(e.clientX, e.clientY);
      setRubberBand({
        startDocX: coords.x,
        startDocY: coords.y,
        currentDocX: coords.x,
        currentDocY: coords.y,
        modifier,
      });
    },
    [getDocCoords, onClearElementSelection],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragState) {
        const coords = getDocCoords(e.clientX, e.clientY);
        const dx = coords.x - dragState.startMouseX;
        const dy = coords.y - dragState.startMouseY;
        const patches = new Map<string, Partial<CreationFlowElement>>();

        if (dragState.mode === "move") {
          const primaryStart = dragState.startPositions.get(dragState.elementId);
          const primarySize = dragState.startSizes.get(dragState.elementId) ?? {
            width: 10,
            height: 10,
          };

          if (primaryStart) {
            const proposedX = primaryStart.x + dx;
            const proposedY = primaryStart.y + dy;
            const primaryElement: CreationFlowElement = {
              id: dragState.elementId as unknown as CreationFlowElement["id"],
              type: "shape",
              x: proposedX,
              y: proposedY,
              width: primarySize.width,
              height: primarySize.height,
              rotation: 0,
              opacity: 1,
              visible: true,
              locked: false,
              zIndex: 0,
              shapeType: "rect",
            } as CreationFlowElement;

            const snapEnabled = canvasSettings.snapToGrid || canvasSettings.showAlignmentGuides;

            if (snapEnabled) {
              const snap = calculateSnapForMove({
                surface,
                movingElement: primaryElement,
                movingElementIds: Array.from(dragState.startPositions.keys()),
                proposedX,
                proposedY,
                options: {
                  threshold: canvasSettings.snapThreshold,
                  snapToGrid: canvasSettings.snapToGrid,
                  gridSize: canvasSettings.gridSize,
                },
              });
              const adjustedDx = snap.x - primaryStart.x;
              const adjustedDy = snap.y - primaryStart.y;
              for (const [id, start] of dragState.startPositions.entries()) {
                patches.set(id, { x: start.x + adjustedDx, y: start.y + adjustedDy });
              }
              setSnapGuides(
                canvasSettings.showAlignmentGuides &&
                  (snap.guides.vertical.length > 0 || snap.guides.horizontal.length > 0)
                  ? snap.guides
                  : null,
              );
            } else {
              for (const [id, start] of dragState.startPositions.entries()) {
                patches.set(id, { x: start.x + dx, y: start.y + dy });
              }
              setSnapGuides(null);
            }
          } else {
            for (const [id, start] of dragState.startPositions.entries()) {
              patches.set(id, { x: start.x + dx, y: start.y + dy });
            }
            setSnapGuides(null);
          }
        } else if (dragState.elementId && dragState.resizeDirection) {
          const start = dragState.startPositions.get(dragState.elementId);
          const size = dragState.startSizes.get(dragState.elementId) ?? {
            width: MIN_DIMENSION,
            height: MIN_DIMENSION,
          };
          if (start) {
            const next = applyResize(
              { x: start.x, y: start.y, width: size.width, height: size.height },
              dragState.resizeDirection,
              dx,
              dy,
              dragState.aspectLocked === true,
            );
            patches.set(dragState.elementId, next);
          }
          setSnapGuides(null);
        }
        onUpdateElements(patches);
        return;
      }
      if (rubberBand) {
        const coords = getDocCoords(e.clientX, e.clientY);
        setRubberBand((prev) =>
          prev ? { ...prev, currentDocX: coords.x, currentDocY: coords.y } : prev,
        );
      }
    },
    [dragState, rubberBand, getDocCoords, onUpdateElements, surface, canvasSettings],
  );

  const handleMouseUp = useCallback(() => {
    if (rubberBand) {
      const rect = makeSelectionRect(
        rubberBand.startDocX,
        rubberBand.startDocY,
        rubberBand.currentDocX,
        rubberBand.currentDocY,
      );
      const width = rect.maxX - rect.minX;
      const height = rect.maxY - rect.minY;
      if (width > 2 || height > 2) {
        const hits = surface.elements.filter((el) => rectIntersectsElement(rect, el));
        if (hits.length > 0) {
          onSelectElementsInRect(rect, rubberBand.modifier);
        }
      }
      setRubberBand(null);
    }
    setDragState(null);
    setSnapGuides(null);
  }, [rubberBand, surface.elements, onSelectElementsInRect]);

  useEffect(() => {
    if (dragState || rubberBand) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = "";
      };
    }
  }, [dragState, rubberBand, handleMouseMove, handleMouseUp]);

  const singleSelected =
    selectedElementIds.length === 1
      ? surface.elements.find((el) => el.id === selectedElementIds[0])
      : undefined;
  const primarySelectedId = selectedElementIds[0] ?? null;

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

    const shouldRenderFill =
      surface.fillColor && (surface.role === "colorRegion" || surface.role === "overlay");

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
        <path d={surface.pathData} fill={fill} fillOpacity={opacity} />
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
        <path d={surface.pathData} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
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
          <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
            <path d={surface.pathData!} />
          </clipPath>
        </defs>
      </svg>
    );
  };

  const renderRubberBand = () => {
    if (!rubberBand) return null;
    const left = Math.min(rubberBand.startDocX, rubberBand.currentDocX) * previewScale;
    const top = Math.min(rubberBand.startDocY, rubberBand.currentDocY) * previewScale;
    const width = Math.abs(rubberBand.currentDocX - rubberBand.startDocX) * previewScale;
    const height = Math.abs(rubberBand.currentDocY - rubberBand.startDocY) * previewScale;
    return (
      <div
        className="surface-rubber-band"
        style={{
          position: "absolute",
          left,
          top,
          width,
          height,
          border: "1px solid #243b68",
          background: "rgba(36, 59, 104, 0.08)",
          pointerEvents: "none",
          zIndex: 9999,
        }}
      />
    );
  };

  const renderSnapGuides = () => {
    if (!snapGuides) return null;
    return (
      <div className="surface-snap-guides" aria-hidden="true">
        {snapGuides.vertical.map((guide: AlignmentGuide, index) => (
          <div
            key={`v-${guide.targetElementId}-${index}`}
            className="snap-guide snap-guide-vertical"
            style={{
              position: "absolute",
              left: guide.position * previewScale,
              top: 0,
              bottom: 0,
              width: "1px",
              background: "#ff3b6b",
              boxShadow: "0 0 0 0.5px rgba(255, 59, 107, 0.5)",
              pointerEvents: "none",
              zIndex: 9998,
            }}
          />
        ))}
        {snapGuides.horizontal.map((guide: AlignmentGuide, index) => (
          <div
            key={`h-${guide.targetElementId}-${index}`}
            className="snap-guide snap-guide-horizontal"
            style={{
              position: "absolute",
              top: guide.position * previewScale,
              left: 0,
              right: 0,
              height: "1px",
              background: "#ff3b6b",
              boxShadow: "0 0 0 0.5px rgba(255, 59, 107, 0.5)",
              pointerEvents: "none",
              zIndex: 9998,
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      className="surface-canvas"
      style={getSurfaceStyle()}
      onMouseDown={handleCanvasMouseDown}
    >
      {renderSurfaceBackground()}
      {renderPathOverlay()}
      {renderClipPathDefinition()}

      <div style={getElementLayerStyle()}>
        {sortedElements.map((element) => (
          <ElementView
            key={element.id}
            element={element}
            isSelected={isElementSelected(element.id, {
              selectedPageId: null,
              selectedSurfaceId: null,
              selectedElementIds,
            })}
            onSelect={(modifier) => onSelectElement(element.id, modifier)}
            onMouseDown={(e) => handleElementMouseDown(element.id, e)}
            surfaceWidth={surface.width}
            surfaceHeight={surface.height}
            clipPathId={shouldClipPath ? clipPathId : null}
            previewScale={previewScale}
            isInlineEditing={inlineEditingElementId === element.id}
            onStartInlineTextEdit={onStartInlineTextEdit}
            onCommitInlineTextEdit={onCommitInlineTextEdit}
            onCancelInlineTextEdit={onCancelInlineTextEdit}
            document={flowDocument}
            variables={variables}
          />
        ))}
      </div>

      {singleSelected && primarySelectedId && dragState?.mode !== "move" && (
        <ResizeHandles
          element={singleSelected}
          scale={previewScale}
          onResizeStart={(direction, e) => handleResizeMouseDown(primarySelectedId, direction, e)}
        />
      )}

      {renderRubberBand()}
      {renderSnapGuides()}
    </div>
  );
}

interface ResizeHandlesProps {
  readonly element: CreationFlowElement;
  readonly scale: number;
  readonly onResizeStart: (direction: ResizeDirection, e: React.MouseEvent<HTMLDivElement>) => void;
}

type ResizeHandlePosition = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const RESIZE_DIRECTIONS: ReadonlyArray<{
  readonly direction: ResizeHandlePosition;
  readonly cursor: string;
  readonly side: ResizeHandlePosition;
}> = [
  { direction: "nw", cursor: "nwse-resize", side: "nw" },
  { direction: "n", cursor: "ns-resize", side: "n" },
  { direction: "ne", cursor: "nesw-resize", side: "ne" },
  { direction: "e", cursor: "ew-resize", side: "e" },
  { direction: "se", cursor: "nwse-resize", side: "se" },
  { direction: "s", cursor: "ns-resize", side: "s" },
  { direction: "sw", cursor: "nesw-resize", side: "sw" },
  { direction: "w", cursor: "ew-resize", side: "w" },
];

function ResizeHandles({ element, scale, onResizeStart }: ResizeHandlesProps) {
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: `${element.x * scale}px`,
    top: `${element.y * scale}px`,
    width: `${element.width * scale}px`,
    height: `${element.height * scale}px`,
    pointerEvents: "none",
    zIndex: 9999,
  };

  return (
    <div className="resize-handles" style={containerStyle} aria-hidden="true">
      <div
        className="resize-selection-outline"
        style={{
          position: "absolute",
          inset: 0,
          border: "1px solid var(--color-primary)",
          pointerEvents: "none",
        }}
      />
      {RESIZE_DIRECTIONS.map((handle) => {
        const offset = -6;
        const style: React.CSSProperties = {
          position: "absolute",
          width: 12,
          height: 12,
          borderRadius: 2,
          background: "var(--color-primary)",
          border: "2px solid var(--color-bg-white)",
          cursor: handle.cursor,
          pointerEvents: "auto",
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.2)",
        };
        switch (handle.side) {
          case "nw":
            style.left = offset;
            style.top = offset;
            break;
          case "n":
            style.left = "50%";
            style.top = offset;
            style.transform = "translateX(-50%)";
            break;
          case "ne":
            style.right = offset;
            style.top = offset;
            break;
          case "e":
            style.right = offset;
            style.top = "50%";
            style.transform = "translateY(-50%)";
            break;
          case "se":
            style.right = offset;
            style.bottom = offset;
            break;
          case "s":
            style.left = "50%";
            style.bottom = offset;
            style.transform = "translateX(-50%)";
            break;
          case "sw":
            style.left = offset;
            style.bottom = offset;
            break;
          case "w":
            style.left = offset;
            style.top = "50%";
            style.transform = "translateY(-50%)";
            break;
        }
        return (
          <div
            key={handle.direction}
            className={`resize-handle resize-handle-${handle.direction}`}
            style={style}
            data-resize-direction={handle.direction}
            onMouseDown={(e) => onResizeStart(handle.direction, e)}
          />
        );
      })}
    </div>
  );
}
