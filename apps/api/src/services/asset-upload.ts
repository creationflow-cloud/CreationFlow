import type { PrismaClient } from "@creationflow/database";
import type { StorageProvider } from "@creationflow/storage";

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

  // TODO: Implement SVG sanitization before storing SVG files.
  // Malicious SVG files can contain JavaScript or external entity references.
  // See: https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing

  // TODO: Implement PDF sanitization before storing PDF files.
  // PDF files can contain JavaScript, embedded files, or malicious actions.
  // Validate PDF structure and strip dangerous elements before storage.

  const storageKey = crypto.randomUUID();
  const bucket = `assets/${input.workspaceId}`;

  await storage.putObject({
    bucket,
    key: storageKey,
    body: input.file.data,
    contentType: input.file.mimetype,
  });

  const asset = await createAsset(db, {
    workspaceId: input.workspaceId,
    type: input.type,
    name: input.file.filename,
    source: storageKey,
    mimeType: input.file.mimetype,
    sizeBytes: input.file.data.byteLength.toString(),
  });

  return asset;
}
