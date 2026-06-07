import type { CreationFlowSurface, CreationFlowElement } from "@creationflow/schema";
import type { SelectionModifier, SelectionRect } from "../helpers/selection-helpers.js";
import { SurfaceCanvas } from "./SurfaceCanvas.js";

interface CanvasWorkspaceProps {
  readonly surface: CreationFlowSurface | undefined;
  readonly selectedElementIds: readonly string[];
  readonly onSelectElement: (elementId: string, modifier: SelectionModifier) => void;
  readonly onSelectElementsInRect: (rect: SelectionRect, modifier: SelectionModifier) => void;
  readonly onClearElementSelection: () => void;
  readonly onUpdateElements: (patches: ReadonlyMap<string, Partial<CreationFlowElement>>) => void;
  readonly onDragStart: () => void;
}

export function CanvasWorkspace({
  surface,
  selectedElementIds,
  onSelectElement,
  onSelectElementsInRect,
  onClearElementSelection,
  onUpdateElements,
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
          selectedElementIds={selectedElementIds}
          onSelectElement={onSelectElement}
          onSelectElementsInRect={onSelectElementsInRect}
          onClearElementSelection={onClearElementSelection}
          onUpdateElements={onUpdateElements}
          onDragStart={onDragStart}
        />
      </div>
    </section>
  );
}
