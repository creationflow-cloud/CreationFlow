import { del, get, patch, post } from "./client.js";

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
  readonly name: string;
  readonly externalId?: string;
}

export interface UpdateProductInput {
  readonly name?: string;
  readonly externalId?: string | null;
}

export async function listProducts(workspaceId?: string): Promise<ProductDto[]> {
  const path = workspaceId ? `/products?workspaceId=${workspaceId}` : "/products";

  return get<ProductDto[]>(path);
}

export async function createProduct(input: CreateProductInput): Promise<ProductDto> {
  return post<ProductDto>("/products", input);
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductDto> {
  return patch<ProductDto>(`/products/${id}`, input);
}

export async function deleteProduct(id: string): Promise<void> {
  await del<void>(`/products/${id}`);
}
