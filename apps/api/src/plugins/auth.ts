import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

export type ApiRole = "admin" | "editor" | "viewer";

const ROLE_RANK: Readonly<Record<ApiRole, number>> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export interface ApiKeyRoleEntry {
  readonly key: string;
  readonly role: ApiRole;
}

export interface ApiAuthConfig {
  readonly apiKey: string | undefined;
  readonly authDisabled: boolean;
  readonly allowedWorkspaces: ReadonlySet<string> | "all";
  readonly apiKeyRoles: readonly ApiKeyRoleEntry[];
  readonly defaultRole: ApiRole;
}

export interface RequestAuth {
  readonly authenticated: true;
  readonly role: ApiRole;
}

declare module "fastify" {
  interface FastifyInstance {
    auth: {
      readonly requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
      readonly requireRole: (
        minimum: ApiRole,
      ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
      readonly enforceWorkspaceScope: (workspaceId: string | null | undefined) => void;
    };
  }
  interface FastifyRequest {
    auth?: RequestAuth;
  }
}

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

class RoleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoleError";
  }
}

class WorkspaceScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceScopeError";
  }
}

export { RoleError, WorkspaceScopeError };

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");

  if (aBuf.length !== bBuf.length) {
    const aCopy = Buffer.alloc(aBuf.length);
    aBuf.copy(aCopy);
    timingSafeEqual(aCopy, aCopy);
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

function isApiRole(value: string): value is ApiRole {
  return value === "admin" || value === "editor" || value === "viewer";
}

function resolveRoleForKey(config: ApiAuthConfig, providedKey: string): ApiRole {
  for (const entry of config.apiKeyRoles) {
    if (safeEqual(entry.key, providedKey)) {
      return entry.role;
    }
  }

  if (config.apiKey && safeEqual(config.apiKey, providedKey)) {
    return config.defaultRole;
  }

  return config.defaultRole;
}

async function authPluginImpl(server: FastifyInstance, options: ApiAuthConfig): Promise<void> {
  const isValidKey = (provided: string): boolean => {
    if (options.apiKey && safeEqual(provided, options.apiKey)) {
      return true;
    }
    for (const entry of options.apiKeyRoles) {
      if (safeEqual(entry.key, provided)) {
        return true;
      }
    }
    return false;
  };

  const requireAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (options.authDisabled) {
      request.auth = { authenticated: true, role: "admin" };
      return;
    }

    if (!options.apiKey && options.apiKeyRoles.length === 0) {
      request.log.error("API key authentication is enabled but no API keys are configured.");
      await reply.code(500).send({
        status: "error",
        message: "Server is not configured for authentication.",
      });
      throw new AuthError("auth not configured");
    }

    const provided = extractApiKey(request);

    if (!provided || !isValidKey(provided)) {
      await reply.code(401).send({
        status: "error",
        message: "Missing or invalid API credentials.",
      });
      throw new AuthError("unauthorized");
    }

    request.auth = {
      authenticated: true,
      role: resolveRoleForKey(options, provided),
    };
  };

  const requireRole =
    (minimum: ApiRole) =>
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!request.auth) {
        await reply.code(401).send({
          status: "error",
          message: "Authentication is required.",
        });
        throw new AuthError("unauthorized");
      }

      const requiredRank = ROLE_RANK[minimum];
      const actualRank = ROLE_RANK[request.auth.role];

      if (actualRank < requiredRank) {
        await reply.code(403).send({
          status: "error",
          message: `Role "${request.auth.role}" is not allowed. Required: ${minimum}.`,
        });
        throw new RoleError(`role ${request.auth.role} < ${minimum}`);
      }
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

  server.decorate("auth", { requireAuth, requireRole, enforceWorkspaceScope });
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

export function parseApiKeyRoles(value: string | undefined): readonly ApiKeyRoleEntry[] {
  if (!value) {
    return [];
  }

  const entries: ApiKeyRoleEntry[] = [];
  for (const raw of value.split(",")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }
    const role = trimmed.slice(0, separatorIndex).trim();
    const key = trimmed.slice(separatorIndex + 1).trim();
    if (!key || !isApiRole(role)) {
      continue;
    }
    entries.push({ key, role });
  }

  return entries;
}

export function parseDefaultRole(value: string | undefined): ApiRole {
  if (value && isApiRole(value.trim().toLowerCase())) {
    return value.trim().toLowerCase() as ApiRole;
  }
  return "admin";
}
