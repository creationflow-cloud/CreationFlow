import { PrismaClient, ConfigurationStatus, RenderJobStatus } from "@prisma/client";

export { PrismaClient, ConfigurationStatus, RenderJobStatus };
export type { Prisma } from "@prisma/client";

export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}
