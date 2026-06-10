import type { ConfigurationDto } from "../api/configurations.js";
import type { CreationFlowDocument, CreationFlowVariable, VariableId } from "@creationflow/schema";
import type { RuleVariableValue } from "@creationflow/rules-engine";

function readStringVariables(values: unknown): Record<string, string> {
  if (!values || typeof values !== "object") {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
    if (typeof value === "string") {
      out[key] = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      out[key] = String(value);
    }
  }
  return out;
}

export function collectEditorVariables(
  document: CreationFlowDocument,
  configuration: ConfigurationDto | null,
): Record<string, RuleVariableValue> {
  const out: Record<string, RuleVariableValue> = {};
  const configValues = readStringVariables(
    (configuration as unknown as { variables?: unknown } | null)?.variables,
  );
  for (const [key, value] of Object.entries(configValues)) {
    out[key] = value;
  }

  for (const variable of document.variables) {
    if (out[variable.name] === undefined && variable.defaultValue !== undefined) {
      out[variable.name] = variable.defaultValue;
    }
  }

  return out;
}

export function findVariableById(
  document: CreationFlowDocument,
  variableId: VariableId,
): CreationFlowVariable | undefined {
  return document.variables.find((variable) => variable.id === variableId);
}

export function formatVariablePreviewValue(
  value: RuleVariableValue | undefined,
  fallback?: string,
): string {
  if (value === null || value === undefined) {
    return fallback ?? "—";
  }
  if (typeof value === "string" && value.length === 0) {
    return fallback ?? "—";
  }
  return String(value);
}

export function resolveVariablePreview({
  document,
  variableId,
  variables,
  fallback,
}: {
  readonly document: CreationFlowDocument;
  readonly variableId: VariableId;
  readonly variables: Readonly<Record<string, RuleVariableValue>>;
  readonly fallback?: string;
}): { readonly display: string; readonly variable: CreationFlowVariable | undefined } {
  const variable = findVariableById(document, variableId);
  const name = variable?.name ?? "";
  const value = name.length > 0 ? variables[name] : undefined;
  return {
    display: formatVariablePreviewValue(value ?? null, fallback),
    variable,
  };
}
