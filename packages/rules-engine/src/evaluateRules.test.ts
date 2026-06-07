import { describe, expect, it } from "vitest";

import { evaluateRules } from "./evaluateRules.js";
import type { CreationFlowDocument, DocumentId, RuleId, WorkspaceId } from "@creationflow/schema";

const docId = (value: string) => value as unknown as DocumentId;
const wsId = (value: string) => value as unknown as WorkspaceId;

function makeDocument(rules: CreationFlowDocument["rules"]): CreationFlowDocument {
  return {
    id: docId("doc-1"),
    version: "1",
    metadata: {
      workspaceId: wsId("ws-1"),
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    pages: [],
    variables: [],
    assets: [],
    rules,
  };
}

const ruleId = (value: string) => value as unknown as RuleId;

describe("evaluateRules", () => {
  it("marks disabled rules as skipped without warnings", () => {
    const document = makeDocument([
      { id: ruleId("r1"), name: "r1", enabled: false, condition: {}, actions: [] },
    ]);
    const result = evaluateRules(document, { variables: {} });

    expect(result.skippedRules.map((r) => r.id)).toEqual([ruleId("r1")]);
    expect(result.appliedRules).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("emits a warning for every enabled rule (MVP stub behaviour)", () => {
    const document = makeDocument([
      { id: ruleId("r1"), name: "r1", enabled: true, condition: {}, actions: [] },
      { id: ruleId("r2"), name: "r2", enabled: true, condition: {}, actions: [] },
    ]);
    const result = evaluateRules(document, { variables: {} });

    expect(result.warnings.map((w) => w.ruleId)).toEqual([ruleId("r1"), ruleId("r2")]);
    expect(result.errors).toEqual([]);
  });

  it("returns the original document untouched", () => {
    const document = makeDocument([
      { id: ruleId("r1"), name: "r1", enabled: true, condition: {}, actions: [] },
    ]);
    const result = evaluateRules(document, { variables: {} });
    expect(result.document).toBe(document);
  });
});
