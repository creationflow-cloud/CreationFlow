import type { FastifyInstance, FastifyRequest } from "fastify";

import { getAssetById } from "../services/assets.js";
import { verifyAssetSignedUrl } from "../services/signed-urls.js";

function toContentDispositionFilename(name: string): string {
  return name.replace(/["\\\r\n]/g, "_");
}

interface AssetFileParams {
  readonly id: string;
}

interface AssetFileQuery {
  readonly expires?: string;
  readonly signature?: string;
}

function extractSignedUrlParams(request: FastifyRequest): {
  readonly expires: string;
  readonly signature: string;
} | null {
  const query = request.query as AssetFileQuery | undefined;
  if (!query || typeof query.expires !== "string" || typeof query.signature !== "string") {
    return null;
  }
  return { expires: query.expires, signature: query.signature };
}

export async function registerAssetFileRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Params: AssetFileParams }>(
    "/assets/:id/file",
    {
      schema: {
        tags: ["Assets"],
        summary: "Get asset file (auth via API key or signed URL token)",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", minLength: 1 },
          },
        },
        querystring: {
          type: "object",
          properties: {
            expires: { type: "string" },
            signature: { type: "string" },
          },
        },
        response: {
          200: {
            type: "string",
            format: "binary",
          },
          403: {
            type: "object",
            properties: {
              status: { type: "string", const: "error" },
              message: { type: "string" },
            },
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

        const signedParams = extractSignedUrlParams(request);
        if (signedParams) {
          const valid = verifyAssetSignedUrl(
            asset.id,
            asset.workspaceId,
            signedParams.expires,
            signedParams.signature,
            server.config.assetSigningSecret,
          );
          if (!valid) {
            return reply.code(403).send({
              status: "error",
              message: "Invalid or expired signed URL.",
            });
          }
        } else {
          await server.auth.requireAuth(request, reply);
          if (reply.sent) {
            return reply;
          }
          server.auth.enforceWorkspaceScope(asset.workspaceId);
        }

        const object = await server.storage.getObject({
          bucket: `assets/${asset.workspaceId}`,
          key: asset.source,
        });

        const response = reply.header(
          "Content-Type",
          asset.mimeType ?? "application/octet-stream",
        );

        if (asset.type === "pdf") {
          response
            .header("Cache-Control", "no-cache, no-store, must-revalidate")
            .header("Pragma", "no-cache")
            .header("Expires", "0")
            .header(
              "Content-Disposition",
              `attachment; filename="${toContentDispositionFilename(asset.name)}"`,
            );
        } else if (signedParams) {
          response.header("Cache-Control", `private, max-age=600`);
        } else {
          response.header("Cache-Control", "public, max-age=31536000");
        }

        return response.send(object.body);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === "AuthError" ||
            error.name === "RoleError" ||
            error.name === "WorkspaceScopeError")
        ) {
          const status = error.name === "AuthError" ? 401 : 403;
          return reply.code(status).send({
            status: "error",
            message: error.message,
          });
        }
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
