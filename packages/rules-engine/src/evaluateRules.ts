import type { CreationFlowDocument, CreationFlowRule } from "@creationflow/schema";

import type {
  RuleEvaluationContext,
  RuleEvaluationError,
  RuleEvaluationResult,
  RuleEvaluationWarning,
} from "./types.js";

export function evaluateRules(
  document: CreationFlowDocument,
  context: RuleEvaluationContext,
): RuleEvaluationResult {
  void context;

  const appliedRules: never[] = [];
  const skippedRules: CreationFlowRule[] = [];
  const warnings: RuleEvaluationWarning[] = [];
  const errors: RuleEvaluationError[] = [];

  for (const rule of document.rules) {
    if (!rule.enabled) {
      skippedRules.push(rule);
      continue;
    }

    skippedRules.push(rule);
    warnings.push({
      ruleId: rule.id,
      message: "Rule conditions are not evaluated yet.",
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
