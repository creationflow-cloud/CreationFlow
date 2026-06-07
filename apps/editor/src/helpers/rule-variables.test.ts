import { describe, expect, it } from "vitest";

import { collectEditorVariables } from "./rule-variables.js";
import type {
  CreationFlowDocument,
  DocumentId,
  VariableId,
  WorkspaceId,
} from "@creationflow/schema";

const docId = (value: string) => value as unknown as DocumentId;
const wsId = (value: string) => value as unknown as WorkspaceId;
const varId = (value: string) => value as unknown as VariableId;

function makeDocument(
  variables: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly defaultValue?: string | number | boolean | null;
  }>,
): CreationFlowDocument {
  return {
    id: docId("doc-1"),
    version: "0",
    metadata: {
      workspaceId: wsId("ws-1"),
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    pages: [],
    variables: variables.map((v) => ({
      id: varId(v.id) as VariableId,
      name: v.name,
      type: "text",
      ...(v.defaultValue !== undefined ? { defaultValue: v.defaultValue } : {}),
    })) as CreationFlowDocument["variables"],
    assets: [],
    rules: [],
  };
}

describe("collectEditorVariables", () => {
  it("returns document default values when no configuration values are provided", () => {
    const document = makeDocument([
      { id: "v1", name: "color", defaultValue: "blue" },
    ]);
    const result = collectEditorVariables(document, null);
    expect(result).toEqual({ color: "blue" });
  });

  it("lets configuration values override document defaults", () => {
    const document = makeDocument([
      { id: "v1", name: "color", defaultValue: "blue" },
    ]);
    const result = collectEditorVariables(document, {
      id: "cfg-1",
      workspaceId: "ws-1",
      templateId: "tpl-1",
      document: {},
      status: "draft",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      variables: { color: "red" },
    } as unknown as Parameters<typeof collectEditorVariables>[1]);
    expect(result).toEqual({ color: "red" });
  });

  it("skips variables without a default when no configuration value is present", () => {
    const document = makeDocument([{ id: "v1", name: "color" }]);
    const result = collectEditorVariables(document, null);
    expect(result).toEqual({});
  });
});
