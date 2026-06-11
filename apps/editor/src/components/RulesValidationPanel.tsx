import type { RuleEvaluationWarning, RuleMandatoryViolation } from "@creationflow/rules-engine";

interface RulesValidationPanelProps {
  readonly mandatoryViolations: readonly RuleMandatoryViolation[];
  readonly warnings: readonly RuleEvaluationWarning[];
}

export function RulesValidationPanel({ mandatoryViolations, warnings }: RulesValidationPanelProps) {
  const hasIssues = mandatoryViolations.length > 0 || warnings.length > 0;

  if (!hasIssues) {
    return (
      <div className="property-card">
        <h3>Rule validation</h3>
        <p className="empty-state-text">All rules satisfied.</p>
      </div>
    );
  }

  return (
    <div className="property-card">
      <h3>Rule validation</h3>
      {mandatoryViolations.length > 0 && (
        <section className="rules-violations-section">
          <h4 className="rules-violations-heading">
            Mandatory violations ({mandatoryViolations.length})
          </h4>
          <ul className="rules-violations-list">
            {mandatoryViolations.map((violation) => (
              <li key={`${violation.ruleId}-${violation.variableName}`}>
                <strong>{violation.ruleId}</strong> ({violation.variableName}):{" "}
                {violation.message ?? "Required value missing"}
              </li>
            ))}
          </ul>
        </section>
      )}
      {warnings.length > 0 && (
        <section className="rules-warnings-section">
          <h4 className="rules-warnings-heading">Warnings ({warnings.length})</h4>
          <ul className="rules-warnings-list">
            {warnings.map((warning) => (
              <li key={warning.ruleId}>
                <strong>{warning.ruleId}</strong>: {warning.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
