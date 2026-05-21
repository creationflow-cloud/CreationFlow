import { get } from "./client.js";

export interface WorkspaceDto {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function listWorkspaces(): Promise<WorkspaceDto[]> {
  return get<WorkspaceDto[]>("/workspaces");
}
