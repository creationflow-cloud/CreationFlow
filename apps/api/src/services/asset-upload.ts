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

export class SvgSanitizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SvgSanitizationError";
  }
}

export class PdfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfValidationError";
  }
}

const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const PDF_EOF = new Uint8Array([0x25, 0x25, 0x45, 0x4f, 0x46]); // %%EOF
const PDF_EOF_CR_LF = new Uint8Array([0x25, 0x25, 0x45, 0x4f, 0x46, 0x0d, 0x0a]);
const MAX_PDF_TAIL_SCAN = 1024;

function startsWithMagic(data: Uint8Array): boolean {
  if (data.byteLength < PDF_MAGIC.byteLength) return false;
  for (let i = 0; i < PDF_MAGIC.byteLength; i++) {
    if (data[i] !== PDF_MAGIC[i]) return false;
  }
  return true;
}

function endsWithSequence(haystack: Uint8Array, needle: Uint8Array): boolean {
  if (haystack.byteLength < needle.byteLength) return false;
  const offset = haystack.byteLength - needle.byteLength;
  for (let i = 0; i < needle.byteLength; i++) {
    if (haystack[offset + i] !== needle[i]) return false;
  }
  return true;
}

function endsWithEof(data: Uint8Array): boolean {
  if (data.byteLength < PDF_EOF.byteLength) return false;
  const tailStart = Math.max(0, data.byteLength - MAX_PDF_TAIL_SCAN);
  const tail = data.subarray(tailStart);
  if (endsWithSequence(tail, PDF_EOF_CR_LF)) return true;
  if (endsWithSequence(tail, PDF_EOF)) return true;
  return false;
}

export function validatePdf(data: Uint8Array): void {
  if (!startsWithMagic(data)) {
    throw new PdfValidationError("File is not a valid PDF: missing %PDF- header.");
  }
  if (!endsWithEof(data)) {
    throw new PdfValidationError("File is not a valid PDF: missing %%EOF trailer.");
  }
  if (data.byteLength < 200) {
    throw new PdfValidationError("File is too small to be a valid PDF.");
  }
}

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

  const sanitizedData =
    input.type === "vector"
      ? sanitizeSvg(input.file.data)
      : input.type === "pdf"
        ? (validatePdf(input.file.data), input.file.data)
        : input.file.data;

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
