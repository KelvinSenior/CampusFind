import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../src/database.js';

const prisma: PrismaClient = getPrismaClient();
const confirmation = process.argv.find((argument) => argument.startsWith('--confirm='))?.slice('--confirm='.length);

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo reset is disabled in production.');
  }
  if (process.env.ALLOW_DEMO_RESET !== 'YES' || confirmation !== 'RESET-CAMPUSFIND-DEMO') {
    throw new Error('This destructive operation requires ALLOW_DEMO_RESET=YES and --confirm=RESET-CAMPUSFIND-DEMO.');
  }

  const reports = await prisma.itemReport.findMany({
    where: { reference: { startsWith: 'CF-DEMO' } },
    select: { id: true },
  });
  const reportIds = reports.map((report) => report.id);
  const claims = reportIds.length
    ? await prisma.claim.findMany({ where: { reportId: { in: reportIds } }, select: { id: true } })
    : [];
  const entityIds = [...reportIds, ...claims.map((claim) => claim.id)];

  await prisma.$transaction(async (tx) => {
    if (entityIds.length) {
      await tx.activityLog.deleteMany({ where: { entityId: { in: entityIds } } });
    }
    await tx.activityLog.deleteMany({ where: { id: { startsWith: 'demo-activity-' } } });
    await tx.abuseReport.deleteMany({ where: { id: { in: ['seed-abuse-report', 'demo-abuse-open-kwame', 'demo-abuse-resolved-grace'] } } });
    await tx.announcement.deleteMany({ where: { id: { startsWith: 'demo-announcement-' } } });
    await tx.notification.deleteMany({ where: { id: { in: ['seed-notification-alex', 'seed-notification-sam'] } } });
    await tx.notification.deleteMany({ where: { id: { startsWith: 'demo-notification-' } } });
    await tx.itemReport.deleteMany({ where: { reference: { startsWith: 'CF-DEMO' } } });
  });

  console.log(`Removed ${reportIds.length} seeded reports and their dependent claims, saved items, and abuse reports. Demo accounts and non-demo records were preserved.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
