import type { AssetType } from "@creationflow/database";

export type ApiAssetType = "image" | "font" | "vector" | "pdf";

const TO_API_MAP: Record<string, ApiAssetType> = {
  IMAGE: "image",
  FONT: "font",
  VECTOR: "vector",
  PDF: "pdf",
};

const TO_DB_MAP: Record<ApiAssetType, AssetType> = {
  image: "IMAGE",
  font: "FONT",
  vector: "VECTOR",
  pdf: "PDF",
};

export function toApiAssetType(dbType: string): ApiAssetType {
  const apiType = TO_API_MAP[dbType];

  if (!apiType) {
    return "image";
  }

  return apiType;
}

export function toDbAssetType(apiType: ApiAssetType): AssetType {
  return TO_DB_MAP[apiType] ?? "IMAGE";
}
