import type { CreationFlowShapeElement } from "@creationflow/schema";

interface ShapeElementViewProps {
  readonly element: CreationFlowShapeElement;
}

export function ShapeElementView({ element }: ShapeElementViewProps) {
  const borderRadius =
    element.shapeType === "ellipse" ? "50%" : element.shapeType === "rect" ? "0" : "0";

  const isLine = element.shapeType === "line";

  return (
    <div
      className="shape-element-view"
      style={{
        background: isLine ? "transparent" : (element.fill ?? "transparent"),
        border: element.stroke
          ? `${element.strokeWidth ?? 1}px solid ${element.stroke}`
          : "1px solid #d9dee8",
        borderRadius,
        height: isLine ? `${element.strokeWidth ?? 1}px` : undefined,
      }}
    />
  );
}
