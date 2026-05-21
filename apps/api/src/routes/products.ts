import type { FastifyInstance } from "fastify";

import { createProduct, getProductById, listProducts } from "../services/products.js";

const productSchema = {
  type: "object",
  required: ["id", "workspaceId", "name", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    workspaceId: { type: "string" },
    externalId: { type: "string" },
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

interface ProductParams {
  readonly id: string;
}

interface CreateProductBody {
  readonly workspaceId: string;
  readonly externalId?: string;
  readonly name: string;
}

interface ListProductsQuery {
  readonly workspaceId?: string;
}

export async function registerProductRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Querystring: ListProductsQuery }>(
    "/products",
    {
      schema: {
        tags: ["Products"],
        summary: "List products",
        querystring: {
          type: "object",
          properties: {
            workspaceId: { type: "string" },
          },
        },
        response: {
          200: {
            type: "array",
            items: productSchema,
          },
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return await listProducts(server.db, request.query.workspaceId);
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to list products.",
        });
      }
    },
  );

  server.post<{ Body: CreateProductBody }>(
    "/products",
    {
      schema: {
        tags: ["Products"],
        summary: "Create product",
        body: {
          type: "object",
          required: ["workspaceId", "name"],
          additionalProperties: false,
          properties: {
            workspaceId: { type: "string" },
            externalId: { type: "string" },
            name: { type: "string", minLength: 1, maxLength: 200 },
          },
        },
        response: {
          201: productSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const product = await createProduct(server.db, request.body);

        return reply.code(201).send(product);
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to create product.",
        });
      }
    },
  );

  server.get<{ Params: ProductParams }>(
    "/products/:id",
    {
      schema: {
        tags: ["Products"],
        summary: "Get product by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: productSchema,
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const product = await getProductById(server.db, request.params.id);

        if (!product) {
          return reply.code(404).send({
            status: "error",
            message: "Product not found.",
          });
        }

        return product;
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to get product.",
        });
      }
    },
  );
}
