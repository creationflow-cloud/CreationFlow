import { readFileSync } from "node:fs";

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
}

function readPackageVersion(): string {
  const packageJsonUrl = new URL("../package.json", import.meta.url);
  const packageJson = JSON.parse(readFileSync(packageJsonUrl, "utf8")) as ApiPackageJson;

  return packageJson.version ?? "0.0.0";
}

export function getApiConfig(): ApiConfig {
  const apiKey = process.env.CREATIONFLOW_API_KEY?.trim();

  return {
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? "3000"),
    version: readPackageVersion(),
    databaseUrl: process.env.DATABASE_URL,
    maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? "10485760"),
    uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
    apiKey: apiKey && apiKey.length > 0 ? apiKey : undefined,
    authDisabled: process.env.CREATIONFLOW_AUTH_DISABLED === "true",
  };
}
