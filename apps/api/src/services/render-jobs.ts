import type { PrismaClient, Prisma, RenderJobStatus } from "@creationflow/database";

import { toApiRenderJobStatus, toDbRenderJobStatus } from "../mappers/render-job-status.js";
import type { ApiRenderJobStatus } from "../mappers/render-job-status.js";

export interface RenderJobDto {
  readonly id: string;
  readonly workspaceId: string;
  readonly configurationId?: string;
  readonly status: ApiRenderJobStatus;
  readonly output?: Record<string, unknown>;
  readonly errorMessage?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateRenderJobInput {
  readonly workspaceId: string;
  readonly configurationId?: string;
  readonly status?: ApiRenderJobStatus;
}

export interface UpdateRenderJobInput {
  readonly status?: ApiRenderJobStatus;
  readonly output?: Record<string, unknown>;
  readonly errorMessage?: string | null;
}

function toOutputValue(value: Prisma.JsonValue): Record<string, unknown> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function toRenderJobDto(job: {
  readonly id: string;
  readonly workspaceId: string;
  readonly configurationId: string | null;
  readonly status: string;
  readonly output: Prisma.JsonValue;
  readonly errorMessage: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}): RenderJobDto {
  return {
    id: job.id,
    workspaceId: job.workspaceId,
    configurationId: job.configurationId ?? undefined,
    status: toApiRenderJobStatus(job.status),
    output: toOutputValue(job.output),
    errorMessage: job.errorMessage ?? undefined,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export interface ListRenderJobsFilter {
  readonly workspaceId?: string;
  readonly configurationId?: string;
  readonly status?: ApiRenderJobStatus;
}

export async function listRenderJobs(
  db: PrismaClient,
  filter: ListRenderJobsFilter = {},
): Promise<RenderJobDto[]> {
  const where: {
    workspaceId?: string;
    configurationId?: string;
    status?: RenderJobStatus;
  } = {};

  if (filter.workspaceId) {
    where.workspaceId = filter.workspaceId;
  }

  if (filter.configurationId) {
    where.configurationId = filter.configurationId;
  }

  if (filter.status) {
    where.status = toDbRenderJobStatus(filter.status);
  }

  const jobs = await db.renderJob.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: {
      createdAt: "desc",
    },
  });

  return jobs.map(toRenderJobDto);
}

export async function createRenderJob(
  db: PrismaClient,
  input: CreateRenderJobInput,
): Promise<RenderJobDto> {
  const job = await db.renderJob.create({
    data: {
      workspaceId: input.workspaceId,
      configurationId: input.configurationId,
      status: input.status ? toDbRenderJobStatus(input.status) : "PENDING",
    },
  });

  return toRenderJobDto(job);
}

export async function getRenderJobById(db: PrismaClient, id: string): Promise<RenderJobDto | null> {
  const job = await db.renderJob.findUnique({
    where: {
      id,
    },
  });

  return job ? toRenderJobDto(job) : null;
}

export async function updateRenderJob(
  db: PrismaClient,
  id: string,
  patch: UpdateRenderJobInput,
): Promise<RenderJobDto | null> {
  const existing = await db.renderJob.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  const job = await db.renderJob.update({
    where: { id },
    data: {
      ...(patch.status !== undefined && { status: toDbRenderJobStatus(patch.status) }),
      ...(patch.output !== undefined && { output: patch.output as Prisma.InputJsonValue }),
      ...(patch.errorMessage !== undefined && { errorMessage: patch.errorMessage }),
    },
  });

  return toRenderJobDto(job);
}
