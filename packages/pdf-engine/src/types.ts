import type {
  AssetId,
  CreationFlowElementType,
  CreationFlowPatternRepeatMode,
  CreationFlowUnit,
  DocumentId,
  ElementId,
  PageId,
} from "@creationflow/schema";

export interface PdfRenderPlan {
  readonly documentId: DocumentId;
  readonly documentVersion: string;
  readonly pages: readonly PdfRenderPlanPage[];
}

export interface PdfRenderPlanPage {
  readonly pageId: PageId;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly unit: CreationFlowUnit;
  readonly elements: readonly PdfRenderPlanElement[];
}

export interface PdfRenderPlanElement {
  readonly elementId: ElementId;
  readonly type: CreationFlowElementType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
  readonly zIndex: number;
  readonly visible: boolean;
  readonly assetId?: AssetId;
  readonly repeatMode?: CreationFlowPatternRepeatMode;
  readonly tileWidth?: number;
  readonly tileHeight?: number;
  readonly gapX?: number;
  readonly gapY?: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly opacity?: number;
  readonly color?: string;
  readonly clipPath?: string;
}
