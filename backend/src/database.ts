import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const globalForPrisma = globalThis as typeof globalThis & {
  campusFindPrisma?: PrismaClient;
};

export function getPrismaClient(): PrismaClient {
  if (globalForPrisma.campusFindPrisma) return globalForPrisma.campusFindPrisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must contain the Neon PostgreSQL connection string.');
  }
  const adapter = new PrismaNeon({ connectionString });
  const client = new PrismaClient({ adapter });
  if (process.env.NODE_ENV !== 'production') globalForPrisma.campusFindPrisma = client;
  return client;
}
