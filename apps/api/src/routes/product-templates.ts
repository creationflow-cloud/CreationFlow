import type { FastifyInstance } from "fastify";

import {
  createProductTemplate,
  getProductTemplateById,
  listProductTemplates,
} from "../services/product-templates.js";

const productTemplateSchema = {
  type: "object",
  required: ["id", "workspaceId", "documentSchema", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    workspaceId: { type: "string" },
    productId: { type: "string" },
    documentSchema: { type: "object" },
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

interface ProductTemplateParams {
  readonly id: string;
}

interface CreateProductTemplateBody {
  readonly workspaceId: string;
  readonly productId?: string;
  readonly documentSchema: Record<string, unknown>;
}

interface ListProductTemplatesQuery {
  readonly workspaceId?: string;
  readonly productId?: string;
}

export async function registerProductTemplateRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Querystring: ListProductTemplatesQuery }>(
    "/product-templates",
    {
      schema: {
        tags: ["ProductTemplates"],
        summary: "List product templates",
        querystring: {
          type: "object",
          properties: {
            workspaceId: { type: "string" },
            productId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "array",
            items: productTemplateSchema,
          },
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return await listProductTemplates(
          server.db,
          request.query.workspaceId,
          request.query.productId,
        );
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to list product templates.",
        });
      }
    },
  );

  server.post<{ Body: CreateProductTemplateBody }>(
    "/product-templates",
    {
      schema: {
        tags: ["ProductTemplates"],
        summary: "Create product template",
        body: {
          type: "object",
          required: ["workspaceId", "documentSchema"],
          additionalProperties: false,
          properties: {
            workspaceId: { type: "string" },
            productId: { type: "string" },
            documentSchema: { type: "object" },
          },
        },
        response: {
          201: productTemplateSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const template = await createProductTemplate(server.db, request.body);

        return reply.code(201).send(template);
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to create product template.",
        });
      }
    },
  );

  server.get<{ Params: ProductTemplateParams }>(
    "/product-templates/:id",
    {
      schema: {
        tags: ["ProductTemplates"],
        summary: "Get product template by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: productTemplateSchema,
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const template = await getProductTemplateById(server.db, request.params.id);

        if (!template) {
          return reply.code(404).send({
            status: "error",
            message: "Product template not found.",
          });
        }

        return template;
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to get product template.",
        });
      }
    },
  );
}
