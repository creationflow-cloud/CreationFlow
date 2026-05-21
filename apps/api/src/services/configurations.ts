import type { PrismaClient, Prisma, ConfigurationStatus } from "@creationflow/database";

export type ApiConfigurationStatus = "draft" | "cart" | "ordered" | "archived";

export interface ConfigurationDto {
  readonly id: string;
  readonly workspaceId: string;
  readonly productId?: string;
  readonly templateId?: string;
  readonly document: Record<string, unknown>;
  readonly status: ApiConfigurationStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateConfigurationInput {
  readonly workspaceId: string;
  readonly productId?: string;
  readonly templateId?: string;
  readonly document: Record<string, unknown>;
  readonly status?: ApiConfigurationStatus;
}

export interface UpdateConfigurationInput {
  readonly document?: Record<string, unknown>;
  readonly status?: ApiConfigurationStatus;
}

const STATUS_MAP: Record<string, ApiConfigurationStatus> = {
  DRAFT: "draft",
  CART: "cart",
  ORDERED: "ordered",
  ARCHIVED: "archived",
};

const REVERSE_STATUS_MAP: Record<ApiConfigurationStatus, ConfigurationStatus> = {
  draft: "DRAFT",
  cart: "CART",
  ordered: "ORDERED",
  archived: "ARCHIVED",
};

function toApiStatus(dbStatus: string): ApiConfigurationStatus {
  const apiStatus = STATUS_MAP[dbStatus];

  if (!apiStatus) {
    return "draft";
  }

  return apiStatus;
}

function toDbStatus(apiStatus: ApiConfigurationStatus): ConfigurationStatus {
  return REVERSE_STATUS_MAP[apiStatus] ?? "DRAFT";
}

function toDocument(doc: Prisma.JsonValue): Record<string, unknown> {
  if (doc === null || Array.isArray(doc) || typeof doc !== "object") {
    return {};
  }

  return doc as Record<string, unknown>;
}

function toConfigurationDto(config: {
  readonly id: string;
  readonly workspaceId: string;
  readonly productId: string | null;
  readonly templateId: string | null;
  readonly document: Prisma.JsonValue;
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}): ConfigurationDto {
  return {
    id: config.id,
    workspaceId: config.workspaceId,
    productId: config.productId ?? undefined,
    templateId: config.templateId ?? undefined,
    document: toDocument(config.document),
    status: toApiStatus(config.status),
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

export async function listConfigurations(
  db: PrismaClient,
  workspaceId?: string,
): Promise<ConfigurationDto[]> {
  const configurations = await db.configuration.findMany({
    where: workspaceId ? { workspaceId } : undefined,
    orderBy: {
      createdAt: "desc",
    },
  });

  return configurations.map(toConfigurationDto);
}

export async function createConfiguration(
  db: PrismaClient,
  input: CreateConfigurationInput,
): Promise<ConfigurationDto> {
  const configuration = await db.configuration.create({
    data: {
      workspaceId: input.workspaceId,
      productId: input.productId,
      templateId: input.templateId,
      document: input.document as Prisma.InputJsonValue,
      status: input.status ? toDbStatus(input.status) : "DRAFT",
    },
  });

  return toConfigurationDto(configuration);
}

export async function getConfigurationById(
  db: PrismaClient,
  id: string,
): Promise<ConfigurationDto | null> {
  const configuration = await db.configuration.findUnique({
    where: {
      id,
    },
  });

  return configuration ? toConfigurationDto(configuration) : null;
}

export async function updateConfiguration(
  db: PrismaClient,
  id: string,
  patch: UpdateConfigurationInput,
): Promise<ConfigurationDto | null> {
  const existing = await db.configuration.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  const configuration = await db.configuration.update({
    where: { id },
    data: {
      ...(patch.document !== undefined && { document: patch.document as Prisma.InputJsonValue }),
      ...(patch.status !== undefined && { status: toDbStatus(patch.status) }),
    },
  });

  return toConfigurationDto(configuration);
}
