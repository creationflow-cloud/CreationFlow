export type ClassValue = string | number | null | false | undefined | ReadonlyArray<ClassValue>;

function flatten(values: ReadonlyArray<ClassValue>, out: string[]): void {
  for (const value of values) {
    if (value === null || value === undefined || value === false) continue;
    if (Array.isArray(value)) {
      flatten(value, out);
    } else {
      out.push(String(value));
    }
  }
}

export function cx(...values: ClassValue[]): string {
  const out: string[] = [];
  flatten(values, out);
  return out.join(" ");
}

export function cxWith(prefix: string, ...values: ClassValue[]): string {
  const joined = cx(...values);
  if (joined.length === 0) return prefix;
  return `${prefix} ${joined}`;
}

export function formatNumber(value: number, locale = "en-US"): string {
  if (!Number.isFinite(value)) return "–";
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(value: number, fractionDigits = 0, locale = "en-US"): string {
  if (!Number.isFinite(value)) return "–";
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function noop(): void {
  /* no-op */
}

export function isShallowEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
