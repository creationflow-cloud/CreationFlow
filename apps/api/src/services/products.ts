import type { PrismaClient } from "@creationflow/database";

export interface ProductDto {
  readonly id: string;
  readonly workspaceId: string;
  readonly externalId?: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateProductInput {
  readonly workspaceId: string;
  readonly externalId?: string;
  readonly name: string;
}

export interface UpdateProductInput {
  readonly name?: string;
  readonly externalId?: string | null;
}

function toProductDto(product: {
  readonly id: string;
  readonly workspaceId: string;
  readonly externalId: string | null;
  readonly name: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}): ProductDto {
  return {
    id: product.id,
    workspaceId: product.workspaceId,
    externalId: product.externalId ?? undefined,
    name: product.name,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function listProducts(db: PrismaClient, workspaceId?: string): Promise<ProductDto[]> {
  const products = await db.product.findMany({
    where: workspaceId ? { workspaceId } : undefined,
    orderBy: {
      createdAt: "desc",
    },
  });

  return products.map(toProductDto);
}

export async function createProduct(
  db: PrismaClient,
  input: CreateProductInput,
): Promise<ProductDto> {
  const product = await db.product.create({
    data: {
      workspaceId: input.workspaceId,
      externalId: input.externalId,
      name: input.name,
    },
  });

  return toProductDto(product);
}

export async function getProductById(db: PrismaClient, id: string): Promise<ProductDto | null> {
  const product = await db.product.findUnique({
    where: {
      id,
    },
  });

  return product ? toProductDto(product) : null;
}

export async function updateProduct(
  db: PrismaClient,
  id: string,
  input: UpdateProductInput,
): Promise<ProductDto | null> {
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const data: Record<string, unknown> = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.externalId !== undefined) {
    data.externalId = input.externalId;
  }

  if (Object.keys(data).length === 0) {
    return toProductDto(existing);
  }

  const updated = await db.product.update({
    where: { id },
    data,
  });
  return toProductDto(updated);
}

export async function deleteProduct(db: PrismaClient, id: string): Promise<boolean> {
  const templates = await db.productTemplate.count({ where: { productId: id } });
  if (templates > 0) {
    throw new Error(
      `Cannot delete product: ${templates} template(s) still reference this product.`,
    );
  }
  const configurations = await db.configuration.count({ where: { productId: id } });
  if (configurations > 0) {
    throw new Error(
      `Cannot delete product: ${configurations} configuration(s) still reference this product.`,
    );
  }
  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }
  await db.product.delete({ where: { id } });
  return true;
}
