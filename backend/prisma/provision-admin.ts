import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../src/database.js';

const prisma: PrismaClient = getPrismaClient();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const confirmation = process.env.CONFIRM_ADMIN_PROVISIONING;

async function main() {
  if (confirmation !== 'YES') {
    throw new Error('Set CONFIRM_ADMIN_PROVISIONING=YES to confirm this one-time administrator setup.');
  }
  if (!email || !zEmail(email)) {
    throw new Error('Set ADMIN_EMAIL to a valid administrator email address.');
  }
  if (!password || password.length < 14 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('Set ADMIN_PASSWORD to 14+ characters with uppercase, lowercase, and a number.');
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
  if (existingAdmin) {
    throw new Error('An administrator already exists. This setup command never replaces an existing administrator.');
  }
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    throw new Error('That email is already registered. Use a new email for the initial administrator.');
  }

  await prisma.user.create({
    data: {
      name: process.env.ADMIN_NAME?.trim() || 'CampusFind Administrator',
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
    },
  });
  console.log(`Created the initial administrator account for ${email}.`);
}

function zEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
