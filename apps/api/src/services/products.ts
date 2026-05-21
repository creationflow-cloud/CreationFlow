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
