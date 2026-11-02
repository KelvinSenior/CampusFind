import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type CampusLocation, type ItemCategory, type ReportType } from '@prisma/client';

const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === 'production';
const demoPassword = process.env.DEMO_PASSWORD;

if (process.env.ALLOW_DEMO_SEED !== 'YES') {
  throw new Error('Set ALLOW_DEMO_SEED=YES to explicitly run the additive demonstration seed.');
}
if (process.env.DEMO_MODE_ENABLED !== 'true') {
  throw new Error('Set DEMO_MODE_ENABLED=true before running the demonstration seed.');
}
if (!demoPassword || demoPassword.length < 14) {
  throw new Error('Set DEMO_PASSWORD to an explicit value of at least 14 characters.');
}
if (isProduction && !process.env.DEMO_PASSWORD) {
  throw new Error('Production demo seeding requires an explicit DEMO_PASSWORD.');
}

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

const additionalExamples: Array<{
  reference: string;
  owner: number;
  type: ReportType;
  name: string;
  category: ItemCategory;
  description: string;
  location: CampusLocation;
  locationDetails: string;
  daysAgo: number;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'RECOVERED';
}> = [
  { reference: 'CF-DEMO016', owner: 0, type: 'LOST', name: 'Black HP laptop', category: 'ELECTRONICS', description: 'Black 14-inch HP laptop with a matte finish and a small university asset sticker on the underside.', location: 'LIBRARY', locationDetails: 'Second-floor study tables', daysAgo: 2, status: 'APPROVED' },
  { reference: 'CF-DEMO017', owner: 1, type: 'FOUND', name: 'Samsung smartphone', category: 'ELECTRONICS', description: 'Samsung phone in a dark green case, found powered off after an afternoon lecture.', location: 'LECTURE_HALL', locationDetails: 'Engineering lecture theatre', daysAgo: 1, status: 'APPROVED' },
  { reference: 'CF-DEMO018', owner: 2, type: 'FOUND', name: 'Apple AirPods case', category: 'ELECTRONICS', description: 'White AirPods charging case with a faint blue ink mark near the hinge. No earbuds inside.', location: 'CAFETERIA', locationDetails: 'Window-side tables', daysAgo: 3, status: 'APPROVED' },
  { reference: 'CF-DEMO019', owner: 3, type: 'LOST', name: 'Student identification card', category: 'IDENTIFICATION', description: 'Student ID in a transparent sleeve with a blue lanyard. The name and number are kept private.', location: 'ADMIN_BLOCK', locationDetails: 'Ground-floor reception', daysAgo: 2, status: 'PENDING' },
  { reference: 'CF-DEMO020', owner: 4, type: 'FOUND', name: 'Brown leather wallet', category: 'BAGS', description: 'Compact brown leather wallet with a stitched edge. Owner should identify the contents privately.', location: 'CAFETERIA', locationDetails: 'Near the payment counter', daysAgo: 4, status: 'APPROVED' },
  { reference: 'CF-DEMO021', owner: 0, type: 'LOST', name: 'Blue backpack', category: 'BAGS', description: 'Navy backpack with two front pockets and a small white mountain patch on the strap.', location: 'RESIDENCE', locationDetails: 'Hostel A common room', daysAgo: 5, status: 'APPROVED' },
  { reference: 'CF-DEMO022', owner: 1, type: 'FOUND', name: 'Scientific calculator', category: 'ELECTRONICS', description: 'Casio scientific calculator with a clear protective cover and initials written inside it.', location: 'LABORATORY', locationDetails: 'Science lab 2', daysAgo: 2, status: 'APPROVED' },
  { reference: 'CF-DEMO023', owner: 2, type: 'LOST', name: 'Engineering notebook', category: 'BOOKS', description: 'A5 engineering notebook with a black spiral binding and graph paper pages.', location: 'LECTURE_HALL', locationDetails: 'Engineering lecture theatre', daysAgo: 1, status: 'PENDING' },
  { reference: 'CF-DEMO024', owner: 3, type: 'FOUND', name: 'Lecture notes folder', category: 'DOCUMENTS', description: 'Clear folder containing folded lecture notes. Course details are withheld to verify ownership.', location: 'LECTURE_HALL', locationDetails: 'Main auditorium, back row', daysAgo: 6, status: 'APPROVED' },
  { reference: 'CF-DEMO025', owner: 4, type: 'LOST', name: 'USB flash drive', category: 'ELECTRONICS', description: 'Small black 64 GB USB drive with a silver cap and a short yellow thread loop.', location: 'LIBRARY', locationDetails: 'Computer area', daysAgo: 3, status: 'APPROVED' },
  { reference: 'CF-DEMO026', owner: 0, type: 'FOUND', name: 'Silver wristwatch', category: 'JEWELLERY', description: 'Silver analogue wristwatch with a navy face and a loose link in the metal strap.', location: 'SPORTS_FACILITY', locationDetails: 'Bleachers by court 1', daysAgo: 7, status: 'APPROVED' },
  { reference: 'CF-DEMO027', owner: 1, type: 'LOST', name: 'House keys', category: 'KEYS', description: 'Two brass keys and one small locker key on a red fabric key fob.', location: 'RESIDENCE', locationDetails: 'Hostel B entrance', daysAgo: 2, status: 'PENDING' },
  { reference: 'CF-DEMO028', owner: 2, type: 'FOUND', name: 'Insulated water bottle', category: 'OTHER', description: 'Matte teal steel bottle with a black lid and a small dent near the base.', location: 'SPORTS_FACILITY', locationDetails: 'Outdoor courts', daysAgo: 9, status: 'RECOVERED' },
  { reference: 'CF-DEMO029', owner: 3, type: 'LOST', name: 'Wireless headphones', category: 'ELECTRONICS', description: 'Black over-ear headphones with a padded headband and a zip carrying case.', location: 'CAFETERIA', locationDetails: 'Upper seating area', daysAgo: 8, status: 'REJECTED' },
  { reference: 'CF-DEMO030', owner: 4, type: 'FOUND', name: 'Black handbag', category: 'BAGS', description: 'Small black handbag with a brass clasp and a short shoulder strap. Contents are not listed.', location: 'ADMIN_BLOCK', locationDetails: 'Outside the records office', daysAgo: 4, status: 'APPROVED' },
  { reference: 'CF-DEMO031', owner: 0, type: 'LOST', name: 'Mathematics textbook', category: 'BOOKS', description: 'Linear algebra textbook with a green cover and handwritten examples on several pages.', location: 'LIBRARY', locationDetails: 'Quiet reading room', daysAgo: 6, status: 'APPROVED' },
  { reference: 'CF-DEMO032', owner: 1, type: 'FOUND', name: 'Portable charger', category: 'ELECTRONICS', description: 'White 10,000 mAh power bank with a short braided charging cable attached.', location: 'OTHER', locationDetails: 'Student centre lounge', daysAgo: 3, status: 'APPROVED' },
  { reference: 'CF-DEMO033', owner: 2, type: 'LOST', name: 'Laptop charger', category: 'ELECTRONICS', description: '65 W USB-C laptop charger with a strip of green tape around the cable near the plug.', location: 'LECTURE_HALL', locationDetails: 'Engineering lecture theatre', daysAgo: 2, status: 'APPROVED' },
  { reference: 'CF-DEMO034', owner: 3, type: 'FOUND', name: 'Pair of spectacles', category: 'OTHER', description: 'Black rectangular spectacles in a hard grey case with a cloth tucked inside.', location: 'CAFETERIA', locationDetails: 'Outside the dining hall', daysAgo: 5, status: 'APPROVED' },
  { reference: 'CF-DEMO035', owner: 4, type: 'LOST', name: 'Student access card', category: 'IDENTIFICATION', description: 'Blue access card on a plain black clip. Card number is intentionally not shown.', location: 'LIBRARY', locationDetails: 'Main entrance turnstiles', daysAgo: 1, status: 'PENDING' },
  { reference: 'CF-DEMO036', owner: 1, type: 'FOUND', name: 'HP laptop in black sleeve', category: 'ELECTRONICS', description: 'Black HP laptop inside a charcoal sleeve, found close to the second-floor library study tables.', location: 'LIBRARY', locationDetails: 'Second-floor study tables', daysAgo: 1, status: 'APPROVED' },
  { reference: 'CF-DEMO037', owner: 1, type: 'LOST', name: 'Brown wallet', category: 'BAGS', description: 'Slim brown wallet with a small stitched initials patch inside the fold.', location: 'CAFETERIA', locationDetails: 'Main dining area', daysAgo: 4, status: 'APPROVED' },
  { reference: 'CF-DEMO038', owner: 2, type: 'FOUND', name: 'Keyring with three keys', category: 'KEYS', description: 'Three silver keys on a round wooden keyring with a small brass compass charm.', location: 'LABORATORY', locationDetails: 'Science building entrance', daysAgo: 2, status: 'APPROVED' },
  { reference: 'CF-DEMO039', owner: 3, type: 'LOST', name: 'Digital wristwatch', category: 'JEWELLERY', description: 'Black digital watch with a rectangular display and a scratched clasp.', location: 'SPORTS_FACILITY', locationDetails: 'Changing room corridor', daysAgo: 3, status: 'APPROVED' },
  { reference: 'CF-DEMO040', owner: 4, type: 'FOUND', name: 'Android smartphone', category: 'ELECTRONICS', description: 'Android phone with a clear case and a small pressed leaf behind the case.', location: 'ADMIN_BLOCK', locationDetails: 'Front steps', daysAgo: 1, status: 'PENDING' },
];

async function main() {
  const passwordHash = await bcrypt.hash(demoPassword!, 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@campusfind.demo' },
    update: { name: 'CampusFind Administrator', passwordHash, role: 'ADMIN', status: 'ACTIVE' },
    create: { name: 'CampusFind Administrator', email: 'admin@campusfind.demo', passwordHash, role: 'ADMIN' },
  });
  const students = await Promise.all([
    ['Daniel Mensah', 'daniel@campusfind.demo'],
    ['Ama Boateng', 'ama@campusfind.demo'],
    ['Michael Owusu', 'michael@campusfind.demo'],
    ['Grace Asante', 'grace@campusfind.demo'],
    ['Kwame Addo', 'kwame@campusfind.demo'],
  ].map(([name, email]) => prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: 'STUDENT', status: 'ACTIVE' },
    create: { name, email, passwordHash, role: 'STUDENT' },
  })));

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

  for (const example of additionalExamples) {
    await prisma.itemReport.upsert({
      where: { reference: example.reference },
      update: {},
      create: {
        reference: example.reference,
        userId: students[example.owner].id,
        reportType: example.type,
        itemName: example.name,
        category: example.category,
        description: example.description,
        dateOccurred: new Date(Date.now() - example.daysAgo * 86_400_000),
        location: example.location,
        locationDetails: example.locationDetails,
        status: example.status,
      },
    });
  }

  const demoReports = await prisma.itemReport.findMany({
    where: { reference: { in: [
      'CF-DEMO001', 'CF-DEMO002', 'CF-DEMO003', 'CF-DEMO004', 'CF-DEMO008', 'CF-DEMO010', 'CF-DEMO012',
      'CF-DEMO006', 'CF-DEMO016', 'CF-DEMO017', 'CF-DEMO018', 'CF-DEMO020', 'CF-DEMO021', 'CF-DEMO022',
      'CF-DEMO024', 'CF-DEMO028', 'CF-DEMO030', 'CF-DEMO032', 'CF-DEMO033', 'CF-DEMO036', 'CF-DEMO038',
    ] } },
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

  const lifecycleClaims = [
    { report: 'CF-DEMO017', claimant: students[0], status: 'PENDING' as const },
    { report: 'CF-DEMO017', claimant: students[2], status: 'APPROVED' as const, handoverCode: 'DEMO-HANDOVER-017' },
    { report: 'CF-DEMO024', claimant: students[2], status: 'REJECTED' as const },
    { report: 'CF-DEMO028', claimant: students[3], status: 'COMPLETED' as const, handoverCode: 'DEMO-HANDOVER-028' },
    { report: 'CF-DEMO032', claimant: students[2], status: 'PENDING' as const },
    { report: 'CF-DEMO038', claimant: students[4], status: 'PENDING' as const },
  ];
  for (const example of lifecycleClaims) {
    const itemReportId = reportId(example.report);
    await prisma.claim.upsert({
      where: { reportId_userId: { reportId: itemReportId, userId: example.claimant.id } },
      update: {},
      create: {
        reportId: itemReportId,
        userId: example.claimant.id,
        explanation: `I last had this item near ${example.report === 'CF-DEMO022' ? 'the science labs' : 'the library'} and can confirm where it was left.`,
        distinguishingFeatures: `The item has a private identifying detail that I can verify with the report owner (${example.report}).`,
        status: example.status,
        handoverCode: example.handoverCode,
        ...(example.status === 'COMPLETED' ? { handoverVerifiedAt: new Date(Date.now() - 86_400_000) } : {}),
      },
    });
  }

  const savedSamples: Array<[typeof students[number], string]> = [
    [students[0], 'CF-DEMO012'], [students[0], 'CF-DEMO033'], [students[0], 'CF-DEMO036'],
    [students[1], 'CF-DEMO001'], [students[1], 'CF-DEMO016'], [students[1], 'CF-DEMO021'],
    [students[2], 'CF-DEMO017'], [students[2], 'CF-DEMO024'], [students[2], 'CF-DEMO030'],
    [students[3], 'CF-DEMO018'], [students[3], 'CF-DEMO022'], [students[3], 'CF-DEMO032'],
    [students[4], 'CF-DEMO006'], [students[4], 'CF-DEMO020'], [students[4], 'CF-DEMO038'],
  ];
  for (const [user, reference] of savedSamples) {
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

  const notificationSamples = [
    { id: 'demo-notification-admin-queue', userId: admin.id, title: 'Reports need review', message: 'New campus reports are waiting in the moderation queue.', isRead: false, daysAgo: 0 },
    { id: 'demo-notification-admin-claim', userId: admin.id, title: 'Ownership claim submitted', message: 'A new claim is ready for review by the report owner or an administrator.', isRead: true, daysAgo: 1 },
    { id: 'demo-notification-daniel-approved', userId: students[0].id, title: 'Your report was approved', message: 'Your report for the black HP laptop is now visible in campus listings.', isRead: true, daysAgo: 2 },
    { id: 'demo-notification-daniel-claim', userId: students[0].id, title: 'Your claim is awaiting review', message: 'The finder has received your claim and can review your identifying details.', isRead: false, daysAgo: 0 },
    { id: 'demo-notification-daniel-match', userId: students[0].id, title: 'A possible match was found', message: 'A found laptop report has similar details. Suggestions are not confirmation of ownership.', isRead: false, daysAgo: 0 },
    { id: 'demo-notification-ama-claim', userId: students[1].id, title: 'A student submitted a claim', message: 'A student shared private identifying details for your found smartphone report.', isRead: false, daysAgo: 0 },
    { id: 'demo-notification-ama-approved', userId: students[1].id, title: 'Found report approved', message: 'Your scientific calculator listing is now available to students.', isRead: true, daysAgo: 2 },
    { id: 'demo-notification-ama-announcement', userId: students[1].id, title: 'Campus notice published', message: 'Read the latest lost-property collection guidance in campus announcements.', isRead: false, daysAgo: 1 },
    { id: 'demo-notification-michael-approved', userId: students[2].id, title: 'Your claim was approved', message: 'Your claim was approved. Present the handover code to an authorised administrator.', isRead: true, daysAgo: 3 },
    { id: 'demo-notification-michael-rejected', userId: students[2].id, title: 'Claim decision available', message: 'A claim decision is available in your dashboard. Review the report details before trying again.', isRead: true, daysAgo: 2 },
    { id: 'demo-notification-michael-pending', userId: students[2].id, title: 'Claim awaiting review', message: 'Your claim for the portable charger is with the report owner.', isRead: false, daysAgo: 0 },
    { id: 'demo-notification-grace-handover', userId: students[3].id, title: 'Handover completed', message: 'An administrator verified the collection of your claimed water bottle.', isRead: true, daysAgo: 1 },
    { id: 'demo-notification-grace-report', userId: students[3].id, title: 'Your ID report is under review', message: 'The campus team will review your student identification card report shortly.', isRead: false, daysAgo: 0 },
    { id: 'demo-notification-grace-claim', userId: students[3].id, title: 'Claim submitted', message: 'Your ownership claim is recorded and awaiting review.', isRead: false, daysAgo: 0 },
    { id: 'demo-notification-kwame-pending', userId: students[4].id, title: 'Report submitted', message: 'Your student access card report is pending administrator review.', isRead: false, daysAgo: 0 },
    { id: 'demo-notification-kwame-claim', userId: students[4].id, title: 'Claim awaiting review', message: 'Your claim for a set of keys has been sent to the report owner.', isRead: false, daysAgo: 0 },
    { id: 'demo-notification-kwame-announcement', userId: students[4].id, title: 'New campus announcement', message: 'The lost-property collection point and office hours have been updated.', isRead: true, daysAgo: 3 },
  ];
  for (const notification of notificationSamples) {
    const { daysAgo, ...data } = notification;
    await prisma.notification.upsert({
      where: { id: data.id },
      update: {},
      create: { ...data, createdAt: new Date(Date.now() - daysAgo * 86_400_000) },
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

  await prisma.abuseReport.upsert({
    where: { id: 'demo-abuse-open-kwame' },
    update: {},
    create: {
      id: 'demo-abuse-open-kwame',
      reportId: reportId('CF-DEMO017'),
      reporterId: students[4].id,
      reason: 'Possible duplicate listing',
      details: 'This phone may match an earlier listing. Please check before arranging a handover.',
      status: 'OPEN',
    },
  });
  await prisma.abuseReport.upsert({
    where: { id: 'demo-abuse-resolved-grace' },
    update: {},
    create: {
      id: 'demo-abuse-resolved-grace',
      reportId: reportId('CF-DEMO018'),
      reporterId: students[3].id,
      reason: 'Private details in description',
      details: 'The original listing included a detail that could identify the owner.',
      status: 'RESOLVED',
      resolvedAt: new Date(Date.now() - 2 * 86_400_000),
    },
  });

  const announcements = [
    { id: 'demo-announcement-library', title: 'Main library collection point', content: 'Items approved for collection are held at the main library help desk during staffed opening hours. Bring your student ID and wait for the handover to be verified.', category: 'Collection', daysAgo: 0 },
    { id: 'demo-announcement-id-cards', title: 'Student identification cards', content: 'Do not post card numbers, addresses, or photographs of identification cards in a public report. Share private ownership details only through a claim.', category: 'Safety', daysAgo: 1 },
    { id: 'demo-announcement-procedure', title: 'How to collect a recovered item', content: 'Submit a claim with identifying details, wait for the report owner to review it, then present the approved handover code to an administrator.', category: 'Guidance', daysAgo: 2 },
    { id: 'demo-announcement-platform', title: 'CampusFind platform update', content: 'Students can now follow saved listings and see claim and report updates in their activity dashboard.', category: 'Platform', daysAgo: 3 },
    { id: 'demo-announcement-verify', title: 'Verify ownership before collection', content: 'Never hand over an item based only on its public description. Ask the claimant to verify details that were not published in the listing.', category: 'Safety', daysAgo: 4 },
    { id: 'demo-announcement-security', title: 'Campus security office', content: 'Urgent safety concerns should be directed to the campus security office. CampusFind is for coordinating lost-property reports, not emergencies.', category: 'Campus services', daysAgo: 5 },
    { id: 'demo-announcement-semester', title: 'End-of-semester property check', content: 'Before leaving campus, check residence common areas, lecture rooms, and the library collection point for belongings you may have misplaced.', category: 'Community', daysAgo: 6 },
    { id: 'demo-announcement-hours', title: 'Collection desk hours', content: 'The library help desk accepts recovered property Monday to Friday, 08:00 to 17:00. Items are not released without an approved claim and verified handover.', category: 'Collection', daysAgo: 7 },
  ];
  for (const announcement of announcements) {
    const { daysAgo, ...data } = announcement;
    await prisma.announcement.upsert({
      where: { id: data.id },
      update: {},
      create: {
        ...data,
        createdById: admin.id,
        publishedAt: new Date(Date.now() - daysAgo * 86_400_000),
        isPublished: true,
      },
    });
  }

  const approvedClaim = await prisma.claim.findUniqueOrThrow({
    where: { reportId_userId: { reportId: reportId('CF-DEMO017'), userId: students[2].id } },
    select: { id: true },
  });
  const rejectedClaim = await prisma.claim.findUniqueOrThrow({
    where: { reportId_userId: { reportId: reportId('CF-DEMO024'), userId: students[2].id } },
    select: { id: true },
  });
  const completedClaim = await prisma.claim.findUniqueOrThrow({
    where: { reportId_userId: { reportId: reportId('CF-DEMO028'), userId: students[3].id } },
    select: { id: true },
  });
  const activitySamples = [
    { id: 'demo-activity-daniel-register', actorId: students[0].id, action: 'STUDENT_REGISTERED', entityType: 'User', entityId: students[0].id, daysAgo: 30 },
    { id: 'demo-activity-daniel-report', actorId: students[0].id, action: 'REPORT_SUBMITTED', entityType: 'ItemReport', entityId: reportId('CF-DEMO016'), daysAgo: 2 },
    { id: 'demo-activity-report-approved', actorId: admin.id, action: 'REPORT_APPROVED', entityType: 'ItemReport', entityId: reportId('CF-DEMO016'), daysAgo: 2 },
    { id: 'demo-activity-ama-found', actorId: students[1].id, action: 'REPORT_SUBMITTED', entityType: 'ItemReport', entityId: reportId('CF-DEMO017'), daysAgo: 1 },
    { id: 'demo-activity-daniel-claim', actorId: students[0].id, action: 'CLAIM_SUBMITTED', entityType: 'ItemReport', entityId: reportId('CF-DEMO017'), daysAgo: 0 },
    { id: 'demo-activity-michael-approved', actorId: admin.id, action: 'CLAIM_APPROVED', entityType: 'Claim', entityId: approvedClaim.id, daysAgo: 3 },
    { id: 'demo-activity-michael-rejected', actorId: admin.id, action: 'CLAIM_REJECTED', entityType: 'Claim', entityId: rejectedClaim.id, daysAgo: 2 },
    { id: 'demo-activity-grace-handover', actorId: admin.id, action: 'HANDOVER_VERIFIED', entityType: 'Claim', entityId: completedClaim.id, daysAgo: 1 },
    { id: 'demo-activity-kwame-abuse', actorId: students[4].id, action: 'ABUSE_REPORT_SUBMITTED', entityType: 'AbuseReport', entityId: 'demo-abuse-open-kwame', daysAgo: 0 },
    { id: 'demo-activity-announcement', actorId: admin.id, action: 'ANNOUNCEMENT_PUBLISHED', entityType: 'Announcement', entityId: 'demo-announcement-library', daysAgo: 0 },
  ];
  for (const activity of activitySamples) {
    const { daysAgo, ...data } = activity;
    await prisma.activityLog.upsert({
      where: { id: data.id },
      update: {},
      create: { ...data, createdAt: new Date(Date.now() - daysAgo * 86_400_000) },
    });
  }

  const [demoUserCount, demoReportCount, claimCount, notificationCount, savedItemCount, announcementCount] = await Promise.all([
    prisma.user.count({ where: { email: { in: ['admin@campusfind.demo', 'daniel@campusfind.demo', 'ama@campusfind.demo', 'michael@campusfind.demo', 'grace@campusfind.demo', 'kwame@campusfind.demo'] } } }),
    prisma.itemReport.count({ where: { reference: { startsWith: 'CF-DEMO' } } }),
    prisma.claim.count(),
    prisma.notification.count(),
    prisma.savedItem.count(),
    prisma.announcement.count({ where: { id: { startsWith: 'demo-announcement-' } } }),
  ]);
  console.log(JSON.stringify({ demoUserCount, demoReportCount, claimCount, notificationCount, savedItemCount, announcementCount }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
