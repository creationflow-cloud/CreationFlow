import type {
  CreationFlowDocument,
  CreationFlowRule,
  CreationFlowRuleAction,
  CreationFlowRuleCondition,
  PageId,
  SurfaceId,
} from "@creationflow/schema";

export type RuleVariableValue = string | number | boolean | null;

export interface RuleEvaluationContext {
  readonly variables: Readonly<Record<string, RuleVariableValue>>;
  readonly currentPageId?: PageId;
  readonly currentSurfaceId?: SurfaceId;
}

export interface RuleEvaluationWarning {
  readonly ruleId: string;
  readonly message: string;
}

export interface RuleEvaluationError {
  readonly ruleId?: string;
  readonly message: string;
}

export type RuleAction = CreationFlowRuleAction;

export type RuleCondition = CreationFlowRuleCondition;

export interface RuleMandatoryViolation {
  readonly ruleId: string;
  readonly variableName: string;
  readonly message?: string;
}

export interface RuleEvaluationAppliedRule {
  readonly id: string;
  readonly name: string;
  readonly type?: CreationFlowRule["type"];
  readonly actions: readonly RuleAction[];
}

export interface RuleEvaluationResult {
  readonly document: CreationFlowDocument;
  readonly appliedRules: readonly RuleEvaluationAppliedRule[];
  readonly skippedRules: readonly CreationFlowRule[];
  readonly warnings: readonly RuleEvaluationWarning[];
  readonly errors: readonly RuleEvaluationError[];
  readonly mandatoryViolations: readonly RuleMandatoryViolation[];
}
