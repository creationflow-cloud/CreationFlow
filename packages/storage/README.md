# @creationflow/storage

Storage providers for CreationFlow.

## Exports

### Storage Provider Interface

- `StorageProvider` — interface for pluggable storage backends

### Implementations

- `FileSystemStorageProvider` — stores files on the local disk
- `MemoryStorageProvider` — in-memory storage for testing

### Types

- `StorageFile` — file metadata
- `StorageProviderOptions` — configuration options

## Usage

The API registers a storage plugin and uses it for asset file uploads and downloads.
