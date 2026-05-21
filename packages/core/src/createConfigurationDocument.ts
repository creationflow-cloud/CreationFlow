import type { CreationFlowDocument, DocumentId } from "@creationflow/schema";

export interface CreateConfigurationDocumentInput {
  readonly documentId: DocumentId;
  readonly templateDocument: Record<string, unknown>;
  readonly now?: string;
}

export function createConfigurationDocument(
  input: CreateConfigurationDocumentInput,
): CreationFlowDocument {
  const timestamp = input.now ?? new Date().toISOString();

  const templateDoc = input.templateDocument as Record<string, unknown>;

  return {
    id: input.documentId,
    version: (templateDoc.version as string) ?? "0.0.0",
    metadata: {
      ...(templateDoc.metadata as object),
      createdAt: timestamp,
      updatedAt: timestamp,
    } as CreationFlowDocument["metadata"],
    pages: (templateDoc.pages as CreationFlowDocument["pages"]) ?? [],
    variables: (templateDoc.variables as CreationFlowDocument["variables"]) ?? [],
    assets: (templateDoc.assets as CreationFlowDocument["assets"]) ?? [],
    rules: (templateDoc.rules as CreationFlowDocument["rules"]) ?? [],
  };
}
