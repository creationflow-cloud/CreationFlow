import { describe, expect, it } from "vitest";

import { evaluateRules } from "./evaluateRules.js";
import type {
  CreationFlowDocument,
  CreationFlowRule,
  CreationFlowRuleAction,
  DocumentId,
  PageId,
  RuleId,
  SurfaceId,
  WorkspaceId,
} from "@creationflow/schema";
import type { RuleAction } from "./types.js";

const docId = (value: string) => value as unknown as DocumentId;
const wsId = (value: string) => value as unknown as WorkspaceId;
const ruleId = (value: string) => value as unknown as RuleId;

function makeDocument(
  conditions: unknown,
  actions: readonly CreationFlowRuleAction[] = [],
  options: { readonly enabled?: boolean; readonly name?: string; readonly type?: CreationFlowRule["type"] } = {},
): CreationFlowDocument {
  const rule: CreationFlowRule = {
    id: ruleId("r1"),
    name: options.name ?? "rule-1",
    enabled: options.enabled ?? true,
    condition: conditions as CreationFlowRule["condition"],
    actions,
    ...(options.type !== undefined && { type: options.type }),
  };

  return {
    id: docId("doc-1"),
    version: "0",
    metadata: {
      workspaceId: wsId("ws-1"),
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    pages: [],
    variables: [],
    assets: [],
    rules: [rule],
  };
}

describe("evaluateRules", () => {
  it("applies a rule whose equals condition matches", () => {
    const document = makeDocument({
      all: [{ kind: "equals", variable: "color", value: "red" }],
    });

    const result = evaluateRules(document, { variables: { color: "red" } });
    expect(result.appliedRules).toHaveLength(1);
    expect(result.appliedRules[0]?.id).toBe(ruleId("r1"));
    expect(result.skippedRules).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("skips a rule whose equals condition does not match", () => {
    const document = makeDocument({
      all: [{ kind: "equals", variable: "color", value: "red" }],
    });

    const result = evaluateRules(document, { variables: { color: "blue" } });
    expect(result.appliedRules).toEqual([]);
    expect(result.skippedRules).toHaveLength(1);
  });

  it("applies a rule when all conditions in `all` match", () => {
    const document = makeDocument({
      all: [
        { kind: "equals", variable: "color", value: "red" },
        { kind: "present", variable: "size" },
      ],
    });

    const result = evaluateRules(document, { variables: { color: "red", size: "L" } });
    expect(result.appliedRules).toHaveLength(1);
  });

  it("supports `any` semantics", () => {
    const document = makeDocument({
      any: [
        { kind: "equals", variable: "color", value: "red" },
        { kind: "equals", variable: "color", value: "blue" },
      ],
    });

    const result = evaluateRules(document, { variables: { color: "blue" } });
    expect(result.appliedRules).toHaveLength(1);
  });

  it("skips disabled rules without evaluation", () => {
    const document = makeDocument(
      { all: [{ kind: "equals", variable: "color", value: "red" }] },
      [],
      { enabled: false },
    );

    const result = evaluateRules(document, { variables: { color: "red" } });
    expect(result.appliedRules).toEqual([]);
    expect(result.skippedRules).toHaveLength(1);
  });

  it("captures errors for unknown condition kinds and skips the rule", () => {
    const document = makeDocument({ all: [{ kind: "unknown", variable: "color" }] });
    const result = evaluateRules(document, { variables: { color: "red" } });
    expect(result.appliedRules).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toMatch(/Unknown condition kind/);
  });

  it("captures errors for unknown action types", () => {
    const document = makeDocument(
      { all: [{ kind: "equals", variable: "color", value: "red" }] },
      [{ type: "launchMissiles" } as unknown as CreationFlowRuleAction],
    );

    const result = evaluateRules(document, { variables: { color: "red" } });
    expect(result.appliedRules).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });

  it("returns applied actions alongside their rule", () => {
    const document = makeDocument(
      { all: [{ kind: "equals", variable: "color", value: "red" }] },
      [
        { type: "setVariable", name: "size", value: "L" },
        { type: "validate", message: "Pick a size" },
      ],
    );

    const result = evaluateRules(document, { variables: { color: "red" } });
    expect(result.appliedRules[0]?.actions).toEqual<RuleAction[]>([
      { type: "setVariable", name: "size", value: "L" },
      { type: "validate", message: "Pick a size" },
    ]);
  });

  it("treats a missing rule condition as matching (no constraints)", () => {
    const document = makeDocument({});
    const result = evaluateRules(document, { variables: {} });
    expect(result.appliedRules).toHaveLength(1);
  });

  it("returns the original document untouched", () => {
    const document = makeDocument({ all: [{ kind: "present", variable: "x" }] });
    const result = evaluateRules(document, { variables: { x: 1 } });
    expect(result.document).toBe(document);
  });
});

describe("evaluateRules rule types", () => {
  it("supports visibility rules via showSurface / hideSurface actions", () => {
    const document = makeDocument(
      { all: [{ kind: "equals", variable: "showFront", value: true }] },
      [
        { type: "showSurface", pageId: "page-1" as unknown as PageId, surfaceId: "front" as unknown as SurfaceId },
        { type: "hideSurface", pageId: "page-1" as unknown as PageId, surfaceId: "back" as unknown as SurfaceId },
      ],
      { name: "visibility-rule" },
    );

    const result = evaluateRules(document, { variables: { showFront: true } });
    expect(result.appliedRules).toHaveLength(1);
    expect(result.appliedRules[0]?.actions).toEqual<RuleAction[]>([
      { type: "showSurface", pageId: "page-1" as unknown as PageId, surfaceId: "front" as unknown as SurfaceId },
      { type: "hideSurface", pageId: "page-1" as unknown as PageId, surfaceId: "back" as unknown as SurfaceId },
    ]);
    expect(result.mandatoryViolations).toEqual([]);
  });

  it("supports mandatory field rules via requireVariable", () => {
    const document = makeDocument(
      { all: [{ kind: "equals", variable: "needsEmail", value: true }] },
      [{ type: "requireVariable", name: "email", message: "Email is required" }],
      { name: "mandatory-rule" },
    );

    const result = evaluateRules(document, { variables: { needsEmail: true } });
    expect(result.appliedRules).toHaveLength(1);
    expect(result.mandatoryViolations).toEqual([
      { ruleId: ruleId("r1"), variableName: "email", message: "Email is required" },
    ]);
  });

  it("does not report a mandatory violation when the variable is present", () => {
    const document = makeDocument(
      { all: [{ kind: "equals", variable: "needsEmail", value: true }] },
      [{ type: "requireVariable", name: "email" }],
    );

    const result = evaluateRules(document, {
      variables: { needsEmail: true, email: "user@example.com" },
    });
    expect(result.mandatoryViolations).toEqual([]);
  });

  it("supports value dependency rules via setVariable", () => {
    const document = makeDocument(
      { all: [{ kind: "equals", variable: "color", value: "red" }] },
      [
        { type: "setVariable", name: "size", value: "L" },
        { type: "setVariable", name: "weight", value: 700 },
      ],
      { name: "value-dependency-rule" },
    );

    const result = evaluateRules(document, { variables: { color: "red" } });
    expect(result.appliedRules[0]?.actions).toEqual<RuleAction[]>([
      { type: "setVariable", name: "size", value: "L" },
      { type: "setVariable", name: "weight", value: 700 },
    ]);
    expect(result.mandatoryViolations).toEqual([]);
  });

  it("surfaces the rule type on the applied rule entry", () => {
    const document: CreationFlowDocument = {
      id: docId("doc-1"),
      version: "0",
      metadata: {
        workspaceId: wsId("ws-1"),
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      pages: [],
      variables: [],
      assets: [],
      rules: [
        {
          id: ruleId("r-mandatory"),
          name: "mandatory-rule",
          type: "mandatory",
          enabled: true,
          condition: { all: [] },
          actions: [{ type: "requireVariable", name: "name" }],
        },
      ],
    };

    const result = evaluateRules(document, { variables: {} });
    expect(result.appliedRules[0]?.type).toBe("mandatory");
    expect(result.mandatoryViolations).toHaveLength(1);
  });
});
