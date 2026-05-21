import type { CreationFlowDocument, CreationFlowRule } from "@creationflow/schema";

export interface RuleEvaluationResult {
  readonly appliedRules: readonly CreationFlowRule[];
  readonly document: CreationFlowDocument;
}

export function evaluateRules(document: CreationFlowDocument): RuleEvaluationResult {
  return {
    appliedRules: [],
    document,
  };
}
