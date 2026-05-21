import type { FastifyInstance } from "fastify";

import {
  createConfiguration,
  getConfigurationById,
  listConfigurations,
  updateConfiguration,
} from "../services/configurations.js";
import type { ApiConfigurationStatus } from "../services/configurations.js";

const configurationSchema = {
  type: "object",
  required: ["id", "workspaceId", "document", "status", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    workspaceId: { type: "string" },
    productId: { type: "string" },
    templateId: { type: "string" },
    document: { type: "object" },
    status: {
      type: "string",
      enum: ["draft", "cart", "ordered", "archived"],
    },
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

interface ConfigurationParams {
  readonly id: string;
}

interface CreateConfigurationBody {
  readonly workspaceId: string;
  readonly productId?: string;
  readonly templateId?: string;
  readonly document: Record<string, unknown>;
  readonly status?: ApiConfigurationStatus;
}

interface UpdateConfigurationBody {
  readonly document?: Record<string, unknown>;
  readonly status?: ApiConfigurationStatus;
}

interface ListConfigurationsQuery {
  readonly workspaceId?: string;
}

export async function registerConfigurationRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Querystring: ListConfigurationsQuery }>(
    "/configurations",
    {
      schema: {
        tags: ["Configurations"],
        summary: "List configurations",
        querystring: {
          type: "object",
          properties: {
            workspaceId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "array",
            items: configurationSchema,
          },
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return await listConfigurations(server.db, request.query.workspaceId);
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to list configurations.",
        });
      }
    },
  );

  server.post<{ Body: CreateConfigurationBody }>(
    "/configurations",
    {
      schema: {
        tags: ["Configurations"],
        summary: "Create configuration",
        body: {
          type: "object",
          required: ["workspaceId", "document"],
          additionalProperties: false,
          properties: {
            workspaceId: { type: "string" },
            productId: { type: "string" },
            templateId: { type: "string" },
            document: { type: "object" },
            status: {
              type: "string",
              enum: ["draft", "cart", "ordered", "archived"],
            },
          },
        },
        response: {
          201: configurationSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const configuration = await createConfiguration(server.db, request.body);

        return reply.code(201).send(configuration);
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to create configuration.",
        });
      }
    },
  );

  server.get<{ Params: ConfigurationParams }>(
    "/configurations/:id",
    {
      schema: {
        tags: ["Configurations"],
        summary: "Get configuration by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: configurationSchema,
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const configuration = await getConfigurationById(server.db, request.params.id);

        if (!configuration) {
          return reply.code(404).send({
            status: "error",
            message: "Configuration not found.",
          });
        }

        return configuration;
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to get configuration.",
        });
      }
    },
  );

  server.put<{ Params: ConfigurationParams; Body: UpdateConfigurationBody }>(
    "/configurations/:id",
    {
      schema: {
        tags: ["Configurations"],
        summary: "Update configuration",
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
            document: { type: "object" },
            status: {
              type: "string",
              enum: ["draft", "cart", "ordered", "archived"],
            },
          },
        },
        response: {
          200: configurationSchema,
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const configuration = await updateConfiguration(server.db, request.params.id, request.body);

        if (!configuration) {
          return reply.code(404).send({
            status: "error",
            message: "Configuration not found.",
          });
        }

        return configuration;
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to update configuration.",
        });
      }
    },
  );
}
