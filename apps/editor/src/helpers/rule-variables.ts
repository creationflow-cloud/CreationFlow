import type { ConfigurationDto } from "../api/configurations.js";
import type { CreationFlowDocument } from "@creationflow/schema";
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
