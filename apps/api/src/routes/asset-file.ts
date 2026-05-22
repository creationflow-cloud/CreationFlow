import type { FastifyInstance } from "fastify";

import { getAssetById } from "../services/assets.js";

interface AssetFileParams {
  readonly id: string;
}

export async function registerAssetFileRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Params: AssetFileParams }>(
    "/assets/:id/file",
    {
      schema: {
        tags: ["Assets"],
        summary: "Get asset file",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: {
            type: "string",
            format: "binary",
          },
          404: {
            type: "object",
            properties: {
              status: { type: "string", const: "error" },
              message: { type: "string" },
            },
          },
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

        const object = await server.storage.getObject({
          bucket: `assets/${asset.workspaceId}`,
          key: asset.source,
        });

        return reply
          .header("Content-Type", asset.mimeType ?? "application/octet-stream")
          .header("Cache-Control", "public, max-age=31536000")
          .send(object.body);
      } catch (error) {
        server.log.error(error);

        if (error instanceof Error && error.message.includes("not found")) {
          return reply.code(404).send({
            status: "error",
            message: "Asset file not found.",
          });
        }

        return reply.code(500).send({
          status: "error",
          message: "Unable to get asset file.",
        });
      }
    },
  );
}
