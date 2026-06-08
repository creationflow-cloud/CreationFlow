const BASE_URL = import.meta.env.VITE_CREATIONFLOW_API_URL ?? "http://localhost:3000";
const STORAGE_KEY = "creationflow.admin.apiKey";

export function getStoredApiKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value && value.length > 0 ? value : null;
}

export function setStoredApiKey(apiKey: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!apiKey) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, apiKey);
}

export function clearStoredApiKey(): void {
  setStoredApiKey(null);
}

interface RequestOptions {
  readonly method?: string;
  readonly body?: unknown;
  readonly skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!options.skipAuth) {
    const apiKey = getStoredApiKey();
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }
  }

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers,
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    const errorMessage = await extractErrorMessage(response);
    throw new ApiError(response.status, errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string; status?: string } | null;
    if (data && typeof data.message === "string" && data.message.length > 0) {
      return data.message;
    }
  } catch {
    // ignore non-JSON bodies
  }
  return `API request failed: ${response.status} ${response.statusText}`;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body });
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PUT", body });
}

export function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body });
}

export function del<T = void>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

export async function pingWithApiKey(apiKey: string): Promise<boolean> {
  const headers: Record<string, string> = {
    "X-API-Key": apiKey,
  };

  const response = await fetch(`${BASE_URL}/workspaces?workspaceId=__probe__`, { headers });
  return response.status !== 401 && response.status !== 500;
}
