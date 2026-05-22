import { describe, expect, it } from "vitest";

import { getRenderJobPdfOutput } from "./render-jobs.js";
import type { RenderJobDto } from "./render-jobs.js";

function createJob(output?: Record<string, unknown>): RenderJobDto {
  return {
    id: "job-1",
    workspaceId: "workspace-1",
    configurationId: "config-1",
    status: "done",
    output,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("getRenderJobPdfOutput", () => {
  it("returns PDF output metadata for valid render-job output", () => {
    const output = getRenderJobPdfOutput(
      createJob({
        assetId: "asset-1",
        downloadUrl: "/assets/asset-1/file",
        filename: "rendered.pdf",
        mimeType: "application/pdf",
        sizeBytes: "1234",
      }),
    );

    expect(output).toEqual({
      assetId: "asset-1",
      downloadUrl: "http://localhost:3000/assets/asset-1/file",
      filename: "rendered.pdf",
      mimeType: "application/pdf",
      sizeBytes: "1234",
    });
  });

  it("returns null for missing or invalid output", () => {
    expect(getRenderJobPdfOutput(null)).toBeNull();
    expect(getRenderJobPdfOutput(createJob())).toBeNull();
    expect(
      getRenderJobPdfOutput(
        createJob({
          assetId: "asset-1",
          downloadUrl: "/assets/asset-1/file",
          filename: "rendered.pdf",
          mimeType: "text/plain",
        }),
      ),
    ).toBeNull();
  });
});
