import type { CreationFlowImageElement } from "@creationflow/schema";

interface ImageElementViewProps {
  readonly element: CreationFlowImageElement;
}

export function ImageElementView({ element }: ImageElementViewProps) {
  return (
    <div
      className="image-element-view"
      style={{
        objectFit: element.fit,
      }}
    >
      <span className="image-placeholder-label">
        {element.assetId ? `Image (${element.assetId.slice(0, 8)})` : "Image"}
      </span>
    </div>
  );
}
