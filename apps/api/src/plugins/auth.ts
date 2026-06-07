import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

export interface ApiAuthConfig {
  readonly apiKey: string | undefined;
  readonly authDisabled: boolean;
}

declare module "fastify" {
  interface FastifyInstance {
    auth: {
      readonly requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    };
  }
  interface FastifyRequest {
    auth?: {
      readonly authenticated: true;
    };
  }
}

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return timingSafeEqual(aBuf, bBuf);
}

function extractApiKey(request: FastifyRequest): string | undefined {
  const header = request.headers["x-api-key"];

  if (typeof header === "string" && header.length > 0) {
    return header;
  }

  if (Array.isArray(header) && header.length > 0) {
    return header[0];
  }

  const authHeader = request.headers.authorization;

  if (typeof authHeader === "string") {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

async function authPluginImpl(server: FastifyInstance, options: ApiAuthConfig): Promise<void> {
  const requireAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (options.authDisabled) {
      request.auth = { authenticated: true };
      return;
    }

    if (!options.apiKey) {
      request.log.error("API key authentication is enabled but CREATIONFLOW_API_KEY is not set.");
      await reply.code(500).send({
        status: "error",
        message: "Server is not configured for authentication.",
      });
      throw new AuthError("auth not configured");
    }

    const provided = extractApiKey(request);

    if (!provided || !safeEqual(provided, options.apiKey)) {
      await reply.code(401).send({
        status: "error",
        message: "Missing or invalid API credentials.",
      });
      throw new AuthError("unauthorized");
    }

    request.auth = { authenticated: true };
  };

  server.decorate("auth", { requireAuth });
}

export const registerAuth = fp(authPluginImpl, { name: "creationflow-auth" });

export function isAuthConfigured(config: ApiAuthConfig): boolean {
  return config.authDisabled || Boolean(config.apiKey);
}
