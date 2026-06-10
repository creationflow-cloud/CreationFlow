import type { CreationFlowPatternElement } from "@creationflow/schema";
import { getAssetUrl } from "../api/assets.js";
import { BUILTIN_PATTERNS } from "./PatternGallery.js";

interface PatternElementViewProps {
  readonly element: CreationFlowPatternElement;
  readonly surfaceWidth: number;
  readonly surfaceHeight: number;
  readonly clipPathId: string | null;
  readonly previewScale: number;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}

function renderBuiltinPattern(
  patternId: string,
  tileW: number,
  tileH: number,
  color: string | undefined,
) {
  const fill = color || "#243b68";
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const quarterW = tileW / 4;
  const quarterH = tileH / 4;

  switch (patternId) {
    case "dots":
      return <circle cx={halfW} cy={halfH} r={quarterW} fill={fill} />;
    case "stripes":
      return <rect x={0} y={0} width={tileW} height={halfH} fill={fill} />;
    case "crosses":
      return (
        <path
          d={`M${halfW - quarterW * 0.3} ${quarterH} h${quarterW * 0.6} v${halfH - quarterH} h${halfW - quarterW * 0.3} v${quarterH * 0.6} h${-(halfW - quarterW * 0.3)} v${halfH - quarterH} h${-quarterW * 0.6} v${-(halfH - quarterH)} h${-(halfW - quarterW * 0.3)} v${-quarterH * 0.6} h${halfW - quarterW * 0.3} z`}
          fill={fill}
        />
      );
    case "diamonds":
      return (
        <path
          d={`M${halfW} 0 l${halfW} ${halfH} l${-halfW} ${halfH} l${-halfW} ${-halfH} z`}
          fill={fill}
        />
      );
    case "waves":
      return (
        <path
          d={`M0 ${halfH} c${quarterW} ${-halfH} ${quarterW * 3} ${-halfH} ${halfW} 0 s${quarterW * 3} ${halfH} ${halfW} 0`}
          stroke={fill}
          strokeWidth={Math.max(2, tileW * 0.1)}
          fill="none"
        />
      );
    case "zigzag":
      return (
        <path
          d={`M0 ${halfH} l${quarterW} ${-halfH * 0.8} l${quarterW} ${halfH * 0.8} l${quarterW} ${-halfH * 0.8} l${quarterW} ${halfH * 0.8}`}
          stroke={fill}
          strokeWidth={Math.max(2, tileW * 0.1)}
          fill="none"
        />
      );
    case "stars":
      return (
        <path
          d={`M${halfW} ${quarterH * 0.5} l${quarterW * 0.6} ${halfH * 0.5} h${halfW * 0.6} l${-halfW * 0.4} ${halfH * 0.35} l${halfW * 0.2} ${halfH * 0.5} l${-halfW * 0.45} ${-halfH * 0.25} l${-halfW * 0.45} ${halfH * 0.25} l${halfW * 0.2} ${-halfH * 0.5} l${-halfW * 0.4} ${-halfH * 0.35} h${halfW * 0.6} z`}
          fill={fill}
        />
      );
    case "circles":
      return (
        <circle
          cx={halfW}
          cy={halfH}
          r={halfW * 0.7}
          stroke={fill}
          strokeWidth={Math.max(2, tileW * 0.1)}
          fill="none"
        />
      );
    default:
      return <rect x={0} y={0} width={tileW} height={tileH} fill="#eef1f6" />;
  }
}

export function PatternElementView({
  element,
  surfaceWidth,
  surfaceHeight,
  clipPathId,
  previewScale,
  isSelected,
  onSelect,
}: PatternElementViewProps) {
  const builtinPattern = BUILTIN_PATTERNS.find((p) => p.id === element.assetId);
  const assetUrl = !builtinPattern && element.assetId ? getAssetUrl(element.assetId) : null;

  const scaledWidth = surfaceWidth * previewScale;
  const scaledHeight = surfaceHeight * previewScale;

  const tileW = element.tileWidth * previewScale;
  const tileH = element.tileHeight * previewScale;
  const gapX = element.gapX * previewScale;
  const gapY = element.gapY * previewScale;
  const offsetX = element.offsetX * previewScale;
  const offsetY = element.offsetY * previewScale;

  const patternW = element.repeatMode === "vertical" ? scaledWidth : tileW + gapX;
  const patternH = element.repeatMode === "horizontal" ? scaledHeight : tileH + gapY;

  const svgStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: element.locked ? "none" : "auto",
    zIndex: element.zIndex,
    opacity: element.opacity,
    cursor: isSelected ? "pointer" : "default",
    ...(clipPathId ? { clipPath: `url(#${clipPathId})` } : {}),
    outline: isSelected ? "2px solid #243b68" : "none",
    outlineOffset: "-2px",
  };

  return (
    <svg className="pattern-element" style={svgStyle} onClick={onSelect}>
      <defs>
        <pattern
          id={`pattern-${element.id}`}
          x={offsetX}
          y={offsetY}
          width={patternW}
          height={patternH}
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${element.rotation})`}
        >
          {builtinPattern ? (
            renderBuiltinPattern(builtinPattern.id, tileW, tileH, element.color)
          ) : assetUrl ? (
            <image
              href={assetUrl}
              x={0}
              y={0}
              width={tileW}
              height={tileH}
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <rect
              x={0}
              y={0}
              width={tileW}
              height={tileH}
              fill="#eef1f6"
              stroke="#d9dee8"
              strokeWidth={1}
            />
          )}
        </pattern>
      </defs>
      <rect
        x={0}
        y={0}
        width={scaledWidth}
        height={scaledHeight}
        fill={`url(#pattern-${element.id})`}
      />
    </svg>
  );
}
