import type {
  CreationFlowDocumentMetadata,
  CreationFlowElement,
  CreationFlowElementType,
  CreationFlowUnit,
  DocumentId,
  ElementId,
  PageId,
  SurfaceId,
} from "@creationflow/schema";

export interface CreateEmptyDocumentInput {
  readonly documentId: string;
  readonly workspaceId: string;
  readonly productId?: string;
  readonly configurationId?: string;
  readonly now?: string;
}

export interface CreateConfigurationDocumentInput {
  readonly documentId: DocumentId;
  readonly templateDocument: Record<string, unknown>;
  readonly now?: string;
}

export interface AddPageInput {
  readonly id: PageId;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly unit: CreationFlowUnit;
}

export interface AddSurfaceInput {
  readonly id: SurfaceId;
  readonly name: string;
  readonly pageId?: PageId;
  readonly width: number;
  readonly height: number;
  readonly unit: CreationFlowUnit;
}

export interface AddElementInput {
  readonly id: ElementId;
  readonly type: CreationFlowElementType;
  readonly name?: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly opacity: number;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly zIndex: number;
}

export type ElementPatch = Partial<Omit<CreationFlowElement, "id" | "type">>;

export type MetadataPatch = Partial<Omit<CreationFlowDocumentMetadata, "createdAt">>;
