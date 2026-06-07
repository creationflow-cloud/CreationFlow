import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

export interface ApiAuthConfig {
  readonly apiKey: string | undefined;
  readonly authDisabled: boolean;
  readonly allowedWorkspaces: ReadonlySet<string> | "all";
}

declare module "fastify" {
  interface FastifyInstance {
    auth: {
      readonly requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
      readonly enforceWorkspaceScope: (workspaceId: string | null | undefined) => void;
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

class WorkspaceScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceScopeError";
  }
}

export { WorkspaceScopeError };

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

  const enforceWorkspaceScope = (workspaceId: string | null | undefined): void => {
    if (options.allowedWorkspaces === "all") {
      return;
    }

    if (!workspaceId || !options.allowedWorkspaces.has(workspaceId)) {
      const error = new WorkspaceScopeError(
        workspaceId ? "Workspace not allowed for this API key." : "Workspace ID is required.",
      );
      throw error;
    }
  };

  server.addHook("preHandler", async (request) => {
    const config = (request.routeOptions?.config ?? {}) as { skipWorkspaceScope?: boolean };
    if (config.skipWorkspaceScope === true) {
      return;
    }

    const query = request.query as Record<string, unknown> | undefined;
    const body = request.body as Record<string, unknown> | undefined;

    const workspaceId =
      typeof query?.workspaceId === "string"
        ? (query.workspaceId as string)
        : typeof body?.workspaceId === "string"
          ? (body.workspaceId as string)
          : undefined;

    if (workspaceId === undefined) {
      return;
    }

    enforceWorkspaceScope(workspaceId);
  });

  server.decorate("auth", { requireAuth, enforceWorkspaceScope });
}

export const registerAuth = fp(authPluginImpl, { name: "creationflow-auth" });

export function isAuthConfigured(config: ApiAuthConfig): boolean {
  return config.authDisabled || Boolean(config.apiKey);
}

export function parseAllowedWorkspaces(value: string | undefined): ReadonlySet<string> | "all" {
  if (!value) {
    return new Set();
  }

  const trimmed = value.trim();

  if (trimmed === "*" || trimmed.toLowerCase() === "all") {
    return "all";
  }

  const entries = trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return new Set(entries);
}
