import { useCallback, useMemo, useState } from "react";
import { evaluateRules } from "@creationflow/rules-engine";
import type {
  RuleEvaluationError,
  RuleEvaluationResult,
  RuleEvaluationWarning,
  RuleMandatoryViolation,
  RuleVariableValue,
} from "@creationflow/rules-engine";
import type {
  CreationFlowDocument,
  CreationFlowRule,
  CreationFlowRuleAction,
  CreationFlowRuleCondition,
  CreationFlowRuleType,
  RuleId,
} from "@creationflow/schema";

interface RulesEditorProps {
  readonly document: Record<string, unknown>;
  readonly onChange: (document: Record<string, unknown>) => void;
}

const RULE_TYPE_LABELS: Record<CreationFlowRuleType, string> = {
  visibility: "Visibility",
  mandatory: "Mandatory Field",
  valueDependency: "Value Dependency",
};

const CONDITION_KIND_LABELS: Record<CreationFlowRuleCondition["kind"], string> = {
  equals: "equals",
  notEquals: "does not equal",
  present: "is present",
};

function toRuleId(value: string): RuleId {
  return value as unknown as RuleId;
}

function readRuleList(document: Record<string, unknown>): CreationFlowRule[] {
  const raw = document.rules;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw as CreationFlowRule[];
}

function makeEmptyCondition(): CreationFlowRuleCondition {
  return { kind: "equals", variable: "", value: "" };
}

function makeEmptyAction(type: CreationFlowRuleAction["type"]): CreationFlowRuleAction {
  switch (type) {
    case "setVariable":
      return { type, name: "", value: "" };
    case "requireVariable":
      return { type, name: "" };
    case "showSurface":
    case "hideSurface":
      return { type, pageId: "" as never, surfaceId: "" as never };
    case "validate":
      return { type, message: "" };
  }
}

function newRule(): CreationFlowRule {
  return {
    id: toRuleId(crypto.randomUUID()),
    name: "New rule",
    type: "visibility",
    enabled: true,
    condition: { all: [] },
    actions: [makeEmptyAction("showSurface")],
  };
}

function summarizeEvaluation(
  result: RuleEvaluationResult | null,
): {
  errors: readonly RuleEvaluationError[];
  warnings: readonly RuleEvaluationWarning[];
  violations: readonly RuleMandatoryViolation[];
} {
  if (!result) {
    return { errors: [], warnings: [], violations: [] };
  }
  return {
    errors: result.errors,
    warnings: result.warnings,
    violations: result.mandatoryViolations,
  };
}

export function RulesEditor({ document, onChange }: RulesEditorProps) {
  const [ruleVariables] = useState<Record<string, RuleVariableValue>>({});

  const rules = useMemo(() => readRuleList(document), [document]);
  const editorDocument = useMemo<CreationFlowDocument>(
    () => document as unknown as CreationFlowDocument,
    [document],
  );

  const evaluation = useMemo(
    () => evaluateRules(editorDocument, { variables: ruleVariables }),
    [editorDocument, ruleVariables],
  );

  const { errors, warnings, violations } = summarizeEvaluation(evaluation);

  const updateRules = useCallback(
    (next: CreationFlowRule[]) => {
      onChange({ ...document, rules: next });
    },
    [document, onChange],
  );

  const handleAddRule = () => {
    updateRules([...rules, newRule()]);
  };

  const handleUpdateRule = (index: number, patch: Partial<CreationFlowRule>) => {
    updateRules(
      rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  };

  const handleDeleteRule = (index: number) => {
    if (!window.confirm("Delete this rule? This action cannot be undone.")) {
      return;
    }
    updateRules(rules.filter((_, i) => i !== index));
  };

  const handleMoveRule = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rules.length) return;
    const next = [...rules];
    const swap = next[index];
    const other = next[target];
    if (!swap || !other) return;
    next[index] = other;
    next[target] = swap;
    updateRules(next);
  };

  return (
    <section className="rules-editor" aria-label="Rules editor">
      <header className="rules-editor__header">
        <div>
          <h3>Rules</h3>
          <p className="rules-editor__hint">
            Define visibility, mandatory, and value-dependency rules for this template.
          </p>
        </div>
        <button type="button" className="add-rule-btn" onClick={handleAddRule}>
          + Add rule
        </button>
      </header>

      {rules.length === 0 && (
        <p className="rules-editor__empty">
          No rules yet. Add your first rule above.
        </p>
      )}

      {rules.length > 0 && (
        <ul className="rules-editor__list">
          {rules.map((rule, index) => (
            <RuleCard
              key={rule.id}
              index={index}
              rule={rule}
              total={rules.length}
              onUpdate={(patch) => handleUpdateRule(index, patch)}
              onDelete={() => handleDeleteRule(index)}
              onMove={handleMoveRule}
            />
          ))}
        </ul>
      )}

      {(errors.length > 0 || warnings.length > 0 || violations.length > 0) && (
        <section className="rules-editor__feedback">
          {violations.length > 0 && (
            <div className="rules-editor__group rules-editor__group--error">
              <h4>{violations.length} mandatory violation(s)</h4>
              <ul>
                {violations.map((v, i) => (
                  <li key={i}>
                    <code>{v.variableName}</code>
                    {v.message ? `: ${v.message}` : " is required."}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {errors.length > 0 && (
            <div className="rules-editor__group rules-editor__group--error">
              <h4>{errors.length} rule error(s)</h4>
              <ul>
                {errors.map((e, i) => (
                  <li key={i}>
                    {e.ruleId ? <code>{e.ruleId}</code> : "Rule"}
                    {": "}
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="rules-editor__group rules-editor__group--warning">
              <h4>{warnings.length} warning(s)</h4>
              <ul>
                {warnings.map((w, i) => (
                  <li key={i}>
                    <code>{w.ruleId}</code>
                    {": "}
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </section>
  );
}

interface RuleCardProps {
  readonly index: number;
  readonly rule: CreationFlowRule;
  readonly total: number;
  readonly onUpdate: (patch: Partial<CreationFlowRule>) => void;
  readonly onDelete: () => void;
  readonly onMove: (index: number, direction: -1 | 1) => void;
}

function RuleCard({ index, rule, total, onUpdate, onDelete, onMove }: RuleCardProps) {
  const conditions = useMemo<CreationFlowRuleCondition[]>(() => {
    if (Array.isArray(rule.condition)) return rule.condition;
    if (rule.condition && Array.isArray((rule.condition as { all?: unknown }).all)) {
      return ((rule.condition as { all: CreationFlowRuleCondition[] }).all) ?? [];
    }
    if (rule.condition && Array.isArray((rule.condition as { any?: unknown }).any)) {
      return ((rule.condition as { any: CreationFlowRuleCondition[] }).any) ?? [];
    }
    return [];
  }, [rule.condition]);

  const updateConditions = (next: CreationFlowRuleCondition[]) => {
    onUpdate({ condition: { all: next } });
  };

  const updateAction = (actionIndex: number, patch: Partial<CreationFlowRuleAction>) => {
    const next = rule.actions.map((action, i) => {
      if (i !== actionIndex) return action;
      return { ...action, ...patch } as CreationFlowRuleAction;
    });
    onUpdate({ actions: next });
  };

  const addCondition = () => {
    updateConditions([...conditions, makeEmptyCondition()]);
  };

  const updateConditionAt = (conditionIndex: number, patch: Partial<CreationFlowRuleCondition>) => {
    updateConditions(
      conditions.map((condition, i) =>
        i === conditionIndex ? ({ ...condition, ...patch } as CreationFlowRuleCondition) : condition,
      ),
    );
  };

  const removeConditionAt = (conditionIndex: number) => {
    updateConditions(conditions.filter((_, i) => i !== conditionIndex));
  };

  const addAction = (type: CreationFlowRuleAction["type"]) => {
    onUpdate({ actions: [...rule.actions, makeEmptyAction(type)] });
  };

  const removeAction = (actionIndex: number) => {
    onUpdate({ actions: rule.actions.filter((_, i) => i !== actionIndex) });
  };

  return (
    <li className="rule-card">
      <header className="rule-card__header">
        <input
          type="text"
          className="rule-name-input"
          value={rule.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Rule name"
        />
        <select
          className="rule-type-select"
          value={rule.type ?? "visibility"}
          onChange={(e) => onUpdate({ type: e.target.value as CreationFlowRuleType })}
        >
          {(Object.keys(RULE_TYPE_LABELS) as CreationFlowRuleType[]).map((type) => (
            <option key={type} value={type}>
              {RULE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <label className="rule-enabled-label">
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(e) => onUpdate({ enabled: e.target.checked })}
          />
          Enabled
        </label>
        <div className="rule-card__actions">
          <button
            type="button"
            className="rule-move-btn"
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            className="rule-move-btn"
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            className="rule-delete-btn"
            onClick={onDelete}
            title="Delete rule"
          >
            Delete
          </button>
        </div>
      </header>

      <section className="rule-section">
        <header className="rule-section__header">
          <h5>Conditions (all must match)</h5>
          <button type="button" className="rule-add-btn" onClick={addCondition}>
            + Add condition
          </button>
        </header>
        {conditions.length === 0 && (
          <p className="rule-section__empty">No conditions. Rule applies unconditionally.</p>
        )}
        {conditions.map((condition, conditionIndex) => (
          <div key={conditionIndex} className="condition-row">
            <select
              value={condition.kind}
              onChange={(e) =>
                updateConditionAt(conditionIndex, {
                  kind: e.target.value as CreationFlowRuleCondition["kind"],
                  ...(e.target.value === "present"
                    ? { variable: condition.variable }
                    : { variable: condition.variable, value: "value" in condition ? condition.value : "" }),
                })
              }
            >
              {Object.entries(CONDITION_KIND_LABELS).map(([kind, label]) => (
                <option key={kind} value={kind}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="condition-variable"
              placeholder="variable"
              value={condition.variable}
              onChange={(e) =>
                updateConditionAt(conditionIndex, {
                  variable: e.target.value,
                } as Partial<CreationFlowRuleCondition>)
              }
            />
            {condition.kind !== "present" && (
              <input
                type="text"
                className="condition-value"
                placeholder="value"
                value={String((condition as { value: unknown }).value ?? "")}
                onChange={(e) =>
                  updateConditionAt(conditionIndex, {
                    value: e.target.value,
                  } as Partial<CreationFlowRuleCondition>)
                }
              />
            )}
            <button
              type="button"
              className="rule-remove-btn"
              onClick={() => removeConditionAt(conditionIndex)}
              title="Remove condition"
            >
              ×
            </button>
          </div>
        ))}
      </section>

      <section className="rule-section">
        <header className="rule-section__header">
          <h5>Actions</h5>
          <div className="rule-section__add-actions">
            <button type="button" className="rule-add-btn" onClick={() => addAction("showSurface")}>
              + Show surface
            </button>
            <button type="button" className="rule-add-btn" onClick={() => addAction("hideSurface")}>
              + Hide surface
            </button>
            <button type="button" className="rule-add-btn" onClick={() => addAction("setVariable")}>
              + Set variable
            </button>
            <button type="button" className="rule-add-btn" onClick={() => addAction("requireVariable")}>
              + Require variable
            </button>
            <button type="button" className="rule-add-btn" onClick={() => addAction("validate")}>
              + Validate
            </button>
          </div>
        </header>
        {rule.actions.length === 0 && (
          <p className="rule-section__empty">No actions. Add one above.</p>
        )}
        {rule.actions.map((action, actionIndex) => (
          <ActionRow
            key={actionIndex}
            action={action}
            onUpdate={(patch) => updateAction(actionIndex, patch)}
            onRemove={() => removeAction(actionIndex)}
          />
        ))}
      </section>
    </li>
  );
}

interface ActionRowProps {
  readonly action: CreationFlowRuleAction;
  readonly onUpdate: (patch: Partial<CreationFlowRuleAction>) => void;
  readonly onRemove: () => void;
}

function ActionRow({ action, onUpdate, onRemove }: ActionRowProps) {
  return (
    <div className="action-row">
      <span className="action-type-pill">{action.type}</span>
      {action.type === "setVariable" && (
        <>
          <input
            type="text"
            className="action-input"
            placeholder="name"
            value={action.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
          <input
            type="text"
            className="action-input"
            placeholder="value"
            value={String(action.value)}
            onChange={(e) => onUpdate({ value: e.target.value })}
          />
        </>
      )}
      {action.type === "requireVariable" && (
        <>
          <input
            type="text"
            className="action-input"
            placeholder="variable name"
            value={action.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
          <input
            type="text"
            className="action-input"
            placeholder="optional message"
            value={action.message ?? ""}
            onChange={(e) =>
              onUpdate({ message: e.target.value === "" ? undefined : e.target.value })
            }
          />
        </>
      )}
      {(action.type === "showSurface" || action.type === "hideSurface") && (
        <>
          <input
            type="text"
            className="action-input"
            placeholder="pageId"
            value={String(action.pageId)}
            onChange={(e) => onUpdate({ pageId: e.target.value as never })}
          />
          <input
            type="text"
            className="action-input"
            placeholder="surfaceId"
            value={String(action.surfaceId)}
            onChange={(e) => onUpdate({ surfaceId: e.target.value as never })}
          />
        </>
      )}
      {action.type === "validate" && (
        <input
          type="text"
          className="action-input"
          placeholder="message"
          value={action.message}
          onChange={(e) => onUpdate({ message: e.target.value })}
        />
      )}
      <button
        type="button"
        className="rule-remove-btn"
        onClick={onRemove}
        title="Remove action"
      >
        ×
      </button>
    </div>
  );
}
