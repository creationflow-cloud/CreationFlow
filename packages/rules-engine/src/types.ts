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

export type RuleAction =
  | { readonly type: "setVariable"; readonly name: string; readonly value: RuleVariableValue }
  | { readonly type: "showSurface"; readonly pageId: PageId; readonly surfaceId: SurfaceId }
  | { readonly type: "hideSurface"; readonly pageId: PageId; readonly surfaceId: SurfaceId }
  | { readonly type: "validate"; readonly message: string };

export interface RuleConditionEquals {
  readonly kind: "equals";
  readonly variable: string;
  readonly value: RuleVariableValue;
}

export interface RuleConditionNotEquals {
  readonly kind: "notEquals";
  readonly variable: string;
  readonly value: RuleVariableValue;
}

export interface RuleConditionPresent {
  readonly kind: "present";
  readonly variable: string;
}

export type RuleCondition = RuleConditionEquals | RuleConditionNotEquals | RuleConditionPresent;

export interface RuleEvaluationAppliedRule {
  readonly id: string;
  readonly name: string;
  readonly actions: readonly RuleAction[];
}

export interface RuleEvaluationResult {
  readonly document: CreationFlowDocument;
  readonly appliedRules: readonly RuleEvaluationAppliedRule[];
  readonly skippedRules: readonly CreationFlowRule[];
  readonly warnings: readonly RuleEvaluationWarning[];
  readonly errors: readonly RuleEvaluationError[];
}
