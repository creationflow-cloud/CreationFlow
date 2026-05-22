import { get, post, put } from "./client.js";

export type ConfigurationStatus = "draft" | "cart" | "ordered" | "archived";

export interface ConfigurationDto {
  readonly id: string;
  readonly workspaceId: string;
  readonly productId?: string;
  readonly templateId?: string;
  readonly document: Record<string, unknown>;
  readonly status: ConfigurationStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateConfigurationInput {
  readonly workspaceId: string;
  readonly productId?: string;
  readonly templateId?: string;
  readonly document: Record<string, unknown>;
  readonly status?: ConfigurationStatus;
}

export interface UpdateConfigurationInput {
  readonly document?: Record<string, unknown>;
  readonly status?: ConfigurationStatus;
}

export async function getConfiguration(id: string): Promise<ConfigurationDto> {
  return get<ConfigurationDto>(`/configurations/${id}`);
}

export async function createConfiguration(
  input: CreateConfigurationInput,
): Promise<ConfigurationDto> {
  return post<ConfigurationDto>("/configurations", input);
}

export async function updateConfiguration(
  id: string,
  input: UpdateConfigurationInput,
): Promise<ConfigurationDto> {
  return put<ConfigurationDto>(`/configurations/${id}`, input);
}
