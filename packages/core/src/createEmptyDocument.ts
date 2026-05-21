import type {
  CreationFlowDocument,
  DocumentId,
  WorkspaceId,
  ProductId,
  ConfigurationId,
} from "@creationflow/schema";
import type { CreateEmptyDocumentInput } from "./types.js";

export function createEmptyDocument(input: CreateEmptyDocumentInput): CreationFlowDocument {
  const timestamp = input.now ?? new Date().toISOString();

  return {
    id: input.documentId as DocumentId,
    version: "0.0.0",
    metadata: {
      workspaceId: input.workspaceId as WorkspaceId,
      productId: (input.productId ?? undefined) as ProductId | undefined,
      configurationId: (input.configurationId ?? undefined) as ConfigurationId | undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    pages: [],
    variables: [],
    assets: [],
    rules: [],
  };
}
