import type { FastifyInstance } from "fastify";

import {
  createAsset,
  deleteAsset,
  getAssetById,
  listAssets,
  updateAsset,
} from "../services/assets.js";
import type { ApiAssetType } from "../mappers/asset-type.js";

const assetSchema = {
  type: "object",
  required: ["id", "workspaceId", "type", "name", "source", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    workspaceId: { type: "string" },
    type: {
      type: "string",
      enum: ["image", "font", "vector", "pdf"],
    },
    name: { type: "string" },
    source: { type: "string" },
    mimeType: { type: "string" },
    width: { type: "integer" },
    height: { type: "integer" },
    sizeBytes: { type: "string" },
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

interface AssetParams {
  readonly id: string;
}

interface CreateAssetBody {
  readonly workspaceId: string;
  readonly type: ApiAssetType;
  readonly name: string;
  readonly source: string;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
  readonly sizeBytes?: string;
}

interface UpdateAssetBody {
  readonly name?: string;
  readonly source?: string;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
  readonly sizeBytes?: string;
}

interface ListAssetsQuery {
  readonly workspaceId?: string;
  readonly type?: ApiAssetType;
}

export async function registerAssetRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Querystring: ListAssetsQuery }>(
    "/assets",
    {
      schema: {
        tags: ["Assets"],
        summary: "List assets",
        querystring: {
          type: "object",
          properties: {
            workspaceId: { type: "string" },
            type: {
              type: "string",
              enum: ["image", "font", "vector", "pdf"],
            },
          },
        },
        response: {
          200: {
            type: "array",
            items: assetSchema,
          },
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return await listAssets(server.db, {
          workspaceId: request.query.workspaceId,
          type: request.query.type,
        });
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to list assets.",
        });
      }
    },
  );

  server.post<{ Body: CreateAssetBody }>(
    "/assets",
    {
      schema: {
        tags: ["Assets"],
        summary: "Create asset",
        body: {
          type: "object",
          required: ["workspaceId", "type", "name", "source"],
          additionalProperties: false,
          properties: {
            workspaceId: { type: "string" },
            type: {
              type: "string",
              enum: ["image", "font", "vector", "pdf"],
            },
            name: { type: "string", minLength: 1, maxLength: 200 },
            source: { type: "string" },
            mimeType: { type: "string" },
            width: { type: "integer", minimum: 0 },
            height: { type: "integer", minimum: 0 },
            sizeBytes: { type: "string" },
          },
        },
        response: {
          201: assetSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const asset = await createAsset(server.db, request.body);

        return reply.code(201).send(asset);
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to create asset.",
        });
      }
    },
  );

  server.get<{ Params: AssetParams }>(
    "/assets/:id",
    {
      schema: {
        tags: ["Assets"],
        summary: "Get asset by ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: assetSchema,
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const asset = await getAssetById(server.db, request.params.id);

        if (!asset) {
          return reply.code(404).send({
            status: "error",
            message: "Asset not found.",
          });
        }

        return asset;
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to get asset.",
        });
      }
    },
  );

  server.put<{ Params: AssetParams; Body: UpdateAssetBody }>(
    "/assets/:id",
    {
      schema: {
        tags: ["Assets"],
        summary: "Update asset",
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
            name: { type: "string", minLength: 1, maxLength: 200 },
            source: { type: "string" },
            mimeType: { type: "string" },
            width: { type: "integer", minimum: 0 },
            height: { type: "integer", minimum: 0 },
            sizeBytes: { type: "string" },
          },
        },
        response: {
          200: assetSchema,
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const asset = await updateAsset(server.db, request.params.id, request.body);

        if (!asset) {
          return reply.code(404).send({
            status: "error",
            message: "Asset not found.",
          });
        }

        return asset;
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to update asset.",
        });
      }
    },
  );

  server.delete<{ Params: AssetParams }>(
    "/assets/:id",
    {
      schema: {
        tags: ["Assets"],
        summary: "Delete asset",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        response: {
          204: {
            type: "null",
            description: "Asset deleted successfully",
          },
          404: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const deleted = await deleteAsset(server.db, request.params.id);

        if (!deleted) {
          return reply.code(404).send({
            status: "error",
            message: "Asset not found.",
          });
        }

        return reply.code(204).send();
      } catch (error) {
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to delete asset.",
        });
      }
    },
  );
}
