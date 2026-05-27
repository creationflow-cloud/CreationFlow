import type {
  AssetId,
  CreationFlowDocumentMetadata,
  CreationFlowElement,
  CreationFlowPatternRepeatMode,
  CreationFlowTextAlign,
  CreationFlowUnit,
  DocumentId,
  ElementId,
  PageId,
  SurfaceId,
  VariableId,
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

interface AddElementBaseInput {
  readonly id: ElementId;
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

export interface AddTextElementInput extends AddElementBaseInput {
  readonly type: "text";
  readonly text: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight?: string;
  readonly color: string;
  readonly align: CreationFlowTextAlign;
}

export interface AddImageElementInput extends AddElementBaseInput {
  readonly type: "image";
  readonly assetId: AssetId;
  readonly fit: "contain" | "cover" | "fill";
}

export interface AddShapeElementInput extends AddElementBaseInput {
  readonly type: "shape";
  readonly shapeType: "rect" | "ellipse" | "line";
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
}

export interface AddGroupElementInput extends AddElementBaseInput {
  readonly type: "group";
  readonly children: readonly CreationFlowElement[];
}

export interface AddVariableElementInput extends AddElementBaseInput {
  readonly type: "variable";
  readonly variableId: VariableId;
  readonly fallback?: string;
}

export interface AddPatternElementInput extends AddElementBaseInput {
  readonly type: "pattern";
  readonly surfaceId: SurfaceId;
  readonly assetId: AssetId;
  readonly repeatMode: CreationFlowPatternRepeatMode;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly gapX: number;
  readonly gapY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly color?: string;
}

export type AddElementInput =
  | AddTextElementInput
  | AddImageElementInput
  | AddShapeElementInput
  | AddGroupElementInput
  | AddVariableElementInput
  | AddPatternElementInput;

export type ElementPatch = Partial<Omit<CreationFlowElement, "id" | "type">>;

export type MetadataPatch = Partial<Omit<CreationFlowDocumentMetadata, "createdAt">>;
