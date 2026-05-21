import type { RenderJobStatus } from "@creationflow/database";

export type ApiRenderJobStatus = "pending" | "processing" | "done" | "failed";

const TO_API_MAP: Record<string, ApiRenderJobStatus> = {
  PENDING: "pending",
  PROCESSING: "processing",
  DONE: "done",
  FAILED: "failed",
};

const TO_DB_MAP: Record<ApiRenderJobStatus, RenderJobStatus> = {
  pending: "PENDING",
  processing: "PROCESSING",
  done: "DONE",
  failed: "FAILED",
};

export function toApiRenderJobStatus(dbStatus: string): ApiRenderJobStatus {
  const apiStatus = TO_API_MAP[dbStatus];

  if (!apiStatus) {
    return "pending";
  }

  return apiStatus;
}

export function toDbRenderJobStatus(apiStatus: ApiRenderJobStatus): RenderJobStatus {
  return TO_DB_MAP[apiStatus] ?? "PENDING";
}
