import type { CreationFlowSurface, CreationFlowSurfaceRole } from "@creationflow/schema";

export interface SvgSurfaceImportResult {
  readonly width: number;
  readonly height: number;
  readonly viewBox?: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly surfaces: CreationFlowSurface[];
  readonly warnings: SvgSurfaceImportWarning[];
}

export interface SvgSurfaceImportWarning {
  readonly code:
    | "missing_viewbox"
    | "ignored_transform"
    | "unsupported_element"
    | "missing_path_d"
    | "ambiguous_role"
    | "invalid_fill"
    | "empty_svg";
  readonly elementId?: string;
  readonly elementName?: string;
  readonly message: string;
}

export interface SvgImportOptions {
  readonly defaultRole?: CreationFlowSurfaceRole;
  readonly inferRolesFromNames?: boolean;
}
