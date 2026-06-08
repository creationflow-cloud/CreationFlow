import type { PrismaClient, Prisma } from "@creationflow/database";

export interface ProductTemplateDto {
  readonly id: string;
  readonly workspaceId: string;
  readonly productId?: string;
  readonly documentSchema: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateProductTemplateInput {
  readonly workspaceId: string;
  readonly productId?: string;
  readonly documentSchema: Record<string, unknown>;
}

export interface UpdateProductTemplateInput {
  readonly documentSchema?: Record<string, unknown>;
}

function toDocumentSchema(doc: Prisma.JsonValue): Record<string, unknown> {
  if (doc === null || Array.isArray(doc) || typeof doc !== "object") {
    return {};
  }

  return doc as Record<string, unknown>;
}

function toProductTemplateDto(template: {
  readonly id: string;
  readonly workspaceId: string;
  readonly productId: string | null;
  readonly documentSchema: Prisma.JsonValue;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}): ProductTemplateDto {
  return {
    id: template.id,
    workspaceId: template.workspaceId,
    productId: template.productId ?? undefined,
    documentSchema: toDocumentSchema(template.documentSchema),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export async function listProductTemplates(
  db: PrismaClient,
  workspaceId?: string,
  productId?: string,
): Promise<ProductTemplateDto[]> {
  const where: { workspaceId?: string; productId?: string } = {};

  if (workspaceId) {
    where.workspaceId = workspaceId;
  }

  if (productId) {
    where.productId = productId;
  }

  const templates = await db.productTemplate.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: {
      createdAt: "desc",
    },
  });

  return templates.map(toProductTemplateDto);
}

export async function createProductTemplate(
  db: PrismaClient,
  input: CreateProductTemplateInput,
): Promise<ProductTemplateDto> {
  const template = await db.productTemplate.create({
    data: {
      workspaceId: input.workspaceId,
      productId: input.productId,
      documentSchema: input.documentSchema as Prisma.InputJsonValue,
    },
  });

  return toProductTemplateDto(template);
}

export async function getProductTemplateById(
  db: PrismaClient,
  id: string,
): Promise<ProductTemplateDto | null> {
  const template = await db.productTemplate.findUnique({
    where: {
      id,
    },
  });

  return template ? toProductTemplateDto(template) : null;
}

export async function updateProductTemplate(
  db: PrismaClient,
  id: string,
  input: UpdateProductTemplateInput,
): Promise<ProductTemplateDto | null> {
  const existing = await db.productTemplate.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  const data: Record<string, unknown> = {};

  if (input.documentSchema !== undefined) {
    data.documentSchema = input.documentSchema as Prisma.InputJsonValue;
  }

  if (Object.keys(data).length === 0) {
    return toProductTemplateDto(existing);
  }

  const updated = await db.productTemplate.update({
    where: { id },
    data,
  });

  return toProductTemplateDto(updated);
}

export async function deleteProductTemplate(
  db: PrismaClient,
  id: string,
): Promise<boolean> {
  const configurations = await db.configuration.count({
    where: { templateId: id },
  });
  if (configurations > 0) {
    throw new Error(
      `Cannot delete template: ${configurations} configuration(s) still reference this template.`,
    );
  }
  const existing = await db.productTemplate.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }
  await db.productTemplate.delete({ where: { id } });
  return true;
}
