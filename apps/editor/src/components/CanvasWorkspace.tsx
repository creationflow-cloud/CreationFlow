import type { CreationFlowSurface, CreationFlowElement } from "@creationflow/schema";
import { SurfaceCanvas } from "./SurfaceCanvas.js";

interface CanvasWorkspaceProps {
  readonly surface: CreationFlowSurface | undefined;
  readonly selectedElementId: string | null;
  readonly onSelectElement: (elementId: string) => void;
  readonly onUpdateElement: (elementId: string, patch: Partial<CreationFlowElement>) => void;
  readonly onDragStart: () => void;
}

export function CanvasWorkspace({
  surface,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDragStart,
}: CanvasWorkspaceProps) {
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
    <section className="canvas-stage" aria-label="Canvas area">
      <div className="canvas-scroll-wrapper">
        <div className="canvas-surface-header">
          <span className="surface-name-label">{surface.name}</span>
          <span className="surface-dimensions">
            {surface.width} × {surface.height} {surface.unit}
          </span>
        </div>
        <SurfaceCanvas
          surface={surface}
          selectedElementId={selectedElementId}
          onSelectElement={onSelectElement}
          onUpdateElement={onUpdateElement}
          onDragStart={onDragStart}
        />
      </div>
    </section>
  );
}
