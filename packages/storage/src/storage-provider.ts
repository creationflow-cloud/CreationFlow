import type {
  StorageDeleteInput,
  StorageGetInput,
  StorageGetPublicUrlInput,
  StorageObject,
  StoragePutInput,
} from "./types.js";

export interface StorageProvider {
  putObject(input: StoragePutInput): Promise<void>;
  getObject(input: StorageGetInput): Promise<StorageObject>;
  deleteObject(input: StorageDeleteInput): Promise<void>;
  getPublicUrl(input: StorageGetPublicUrlInput): Promise<string>;
}
