import type { CreationFlowImageCrop, CreationFlowImageElement } from "@creationflow/schema";

import { getAssetUrl } from "../api/assets.js";

interface ImageElementViewProps {
  readonly element: CreationFlowImageElement;
}

function isValidCrop(crop: CreationFlowImageCrop | undefined): crop is CreationFlowImageCrop {
  if (!crop) return false;
  if (!Number.isFinite(crop.x) || !Number.isFinite(crop.y)) return false;
  if (!Number.isFinite(crop.width) || !Number.isFinite(crop.height)) return false;
  if (crop.width <= 0 || crop.height <= 0) return false;
  if (crop.x < 0 || crop.y < 0) return false;
  return true;
}

function buildObjectPosition(crop: CreationFlowImageCrop): string {
  const centerX = crop.x + crop.width / 2;
  const centerY = crop.y + crop.height / 2;
  return `${centerX}% ${centerY}%`;
}

function buildObjectSize(crop: CreationFlowImageCrop): string {
  const scaleX = 100 / crop.width;
  const scaleY = 100 / crop.height;
  return `${scaleX * 100}% ${scaleY * 100}%`;
}

export function ImageElementView({ element }: ImageElementViewProps) {
  const imageUrl = element.assetId ? getAssetUrl(element.assetId) : null;
  const crop = isValidCrop(element.crop) ? element.crop : null;

  if (crop) {
    return (
      <div
        className="image-element-view image-element-view--cropped"
        style={{
          objectFit: element.fit,
          background: "#f0f4f8",
        }}
      >
        {imageUrl ? (
          <img
            key={element.assetId}
            src={imageUrl}
            alt={element.name ?? "Image"}
            style={{
              width: buildObjectSize(crop),
              height: "100%",
              objectFit: element.fit,
              objectPosition: buildObjectPosition(crop),
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
        <div className="image-crop-overlay" aria-hidden="true">
          <div className="image-crop-frame" style={{
            left: `${crop.x}%`,
            top: `${crop.y}%`,
            width: `${crop.width}%`,
            height: `${crop.height}%`,
          }} />
        </div>
      </div>
    );
  }

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
