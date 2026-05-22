import { get, post } from "./client.js";

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

export async function listProductTemplates(
  workspaceId?: string,
  productId?: string,
): Promise<ProductTemplateDto[]> {
  const params = new URLSearchParams();

  if (workspaceId) {
    params.set("workspaceId", workspaceId);
  }

  if (productId) {
    params.set("productId", productId);
  }

  const query = params.toString();
  const path = query ? `/product-templates?${query}` : "/product-templates";

  return get<ProductTemplateDto[]>(path);
}

export async function getProductTemplate(id: string): Promise<ProductTemplateDto> {
  return get<ProductTemplateDto>(`/product-templates/${id}`);
}

export async function createProductTemplate(
  input: CreateProductTemplateInput,
): Promise<ProductTemplateDto> {
  return post<ProductTemplateDto>("/product-templates", input);
}
