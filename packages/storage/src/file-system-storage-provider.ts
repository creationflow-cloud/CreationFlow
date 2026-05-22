import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { StorageProvider } from "./storage-provider.js";
import type {
  StorageDeleteInput,
  StorageGetInput,
  StorageGetPublicUrlInput,
  StorageObject,
  StoragePutInput,
} from "./types.js";

export interface FileSystemStorageProviderOptions {
  readonly uploadDir: string;
  readonly baseUrl: string;
}

export class FileSystemStorageProvider implements StorageProvider {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(options: FileSystemStorageProviderOptions) {
    this.uploadDir = options.uploadDir;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
  }

  async init(): Promise<void> {
    await mkdir(this.uploadDir, { recursive: true });
  }

  private resolvePath(bucket: string, key: string): string {
    return join(this.uploadDir, bucket, key);
  }

  async putObject(input: StoragePutInput): Promise<void> {
    const body = typeof input.body === "string" ? new TextEncoder().encode(input.body) : input.body;

    const fullPath = this.resolvePath(input.bucket, input.key);
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));

    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, body);
  }

  async getObject(input: StorageGetInput): Promise<StorageObject> {
    const fullPath = this.resolvePath(input.bucket, input.key);

    try {
      await stat(fullPath);
    } catch {
      throw new Error(`Storage object not found: ${input.bucket}/${input.key}`);
    }

    const body = await readFile(fullPath);

    return {
      key: input.key,
      body: new Uint8Array(body),
    };
  }

  async deleteObject(input: StorageDeleteInput): Promise<void> {
    const fullPath = this.resolvePath(input.bucket, input.key);

    try {
      await unlink(fullPath);
    } catch {
      // File may already be deleted
    }
  }

  async getPublicUrl(input: StorageGetPublicUrlInput): Promise<string> {
    return `${this.baseUrl}/assets/${input.key}/file`;
  }
}
