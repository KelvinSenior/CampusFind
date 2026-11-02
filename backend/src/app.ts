import 'dotenv/config';
import crypto from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { Prisma, PrismaClient, type User, type UserRole } from '@prisma/client';
import { z } from 'zod';
import { getPrismaClient } from './database.js';
import { findPotentialMatches } from './matching.js';

export const prisma: PrismaClient = getPrismaClient();
export const app = express();
const jwtSecret = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookie = 'campusfind_session';
const csrfCookie = 'campusfind_csrf';

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
}

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:4200',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

type AuthenticatedRequest = Request & { user?: Pick<User, 'id' | 'role' | 'status'> };

app.use((req, _res, next) => {
  if (req.path !== '/api' && !req.path.startsWith('/api/')) {
    req.url = `/api${req.url}`;
  }
  next();
});

function cookieOptions(httpOnly: boolean) {
  return {
    httpOnly,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: httpOnly ? '/api' : '/',
    ...(httpOnly ? { maxAge: 24 * 60 * 60 * 1000 } : {}),
  };
}

function setSession(res: Response, user: User) {
  const token = issueToken(user);
  const csrfToken = crypto.randomBytes(32).toString('base64url');
  res.cookie(sessionCookie, token, cookieOptions(true));
  res.cookie(csrfCookie, csrfToken, cookieOptions(false));
  return csrfToken;
}

function requireCsrf(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  const cookieToken = req.cookies?.[csrfCookie];
  const headerToken = req.header('x-csrf-token');
  if (
    typeof cookieToken !== 'string'
    || typeof headerToken !== 'string'
    || cookieToken.length !== headerToken.length
    || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    res.status(403).json({ error: 'CSRF validation failed. Refresh the page and try again.' });
    return;
  }
  next();
}

app.use(requireCsrf);

function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function pathId(req: Request): string {
  const id = req.params.id;
  if (typeof id !== 'string') throw new Error('A single route identifier is required.');
  return id;
}

function issueToken(user: User) {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret!, { expiresIn: 60 * 60 * 24 });
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[sessionCookie];
  if (typeof token !== 'string') {
    res.status(401).json({ error: 'Authentication is required.' });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret!) as jwt.JwtPayload;
    if (typeof payload.sub !== 'string') {
      res.status(401).json({ error: 'Invalid authentication token.' });
      return;
    }

    void prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true },
    }).then((user) => {
      if (!user || user.status !== 'ACTIVE') {
        res.status(401).json({ error: 'This account is unavailable.' });
        return;
      }
      req.user = user;
      next();
    }).catch(next);
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}

const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(40),
  lastName: z.string().trim().min(1).max(40),
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(10).max(100)
    .regex(/[a-z]/, 'Password must include a lowercase letter.')
    .regex(/[A-Z]/, 'Password must include an uppercase letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
  acceptedTerms: z.literal(true),
});

const loginSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(100),
});

const reportSchema = z.object({
  reportType: z.enum(['LOST', 'FOUND']),
  itemName: z.string().trim().min(2).max(100),
  category: z.enum(['ELECTRONICS', 'BAGS', 'IDENTIFICATION', 'BOOKS', 'CLOTHING', 'JEWELLERY', 'KEYS', 'DOCUMENTS', 'OTHER']),
  description: z.string().trim().min(10).max(2000),
  identifyingDetails: z.string().trim().max(1000).optional(),
  photoUrl: z.url().optional().or(z.literal('')),
  dateOccurred: z.iso.datetime(),
  location: z.enum(['LECTURE_HALL', 'LIBRARY', 'RESIDENCE', 'CAFETERIA', 'LABORATORY', 'SPORTS_FACILITY', 'ADMIN_BLOCK', 'OTHER']),
  locationDetails: z.string().trim().max(200).optional(),
});

const claimSchema = z.object({
  explanation: z.string().trim().min(10).max(1500),
  distinguishingFeatures: z.string().trim().min(5).max(1000),
  additionalEvidence: z.string().trim().max(1500).optional(),
});

const reportUpdateSchema = reportSchema.partial().refine((value) => Object.keys(value).length > 0);

const reportSelect = {
  id: true,
  reference: true,
  reportType: true,
  itemName: true,
  category: true,
  description: true,
  photoUrl: true,
  dateOccurred: true,
  location: true,
  locationDetails: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  user: { select: { id: true, name: true } },
} satisfies Prisma.ItemReportSelect;

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/auth/csrf', (req, res) => {
  const csrfToken = typeof req.cookies?.[csrfCookie] === 'string'
    ? req.cookies[csrfCookie]
    : crypto.randomBytes(32).toString('base64url');
  res.cookie(csrfCookie, csrfToken, cookieOptions(false));
  res.json({ csrfToken });
});

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait and try again.' },
});

app.post('/api/auth/register', authRateLimit, async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: { name: `${input.firstName} ${input.lastName}`, email: input.email, passwordHash },
    });
    const csrfToken = setSession(res, user);
    res.status(201).json({ user: publicUser(user), csrfToken });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', authRateLimit, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(input.password, user.passwordHash))) {
      res.status(401).json({ error: 'Email or password is incorrect.' });
      return;
    }
    const csrfToken = setSession(res, user);
    res.json({ user: publicUser(user), csrfToken });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(sessionCookie, { ...cookieOptions(true), maxAge: undefined });
  res.clearCookie(csrfCookie, { ...cookieOptions(false), maxAge: undefined });
  res.status(204).end();
});

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  res.json({ user: publicUser(user) });
});

app.get('/api/reports', async (req, res, next) => {
  try {
    const filters = z.object({
      q: z.string().trim().max(100).optional(),
      type: z.enum(['LOST', 'FOUND']).optional(),
      category: z.enum(['ELECTRONICS', 'BAGS', 'IDENTIFICATION', 'BOOKS', 'CLOTHING', 'JEWELLERY', 'KEYS', 'DOCUMENTS', 'OTHER']).optional(),
      location: z.enum(['LECTURE_HALL', 'LIBRARY', 'RESIDENCE', 'CAFETERIA', 'LABORATORY', 'SPORTS_FACILITY', 'ADMIN_BLOCK', 'OTHER']).optional(),
      status: z.enum(['APPROVED', 'RECOVERED']).optional(),
      date: z.iso.date().optional(),
      sort: z.enum(['newest', 'oldest', 'updated']).default('newest'),
    }).parse(req.query);
    const reports = await prisma.itemReport.findMany({
      where: {
        status: filters.status ?? { in: ['APPROVED', 'RECOVERED'] },
        ...(filters.type ? { reportType: filters.type } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.location ? { location: filters.location } : {}),
        ...(filters.q ? { OR: [{ itemName: { contains: filters.q } }, { description: { contains: filters.q } }] } : {}),
        ...(filters.date ? {
          dateOccurred: {
            gte: new Date(`${filters.date}T00:00:00.000Z`),
            lt: new Date(new Date(`${filters.date}T00:00:00.000Z`).getTime() + 86_400_000),
          },
        } : {}),
      },
      select: reportSelect,
      orderBy: filters.sort === 'updated'
        ? { updatedAt: 'desc' }
        : { createdAt: filters.sort === 'oldest' ? 'asc' : 'desc' },
      take: 100,
    });
    res.json({ reports });
  } catch (error) {
    next(error);
  }
});

app.get('/api/reports/:id', async (req, res, next) => {
  try {
    const report = await prisma.itemReport.findUnique({
      where: { id: pathId(req) },
      select: {
        ...reportSelect,
        identifyingDetails: true,
      },
    });
    if (!report || report.status === 'REJECTED' || report.status === 'PENDING') {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    res.json({ report: { ...report, identifyingDetails: undefined } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/reports', requireAuth, requireRole('STUDENT'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = reportSchema.parse(req.body);
    const report = await prisma.itemReport.create({
      data: {
        ...input,
        photoUrl: input.photoUrl || null,
        reference: `CF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        dateOccurred: new Date(input.dateOccurred),
        userId: req.user!.id,
      },
      select: reportSelect,
    });
    await prisma.activityLog.create({
      data: { actorId: req.user!.id, action: 'REPORT_SUBMITTED', entityType: 'ItemReport', entityId: report.id },
    });
    res.status(201).json({ report });
  } catch (error) {
    next(error);
  }
});

app.get('/api/my/reports', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const reports = await prisma.itemReport.findMany({
      where: { userId: req.user!.id },
      select: reportSelect,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reports });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/reports/:id', requireAuth, requireRole('STUDENT'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = reportUpdateSchema.parse(req.body);
    const id = pathId(req);
    const existing = await prisma.itemReport.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user!.id) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    if (!['PENDING', 'REJECTED'].includes(existing.status)) {
      res.status(409).json({ error: 'Only pending or rejected reports can be edited.' });
      return;
    }
    const report = await prisma.itemReport.update({
      where: { id },
      data: {
        ...input,
        ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl || null } : {}),
        ...(input.dateOccurred ? { dateOccurred: new Date(input.dateOccurred) } : {}),
        status: 'PENDING',
      },
      select: reportSelect,
    });
    res.json({ report });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/reports/:id', requireAuth, requireRole('STUDENT'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = pathId(req);
    const report = await prisma.itemReport.findUnique({ where: { id } });
    if (!report || report.userId !== req.user!.id) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    if (!['PENDING', 'REJECTED'].includes(report.status)) {
      res.status(409).json({ error: 'Only pending or rejected reports can be deleted.' });
      return;
    }
    await prisma.itemReport.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/reports/:id/matches', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = pathId(req);
    const lostReport = await prisma.itemReport.findUnique({ where: { id } });
    if (!lostReport || lostReport.reportType !== 'LOST' || (lostReport.userId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      res.status(404).json({ error: 'Lost report not found.' });
      return;
    }
    const foundReports = await prisma.itemReport.findMany({
      where: { reportType: 'FOUND', status: 'APPROVED', userId: { not: lostReport.userId } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const matches = findPotentialMatches(lostReport, foundReports);
    res.json({
      matches: matches.map(({ report, score, reasons }) => ({
        report: {
          id: report.id,
          reference: report.reference,
          itemName: report.itemName,
          category: report.category,
          description: report.description,
          location: report.location,
          dateOccurred: report.dateOccurred,
          status: report.status,
        },
        score,
        reasons,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/reports', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const status = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'RECOVERED']).optional().parse(req.query.status);
    const reports = await prisma.itemReport.findMany({
      where: status ? { status } : {},
      select: reportSelect,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ reports });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/claims', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const status = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']).optional().parse(req.query.status);
    const claims = await prisma.claim.findMany({
      where: status ? { status } : {},
      select: {
        id: true,
        status: true,
        createdAt: true,
        handoverCode: true,
        explanation: true,
        distinguishingFeatures: true,
        report: { select: { id: true, reference: true, itemName: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ claims });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/reports/:id/moderate', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const input = z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body);
    const adminId = (req as AuthenticatedRequest).user!.id;
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.itemReport.findUnique({ where: { id: pathId(req) } });
      if (!current) return { kind: 'missing' as const };
      if (current.status !== 'PENDING') return { kind: 'conflict' as const };
      const report = await tx.itemReport.update({
        where: { id: current.id },
        data: { status: input.status },
        select: reportSelect,
      });
      await tx.notification.create({
        data: {
          userId: report.userId,
          title: `Report ${input.status.toLowerCase()}`,
          message: `Your report "${report.itemName}" was ${input.status.toLowerCase()}.`,
        },
      });
      await tx.activityLog.create({
        data: { actorId: adminId, action: `REPORT_${input.status}`, entityType: 'ItemReport', entityId: report.id },
      });
      return { kind: 'updated' as const, report };
    });
    if (result.kind === 'missing') {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    if (result.kind === 'conflict') {
      res.status(409).json({ error: 'Only pending reports can be moderated.' });
      return;
    }
    res.json({ report: result.report });
  } catch (error) {
    next(error);
  }
});

app.post('/api/reports/:id/claims', requireAuth, requireRole('STUDENT'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = claimSchema.parse(req.body);
    const report = await prisma.itemReport.findUnique({ where: { id: pathId(req) } });
    if (!report || report.status !== 'APPROVED' || report.reportType !== 'FOUND') {
      res.status(404).json({ error: 'Found report not found.' });
      return;
    }
    if (report.userId === req.user!.id) {
      res.status(400).json({ error: 'You cannot claim your own found report.' });
      return;
    }
    const claim = await prisma.$transaction(async (tx) => {
      const created = await tx.claim.create({
        data: { ...input, reportId: report.id, userId: req.user!.id },
        select: { id: true, reportId: true, explanation: true, distinguishingFeatures: true, status: true, createdAt: true },
      });
      await tx.notification.create({
        data: {
          userId: report.userId,
          title: 'New ownership claim',
          message: `Someone submitted an ownership claim for "${report.itemName}".`,
        },
      });
      return created;
    });
    res.status(201).json({ claim });
  } catch (error) {
    next(error);
  }
});

app.get('/api/my/claims', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const claims = await prisma.claim.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        explanation: true,
        distinguishingFeatures: true,
        status: true,
        handoverCode: true,
        createdAt: true,
        report: { select: { id: true, reference: true, itemName: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ claims });
  } catch (error) {
    next(error);
  }
});

app.get('/api/reports/:id/claims', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const reportId = pathId(req);
    const report = await prisma.itemReport.findUnique({ where: { id: reportId }, select: { userId: true } });
    if (!report || (report.userId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    const claims = await prisma.claim.findMany({
      where: { reportId },
      select: {
        id: true,
        explanation: true,
        distinguishingFeatures: true,
        additionalEvidence: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ claims });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/claims/:id/review', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body);
    const claimId = pathId(req);
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { report: { select: { userId: true, itemName: true, status: true } } },
    });
    if (!claim || (claim.report.userId !== req.user!.id && req.user!.role !== 'ADMIN')) {
      res.status(404).json({ error: 'Claim not found.' });
      return;
    }
    if (claim.status !== 'PENDING') {
      res.status(409).json({ error: 'Only pending claims can be reviewed.' });
      return;
    }
    if (claim.report.status !== 'APPROVED') {
      res.status(409).json({ error: 'Claims can only be reviewed while the report is active.' });
      return;
    }
    const reviewed = await prisma.$transaction(async (tx) => {
      if (status === 'APPROVED') {
        const competingClaim = await tx.claim.findFirst({
          where: { reportId: claim.reportId, id: { not: claim.id }, status: { in: ['APPROVED', 'COMPLETED'] } },
          select: { id: true },
        });
        if (competingClaim) return null;
      }
      const result = await tx.claim.update({
        where: { id: claim.id },
        data: {
          status,
          ...(status === 'APPROVED' ? { handoverCode: crypto.randomBytes(6).toString('hex').toUpperCase() } : {}),
        },
        select: { id: true, status: true, handoverCode: true, reportId: true, userId: true },
      });
      await tx.notification.create({
        data: {
          userId: claim.userId,
          title: `Claim ${status.toLowerCase()}`,
          message: `Your claim for "${claim.report.itemName}" was ${status.toLowerCase()}.`,
        },
      });
      return result;
    });
    if (!reviewed) {
      res.status(409).json({ error: 'Another claim has already been approved for this item.' });
      return;
    }
    res.json({ claim: reviewed });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/claims/:id/verify-handover', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { handoverCode } = z.object({ handoverCode: z.string().trim().min(8).max(32) }).parse(req.body);
    const claimId = pathId(req);
    const claim = await prisma.claim.findUnique({ where: { handoverCode } });
    if (!claim || claim.id !== claimId || claim.status !== 'APPROVED') {
      res.status(404).json({ error: 'Approved claim or handover code not found.' });
      return;
    }
    await prisma.$transaction(async (tx) => {
      await tx.claim.update({
        where: { id: claim.id },
        data: { status: 'COMPLETED', handoverVerifiedAt: new Date() },
      });
      await tx.itemReport.update({ where: { id: claim.reportId }, data: { status: 'RECOVERED' } });
      await tx.notification.create({
        data: { userId: claim.userId, title: 'Handover completed', message: 'Your item handover has been verified.' },
      });
      await tx.activityLog.create({
        data: { actorId: (req as AuthenticatedRequest).user!.id, action: 'HANDOVER_VERIFIED', entityType: 'Claim', entityId: claim.id },
      });
    });
    res.json({ status: 'COMPLETED' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/notifications', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/notifications/:id/read', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: pathId(req), userId: req.user!.id },
      data: { isRead: true },
    });
    if (!result.count) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    res.json({ status: 'READ' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/dashboard', requireAuth, requireRole('ADMIN'), async (_req, res, next) => {
  try {
    const [users, lost, found, pendingReports, pendingClaims, recovered, openAbuse] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.itemReport.count({ where: { reportType: 'LOST' } }),
      prisma.itemReport.count({ where: { reportType: 'FOUND' } }),
      prisma.itemReport.count({ where: { status: 'PENDING' } }),
      prisma.claim.count({ where: { status: 'PENDING' } }),
      prisma.itemReport.count({ where: { status: 'RECOVERED' } }),
      prisma.abuseReport.count({ where: { status: 'OPEN' } }),
    ]);
    res.json({ users, lost, found, pendingReports, pendingClaims, recovered, openAbuse });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ error: 'Invalid request data.', details: error.issues });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'A record with that value already exists.' });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Record not found.' });
      return;
    }
  }
  console.error(error);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

export default app;
