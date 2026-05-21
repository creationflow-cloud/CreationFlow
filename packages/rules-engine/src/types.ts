import type {
  CreationFlowDocument,
  CreationFlowRule,
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

export interface RuleEvaluationResult {
  readonly document: CreationFlowDocument;
  readonly appliedRules: readonly never[];
  readonly skippedRules: readonly CreationFlowRule[];
  readonly warnings: readonly RuleEvaluationWarning[];
  readonly errors: readonly RuleEvaluationError[];
}
