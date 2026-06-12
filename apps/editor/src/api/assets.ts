const BASE_URL = import.meta.env.VITE_CREATIONFLOW_API_URL ?? "http://localhost:3000";

import { get, getStoredApiKey } from "./client.js";

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

interface SignedAssetUrl {
  readonly signedUrl: string;
  readonly expiresAt: string;
}

const REFRESH_BUFFER_MS = 60_000;

interface CachedSignedUrl {
  readonly url: string;
  readonly expiresAtMs: number;
}

const signedUrlCache = new Map<string, CachedSignedUrl>();
const inflightSignedUrls = new Map<string, Promise<string>>();

function isCacheValid(cached: CachedSignedUrl, nowMs: number): boolean {
  return cached.expiresAtMs - REFRESH_BUFFER_MS > nowMs;
}

function joinWithBase(signedUrl: string): string {
  if (signedUrl.startsWith("http://") || signedUrl.startsWith("https://")) {
    return signedUrl;
  }
  return `${BASE_URL}${signedUrl}`;
}

export async function getAssetUrl(assetId: string): Promise<string> {
  if (!assetId) {
    return "";
  }

  const now = Date.now();
  const cached = signedUrlCache.get(assetId);
  if (cached && isCacheValid(cached, now)) {
    return cached.url;
  }

  const inflight = inflightSignedUrls.get(assetId);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    const { signedUrl, expiresAt } = await get<SignedAssetUrl>(`/assets/${assetId}/signed-url`);
    const fullUrl = joinWithBase(signedUrl);
    signedUrlCache.set(assetId, {
      url: fullUrl,
      expiresAtMs: new Date(expiresAt).getTime(),
    });
    return fullUrl;
  })();

  inflightSignedUrls.set(assetId, request);

  try {
    return await request;
  } finally {
    inflightSignedUrls.delete(assetId);
  }
}

export function clearAssetUrlCache(assetId?: string): void {
  if (assetId) {
    signedUrlCache.delete(assetId);
  } else {
    signedUrlCache.clear();
  }
}
