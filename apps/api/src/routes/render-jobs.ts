import type { FastifyInstance } from "fastify";

import {
  createRenderJob,
  getRenderJobById,
  listRenderJobs,
  updateRenderJob,
} from "../services/render-jobs.js";
import { RenderJobNotFoundError, renderRenderJobToPdf } from "../services/render-job-renderer.js";
import { enqueueRenderJob } from "../services/render-job-queue.js";
import type { ApiRenderJobStatus } from "../mappers/render-job-status.js";
import { resolveMetrics } from "../plugins/metrics.js";
import { getChildLogger, redactSensitive } from "../plugins/logging.js";

const renderJobOutputSchema = {
  type: "object",
  properties: {
    assetId: { type: "string" },
    downloadUrl: { type: "string" },
    filename: { type: "string" },
    mimeType: { type: "string", const: "application/pdf" },
    sizeBytes: { type: "string" },
  },
} as const;

const renderJobSchema = {
  type: "object",
  required: ["id", "workspaceId", "status", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    workspaceId: { type: "string" },
    configurationId: { type: "string" },
    status: {
      type: "string",
      enum: ["pending", "processing", "done", "failed"],
    },
    output: renderJobOutputSchema,
    errorMessage: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

const errorSchema = {
  type: "object",
  required: ["status", "message"],
  properties: {
    status: { type: "string", const: "error" },
    message: { type: "string" },
  },
} as const;

interface RenderJobParams {
  readonly id: string;
}

interface CreateRenderJobBody {
  readonly workspaceId: string;
  readonly configurationId?: string;
  readonly status?: ApiRenderJobStatus;
}

interface UpdateRenderJobBody {
  readonly status?: ApiRenderJobStatus;
  readonly output?: Record<string, unknown>;
  readonly errorMessage?: string | null;
}

interface ListRenderJobsQuery {
  readonly workspaceId?: string;
  readonly configurationId?: string;
  readonly status?: ApiRenderJobStatus;
}

export async function registerRenderJobRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Querystring: ListRenderJobsQuery }>(
    "/render-jobs",
    {
      schema: {
        tags: ["RenderJobs"],
        summary: "List render jobs",
        querystring: {
          type: "object",
          properties: {
            workspaceId: { type: "string" },
            configurationId: { type: "string" },
            status: {
              type: "string",
              enum: ["pending", "processing", "done", "failed"],
            },
          },
        },
        response: {
          200: {
            type: "array",
            items: renderJobSchema,
          },
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return await listRenderJobs(server.db, {
          workspaceId: request.query.workspaceId,
          configurationId: request.query.configurationId,
          status: request.query.status,
        });
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to list render jobs.",
        });
      }
    },
  );

  server.post<{ Body: CreateRenderJobBody }>(
    "/render-jobs",
    {
      schema: {
        tags: ["RenderJobs"],
        summary: "Create render job",
        body: {
          type: "object",
          required: ["workspaceId"],
          additionalProperties: false,
          properties: {
            workspaceId: { type: "string" },
            configurationId: { type: "string" },
            status: {
              type: "string",
              enum: ["pending", "processing", "done", "failed"],
            },
          },
        },
        response: {
          201: renderJobSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const job = await createRenderJob(server.db, request.body);

        await enqueueRenderJob(job.id);

        return reply.code(201).send(job);
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to create render job.",
        });
      }
    },
  );

  server.post<{ Params: RenderJobParams }>(
    "/render-jobs/:id/render",
    {
      schema: {
        tags: ["RenderJobs"],
        summary: "Render job to PDF",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: renderJobSchema,
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const existing = await getRenderJobById(server.db, request.params.id);
        if (!existing) {
          return reply.code(404).send({
            status: "error",
            message: "Render job not found.",
          });
        }
        server.auth.enforceWorkspaceScope(existing.workspaceId);

        const logger = getChildLogger({
          requestId: request.requestId ?? "-",
          jobId: existing.id,
          workspaceId: existing.workspaceId,
          component: "render-jobs.route",
        });
        logger.info(
          redactSensitive({ event: "render.route.start", status: existing.status }),
          "render route triggered",
        );

        return await renderRenderJobToPdf(server.db, server.storage, request.params.id, {
          metrics: resolveMetrics(server),
          logger,
        });
      } catch (error) {
        server.log.error(error);

        if (error instanceof RenderJobNotFoundError) {
          return reply.code(404).send({
            status: "error",
            message: "Render job not found.",
          });
        }

        return reply.code(500).send({
          status: "error",
          message: "Unable to render job.",
        });
      }
    },
  );

  server.get<{ Params: RenderJobParams }>(
    "/render-jobs/:id",
    {
      schema: {
        tags: ["RenderJobs"],
        summary: "Get render job by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: renderJobSchema,
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const job = await getRenderJobById(server.db, request.params.id);

        if (!job) {
          return reply.code(404).send({
            status: "error",
            message: "Render job not found.",
          });
        }

        server.auth.enforceWorkspaceScope(job.workspaceId);

        return job;
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to get render job.",
        });
      }
    },
  );

  server.put<{ Params: RenderJobParams; Body: UpdateRenderJobBody }>(
    "/render-jobs/:id",
    {
      schema: {
        tags: ["RenderJobs"],
        summary: "Update render job",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            status: {
              type: "string",
              enum: ["pending", "processing", "done", "failed"],
            },
            output: { type: "object" },
            errorMessage: { type: ["string", "null"] },
          },
        },
        response: {
          200: renderJobSchema,
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const existing = await getRenderJobById(server.db, request.params.id);
        if (!existing) {
          return reply.code(404).send({
            status: "error",
            message: "Render job not found.",
          });
        }
        server.auth.enforceWorkspaceScope(existing.workspaceId);

        const job = await updateRenderJob(server.db, request.params.id, request.body);

        if (!job) {
          return reply.code(404).send({
            status: "error",
            message: "Render job not found.",
          });
        }

        return job;
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to update render job.",
        });
      }
    },
  );
}
