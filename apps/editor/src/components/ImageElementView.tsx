import type { CreationFlowImageElement } from "@creationflow/schema";

import { getAssetUrl } from "../api/assets.js";

interface ImageElementViewProps {
  readonly element: CreationFlowImageElement;
}

export function ImageElementView({ element }: ImageElementViewProps) {
  const imageUrl = element.assetId ? getAssetUrl(element.assetId) : null;

  return (
    <div
      className="image-element-view"
      style={{
        objectFit: element.fit,
      }}
    >
      {imageUrl ? (
        <img
          key={element.assetId}
          src={imageUrl}
          alt={element.name ?? "Image"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: element.fit,
            display: "block",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="image-placeholder-label">
          {element.assetId ? `Image (${element.assetId.slice(0, 8)})` : "Image"}
        </span>
      )}
    </div>
  );
}
