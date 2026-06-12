import { describe, expect, it } from "vitest";

import {
  ASSET_SIGNED_URL_TTL_SECONDS,
  generateAssetSignedUrl,
  verifyAssetSignedUrl,
} from "./signed-urls.js";

const SECRET = "test-signing-secret-must-be-long-enough";
const ASSET_ID = "asset-abc";
const WORKSPACE_ID = "ws-123";

describe("signed-urls", () => {
  it("builds a signed URL with expires and signature query params", () => {
    const nowMs = 1_700_000_000_000;
    const { signedUrl, expiresAt } = generateAssetSignedUrl(
      ASSET_ID,
      WORKSPACE_ID,
      SECRET,
      nowMs,
    );

    expect(signedUrl.startsWith(`/assets/${ASSET_ID}/file?`)).toBe(true);
    const url = new URL(signedUrl, "http://localhost");
    expect(url.searchParams.get("expires")).toBe(
      String(Math.floor(nowMs / 1000) + ASSET_SIGNED_URL_TTL_SECONDS),
    );
    expect(url.searchParams.get("signature")).toMatch(/^[a-f0-9]{64}$/);
    expect(expiresAt).toBe(
      (Number(url.searchParams.get("expires")) as number) * 1000,
    );
  });

  it("verifies a freshly generated signature", () => {
    const { signedUrl } = generateAssetSignedUrl(ASSET_ID, WORKSPACE_ID, SECRET);
    const url = new URL(signedUrl, "http://localhost");
    const valid = verifyAssetSignedUrl(
      ASSET_ID,
      WORKSPACE_ID,
      url.searchParams.get("expires") as string,
      url.searchParams.get("signature") as string,
      SECRET,
    );
    expect(valid).toBe(true);
  });

  it("rejects a signature signed with a different secret", () => {
    const { signedUrl } = generateAssetSignedUrl(
      ASSET_ID,
      WORKSPACE_ID,
      "other-secret-must-be-long-enough",
    );
    const url = new URL(signedUrl, "http://localhost");
    const valid = verifyAssetSignedUrl(
      ASSET_ID,
      WORKSPACE_ID,
      url.searchParams.get("expires") as string,
      url.searchParams.get("signature") as string,
      SECRET,
    );
    expect(valid).toBe(false);
  });

  it("rejects an expired signature", () => {
    const nowMs = 1_700_000_000_000;
    const { signedUrl, expiresAt } = generateAssetSignedUrl(
      ASSET_ID,
      WORKSPACE_ID,
      SECRET,
      nowMs,
      60,
    );
    const url = new URL(signedUrl, "http://localhost");
    const valid = verifyAssetSignedUrl(
      ASSET_ID,
      WORKSPACE_ID,
      url.searchParams.get("expires") as string,
      url.searchParams.get("signature") as string,
      SECRET,
      expiresAt + 1,
    );
    expect(valid).toBe(false);
  });

  it("rejects when the asset id does not match the signature", () => {
    const { signedUrl } = generateAssetSignedUrl(ASSET_ID, WORKSPACE_ID, SECRET);
    const url = new URL(signedUrl, "http://localhost");
    const valid = verifyAssetSignedUrl(
      "other-asset",
      WORKSPACE_ID,
      url.searchParams.get("expires") as string,
      url.searchParams.get("signature") as string,
      SECRET,
    );
    expect(valid).toBe(false);
  });

  it("rejects when the workspace id does not match the signature", () => {
    const { signedUrl } = generateAssetSignedUrl(ASSET_ID, WORKSPACE_ID, SECRET);
    const url = new URL(signedUrl, "http://localhost");
    const valid = verifyAssetSignedUrl(
      ASSET_ID,
      "other-workspace",
      url.searchParams.get("expires") as string,
      url.searchParams.get("signature") as string,
      SECRET,
    );
    expect(valid).toBe(false);
  });

  it("rejects malformed expires values", () => {
    const { signedUrl } = generateAssetSignedUrl(ASSET_ID, WORKSPACE_ID, SECRET);
    const url = new URL(signedUrl, "http://localhost");
    expect(
      verifyAssetSignedUrl(
        ASSET_ID,
        WORKSPACE_ID,
        "not-a-number",
        url.searchParams.get("signature") as string,
        SECRET,
      ),
    ).toBe(false);
  });

  it("rejects a malformed hex signature", () => {
    const { signedUrl } = generateAssetSignedUrl(ASSET_ID, WORKSPACE_ID, SECRET);
    const url = new URL(signedUrl, "http://localhost");
    expect(
      verifyAssetSignedUrl(
        ASSET_ID,
        WORKSPACE_ID,
        url.searchParams.get("expires") as string,
        "not-hex",
        SECRET,
      ),
    ).toBe(false);
  });

  it("rejects a signature with the wrong length", () => {
    const { signedUrl } = generateAssetSignedUrl(ASSET_ID, WORKSPACE_ID, SECRET);
    const url = new URL(signedUrl, "http://localhost");
    expect(
      verifyAssetSignedUrl(
        ASSET_ID,
        WORKSPACE_ID,
        url.searchParams.get("expires") as string,
        "abcd",
        SECRET,
      ),
    ).toBe(false);
  });
});
