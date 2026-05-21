import { PrismaClient, ConfigurationStatus } from "@prisma/client";

export { PrismaClient, ConfigurationStatus };
export type { Prisma } from "@prisma/client";

export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}
