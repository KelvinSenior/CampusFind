import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type CampusLocation, type ItemCategory, type ReportType } from '@prisma/client';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The demonstration seed must not run in production.');
}

const prisma = new PrismaClient();
const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME ?? 'CampusFind Administrator';

const examples: Array<{
  reference: string;
  type: ReportType;
  name: string;
  category: ItemCategory;
  description: string;
  location: CampusLocation;
  daysAgo: number;
  status: 'APPROVED' | 'PENDING' | 'RECOVERED';
}> = [
  ['CF-DEMO001', 'LOST', 'Blue wireless headphones', 'ELECTRONICS', 'Navy blue over-ear headphones in a soft zip case.', 'LIBRARY', 1, 'APPROVED'],
  ['CF-DEMO002', 'FOUND', 'Set of silver keys', 'KEYS', 'Three keys on a small wooden campus-shaped keyring.', 'CAFETERIA', 2, 'APPROVED'],
  ['CF-DEMO003', 'LOST', 'Black laptop charger', 'ELECTRONICS', 'USB-C charger, 65W, with a small strip of green tape.', 'LECTURE_HALL', 3, 'APPROVED'],
  ['CF-DEMO004', 'FOUND', 'Red water bottle', 'OTHER', 'Insulated red bottle found near the study tables.', 'LIBRARY', 4, 'APPROVED'],
  ['CF-DEMO005', 'LOST', 'Student identification card', 'IDENTIFICATION', 'University ID card in a clear sleeve.', 'ADMIN_BLOCK', 1, 'PENDING'],
  ['CF-DEMO006', 'FOUND', 'Green canvas backpack', 'BAGS', 'Olive canvas backpack with a small stitched patch.', 'SPORTS_FACILITY', 5, 'APPROVED'],
  ['CF-DEMO007', 'LOST', 'Calculus textbook', 'BOOKS', 'Hardcover calculus book with handwritten notes inside.', 'LECTURE_HALL', 6, 'APPROVED'],
  ['CF-DEMO008', 'FOUND', 'Silver wristwatch', 'JEWELLERY', 'Simple silver analogue watch with a dark face.', 'CAFETERIA', 7, 'APPROVED'],
  ['CF-DEMO009', 'LOST', 'Grey hoodie', 'CLOTHING', 'Medium grey hoodie with a university athletics logo.', 'RESIDENCE', 8, 'APPROVED'],
  ['CF-DEMO010', 'FOUND', 'Blue pencil case', 'BOOKS', 'Small blue zip pencil case with pens and a ruler.', 'LABORATORY', 9, 'APPROVED'],
  ['CF-DEMO011', 'LOST', 'USB flash drive', 'ELECTRONICS', 'Black 32GB USB drive attached to a red lanyard.', 'LIBRARY', 2, 'APPROVED'],
  ['CF-DEMO012', 'FOUND', 'Brown wallet', 'BAGS', 'Compact brown wallet. Owner can describe distinguishing details.', 'LECTURE_HALL', 10, 'APPROVED'],
  ['CF-DEMO013', 'LOST', 'Pair of sports gloves', 'CLOTHING', 'Black training gloves, size medium.', 'SPORTS_FACILITY', 11, 'PENDING'],
  ['CF-DEMO014', 'FOUND', 'Umbrella', 'OTHER', 'Compact navy umbrella with a curved wooden handle.', 'ADMIN_BLOCK', 12, 'RECOVERED'],
  ['CF-DEMO015', 'LOST', 'Earbud charging case', 'ELECTRONICS', 'White wireless earbud charging case without earbuds.', 'CAFETERIA', 13, 'APPROVED'],
].map(([reference, type, name, category, description, location, daysAgo, status]) => ({
  reference: String(reference),
  type: type as ReportType,
  name: String(name),
  category: category as ItemCategory,
  description: String(description),
  location: location as CampusLocation,
  daysAgo: Number(daysAgo),
  status: status as 'APPROVED' | 'PENDING' | 'RECOVERED',
}));

async function main() {
  if (!adminEmail || !adminPassword) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in the local environment before seeding.');
  }
  if (adminPassword.length < 14) {
    throw new Error('ADMIN_PASSWORD must contain at least 14 characters.');
  }
  const hash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash: hash, role: 'ADMIN', status: 'ACTIVE' },
    create: { name: adminName, email: adminEmail, passwordHash: hash, role: 'ADMIN' },
  });
  const students = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alex.student@campusfind.local' },
      update: {},
      create: { name: 'Alex Morgan', email: 'alex.student@campusfind.local', passwordHash: await bcrypt.hash('Student123!', 12) },
    }),
    prisma.user.upsert({
      where: { email: 'sam.student@campusfind.local' },
      update: {},
      create: { name: 'Sam Rivera', email: 'sam.student@campusfind.local', passwordHash: await bcrypt.hash('Student123!', 12) },
    }),
  ]);

  for (const [index, example] of examples.entries()) {
    const report = await prisma.itemReport.upsert({
      where: { reference: example.reference },
      update: {},
      create: {
        reference: example.reference,
        userId: students[index % students.length].id,
        reportType: example.type,
        itemName: example.name,
        category: example.category,
        description: example.description,
        dateOccurred: new Date(Date.now() - example.daysAgo * 86_400_000),
        location: example.location,
        status: example.status,
      },
    });
    if (example.reference === 'CF-DEMO014') {
      const existing = await prisma.claim.findFirst({ where: { reportId: report.id } });
      if (!existing) {
        await prisma.claim.create({
          data: {
            reportId: report.id,
            userId: students[0].id,
            explanation: 'I left my umbrella in the admin block after an appointment.',
            distinguishingFeatures: 'The wooden handle has a small brass ring near the base.',
            status: 'COMPLETED',
            handoverCode: 'DEMO-HANDOVER-014',
            handoverVerifiedAt: new Date(),
          },
        });
      }
    }
  }

  const demoReports = await prisma.itemReport.findMany({
    where: { reference: { in: ['CF-DEMO001', 'CF-DEMO002', 'CF-DEMO003', 'CF-DEMO004', 'CF-DEMO008', 'CF-DEMO010', 'CF-DEMO012'] } },
    select: { id: true, reference: true },
  });
  const reportId = (reference: string) => {
    const report = demoReports.find((item) => item.reference === reference);
    if (!report) throw new Error(`Seed report ${reference} was not created.`);
    return report.id;
  };

  const exampleClaims = [
    { report: 'CF-DEMO002', claimant: students[0], status: 'PENDING' as const },
    { report: 'CF-DEMO004', claimant: students[0], status: 'APPROVED' as const, handoverCode: 'DEMO-HANDOVER-004' },
    { report: 'CF-DEMO008', claimant: students[0], status: 'REJECTED' as const },
    { report: 'CF-DEMO010', claimant: students[0], status: 'PENDING' as const },
  ];
  for (const [index, example] of exampleClaims.entries()) {
    const itemReportId = reportId(example.report);
    await prisma.claim.upsert({
      where: { reportId_userId: { reportId: itemReportId, userId: example.claimant.id } },
      update: {},
      create: {
        reportId: itemReportId,
        userId: example.claimant.id,
        explanation: `I believe the item belongs to me. I last had it near ${example.report === 'CF-DEMO002' ? 'the cafeteria' : 'the library'}.`,
        distinguishingFeatures: `It has a small identifying mark I can describe during verification (${index + 1}).`,
        status: example.status,
        handoverCode: example.handoverCode,
      },
    });
  }

  for (const [user, reference] of [[students[0], 'CF-DEMO012'], [students[1], 'CF-DEMO001']] as const) {
    await prisma.savedItem.upsert({
      where: { userId_reportId: { userId: user.id, reportId: reportId(reference) } },
      update: {},
      create: { userId: user.id, reportId: reportId(reference) },
    });
  }

  for (const notification of [
    {
      id: 'seed-notification-alex',
      userId: students[0].id,
      title: 'Welcome to CampusFind',
      message: 'Your campus community is ready to help. Browse recent reports or share what you lost.',
    },
    {
      id: 'seed-notification-sam',
      userId: students[1].id,
      title: 'A claim needs your review',
      message: 'A student submitted an ownership claim for one of your found reports.',
    },
  ]) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: {},
      create: notification,
    });
  }

  const abuseReportId = 'seed-abuse-report';
  await prisma.abuseReport.upsert({
    where: { id: abuseReportId },
    update: {},
    create: {
      id: abuseReportId,
      reportId: reportId('CF-DEMO003'),
      reporterId: students[1].id,
      reason: 'Potentially identifying information',
      details: 'Please confirm this listing does not expose private contact or identification details.',
    },
  });

  await prisma.announcement.upsert({
    where: { id: 'welcome-announcement' },
    update: {},
    create: {
      id: 'welcome-announcement',
      title: 'Welcome to CampusFind',
      content: 'Use CampusFind to report lost belongings, return found items, and follow a clear recovery process.',
      category: 'Community',
      createdById: admin.id,
    },
  });

  console.log(`Seed complete. Admin account: ${adminEmail}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
