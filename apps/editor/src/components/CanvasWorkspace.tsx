import { useEffect, useRef } from "react";

import type { CreationFlowSurface, CreationFlowElement } from "@creationflow/schema";
import type { SelectionModifier, SelectionRect } from "../helpers/selection-helpers.js";
import { SurfaceCanvas } from "./SurfaceCanvas.js";
import { ZoomControls } from "./ZoomControls.js";
import type { UseZoomPanResult, ViewState } from "../helpers/use-zoom-pan.js";
import type { CanvasSettings } from "./CanvasSettingsPanel.js";

interface CanvasWorkspaceProps {
  readonly surface: CreationFlowSurface | undefined;
  readonly selectedElementIds: readonly string[];
  readonly onSelectElement: (elementId: string, modifier: SelectionModifier) => void;
  readonly onSelectElementsInRect: (rect: SelectionRect, modifier: SelectionModifier) => void;
  readonly onClearElementSelection: () => void;
  readonly onUpdateElements: (patches: ReadonlyMap<string, Partial<CreationFlowElement>>) => void;
  readonly onDragStart: () => void;
  readonly zoomPan: UseZoomPanResult;
  readonly onViewportSizeChange: (size: { width: number; height: number }) => void;
  readonly canvasSettings: CanvasSettings;
}

export function CanvasWorkspace({
  surface,
  selectedElementIds,
  onSelectElement,
  onSelectElementsInRect,
  onClearElementSelection,
  onUpdateElements,
  onDragStart,
  zoomPan,
  onViewportSizeChange,
  canvasSettings,
}: CanvasWorkspaceProps) {
  useEffect(() => {
    const el = zoomPan.containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        onViewportSizeChange({ width, height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [zoomPan.containerRef, onViewportSizeChange]);

  if (!surface) {
    return (
      <section className="canvas-stage" aria-label="Canvas area">
        <div className="canvas-placeholder">
          <h2>Canvas Area</h2>
          <p>Select a surface to start editing</p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={zoomPan.containerRef}
      className={`canvas-stage ${zoomPan.isSpacePressed ? "canvas-stage-pan-ready" : ""}`}
      aria-label="Canvas area"
    >
      <PanOverlay
        view={zoomPan.view}
        setView={zoomPan.setView}
        isSpacePressed={zoomPan.isSpacePressed}
      >
        <div
          className="canvas-content"
          style={{
            transform: `translate(${zoomPan.view.panX}px, ${zoomPan.view.panY}px) scale(${zoomPan.view.zoom})`,
            transformOrigin: "0 0",
            width: `${surface.width}px`,
            minHeight: `${surface.height}px`,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <div className="canvas-scroll-wrapper">
            <div className="canvas-surface-header">
              <span className="surface-name-label">{surface.name}</span>
              <span className="surface-dimensions">
                {surface.width} × {surface.height} {surface.unit}
              </span>
            </div>
            <SurfaceCanvas
              surface={surface}
              selectedElementIds={selectedElementIds}
              onSelectElement={onSelectElement}
              onSelectElementsInRect={onSelectElementsInRect}
              onClearElementSelection={onClearElementSelection}
              onUpdateElements={onUpdateElements}
              onDragStart={onDragStart}
              previewScale={1}
              canvasSettings={canvasSettings}
            />
          </div>
        </div>
      </PanOverlay>
      <ZoomControls
        view={zoomPan.view}
        onZoomIn={zoomPan.zoomIn}
        onZoomOut={zoomPan.zoomOut}
        onReset={zoomPan.resetView}
        onFit={zoomPan.fitToViewport}
      />
    </section>
  );
}

interface PanOverlayProps {
  readonly view: ViewState;
  readonly setView: (next: ViewState) => void;
  readonly isSpacePressed: boolean;
  readonly children: React.ReactNode;
}

function PanOverlay({ view, setView, isSpacePressed, children }: PanOverlayProps) {
  const dragState = useRef<{ startX: number; startY: number; originPanX: number; originPanY: number } | null>(null);

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      if (!dragState.current) return;
      const { startX, startY, originPanX, originPanY } = dragState.current;
      setView({
        ...view,
        panX: originPanX + (e.clientX - startX),
        panY: originPanY + (e.clientY - startY),
      });
    }
    function handleUp() {
      dragState.current = null;
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [view, setView]);

  return (
    <div
      className="canvas-pan-overlay"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        cursor: isSpacePressed ? (dragState.current ? "grabbing" : "grab") : "default",
        background: "transparent",
        zIndex: 0,
      }}
      onMouseDown={(event) => {
        if (!isSpacePressed) return;
        if (event.button !== 0) return;
        event.preventDefault();
        dragState.current = {
          startX: event.clientX,
          startY: event.clientY,
          originPanX: view.panX,
          originPanY: view.panY,
        };
      }}
      onWheel={(event) => {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
          const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
          const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
          const newZoom = Math.max(0.1, Math.min(8, view.zoom * factor));
          if (newZoom === view.zoom) return;
          const ratio = newZoom / view.zoom;
          setView({
            zoom: newZoom,
            panX: anchor.x - (anchor.x - view.panX) * ratio,
            panY: anchor.y - (anchor.y - view.panY) * ratio,
          });
        }
      }}
    >
      {children}
    </div>
  );
}
