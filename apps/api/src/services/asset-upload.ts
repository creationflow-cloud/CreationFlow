import type { PrismaClient } from "@creationflow/database";
import type { StorageProvider } from "@creationflow/storage";
import sanitizeHtml from "sanitize-html";

import type { ApiAssetType } from "../mappers/asset-type.js";
import type { AssetDto } from "./assets.js";
import { createAsset } from "./assets.js";

export interface UploadAssetInput {
  readonly workspaceId: string;
  readonly type: ApiAssetType;
  readonly file: {
    readonly filename: string;
    readonly mimetype: string;
    readonly data: Uint8Array;
  };
}

export interface UploadAssetConfig {
  readonly maxUploadBytes: number;
}

const SVG_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "svg",
    "g",
    "defs",
    "symbol",
    "use",
    "path",
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "text",
    "tspan",
    "linearGradient",
    "radialGradient",
    "stop",
    "clipPath",
    "mask",
    "filter",
    "feGaussianBlur",
    "feOffset",
    "feMerge",
    "feMergeNode",
    "feFlood",
    "feComposite",
    "feColorMatrix",
    "title",
    "desc",
  ],
  allowedAttributes: {
    "*": ["id", "class", "style", "transform", "fill", "stroke", "opacity"],
    svg: ["viewBox", "width", "height", "xmlns", "version", "preserveAspectRatio"],
    path: ["d", "fill-rule", "clip-rule"],
    rect: ["x", "y", "width", "height", "rx", "ry"],
    circle: ["cx", "cy", "r"],
    ellipse: ["cx", "cy", "rx", "ry"],
    line: ["x1", "y1", "x2", "y2"],
    polyline: ["points"],
    polygon: ["points"],
    text: ["x", "y", "font-size", "font-family", "text-anchor", "font-weight"],
    lineargradient: ["x1", "y1", "x2", "y2", "gradientunits", "gradienttransform"],
    radialgradient: ["cx", "cy", "r", "fx", "fy", "gradientunits", "gradienttransform"],
    stop: ["offset", "stop-color", "stop-opacity"],
    clipPath: ["id"],
    mask: ["id"],
    filter: ["id", "x", "y", "width", "height", "filterUnits"],
    use: ["href", "xlink:href"],
  },
  allowedSchemes: ["data"],
  allowedSchemesByTag: {
    img: ["data"],
  },
  allowProtocolRelative: false,
  allowedIframeHostnames: [],
  disallowedTagsMode: "discard",
  // Forbid any tag attributes that could execute JavaScript or load external resources
  allowedSchemesAppliedToAttributes: ["href", "xlink:href"],
  transformTags: {
    // Force all anchors to be safe no-op
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
  // Disallow entire content blocks that could be script-like
  exclusiveFilter: (frame) =>
    Boolean(frame.tag === "script") || Boolean(frame.tag === "foreignObject"),
};

const MAX_TEXT_DECODER_BYTES = 10 * 1024 * 1024;

export function sanitizeSvg(data: Uint8Array): Uint8Array {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const raw =
    data.byteLength > MAX_TEXT_DECODER_BYTES
      ? decoder.decode(data.subarray(0, MAX_TEXT_DECODER_BYTES))
      : decoder.decode(data);

  const sanitized = sanitizeHtml(raw, SVG_SANITIZE_OPTIONS);

  const encoder = new TextEncoder();
  return encoder.encode(sanitized);
}

export async function uploadAsset(
  db: PrismaClient,
  storage: StorageProvider,
  input: UploadAssetInput,
  config: UploadAssetConfig,
): Promise<AssetDto> {
  if (!input.file.filename) {
    throw new Error("File name is required.");
  }

  if (!input.file.mimetype) {
    throw new Error("MIME type is required.");
  }

  if (input.file.data.byteLength > config.maxUploadBytes) {
    throw new Error(`File size exceeds maximum allowed size of ${config.maxUploadBytes} bytes.`);
  }

  const sanitizedData = input.type === "vector" ? sanitizeSvg(input.file.data) : input.file.data;

  const storageKey = crypto.randomUUID();
  const bucket = `assets/${input.workspaceId}`;

  await storage.putObject({
    bucket,
    key: storageKey,
    body: sanitizedData,
    contentType: input.file.mimetype,
  });

  const asset = await createAsset(db, {
    workspaceId: input.workspaceId,
    type: input.type,
    name: input.file.filename,
    source: storageKey,
    mimeType: input.file.mimetype,
    sizeBytes: sanitizedData.byteLength.toString(),
  });

  return asset;
}
