import type {
  ConfigurationId,
  CreationFlowDocument,
  ProductId,
  SurfaceId,
  WorkspaceId,
} from "@creationflow/schema";

export interface CreateEmptyDocumentInput {
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  readonly configurationId: ConfigurationId;
  readonly now?: string;
}

export function createEmptyDocument(input: CreateEmptyDocumentInput): CreationFlowDocument {
  const timestamp = input.now ?? new Date().toISOString();

  return {
    metadata: {
      workspaceId: input.workspaceId,
      productId: input.productId,
      configurationId: input.configurationId,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: "0.0.0",
    },
    unit: "mm",
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        surfaces: [
          {
            id: "surface-1" as SurfaceId,
            name: "Default surface",
            size: {
              width: 210,
              height: 297,
            },
            elements: [],
          },
        ],
      },
    ],
    variables: [],
    rules: [],
  };
}
