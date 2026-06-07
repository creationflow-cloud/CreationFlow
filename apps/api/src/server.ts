import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";

import type { ApiConfig } from "./config.js";
import { registerAuth, RoleError, WorkspaceScopeError } from "./plugins/auth.js";
import { registerDatabase } from "./plugins/database.js";
import { registerOpenApi } from "./plugins/openapi.js";
import { registerStorage } from "./plugins/storage.js";
import { registerRoutes } from "./routes/index.js";

declare module "fastify" {
  interface FastifyInstance {
    config: ApiConfig;
  }
}

export { RoleError };

export async function createServer(config: ApiConfig) {
  const server = Fastify({
    logger: true,
  });

  server.decorate("config", config);

  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof WorkspaceScopeError || error instanceof RoleError) {
      return reply.code(403).send({
        status: "error",
        message: error.message,
      });
    }

    server.log.error(error);
    if (!reply.sent) {
      return reply.code(500).send({
        status: "error",
        message: "Internal server error.",
      });
    }
    return reply;
  });

  await server.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  });

  await server.register(multipart, {
    limits: {
      fileSize: config.maxUploadBytes,
    },
  });

  await registerAuth(server, {
    apiKey: config.apiKey,
    authDisabled: config.authDisabled,
    allowedWorkspaces: config.allowedWorkspaces,
    apiKeyRoles: config.apiKeyRoles,
    defaultRole: config.defaultRole,
  });
  await registerOpenApi(server, config);
  await registerDatabase(server, config);
  await registerStorage(server);
  await registerRoutes(server, config);

  return server;
}
