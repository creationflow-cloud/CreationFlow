import type { FastifyInstance } from "fastify";

import {
  createAsset,
  deleteAsset,
  getAssetById,
  listAssets,
  updateAsset,
} from "../services/assets.js";
import { uploadAsset } from "../services/asset-upload.js";
import { generateAssetSignedUrl } from "../services/signed-urls.js";
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

  server.post(
    "/assets/upload",
    {
      schema: {
        tags: ["Assets"],
        summary: "Upload asset file",
        consumes: ["multipart/form-data"],
        response: {
          201: assetSchema,
          400: errorSchema,
          500: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const parts = request.parts();
        let workspaceId: string | undefined;
        let type: ApiAssetType | undefined;
        let fileData:
          | {
              filename: string;
              mimetype: string;
              data: Uint8Array;
            }
          | undefined;

        for await (const part of parts) {
          if (part.type === "file") {
            const chunks: Buffer[] = [];
            for await (const chunk of part.file) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const buffer = Buffer.concat(chunks);
            fileData = {
              filename: part.filename,
              mimetype: part.mimetype,
              data: new Uint8Array(buffer),
            };
          } else if (part.type === "field") {
            if (part.fieldname === "workspaceId") {
              workspaceId = part.value as string;
            } else if (part.fieldname === "type") {
              type = part.value as ApiAssetType;
            }
          }
        }

        if (!fileData) {
          return reply.code(400).send({
            status: "error",
            message: "No file uploaded.",
          });
        }

        if (!workspaceId) {
          return reply.code(400).send({
            status: "error",
            message: "workspaceId is required.",
          });
        }

        if (!type) {
          return reply.code(400).send({
            status: "error",
            message: "type is required.",
          });
        }

        const asset = await uploadAsset(
          server.db,
          server.storage,
          {
            workspaceId,
            type,
            file: fileData,
          },
          {
            maxUploadBytes: server.config.maxUploadBytes,
          },
        );

        return reply.code(201).send(asset);
      } catch (error) {
        server.log.error(error);

        if (error instanceof Error && error.message.includes("File size exceeds")) {
          return reply.code(400).send({
            status: "error",
            message: error.message,
          });
        }

        return reply.code(500).send({
          status: "error",
          message: "Unable to upload asset.",
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

  server.get<{ Params: AssetParams }>(
    "/assets/:id/signed-url",
    {
      schema: {
        tags: ["Assets"],
        summary: "Generate a signed download URL for an asset",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["signedUrl", "expiresAt"],
            properties: {
              signedUrl: { type: "string" },
              expiresAt: { type: "string", format: "date-time" },
            },
          },
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

        server.auth.enforceWorkspaceScope(asset.workspaceId);

        const { signedUrl, expiresAt } = generateAssetSignedUrl(
          asset.id,
          asset.workspaceId,
          server.config.assetSigningSecret,
        );

        return {
          signedUrl,
          expiresAt: new Date(expiresAt).toISOString(),
        };
      } catch (error) {
        if (error instanceof Error && error.name === "WorkspaceScopeError") {
          return reply.code(403).send({
            status: "error",
            message: error.message,
          });
        }
        server.log.error(error);

        return reply.code(500).send({
          status: "error",
          message: "Unable to generate signed URL.",
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
