import { createHmac, timingSafeEqual } from "node:crypto";

export const ASSET_SIGNED_URL_TTL_SECONDS = 600;

export interface SignedAssetUrl {
  readonly signedUrl: string;
  readonly expiresAt: number;
}

function buildPayload(assetId: string, workspaceId: string, expires: number): string {
  return `${assetId}:${workspaceId}:${expires}`;
}

export function generateAssetSignedUrl(
  assetId: string,
  workspaceId: string,
  secret: string,
  nowMs: number = Date.now(),
  ttlSeconds: number = ASSET_SIGNED_URL_TTL_SECONDS,
): SignedAssetUrl {
  const expires = Math.floor(nowMs / 1000) + ttlSeconds;
  const payload = buildPayload(assetId, workspaceId, expires);
  const signature = createHmac("sha256", secret).update(payload).digest("hex");

  const params = new URLSearchParams({ expires: String(expires), signature });
  return {
    signedUrl: `/assets/${assetId}/file?${params.toString()}`,
    expiresAt: expires * 1000,
  };
}

export function verifyAssetSignedUrl(
  assetId: string,
  workspaceId: string,
  expiresRaw: string,
  signatureRaw: string,
  secret: string,
  nowMs: number = Date.now(),
): boolean {
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || !Number.isInteger(expires)) {
    return false;
  }

  const expiresMs = expires * 1000;
  if (nowMs >= expiresMs) {
    return false;
  }

  const payload = buildPayload(assetId, workspaceId, expires);
  const expected = createHmac("sha256", secret).update(payload).digest();

  let provided: Buffer;
  try {
    provided = Buffer.from(signatureRaw, "hex");
  } catch {
    return false;
  }

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}
