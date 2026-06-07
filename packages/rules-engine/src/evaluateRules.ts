import type {
  CreationFlowDocument,
  CreationFlowRule,
  PageId,
  SurfaceId,
} from "@creationflow/schema";

import type {
  RuleAction,
  RuleCondition,
  RuleEvaluationAppliedRule,
  RuleEvaluationContext,
  RuleEvaluationError,
  RuleEvaluationResult,
  RuleEvaluationWarning,
  RuleVariableValue,
} from "./types.js";

export function evaluateRules(
  document: CreationFlowDocument,
  context: RuleEvaluationContext,
): RuleEvaluationResult {
  const appliedRules: RuleEvaluationAppliedRule[] = [];
  const skippedRules: CreationFlowRule[] = [];
  const warnings: RuleEvaluationWarning[] = [];
  const errors: RuleEvaluationError[] = [];

  for (const rule of document.rules) {
    if (!rule.enabled) {
      skippedRules.push(rule);
      continue;
    }

    const parsed = parseConditions(rule.condition);

    if (parsed instanceof Error) {
      errors.push({ ruleId: rule.id, message: parsed.message });
      skippedRules.push(rule);
      continue;
    }

    const matched =
      parsed.conditions.length === 0 ||
      (parsed.mode === "all"
        ? parsed.conditions.every((condition) => evaluateCondition(condition, context))
        : parsed.conditions.some((condition) => evaluateCondition(condition, context)));

    if (!matched) {
      skippedRules.push(rule);
      continue;
    }

    const actions = parseActions(rule.actions);

    if (actions instanceof Error) {
      errors.push({ ruleId: rule.id, message: actions.message });
      skippedRules.push(rule);
      continue;
    }

    appliedRules.push({
      id: rule.id,
      name: rule.name,
      actions,
    });
  }

  return {
    document,
    appliedRules,
    skippedRules,
    warnings,
    errors,
  };
}

interface ParsedConditionGroup {
  readonly mode: "all" | "any";
  readonly conditions: readonly RuleCondition[];
}

function parseConditions(condition: unknown): ParsedConditionGroup | Error {
  if (!condition || typeof condition !== "object") {
    return { mode: "all", conditions: [] };
  }
  const root = condition as { all?: unknown; any?: unknown };
  if (Array.isArray(root.all)) {
    const list = parseConditionList(root.all);
    return list instanceof Error ? list : { mode: "all", conditions: list };
  }
  if (Array.isArray(root.any)) {
    const list = parseConditionList(root.any);
    return list instanceof Error ? list : { mode: "any", conditions: list };
  }
  if (Array.isArray(condition)) {
    const list = parseConditionList(condition);
    return list instanceof Error ? list : { mode: "all", conditions: list };
  }
  // Empty object without all/any counts as "no constraints" (matches by default).
  if (Object.keys(root).length === 0) {
    return { mode: "all", conditions: [] };
  }
  return new Error("Rule condition must be { all: [...] } or { any: [...] } or an array.");
}

function parseConditionList(values: readonly unknown[]): readonly RuleCondition[] | Error {
  const conditions: RuleCondition[] = [];
  for (const value of values) {
    const condition = parseCondition(value);
    if (condition instanceof Error) {
      return condition;
    }
    conditions.push(condition);
  }
  return conditions;
}

function parseCondition(value: unknown): RuleCondition | Error {
  if (!value || typeof value !== "object") {
    return new Error("Condition entry must be an object.");
  }
  const record = value as Record<string, unknown>;
  const kind = record.kind;

  if (kind === "equals" || kind === "notEquals") {
    if (typeof record.variable !== "string") {
      return new Error(`Condition ${kind} requires a string "variable".`);
    }
    if (!isVariableValue(record.value)) {
      return new Error(`Condition ${kind} requires a scalar "value".`);
    }
    return {
      kind,
      variable: record.variable,
      value: record.value,
    } as RuleCondition;
  }

  if (kind === "present") {
    if (typeof record.variable !== "string") {
      return new Error('Condition "present" requires a string "variable".');
    }
    return { kind, variable: record.variable };
  }

  return new Error(`Unknown condition kind: ${String(kind)}.`);
}

function isVariableValue(value: unknown): value is RuleVariableValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function evaluateCondition(condition: RuleCondition, context: RuleEvaluationContext): boolean {
  const actual = context.variables[condition.variable];

  switch (condition.kind) {
    case "equals":
      return actual === condition.value;
    case "notEquals":
      return actual !== condition.value;
    case "present":
      return actual !== undefined && actual !== null;
  }
}

function parseActions(rawActions: readonly unknown[]): readonly RuleAction[] | Error {
  const actions: RuleAction[] = [];
  for (const raw of rawActions) {
    const action = parseAction(raw);
    if (action instanceof Error) {
      return action;
    }
    actions.push(action);
  }
  return actions;
}

function parseAction(raw: unknown): RuleAction | Error {
  if (!raw || typeof raw !== "object") {
    return new Error("Action must be an object.");
  }
  const record = raw as Record<string, unknown>;

  if (record.type === "setVariable") {
    if (typeof record.name !== "string") {
      return new Error('Action "setVariable" requires a string "name".');
    }
    if (!isVariableValue(record.value)) {
      return new Error('Action "setVariable" requires a scalar "value".');
    }
    return { type: "setVariable", name: record.name, value: record.value };
  }

  if (record.type === "showSurface" || record.type === "hideSurface") {
    if (typeof record.pageId !== "string" || typeof record.surfaceId !== "string") {
      return new Error(`Action "${record.type}" requires pageId and surfaceId.`);
    }
    return {
      type: record.type,
      pageId: record.pageId as unknown as PageId,
      surfaceId: record.surfaceId as unknown as SurfaceId,
    };
  }

  if (record.type === "validate") {
    if (typeof record.message !== "string") {
      return new Error('Action "validate" requires a string "message".');
    }
    return { type: "validate", message: record.message };
  }

  return new Error(`Unknown action type: ${String(record.type)}.`);
}
