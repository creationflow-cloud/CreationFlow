import { get } from "./client.js";

export type RenderJobStatus = "pending" | "processing" | "done" | "failed";

export interface RenderJobDto {
  readonly id: string;
  readonly workspaceId: string;
  readonly configurationId?: string;
  readonly status: RenderJobStatus;
  readonly output?: Record<string, unknown>;
  readonly errorMessage?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListRenderJobsFilter {
  readonly workspaceId?: string;
  readonly configurationId?: string;
  readonly status?: RenderJobStatus;
}

export async function listRenderJobs(filter: ListRenderJobsFilter = {}): Promise<RenderJobDto[]> {
  const params = new URLSearchParams();

  if (filter.workspaceId) {
    params.set("workspaceId", filter.workspaceId);
  }

  if (filter.configurationId) {
    params.set("configurationId", filter.configurationId);
  }

  if (filter.status) {
    params.set("status", filter.status);
  }

  const query = params.toString();
  const path = query ? `/render-jobs?${query}` : "/render-jobs";

  return get<RenderJobDto[]>(path);
}
