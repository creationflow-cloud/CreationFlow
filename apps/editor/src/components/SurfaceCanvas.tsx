import type { CreationFlowElement, CreationFlowSurface } from "@creationflow/schema";

import { ElementView } from "./ElementView.js";

interface SurfaceCanvasProps {
  readonly surface: CreationFlowSurface;
  readonly selectedElementId: string | null;
  readonly onSelectElement: (elementId: string) => void;
  readonly previewScale?: number;
}

export function SurfaceCanvas({
  surface,
  selectedElementId,
  onSelectElement,
  previewScale = 1,
}: SurfaceCanvasProps) {
  const sortedElements = [...surface.elements].sort((a, b) => a.zIndex - b.zIndex);

  const scaledWidth = surface.width * previewScale;
  const scaledHeight = surface.height * previewScale;

  return (
    <div
      className="surface-canvas"
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
      }}
    >
      {sortedElements.map((element) => (
        <ScaledElementView
          key={element.id}
          element={element}
          isSelected={selectedElementId === element.id}
          onSelect={() => onSelectElement(element.id)}
          previewScale={previewScale}
        />
      ))}
    </div>
  );
}

function ScaledElementView({
  element,
  isSelected,
  onSelect,
  previewScale,
}: {
  readonly element: CreationFlowElement;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
  readonly previewScale: number;
}) {
  const scaledElement = scaleElement(element, previewScale);

  return <ElementView element={scaledElement} isSelected={isSelected} onSelect={onSelect} />;
}

function scaleElement(element: CreationFlowElement, scale: number): CreationFlowElement {
  return {
    ...element,
    x: element.x * scale,
    y: element.y * scale,
    width: element.width * scale,
    height: element.height * scale,
  } as CreationFlowElement;
}
