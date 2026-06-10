export interface DimensionValidation {
  readonly valid: boolean;
  readonly error: string | null;
}

export function validateDimensionInput(
  label: string,
  value: number,
  options: { min?: number; max?: number; integer?: boolean } = {},
): DimensionValidation {
  if (!Number.isFinite(value)) {
    return { valid: false, error: `${label} must be a number.` };
  }
  if (options.integer && !Number.isInteger(value)) {
    return { valid: false, error: `${label} must be a whole number.` };
  }
  if (options.min !== undefined && value < options.min) {
    return {
      valid: false,
      error:
        options.min === 1
          ? `${label} must be at least 1.`
          : `${label} must be at least ${options.min}.`,
    };
  }
  if (options.max !== undefined && value > options.max) {
    return {
      valid: false,
      error: `${label} must be at most ${options.max}.`,
    };
  }
  return { valid: true, error: null };
}

export function validatePageName(name: string): DimensionValidation {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Page name is required." };
  }
  if (trimmed.length > 120) {
    return { valid: false, error: "Page name must be 120 characters or fewer." };
  }
  return { valid: true, error: null };
}

export function validateSurfaceName(name: string): DimensionValidation {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Surface name is required." };
  }
  if (trimmed.length > 120) {
    return { valid: false, error: "Surface name must be 120 characters or fewer." };
  }
  return { valid: true, error: null };
}

export function validatePathData(path: string): DimensionValidation {
  const trimmed = path.trim();
  if (trimmed.length === 0) {
    return { valid: true, error: null };
  }
  if (!/^[MmLlHhVvCcSsQqTtAaZz]+[0-9.,\-\s]*$/.test(trimmed) && !trimmed.startsWith("M")) {
    return {
      valid: false,
      error: "Path data must start with a valid SVG path command.",
    };
  }
  return { valid: true, error: null };
}

export function formatApiErrorMessage(status: number, fallbackMessage: string): string {
  if (status === 401) return "You are not authenticated. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested resource was not found.";
  if (status === 409) return fallbackMessage || "This action conflicts with the current state.";
  if (status === 422) return fallbackMessage || "Some fields are invalid. Please review the form.";
  if (status === 500) return "The server encountered an unexpected error. Please try again.";
  if (status >= 400 && status < 500) return fallbackMessage || "The request was invalid.";
  return fallbackMessage;
}
