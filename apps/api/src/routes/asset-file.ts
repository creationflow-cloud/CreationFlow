import type { FastifyInstance } from "fastify";

import { getAssetById } from "../services/assets.js";

function toContentDispositionFilename(name: string): string {
  return name.replace(/["\\\r\n]/g, "_");
}

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

        const response = reply
          .header("Content-Type", asset.mimeType ?? "application/octet-stream");

        if (asset.type === "pdf") {
          response
            .header("Cache-Control", "no-cache, no-store, must-revalidate")
            .header("Pragma", "no-cache")
            .header("Expires", "0")
            .header(
              "Content-Disposition",
              `attachment; filename="${toContentDispositionFilename(asset.name)}"`,
            );
        } else {
          response.header("Cache-Control", "public, max-age=31536000");
        }

        return response.send(object.body);
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
