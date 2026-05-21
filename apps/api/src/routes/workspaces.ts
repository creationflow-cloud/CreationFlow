import type { FastifyInstance } from "fastify";

import { createWorkspace, getWorkspaceById, listWorkspaces } from "../services/workspaces.js";

const workspaceSchema = {
  type: "object",
  required: ["id", "name", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
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

interface WorkspaceParams {
  readonly id: string;
}

interface CreateWorkspaceBody {
  readonly name: string;
}

export async function registerWorkspaceRoutes(server: FastifyInstance): Promise<void> {
  server.get(
    "/workspaces",
    {
      schema: {
        tags: ["Workspaces"],
        summary: "List workspaces",
        response: {
          200: {
            type: "array",
            items: workspaceSchema,
          },
          500: errorSchema,
        },
      },
    },
    async (_request, reply) => {
      try {
        return await listWorkspaces(server.db);
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to list workspaces.",
        });
      }
    },
  );

  server.post<{ Body: CreateWorkspaceBody }>(
    "/workspaces",
    {
      schema: {
        tags: ["Workspaces"],
        summary: "Create workspace",
        body: {
          type: "object",
          required: ["name"],
          additionalProperties: false,
          properties: {
            name: {
              type: "string",
              minLength: 1,
              maxLength: 120,
            },
          },
        },
        response: {
          201: workspaceSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const workspace = await createWorkspace(server.db, request.body);

        return reply.code(201).send(workspace);
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to create workspace.",
        });
      }
    },
  );

  server.get<{ Params: WorkspaceParams }>(
    "/workspaces/:id",
    {
      schema: {
        tags: ["Workspaces"],
        summary: "Get workspace by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: workspaceSchema,
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const workspace = await getWorkspaceById(server.db, request.params.id);

        if (!workspace) {
          return reply.code(404).send({
            status: "error",
            message: "Workspace not found.",
          });
        }

        return workspace;
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to get workspace.",
        });
      }
    },
  );
}
