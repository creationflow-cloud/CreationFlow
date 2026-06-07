import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";

import type { ApiConfig } from "./config.js";
import { registerAuth } from "./plugins/auth.js";
import { registerDatabase } from "./plugins/database.js";
import { registerOpenApi } from "./plugins/openapi.js";
import { registerStorage } from "./plugins/storage.js";
import { registerRoutes } from "./routes/index.js";

declare module "fastify" {
  interface FastifyInstance {
    config: ApiConfig;
  }
}

export async function createServer(config: ApiConfig) {
  const server = Fastify({
    logger: true,
  });

  server.decorate("config", config);

  await server.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  });

  await server.register(multipart, {
    limits: {
      fileSize: config.maxUploadBytes,
    },
  });

  await registerAuth(server, { apiKey: config.apiKey, authDisabled: config.authDisabled });
  await registerOpenApi(server, config);
  await registerDatabase(server, config);
  await registerStorage(server);
  await registerRoutes(server, config);

  return server;
}
