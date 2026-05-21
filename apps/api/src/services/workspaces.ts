import type { PrismaClient } from "@creationflow/database";

export interface WorkspaceDto {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWorkspaceInput {
  readonly name: string;
}

function toWorkspaceDto(workspace: {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}): WorkspaceDto {
  return {
    id: workspace.id,
    name: workspace.name,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

export async function listWorkspaces(db: PrismaClient): Promise<WorkspaceDto[]> {
  const workspaces = await db.workspace.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return workspaces.map(toWorkspaceDto);
}

export async function createWorkspace(
  db: PrismaClient,
  input: CreateWorkspaceInput,
): Promise<WorkspaceDto> {
  const workspace = await db.workspace.create({
    data: {
      name: input.name,
    },
  });

  return toWorkspaceDto(workspace);
}

export async function getWorkspaceById(db: PrismaClient, id: string): Promise<WorkspaceDto | null> {
  const workspace = await db.workspace.findUnique({
    where: {
      id,
    },
  });

  return workspace ? toWorkspaceDto(workspace) : null;
}
