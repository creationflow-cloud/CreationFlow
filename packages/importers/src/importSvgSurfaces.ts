import type { CreationFlowSurface, SurfaceId } from "@creationflow/schema";
import type { SvgSurfaceImportResult, SvgSurfaceImportWarning, SvgImportOptions } from "./types.js";
import { parseSvg } from "./parseSvg.js";
import { inferRoleFromName } from "./roleMapper.js";

export function importSvgSurfaces(
  svgString: string,
  options: SvgImportOptions = {},
): SvgSurfaceImportResult {
  // options reserved for future per-import configuration (unit, default role)
  void options;
  const warnings: SvgSurfaceImportWarning[] = [];
  const parsed = parseSvg(svgString, warnings);

  if (parsed.paths.length === 0 && parsed.rects.length === 0) {
    warnings.push({
      code: "empty_svg",
      message: "No supported elements found in SVG. Result contains no surfaces.",
    });
  }

  const surfaces: CreationFlowSurface[] = [];

  for (const path of parsed.paths) {
    const name = path.label || path.id || `Path ${surfaces.length + 1}`;
    const explicitRole = path.role as
      | "default"
      | "colorRegion"
      | "designRegion"
      | "overlay"
      | undefined;
    const role = explicitRole ?? inferRoleFromName(name);
    const isDesignRegion = role === "designRegion";

    surfaces.push({
      id: crypto.randomUUID() as SurfaceId,
      name,
      width: parsed.width,
      height: parsed.height,
      unit: "px",
      elements: [],
      shape: "path",
      role,
      pathData: path.d,
      fillColor: path.fill,
      clipContent: isDesignRegion,
    });
  }

  for (const rect of parsed.rects) {
    const name = rect.label || rect.id || `Rect ${surfaces.length + 1}`;
    const explicitRole = rect.role as
      | "default"
      | "colorRegion"
      | "designRegion"
      | "overlay"
      | undefined;
    const role = explicitRole ?? inferRoleFromName(name);
    const isDesignRegion = role === "designRegion";

    const pathData = `M${rect.x} ${rect.y} L${rect.x + rect.width} ${rect.y} L${rect.x + rect.width} ${rect.y + rect.height} L${rect.x} ${rect.y + rect.height} Z`;

    surfaces.push({
      id: crypto.randomUUID() as SurfaceId,
      name,
      width: parsed.width,
      height: parsed.height,
      unit: "px",
      elements: [],
      shape: "path",
      role,
      pathData,
      fillColor: rect.fill,
      clipContent: isDesignRegion,
    });
  }

  return {
    width: parsed.width,
    height: parsed.height,
    viewBox: parsed.viewBox,
    surfaces,
    warnings,
  };
}
