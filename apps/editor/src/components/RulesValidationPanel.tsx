import { useMemo } from "react";
import { evaluateRules } from "@creationflow/rules-engine";
import type {
  RuleEvaluationError,
  RuleEvaluationResult,
  RuleEvaluationWarning,
  RuleMandatoryViolation,
  RuleVariableValue,
} from "@creationflow/rules-engine";
import type { CreationFlowDocument } from "@creationflow/schema";

interface RulesValidationPanelProps {
  readonly document: CreationFlowDocument | null;
  readonly variables: Readonly<Record<string, RuleVariableValue>>;
}

function formatEvaluation(result: RuleEvaluationResult | null) {
  if (!result) {
    return { errors: [], warnings: [], violations: [] };
  }
  return {
    errors: result.errors,
    warnings: result.warnings,
    violations: result.mandatoryViolations,
  };
}

export function RulesValidationPanel({ document, variables }: RulesValidationPanelProps) {
  const result = useMemo(() => {
    if (!document) return null;
    return evaluateRules(document, { variables });
  }, [document, variables]);

  const { errors, warnings, violations } = formatEvaluation(result);
  const hasIssues = errors.length + warnings.length + violations.length > 0;

  if (!document) {
    return (
      <section className="rules-validation rules-validation--empty">
        <h3 className="rules-validation__heading">Rules</h3>
        <p className="rules-validation__hint">No document loaded.</p>
      </section>
    );
  }

  if (!hasIssues) {
    return (
      <section className="rules-validation rules-validation--ok">
        <h3 className="rules-validation__heading">Rules</h3>
        <p className="rules-validation__hint">
          All {document.rules.length} rule{document.rules.length === 1 ? "" : "s"} pass.
        </p>
      </section>
    );
  }

  return (
    <section className="rules-validation" aria-live="polite">
      <h3 className="rules-validation__heading">Rules</h3>

      {violations.length > 0 && (
        <div className="rules-validation__group rules-validation__group--error">
          <h4>
            {violations.length} mandatory violation{violations.length === 1 ? "" : "s"}
          </h4>
          <ul>
            {violations.map((violation: RuleMandatoryViolation, index: number) => (
              <li key={`${violation.ruleId}-${violation.variableName}-${index}`}>
                <code>{violation.variableName}</code>
                {violation.message ? `: ${violation.message}` : " is required."}
              </li>
            ))}
          </ul>
          <p className="rules-validation__note">
            Save and render are blocked until these variables are filled in.
          </p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="rules-validation__group rules-validation__group--error">
          <h4>
            {errors.length} rule error{errors.length === 1 ? "" : "s"}
          </h4>
          <ul>
            {errors.map((error: RuleEvaluationError, index: number) => (
              <li key={`${error.ruleId ?? "global"}-${index}`}>
                {error.ruleId ? <code>{error.ruleId}</code> : "Rule"}
                {": "}
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rules-validation__group rules-validation__group--warning">
          <h4>
            {warnings.length} warning{warnings.length === 1 ? "" : "s"}
          </h4>
          <ul>
            {warnings.map((warning: RuleEvaluationWarning, index: number) => (
              <li key={`${warning.ruleId}-${index}`}>
                <code>{warning.ruleId}</code>
                {": "}
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
