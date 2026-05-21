import type { PrismaClient, AssetType } from "@creationflow/database";

import { toApiAssetType, toDbAssetType } from "../mappers/asset-type.js";
import type { ApiAssetType } from "../mappers/asset-type.js";

export interface AssetDto {
  readonly id: string;
  readonly workspaceId: string;
  readonly type: ApiAssetType;
  readonly name: string;
  readonly source: string;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
  readonly sizeBytes?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateAssetInput {
  readonly workspaceId: string;
  readonly type: ApiAssetType;
  readonly name: string;
  readonly source: string;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
  readonly sizeBytes?: string;
}

export interface UpdateAssetInput {
  readonly name?: string;
  readonly source?: string;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
  readonly sizeBytes?: string;
}

function sizeBytesToString(value: bigint | null): string | undefined {
  if (value === null) {
    return undefined;
  }

  return value.toString();
}

function sizeBytesToBigInt(value: string | undefined): bigint | null {
  if (value === undefined) {
    return null;
  }

  return BigInt(value);
}

function toAssetDto(asset: {
  readonly id: string;
  readonly workspaceId: string;
  readonly type: string;
  readonly name: string;
  readonly source: string;
  readonly mimeType: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly sizeBytes: bigint | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}): AssetDto {
  return {
    id: asset.id,
    workspaceId: asset.workspaceId,
    type: toApiAssetType(asset.type),
    name: asset.name,
    source: asset.source,
    mimeType: asset.mimeType ?? undefined,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    sizeBytes: sizeBytesToString(asset.sizeBytes),
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

export interface ListAssetsFilter {
  readonly workspaceId?: string;
  readonly type?: ApiAssetType;
}

export async function listAssets(
  db: PrismaClient,
  filter: ListAssetsFilter = {},
): Promise<AssetDto[]> {
  const where: { workspaceId?: string; type?: AssetType } = {};

  if (filter.workspaceId) {
    where.workspaceId = filter.workspaceId;
  }

  if (filter.type) {
    where.type = toDbAssetType(filter.type);
  }

  const assets = await db.asset.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: {
      createdAt: "desc",
    },
  });

  return assets.map(toAssetDto);
}

export async function createAsset(db: PrismaClient, input: CreateAssetInput): Promise<AssetDto> {
  const asset = await db.asset.create({
    data: {
      workspaceId: input.workspaceId,
      type: toDbAssetType(input.type),
      name: input.name,
      source: input.source,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      sizeBytes: sizeBytesToBigInt(input.sizeBytes),
    },
  });

  return toAssetDto(asset);
}

export async function getAssetById(db: PrismaClient, id: string): Promise<AssetDto | null> {
  const asset = await db.asset.findUnique({
    where: {
      id,
    },
  });

  return asset ? toAssetDto(asset) : null;
}

export async function updateAsset(
  db: PrismaClient,
  id: string,
  patch: UpdateAssetInput,
): Promise<AssetDto | null> {
  const existing = await db.asset.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  const asset = await db.asset.update({
    where: { id },
    data: {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.source !== undefined && { source: patch.source }),
      ...(patch.mimeType !== undefined && { mimeType: patch.mimeType }),
      ...(patch.width !== undefined && { width: patch.width }),
      ...(patch.height !== undefined && { height: patch.height }),
      ...(patch.sizeBytes !== undefined && { sizeBytes: sizeBytesToBigInt(patch.sizeBytes) }),
    },
  });

  return toAssetDto(asset);
}

export async function deleteAsset(db: PrismaClient, id: string): Promise<boolean> {
  const existing = await db.asset.findUnique({
    where: { id },
  });

  if (!existing) {
    return false;
  }

  await db.asset.delete({
    where: { id },
  });

  return true;
}
