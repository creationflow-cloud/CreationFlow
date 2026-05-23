import type { CreationFlowSurfaceRole } from "@creationflow/schema";

export function inferRoleFromName(name: string | undefined): CreationFlowSurfaceRole {
  if (!name) {
    return "default";
  }

  const lower = name.toLowerCase().trim();

  if (
    lower.includes("color") ||
    lower.includes("colour") ||
    lower.includes("body") ||
    lower.includes("front-color")
  ) {
    return "colorRegion";
  }

  if (
    lower.includes("design") ||
    lower.includes("print") ||
    lower.includes("druck") ||
    lower.includes("print-area")
  ) {
    return "designRegion";
  }

  if (
    lower.includes("overlay") ||
    lower.includes("shadow") ||
    lower.includes("seam") ||
    lower.includes("fold")
  ) {
    return "overlay";
  }

  return "default";
}
