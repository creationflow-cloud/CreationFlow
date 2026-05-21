import { PrismaClient, ConfigurationStatus, RenderJobStatus, AssetType } from "@prisma/client";

export { PrismaClient, ConfigurationStatus, RenderJobStatus, AssetType };
export type { Prisma } from "@prisma/client";

export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}
