import type { CreationFlowDocument } from "@creationflow/schema";

import { get, post } from "./client.js";
import type { ConfigurationDto, ConfigurationStatus } from "./configurations.js";

export interface ProductTemplateDto {
  readonly id: string;
  readonly workspaceId: string;
  readonly productId?: string;
  readonly documentSchema: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export async function getProductTemplate(id: string): Promise<ProductTemplateDto> {
  return get<ProductTemplateDto>(`/product-templates/${id}`);
}

export async function createConfigurationFromTemplate(
  templateId: string,
  document: CreationFlowDocument,
  workspaceId: string,
  status?: ConfigurationStatus,
): Promise<ConfigurationDto> {
  return post<ConfigurationDto>("/configurations", {
    workspaceId,
    templateId,
    document,
    status,
  });
}
