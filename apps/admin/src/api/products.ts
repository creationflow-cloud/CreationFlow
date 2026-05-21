import { get } from "./client.js";

export interface ProductDto {
  readonly id: string;
  readonly workspaceId: string;
  readonly externalId?: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function listProducts(workspaceId?: string): Promise<ProductDto[]> {
  const path = workspaceId ? `/products?workspaceId=${workspaceId}` : "/products";

  return get<ProductDto[]>(path);
}
