import { describe, expect, it } from "vitest";

import {
  collectEditorVariables,
  formatVariablePreviewValue,
  resolveVariablePreview,
} from "./rule-variables.js";
import type { ConfigurationDto } from "../api/configurations.js";
import type { CreationFlowDocument, VariableId } from "@creationflow/schema";

function makeDocument(
  variables: { id: string; name: string; defaultValue?: string | null }[] = [],
): CreationFlowDocument {
  return {
    id: "doc-1" as unknown as CreationFlowDocument["id"],
    version: "0.0.0",
    metadata: {
      workspaceId: "ws-1" as unknown as CreationFlowDocument["metadata"]["workspaceId"],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    pages: [],
    variables: variables.map((variable) => ({
      id: variable.id as unknown as VariableId,
      name: variable.name,
      type: "text",
      defaultValue:
        variable.defaultValue === undefined ? undefined : variable.defaultValue,
    })) as CreationFlowDocument["variables"],
    assets: [],
    rules: [],
  } as unknown as CreationFlowDocument;
}

describe("collectEditorVariables", () => {
  it("returns an empty map for documents without variables or configuration", () => {
    const document = makeDocument();
    expect(collectEditorVariables(document, null)).toEqual({});
  });

  it("applies document variable defaults when no configuration value exists", () => {
    const document = makeDocument([
      { id: "var-name", name: "name", defaultValue: "Default" },
    ]);
    expect(collectEditorVariables(document, null)).toEqual({ name: "Default" });
  });

  it("coerces non-string configuration values to strings", () => {
    const document = makeDocument();
    const configuration = { variables: { count: 7, ready: true } } as unknown as ConfigurationDto;
    expect(collectEditorVariables(document, configuration)).toEqual({
      count: "7",
      ready: "true",
    });
  });

  it("prefers configuration values over document defaults", () => {
    const document = makeDocument([
      { id: "var-name", name: "name", defaultValue: "Default" },
    ]);
    const configuration = { variables: { name: "Override" } } as unknown as ConfigurationDto;
    expect(collectEditorVariables(document, configuration)).toEqual({ name: "Override" });
  });

  it("skips variables without a default when no configuration value is present", () => {
    const document = makeDocument([{ id: "v1", name: "color" }]);
    expect(collectEditorVariables(document, null)).toEqual({});
  });
});

describe("formatVariablePreviewValue", () => {
  it("returns fallback when value is null or undefined", () => {
    expect(formatVariablePreviewValue(null, "fallback")).toBe("fallback");
    expect(formatVariablePreviewValue(undefined, "fallback")).toBe("fallback");
  });

  it("returns fallback when string is empty", () => {
    expect(formatVariablePreviewValue("", "fallback")).toBe("fallback");
  });

  it("returns placeholder when no fallback is provided", () => {
    expect(formatVariablePreviewValue(null)).toBe("—");
  });

  it("stringifies non-null values", () => {
    expect(formatVariablePreviewValue("Hello")).toBe("Hello");
    expect(formatVariablePreviewValue(42)).toBe("42");
    expect(formatVariablePreviewValue(false)).toBe("false");
  });
});

describe("resolveVariablePreview", () => {
  it("returns the value bound to the variable name when defined", () => {
    const document = makeDocument([{ id: "var-name", name: "name" }]);
    const result = resolveVariablePreview({
      document,
      variableId: "var-name" as unknown as VariableId,
      variables: { name: "Hello" },
    });
    expect(result.display).toBe("Hello");
    expect(result.variable?.name).toBe("name");
  });

  it("falls back to the provided fallback when value is missing", () => {
    const document = makeDocument([{ id: "var-name", name: "name" }]);
    const result = resolveVariablePreview({
      document,
      variableId: "var-name" as unknown as VariableId,
      variables: {},
      fallback: "Default",
    });
    expect(result.display).toBe("Default");
  });

  it("returns the placeholder when the variable id is unknown", () => {
    const document = makeDocument();
    const result = resolveVariablePreview({
      document,
      variableId: "missing" as unknown as VariableId,
      variables: {},
      fallback: "Default",
    });
    expect(result.variable).toBeUndefined();
    expect(result.display).toBe("Default");
  });

  it("uses em-dash placeholder when no fallback and no value is available", () => {
    const document = makeDocument();
    const result = resolveVariablePreview({
      document,
      variableId: "missing" as unknown as VariableId,
      variables: {},
    });
    expect(result.display).toBe("—");
  });
});
