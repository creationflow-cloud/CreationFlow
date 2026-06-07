type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

export type DocumentId = Brand<string, "DocumentId">;
export type PageId = Brand<string, "PageId">;
export type WorkspaceId = Brand<string, "WorkspaceId">;
export type ProductId = Brand<string, "ProductId">;
export type ConfigurationId = Brand<string, "ConfigurationId">;
export type SurfaceId = Brand<string, "SurfaceId">;
export type ElementId = Brand<string, "ElementId">;
export type AssetId = Brand<string, "AssetId">;
export type VariableId = Brand<string, "VariableId">;
export type RuleId = Brand<string, "RuleId">;

// This model is the renderer-independent source of truth. Do not add Canvas, React, PDF, or 3D-specific types here.
export type CreationFlowUnit = "px" | "mm" | "pt";

export interface CreationFlowDocumentMetadata {
  readonly workspaceId: WorkspaceId;
  readonly productId?: ProductId;
  readonly configurationId?: ConfigurationId;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly dpi?: number;
  readonly minAssetDpi?: number;
}

export interface CreationFlowPrintArea {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly bleed?: number;
  readonly safeArea?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export type CreationFlowSurfaceKind = "front" | "back" | "left_sleeve" | "right_sleeve" | "custom";

export type CreationFlowSurfaceShape = "rect" | "path";

export type CreationFlowSurfaceRole = "default" | "colorRegion" | "designRegion" | "overlay";

export interface CreationFlowPage {
  readonly id: PageId;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly unit: CreationFlowUnit;
  readonly surfaces?: readonly CreationFlowSurface[];
}

export interface CreationFlowSurface {
  readonly id: SurfaceId;
  readonly name: string;
  readonly pageId?: PageId;
  readonly kind?: CreationFlowSurfaceKind;
  readonly width: number;
  readonly height: number;
  readonly unit: CreationFlowUnit;
  readonly printArea?: CreationFlowPrintArea;
  readonly elements: readonly CreationFlowElement[];
  readonly shape?: CreationFlowSurfaceShape;
  readonly role?: CreationFlowSurfaceRole;
  readonly pathData?: string;
  readonly fillColor?: string;
  readonly clipContent?: boolean;
}

export type CreationFlowElementType = "text" | "image" | "shape" | "group" | "variable" | "pattern";

export type CreationFlowPatternRepeatMode = "horizontal" | "vertical" | "both";

interface CreationFlowElementBase {
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

export type CreationFlowTextAlign = "left" | "center" | "right";

export interface CreationFlowTextElement extends CreationFlowElementBase {
  readonly type: "text";
  readonly text: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight?: string;
  readonly color: string;
  readonly align: CreationFlowTextAlign;
}

export interface CreationFlowImageElement extends CreationFlowElementBase {
  readonly type: "image";
  readonly assetId: AssetId;
  readonly fit: "contain" | "cover" | "fill";
}

export interface CreationFlowShapeElement extends CreationFlowElementBase {
  readonly type: "shape";
  readonly shapeType: "rect" | "ellipse" | "line";
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
}

export interface CreationFlowGroupElement
  extends Omit<CreationFlowElementBase, "rotation" | "opacity"> {
  readonly type: "group";
  readonly children: readonly CreationFlowElement[];
  readonly rotation?: number;
  readonly opacity?: number;
}

export interface CreationFlowVariableElement extends CreationFlowElementBase {
  readonly type: "variable";
  readonly variableId: VariableId;
  readonly fallback?: string;
}

export interface CreationFlowPatternElement extends CreationFlowElementBase {
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

export type CreationFlowElement =
  | CreationFlowTextElement
  | CreationFlowImageElement
  | CreationFlowShapeElement
  | CreationFlowGroupElement
  | CreationFlowVariableElement
  | CreationFlowPatternElement;

export interface CreationFlowAsset {
  readonly id: AssetId;
  readonly type: "image" | "font" | "vector" | "pdf";
  readonly name: string;
  readonly source: string;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
}

export type CreationFlowVariableValue = string | number | boolean | null;

export interface CreationFlowVariable {
  readonly id: VariableId;
  readonly name: string;
  readonly type: "text" | "number" | "boolean" | "image" | "color";
  readonly defaultValue?: CreationFlowVariableValue;
}

export type CreationFlowRuleCondition =
  | { readonly kind: "equals"; readonly variable: string; readonly value: CreationFlowVariableValue }
  | { readonly kind: "notEquals"; readonly variable: string; readonly value: CreationFlowVariableValue }
  | { readonly kind: "present"; readonly variable: string };

export type CreationFlowRuleConditionGroup = {
  readonly all?: readonly CreationFlowRuleCondition[];
  readonly any?: readonly CreationFlowRuleCondition[];
} | readonly CreationFlowRuleCondition[];

export type CreationFlowRuleType = "visibility" | "mandatory" | "valueDependency";

export type CreationFlowRuleAction =
  | { readonly type: "setVariable"; readonly name: string; readonly value: CreationFlowVariableValue }
  | { readonly type: "showSurface"; readonly pageId: PageId; readonly surfaceId: SurfaceId }
  | { readonly type: "hideSurface"; readonly pageId: PageId; readonly surfaceId: SurfaceId }
  | { readonly type: "requireVariable"; readonly name: string; readonly message?: string }
  | { readonly type: "validate"; readonly message: string };

export interface CreationFlowRule {
  readonly id: RuleId;
  readonly name: string;
  readonly type?: CreationFlowRuleType;
  readonly condition: CreationFlowRuleConditionGroup;
  readonly actions: readonly CreationFlowRuleAction[];
  readonly enabled: boolean;
}

export interface CreationFlowDocument {
  readonly id: DocumentId;
  readonly version: string;
  readonly metadata: CreationFlowDocumentMetadata;
  readonly pages: readonly CreationFlowPage[];
  readonly variables: readonly CreationFlowVariable[];
  readonly assets: readonly CreationFlowAsset[];
  readonly rules: readonly CreationFlowRule[];
}

export function isTextElement(element: CreationFlowElement): element is CreationFlowTextElement {
  return element.type === "text";
}

export function isImageElement(element: CreationFlowElement): element is CreationFlowImageElement {
  return element.type === "image";
}

export function isPatternElement(element: CreationFlowElement): element is CreationFlowPatternElement {
  return element.type === "pattern";
}
