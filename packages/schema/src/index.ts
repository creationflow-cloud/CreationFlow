type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

export type WorkspaceId = Brand<string, "WorkspaceId">;
export type ProductId = Brand<string, "ProductId">;
export type ConfigurationId = Brand<string, "ConfigurationId">;
export type SurfaceId = Brand<string, "SurfaceId">;
export type ElementId = Brand<string, "ElementId">;
export type AssetId = Brand<string, "AssetId">;

export type CreationFlowDocumentUnit = "mm" | "pt" | "px";

export interface CreationFlowDocumentMetadata {
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  readonly configurationId: ConfigurationId;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: string;
}

export interface CreationFlowSize {
  readonly width: number;
  readonly height: number;
}

export interface CreationFlowPosition {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
}

export interface CreationFlowStyle {
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly opacity?: number;
  readonly fontFamily?: string;
  readonly fontSize?: number;
  readonly fontWeight?: string;
  readonly textAlign?: "left" | "center" | "right";
}

export type CreationFlowElementType = "text" | "image" | "shape" | "group" | "variable";

interface CreationFlowElementBase {
  readonly id: ElementId;
  readonly type: CreationFlowElementType;
  readonly name?: string;
  readonly position: CreationFlowPosition;
  readonly style?: CreationFlowStyle;
  readonly locked?: boolean;
  readonly visible?: boolean;
}

export interface CreationFlowTextElement extends CreationFlowElementBase {
  readonly type: "text";
  readonly text: string;
}

export interface CreationFlowImageElement extends CreationFlowElementBase {
  readonly type: "image";
  readonly assetId: AssetId;
  readonly alt?: string;
}

export interface CreationFlowShapeElement extends CreationFlowElementBase {
  readonly type: "shape";
  readonly shape: "rectangle" | "ellipse" | "path";
  readonly pathData?: string;
}

export interface CreationFlowGroupElement extends CreationFlowElementBase {
  readonly type: "group";
  readonly children: readonly CreationFlowElement[];
}

export interface CreationFlowVariableElement extends CreationFlowElementBase {
  readonly type: "variable";
  readonly variableKey: string;
  readonly fallback?: string;
}

export type CreationFlowElement =
  | CreationFlowTextElement
  | CreationFlowImageElement
  | CreationFlowShapeElement
  | CreationFlowGroupElement
  | CreationFlowVariableElement;

export interface CreationFlowVariable {
  readonly key: string;
  readonly label?: string;
  readonly value: string | number | boolean | null;
}

export interface CreationFlowRule {
  readonly id: string;
  readonly name?: string;
  readonly when: Record<string, unknown>;
  readonly then: Record<string, unknown>;
  readonly enabled?: boolean;
}

export interface CreationFlowSurface {
  readonly id: SurfaceId;
  readonly name: string;
  readonly size: CreationFlowSize;
  readonly elements: readonly CreationFlowElement[];
}

export interface CreationFlowPage {
  readonly id: string;
  readonly name: string;
  readonly surfaces: readonly CreationFlowSurface[];
}

export interface CreationFlowDocument {
  readonly metadata: CreationFlowDocumentMetadata;
  readonly unit: CreationFlowDocumentUnit;
  readonly pages: readonly CreationFlowPage[];
  readonly variables: readonly CreationFlowVariable[];
  readonly rules: readonly CreationFlowRule[];
}
