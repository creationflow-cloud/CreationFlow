import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@creationflow/database";

import { InvalidRenderJobStatusTransitionError, updateRenderJob } from "./render-jobs.js";

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
