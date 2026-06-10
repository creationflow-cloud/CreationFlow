import { XMLParser } from "fast-xml-parser";
import type { SvgSurfaceImportWarning } from "./types.js";

export interface ParsedPath {
  readonly id?: string;
  readonly label?: string;
  readonly d?: string;
  readonly fill?: string;
  readonly role?: string;
  readonly transform?: string;
}

export interface ParsedRect {
  readonly id?: string;
  readonly label?: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill?: string;
  readonly role?: string;
  readonly transform?: string;
}

export interface ParsedSvg {
  readonly width: number;
  readonly height: number;
  readonly viewBox?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly paths: ParsedPath[];
  readonly rects: ParsedRect[];
  readonly unsupportedElements: string[];
}

export function parseSvg(svgString: string, warnings: SvgSurfaceImportWarning[]): ParsedSvg {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    attributesGroupName: false,
    allowBooleanAttributes: true,
    parseAttributeValue: false,
    parseTagValue: false,
    trimValues: true,
  });

  let parsed: Record<string, unknown>;

  try {
    parsed = parser.parse(svgString) as Record<string, unknown>;
  } catch (error) {
    warnings.push({
      code: "unsupported_element",
      message: `SVG parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });

    return {
      width: 0,
      height: 0,
      paths: [],
      rects: [],
      unsupportedElements: [],
    };
  }

  const svg = parsed.svg as Record<string, unknown> | undefined;

  if (!svg) {
    warnings.push({
      code: "unsupported_element",
      message: "No <svg> element found in input.",
    });

    return {
      width: 0,
      height: 0,
      paths: [],
      rects: [],
      unsupportedElements: [],
    };
  }

  const width = parseDimension(svg["@_width"] as string | number | undefined);
  const height = parseDimension(svg["@_height"] as string | number | undefined);
  const viewBox = parseViewBox(svg["@_viewBox"] as string | undefined, warnings);

  if (!viewBox) {
    warnings.push({
      code: "missing_viewbox",
      message:
        width > 0 && height > 0
          ? `No viewBox found. Using width=${width} height=${height} as dimensions.`
          : "No viewBox and no width/height found. Using default 500x600.",
    });
  }

  const paths: ParsedPath[] = [];
  const rects: ParsedRect[] = [];
  const unsupportedElements: string[] = [];

  const elements = svg.path || [];
  const elementArray = Array.isArray(elements) ? elements : [elements];

  for (const element of elementArray) {
    if (typeof element !== "object" || element === null) {
      continue;
    }

    const elem = element as Record<string, unknown>;
    const transform = elem["@_transform"] as string | undefined;

    if (transform) {
      warnings.push({
        code: "ignored_transform",
        elementId: (elem["@_id"] as string) ?? undefined,
        message: `Transform attribute detected on <path>. Transform is not supported. Element skipped.`,
      });

      continue;
    }

    const d = elem["@_d"] as string | undefined;

    if (!d) {
      warnings.push({
        code: "missing_path_d",
        elementId: (elem["@_id"] as string) ?? undefined,
        message: "<path> element without 'd' attribute. Skipped.",
      });

      continue;
    }

    paths.push({
      id: elem["@_id"] as string | undefined,
      label: extractLabel(elem),
      d,
      fill: elem["@_fill"] as string | undefined,
      role: extractDataRole(elem),
      transform: undefined,
    });
  }

  const rectElements = svg.rect || [];
  const rectArray = Array.isArray(rectElements) ? rectElements : [rectElements];

  for (const element of rectArray) {
    if (typeof element !== "object" || element === null) {
      continue;
    }

    const elem = element as Record<string, unknown>;
    const transform = elem["@_transform"] as string | undefined;

    if (transform) {
      warnings.push({
        code: "ignored_transform",
        elementId: (elem["@_id"] as string) ?? undefined,
        message: `Transform attribute detected on <rect>. Transform is not supported. Element skipped.`,
      });

      continue;
    }

    const x = parseFloat((elem["@_x"] as string) ?? "0");
    const y = parseFloat((elem["@_y"] as string) ?? "0");
    const rectWidth = parseFloat((elem["@_width"] as string) ?? "0");
    const rectHeight = parseFloat((elem["@_height"] as string) ?? "0");

    if (rectWidth === 0 || rectHeight === 0) {
      warnings.push({
        code: "unsupported_element",
        elementId: (elem["@_id"] as string) ?? undefined,
        message: "<rect> with zero width or height. Skipped.",
      });

      continue;
    }

    rects.push({
      id: elem["@_id"] as string | undefined,
      label: extractLabel(elem),
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
      width: Number.isFinite(rectWidth) ? rectWidth : 0,
      height: Number.isFinite(rectHeight) ? rectHeight : 0,
      fill: elem["@_fill"] as string | undefined,
      role: extractDataRole(elem),
      transform: undefined,
    });
  }

  const polygonElements = svg.polygon || [];
  const polygonArray = Array.isArray(polygonElements) ? polygonElements : [polygonElements];

  for (const element of polygonArray) {
    if (typeof element !== "object" || element === null) {
      continue;
    }

    const elem = element as Record<string, unknown>;
    unsupportedElements.push("polygon");
    warnings.push({
      code: "unsupported_element",
      elementId: (elem["@_id"] as string) ?? undefined,
      message: "<polygon> elements are not supported yet. Skipped.",
    });
  }

  const polylineElements = svg.polyline || [];
  const polylineArray = Array.isArray(polylineElements) ? polylineElements : [polylineElements];

  for (const element of polylineArray) {
    if (typeof element !== "object" || element === null) {
      continue;
    }

    const elem = element as Record<string, unknown>;
    unsupportedElements.push("polyline");
    warnings.push({
      code: "unsupported_element",
      elementId: (elem["@_id"] as string) ?? undefined,
      message: "<polyline> elements are not supported yet. Skipped.",
    });
  }

  const textElements = svg.text || [];
  const textArray = Array.isArray(textElements) ? textElements : [textElements];

  for (const element of textArray) {
    if (typeof element !== "object" || element === null) {
      continue;
    }

    const elem = element as Record<string, unknown>;
    unsupportedElements.push("text");
    warnings.push({
      code: "unsupported_element",
      elementId: (elem["@_id"] as string) ?? undefined,
      message: "<text> elements are not supported. Skipped.",
    });
  }

  const imageElements = svg.image || [];
  const imageArray = Array.isArray(imageElements) ? imageElements : [imageElements];

  for (const element of imageArray) {
    if (typeof element !== "object" || element === null) {
      continue;
    }

    const elem = element as Record<string, unknown>;
    unsupportedElements.push("image");
    warnings.push({
      code: "unsupported_element",
      elementId: (elem["@_id"] as string) ?? undefined,
      message: "<image> elements are not supported. Skipped.",
    });
  }

  const groupElements = svg.g || [];
  const groupArray = Array.isArray(groupElements) ? groupElements : [groupElements];

  for (const element of groupArray) {
    if (typeof element !== "object" || element === null) {
      continue;
    }

    const elem = element as Record<string, unknown>;
    const transform = elem["@_transform"] as string | undefined;

    if (transform) {
      unsupportedElements.push("g (with transform)");
      warnings.push({
        code: "ignored_transform",
        elementId: (elem["@_id"] as string) ?? undefined,
        message: "<g> element with transform attribute. Transforms are not supported. Skipped.",
      });
    }
  }

  return {
    width: viewBox?.width ?? width,
    height: viewBox?.height ?? height,
    viewBox,
    paths,
    rects,
    unsupportedElements,
  };
}

function parseDimension(value: string | number | undefined): number {
  if (value === undefined || value === null) {
    return 0;
  }

  const str = String(value).replace(/px$/i, "").trim();
  const num = parseFloat(str);

  return Number.isFinite(num) ? num : 0;
}

function parseViewBox(
  viewBoxStr: string | undefined,
  warnings: SvgSurfaceImportWarning[],
):
  | { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  | undefined {
  if (!viewBoxStr) {
    return undefined;
  }

  const parts = viewBoxStr.trim().split(/\s+/);

  if (parts.length !== 4) {
    warnings.push({
      code: "missing_viewbox",
      message: `Invalid viewBox format: "${viewBoxStr}". Expected 4 numbers.`,
    });

    return undefined;
  }

  const [x, y, width, height] = parts.map(parseFloat);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    warnings.push({
      code: "missing_viewbox",
      message: `Invalid viewBox values: "${viewBoxStr}".`,
    });

    return undefined;
  }

  if (width <= 0 || height <= 0) {
    warnings.push({
      code: "missing_viewbox",
      message: `ViewBox has non-positive dimensions: ${width}x${height}.`,
    });

    return undefined;
  }

  return { x, y, width, height };
}

function extractLabel(element: Record<string, unknown>): string | undefined {
  return (
    (element["@_inkscape:label"] as string | undefined) ??
    (element["@_data-creationflow-label"] as string | undefined) ??
    (element["@_label"] as string | undefined)
  );
}

function extractDataRole(element: Record<string, unknown>): string | undefined {
  return (
    (element["@_data-role"] as string | undefined) ??
    (element["@_data-creationflow-role"] as string | undefined)
  );
}
