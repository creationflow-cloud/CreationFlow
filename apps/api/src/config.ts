import { readFileSync } from "node:fs";

import {
  parseAllowedWorkspaces,
  parseApiKeyRoles,
  parseDefaultRole,
  type ApiKeyRoleEntry,
  type ApiRole,
} from "./plugins/auth.js";

interface ApiPackageJson {
  readonly version?: string;
}

export interface ApiConfig {
  readonly host: string;
  readonly port: number;
  readonly version: string;
  readonly databaseUrl: string | undefined;
  readonly maxUploadBytes: number;
  readonly uploadDir: string;
  readonly apiKey: string | undefined;
  readonly authDisabled: boolean;
  readonly allowedWorkspaces: ReadonlySet<string> | "all";
  readonly apiKeyRoles: readonly ApiKeyRoleEntry[];
  readonly defaultRole: ApiRole;
  readonly logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  readonly nodeEnv: "development" | "production" | "test";
}

function readPackageVersion(): string {
  const packageJsonUrl = new URL("../package.json", import.meta.url);
  const packageJson = JSON.parse(readFileSync(packageJsonUrl, "utf8")) as ApiPackageJson;

  return packageJson.version ?? "0.0.0";
}

export function getApiConfig(): ApiConfig {
  const apiKey = process.env.CREATIONFLOW_API_KEY?.trim();
  const nodeEnvRaw = (process.env.NODE_ENV ?? "development").toLowerCase();
  const nodeEnv: ApiConfig["nodeEnv"] =
    nodeEnvRaw === "production" ? "production" : nodeEnvRaw === "test" ? "test" : "development";
  const logLevelRaw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  const allowedLevels: ApiConfig["logLevel"][] = [
    "fatal",
    "error",
    "warn",
    "info",
    "debug",
    "trace",
    "silent",
  ];
  const logLevel: ApiConfig["logLevel"] = (allowedLevels as readonly string[]).includes(logLevelRaw)
    ? (logLevelRaw as ApiConfig["logLevel"])
    : "info";

  return {
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? "3000"),
    version: readPackageVersion(),
    databaseUrl: process.env.DATABASE_URL,
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? "10485760"),
    uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
    apiKey: apiKey && apiKey.length > 0 ? apiKey : undefined,
    authDisabled: process.env.CREATIONFLOW_AUTH_DISABLED === "true",
    allowedWorkspaces: parseAllowedWorkspaces(process.env.CREATIONFLOW_API_WORKSPACES),
    apiKeyRoles: parseApiKeyRoles(process.env.CREATIONFLOW_API_KEYS),
    defaultRole: parseDefaultRole(process.env.CREATIONFLOW_API_DEFAULT_ROLE),
    logLevel,
    nodeEnv,
  };
}
