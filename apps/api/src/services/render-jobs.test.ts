import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@creationflow/database";

import { InvalidRenderJobStatusTransitionError, recordRenderJobAttempt, updateRenderJob } from "./render-jobs.js";

function createFakeDb(status: string) {
  const state = {
    job: {
      id: "job-1",
      workspaceId: "workspace-1",
      configurationId: "config-1",
      status,
      output: null,
      errorMessage: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  };

  const db = {
    renderJob: {
      findUnique: async () => state.job,
      update: async ({ data }: { data: Partial<typeof state.job> }) => {
        state.job = {
          ...state.job,
          ...data,
          updatedAt: new Date("2026-01-01T00:00:01.000Z"),
        };

        return state.job;
      },
    },
  };

  return { db: db as unknown as PrismaClient, state };
}

describe("render job status transitions", () => {
  it("allows pending to processing", async () => {
    const { db } = createFakeDb("PENDING");

    const result = await updateRenderJob(db, "job-1", { status: "processing" });

    expect(result?.status).toBe("processing");
  });

  it("allows processing to done", async () => {
    const { db } = createFakeDb("PROCESSING");

    const result = await updateRenderJob(db, "job-1", { status: "done" });

    expect(result?.status).toBe("done");
  });

  it("prevents pending to done", async () => {
    const { db } = createFakeDb("PENDING");

    await expect(updateRenderJob(db, "job-1", { status: "done" })).rejects.toBeInstanceOf(
      InvalidRenderJobStatusTransitionError,
    );
  });

  it("prevents terminal jobs from being reset", async () => {
    const { db } = createFakeDb("DONE");

    await expect(updateRenderJob(db, "job-1", { status: "processing" })).rejects.toBeInstanceOf(
      InvalidRenderJobStatusTransitionError,
    );
  });

  it("allows error messages when moving to failed", async () => {
    const { db } = createFakeDb("PROCESSING");

    const result = await updateRenderJob(db, "job-1", {
      status: "failed",
      errorMessage: "Renderer crashed.",
    });

    expect(result?.status).toBe("failed");
    expect(result?.errorMessage).toBe("Renderer crashed.");
  });
});

describe("recordRenderJobAttempt", () => {
  it("increments the attempt counter and surfaces error metadata", async () => {
    const { db, state } = createFakeDb("PROCESSING");

    const result = await recordRenderJobAttempt(db, "job-1", {
      errorCode: "asset_resolve_failed",
      transient: true,
      errorMessage: "Storage was unreachable.",
    });

    expect(result?.attempts).toBe(1);
    expect(result?.errorCode).toBe("asset_resolve_failed");
    expect(result?.transient).toBe(true);
    expect(result?.errorMessage).toBe("Storage was unreachable.");
    expect(state.job.errorMessage).toBe("Storage was unreachable.");
  });

  it("preserves prior output and only patches attempt-related fields", async () => {
    const { db, state } = createFakeDb("PROCESSING");
    state.job.output = { filename: "out.pdf", assetId: "asset-1" };

    const result = await recordRenderJobAttempt(db, "job-1", {
      errorCode: "render_failed",
      transient: false,
    });

    expect(result?.attempts).toBe(1);
    expect(result?.output?.filename).toBe("out.pdf");
    expect(result?.output?.assetId).toBe("asset-1");
    expect(result?.output?.errorCode).toBe("render_failed");
  });
});
