const BASE_URL = import.meta.env.VITE_CREATIONFLOW_API_URL ?? "http://localhost:3000";

import { getStoredApiKey } from "./client.js";

export interface UploadAssetResponse {
  readonly id: string;
  readonly workspaceId: string;
  readonly type: "image" | "font" | "vector" | "pdf";
  readonly name: string;
  readonly source: string;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
  readonly sizeBytes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function uploadAsset(file: File, workspaceId: string): Promise<UploadAssetResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("workspaceId", workspaceId);
  formData.append("type", "image");

  const apiKey = getStoredApiKey();
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const response = await fetch(`${BASE_URL}/assets/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Upload failed." }));
    throw new Error(error.message ?? "Upload failed.");
  }

  return (await response.json()) as UploadAssetResponse;
}

export function getAssetUrl(assetId: string): string {
  return `${BASE_URL}/assets/${assetId}/file?t=${Date.now()}`;
}
