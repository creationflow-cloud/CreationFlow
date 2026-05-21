export type StorageObjectKey = string;

export type StorageBucket = string;

export type StorageObjectMetadata = Record<string, string>;

export interface StoragePutInput {
  readonly bucket: StorageBucket;
  readonly key: StorageObjectKey;
  readonly body: Uint8Array | string;
  readonly contentType?: string;
  readonly metadata?: StorageObjectMetadata;
}

export interface StorageGetInput {
  readonly bucket: StorageBucket;
  readonly key: StorageObjectKey;
}

export interface StorageDeleteInput {
  readonly bucket: StorageBucket;
  readonly key: StorageObjectKey;
}

export interface StorageGetPublicUrlInput {
  readonly bucket: StorageBucket;
  readonly key: StorageObjectKey;
}

export interface StorageObject {
  readonly key: StorageObjectKey;
  readonly body: Uint8Array;
  readonly contentType?: string;
  readonly metadata?: StorageObjectMetadata;
}
