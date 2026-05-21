import type {
  StorageDeleteInput,
  StorageGetInput,
  StorageGetPublicUrlInput,
  StorageObject,
  StoragePutInput,
} from "./types.js";
import type { StorageProvider } from "./storage-provider.js";

/**
 * In-memory storage provider for development and testing only.
 *
 * WARNING: This provider does NOT persist data. All stored objects are lost
 * when the process exits. Do NOT use this in production.
 */
export class MemoryStorageProvider implements StorageProvider {
  private readonly store = new Map<
    string,
    { body: Uint8Array; contentType?: string; metadata?: Record<string, string> }
  >();

  private makeKey(bucket: string, key: string): string {
    return `${bucket}/${key}`;
  }

  async putObject(input: StoragePutInput): Promise<void> {
    const body = typeof input.body === "string" ? new TextEncoder().encode(input.body) : input.body;

    this.store.set(this.makeKey(input.bucket, input.key), {
      body,
      contentType: input.contentType,
      metadata: input.metadata,
    });
  }

  async getObject(input: StorageGetInput): Promise<StorageObject> {
    const entry = this.store.get(this.makeKey(input.bucket, input.key));

    if (!entry) {
      throw new Error(`Storage object not found: ${input.bucket}/${input.key}`);
    }

    return {
      key: input.key,
      body: entry.body,
      contentType: entry.contentType,
      metadata: entry.metadata,
    };
  }

  async deleteObject(input: StorageDeleteInput): Promise<void> {
    this.store.delete(this.makeKey(input.bucket, input.key));
  }

  async getPublicUrl(input: StorageGetPublicUrlInput): Promise<string> {
    return `memory://${input.bucket}/${input.key}`;
  }
}
