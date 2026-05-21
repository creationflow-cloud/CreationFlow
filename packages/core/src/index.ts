import type {
  ConfigurationId,
  DocumentId,
  CreationFlowDocument,
  PageId,
  ProductId,
  SurfaceId,
  WorkspaceId,
} from "@creationflow/schema";

export interface CreateEmptyDocumentInput {
  readonly documentId: DocumentId;
  readonly workspaceId: WorkspaceId;
  readonly productId?: ProductId;
  readonly configurationId?: ConfigurationId;
  readonly now?: string;
}

export function createEmptyDocument(input: CreateEmptyDocumentInput): CreationFlowDocument {
  const timestamp = input.now ?? new Date().toISOString();

  return {
    id: input.documentId,
    version: "0.0.0",
    metadata: {
      workspaceId: input.workspaceId,
      productId: input.productId,
      configurationId: input.configurationId,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    pages: [
      {
        id: "page-1" as PageId,
        name: "Page 1",
        width: 210,
        height: 297,
        unit: "mm",
        surfaces: [
          {
            id: "surface-1" as SurfaceId,
            name: "Front",
            pageId: "page-1" as PageId,
            kind: "front",
            width: 210,
            height: 297,
            unit: "mm",
            elements: [],
          },
        ],
      },
    ],
    variables: [],
    assets: [],
    rules: [],
  };
}
