import { useState } from "react";

import type {
  AssetId,
  CreationFlowElement,
  CreationFlowPatternElement,
  CreationFlowTextAlign,
  CreationFlowTextElement,
  CreationFlowImageElement,
  CreationFlowShapeElement,
} from "@creationflow/schema";
import { getElementZIndex } from "@creationflow/core";

import { clamp } from "../helpers/element-properties.js";

interface ElementPropertiesProps {
  readonly element: CreationFlowElement;
  readonly onUpdate: (patch: Partial<CreationFlowElement>) => void;
  readonly onDelete: () => void;
  readonly onDuplicate: () => void;
  readonly onBringForward: () => void;
  readonly onSendBackward: () => void;
  readonly onBringToFront: () => void;
  readonly onSendToBack: () => void;
  readonly onMove: (dx: number, dy: number) => void;
  readonly onUploadAsset?: (file: File) => Promise<string>;
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="info-row">
      <label className="info-label" htmlFor={`prop-${label}`}>
        {label}
      </label>
      <input
        id={`prop-${label}`}
        className="info-input"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (!Number.isFinite(parsed)) {
            return;
          }

          onChange(min !== undefined && max !== undefined ? clamp(parsed, min, max) : parsed);
        }}
      />
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="info-row">
      <label className="info-label" htmlFor={`prop-${label}`}>
        {label}
      </label>
      <input
        id={`prop-${label}`}
        className="info-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="info-row">
      <label className="info-label" htmlFor={`prop-${label}`}>
        {label}
      </label>
      <input
        id={`prop-${label}`}
        className="info-checkbox"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}

function SelectInput<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="info-row">
      <label className="info-label" htmlFor={`prop-${label}`}>
        {label}
      </label>
      <select
        id={`prop-${label}`}
        className="info-select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ElementProperties({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onMove,
  onUploadAsset,
}: ElementPropertiesProps) {
  return (
    <div className="property-card">
      <h3>Element</h3>
      <div className="info-row">
        <span className="info-label">ID</span>
        <span className="info-value">{element.id}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Type</span>
        <span className="info-value">{element.type}</span>
      </div>

      <TextInput
        label="Name"
        value={element.name ?? ""}
        onChange={(name) => onUpdate({ name: name || undefined })}
      />
      {element.type !== "pattern" && (
        <>
          <NumberInput label="X" value={element.x} onChange={(x) => onUpdate({ x })} />
          <NumberInput label="Y" value={element.y} onChange={(y) => onUpdate({ y })} />
          <NumberInput
            label="Width"
            value={element.width}
            onChange={(width) => onUpdate({ width })}
            min={0}
          />
          <NumberInput
            label="Height"
            value={element.height}
            onChange={(height) => onUpdate({ height })}
            min={0}
          />
        </>
      )}
      <NumberInput
        label="Rotation"
        value={element.rotation}
        onChange={(rotation) => onUpdate({ rotation })}
        min={0}
        max={360}
        step={1}
      />
      <NumberInput
        label="Z-Index"
        value={getElementZIndex(element)}
        onChange={(zIndex) => onUpdate({ zIndex })}
      />
      <NumberInput
        label="Opacity"
        value={element.opacity}
        onChange={(opacity) => onUpdate({ opacity })}
        min={0}
        max={1}
        step={0.1}
      />
      <CheckboxInput
        label="Visible"
        checked={element.visible}
        onChange={(visible) => onUpdate({ visible })}
      />
      <CheckboxInput
        label="Locked"
        checked={element.locked}
        onChange={(locked) => onUpdate({ locked })}
      />

      {element.type === "text" && (
        <TextElementProperties element={element as CreationFlowTextElement} onUpdate={onUpdate} />
      )}

      {element.type === "image" && (
        <ImageElementProperties
          element={element as CreationFlowImageElement}
          onUpdate={onUpdate}
          onUploadAsset={onUploadAsset}
        />
      )}

      {element.type === "shape" && (
        <ShapeElementProperties element={element as CreationFlowShapeElement} onUpdate={onUpdate} />
      )}

      {element.type === "pattern" && (
        <PatternElementProperties
          element={element as CreationFlowPatternElement}
          onUpdate={onUpdate}
        />
      )}

      {element.type !== "pattern" && (
        <>
          <div className="element-actions-section">
            <h3>Actions</h3>
            <div className="action-buttons-grid">
              <button className="action-btn" type="button" onClick={onDuplicate}>
                Duplicate
              </button>
              <button className="action-btn danger" type="button" onClick={onDelete}>
                Delete
              </button>
              <button className="action-btn" type="button" onClick={onBringForward}>
                Bring forward
              </button>
              <button className="action-btn" type="button" onClick={onSendBackward}>
                Send backward
              </button>
              <button className="action-btn" type="button" onClick={onBringToFront}>
                Bring to front
              </button>
              <button className="action-btn" type="button" onClick={onSendToBack}>
                Send to back
              </button>
            </div>
          </div>

          <div className="position-controls-section">
            <h3>Quick Position</h3>
            <div className="position-controls">
              <button className="position-btn up" type="button" onClick={() => onMove(0, -5)}>
                ↑
              </button>
              <button className="position-btn left" type="button" onClick={() => onMove(-5, 0)}>
                ←
              </button>
              <button className="position-btn down" type="button" onClick={() => onMove(0, 5)}>
                ↓
              </button>
              <button className="position-btn right" type="button" onClick={() => onMove(5, 0)}>
                →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TextElementProperties({
  element,
  onUpdate,
}: {
  element: CreationFlowTextElement;
  onUpdate: (patch: Partial<CreationFlowElement>) => void;
}) {
  return (
    <>
      <TextInput
        label="Text"
        value={element.text}
        onChange={(text) => onUpdate({ text } as Partial<CreationFlowTextElement>)}
      />
      <TextInput
        label="Font Family"
        value={element.fontFamily}
        onChange={(fontFamily) => onUpdate({ fontFamily } as Partial<CreationFlowTextElement>)}
      />
      <NumberInput
        label="Font Size"
        value={element.fontSize}
        onChange={(fontSize) => onUpdate({ fontSize } as Partial<CreationFlowTextElement>)}
        min={1}
      />
      <TextInput
        label="Color"
        value={element.color}
        onChange={(color) => onUpdate({ color } as Partial<CreationFlowTextElement>)}
      />
      <SelectInput<CreationFlowTextAlign>
        label="Align"
        value={element.align}
        options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ]}
        onChange={(align) => onUpdate({ align } as Partial<CreationFlowTextElement>)}
      />
    </>
  );
}

function ImageElementProperties({
  element,
  onUpdate,
  onUploadAsset,
}: {
  element: CreationFlowImageElement;
  onUpdate: (patch: Partial<CreationFlowElement>) => void;
  onUploadAsset?: (file: File) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <>
      <TextInput
        label="Asset ID"
        value={element.assetId}
        onChange={(assetId) => onUpdate({ assetId } as Partial<CreationFlowImageElement>)}
      />
      <SelectInput<"contain" | "cover" | "fill">
        label="Fit"
        value={element.fit}
        options={[
          { value: "contain", label: "Contain" },
          { value: "cover", label: "Cover" },
          { value: "fill", label: "Fill" },
        ]}
        onChange={(fit) => onUpdate({ fit } as Partial<CreationFlowImageElement>)}
      />
      {onUploadAsset && (
        <div className="info-row">
          <label className="info-label" htmlFor="image-upload-input">
            Upload Image
          </label>
          <input
            id="image-upload-input"
            className="upload-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              setUploadError(null);
              try {
                const assetId = await onUploadAsset(file);
                onUpdate({ assetId } as Partial<CreationFlowImageElement>);
              } catch (err) {
                setUploadError(err instanceof Error ? err.message : String(err));
              } finally {
                setUploading(false);
                e.target.value = "";
              }
            }}
            disabled={uploading}
          />
        </div>
      )}
      {uploading && <p className="upload-status">Uploading...</p>}
      {uploadError && <p className="upload-status upload-error">{uploadError}</p>}
    </>
  );
}

function ShapeElementProperties({
  element,
  onUpdate,
}: {
  element: CreationFlowShapeElement;
  onUpdate: (patch: Partial<CreationFlowElement>) => void;
}) {
  return (
    <>
      <TextInput
        label="Fill"
        value={element.fill ?? ""}
        onChange={(fill) =>
          onUpdate({ fill: fill || undefined } as Partial<CreationFlowShapeElement>)
        }
      />
      <TextInput
        label="Stroke"
        value={element.stroke ?? ""}
        onChange={(stroke) =>
          onUpdate({ stroke: stroke || undefined } as Partial<CreationFlowShapeElement>)
        }
      />
      <NumberInput
        label="Stroke Width"
        value={element.strokeWidth ?? 0}
        onChange={(strokeWidth) =>
          onUpdate({
            strokeWidth: strokeWidth || undefined,
          } as Partial<CreationFlowShapeElement>)
        }
        min={0}
      />
    </>
  );
}

function PatternElementProperties({
  element,
  onUpdate,
}: {
  element: CreationFlowPatternElement;
  onUpdate: (patch: Partial<CreationFlowElement>) => void;
}) {
  return (
    <>
      <TextInput
        label="Asset ID"
        value={element.assetId}
        onChange={(assetId) => onUpdate({ assetId: assetId as AssetId } as Partial<CreationFlowPatternElement>)}
      />
      <SelectInput<"horizontal" | "vertical" | "both">
        label="Wiederholung"
        value={element.repeatMode}
        options={[
          { value: "both", label: "Beide (Grid)" },
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertikal" },
        ]}
        onChange={(repeatMode) => onUpdate({ repeatMode } as Partial<CreationFlowPatternElement>)}
      />
      <NumberInput
        label="Kachel Breite"
        value={element.tileWidth}
        onChange={(tileWidth) => onUpdate({ tileWidth } as Partial<CreationFlowPatternElement>)}
        min={1}
      />
      <NumberInput
        label="Kachel Höhe"
        value={element.tileHeight}
        onChange={(tileHeight) => onUpdate({ tileHeight } as Partial<CreationFlowPatternElement>)}
        min={1}
      />
      <NumberInput
        label="Abstand X"
        value={element.gapX}
        onChange={(gapX) => onUpdate({ gapX } as Partial<CreationFlowPatternElement>)}
        min={0}
      />
      <NumberInput
        label="Abstand Y"
        value={element.gapY}
        onChange={(gapY) => onUpdate({ gapY } as Partial<CreationFlowPatternElement>)}
        min={0}
      />
      <NumberInput
        label="Offset X"
        value={element.offsetX}
        onChange={(offsetX) => onUpdate({ offsetX } as Partial<CreationFlowPatternElement>)}
      />
      <NumberInput
        label="Offset Y"
        value={element.offsetY}
        onChange={(offsetY) => onUpdate({ offsetY } as Partial<CreationFlowPatternElement>)}
      />
      <NumberInput
        label="Drehung"
        value={element.rotation}
        onChange={(rotation) => onUpdate({ rotation } as Partial<CreationFlowPatternElement>)}
        min={0}
        max={360}
        step={1}
      />
      <NumberInput
        label="Deckkraft"
        value={element.opacity}
        onChange={(opacity) => onUpdate({ opacity } as Partial<CreationFlowPatternElement>)}
        min={0}
        max={1}
        step={0.1}
      />
      <TextInput
        label="Farbe"
        value={element.color ?? ""}
        onChange={(color) =>
          onUpdate({ color: color || undefined } as Partial<CreationFlowPatternElement>)
        }
      />
    </>
  );
}
