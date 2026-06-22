import { Router, type IRouter } from "express";
import { db, reportsTable, usersTable, schoolsTable, matchesTable, messagesTable, postsTable, quizResultsTable } from "@workspace/db";
import { eq, and, like, sql } from "drizzle-orm";
import { CreateReportBody, ListReportsQueryParams, ResolveReportParams, ResolveReportBody, GetAdminDashboardQueryParams, ListAdminUsersQueryParams } from "@workspace/api-zod";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/requireAuth";
import { formatUser } from "./auth";

const router: IRouter = Router();

router.post("/reports", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [report] = await db.insert(reportsTable).values({ ...parsed.data, reporterId: req.userId! }).returning();
  const [reporter] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, reporter.schoolId));
  res.status(201).json({ ...report, reporter: await formatUser(reporter, school), createdAt: report.createdAt.toISOString(), updatedAt: undefined });
});

router.get("/admin/reports", requireAdmin as any, async (req: AuthRequest, res): Promise<void> => {
  const params = ListReportsQueryParams.safeParse(req.query);
  const conditions = [];
  if (params.success && params.data.status) conditions.push(eq(reportsTable.status, params.data.status));

  const reports = await db.select().from(reportsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(reportsTable.createdAt);

  const result = await Promise.all(reports.map(async r => {
    const [reporter] = await db.select().from(usersTable).where(eq(usersTable.id, r.reporterId));
    const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, reporter.schoolId));
    return { ...r, reporter: await formatUser(reporter, school), createdAt: r.createdAt.toISOString(), updatedAt: undefined };
  }));
  res.json(result);
});

router.patch("/admin/reports/:id", requireAdmin as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ResolveReportParams.safeParse({ id: parseInt(raw, 10) });
  const bodyParsed = ResolveReportBody.safeParse(req.body);
  if (!params.success || !bodyParsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const [report] = await db.update(reportsTable).set(bodyParsed.data).where(eq(reportsTable.id, params.data.id)).returning();
  if (!report) { res.status(404).json({ error: "Report not found" }); return; }

  const [reporter] = await db.select().from(usersTable).where(eq(usersTable.id, report.reporterId));
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, reporter.schoolId));
  res.json({ ...report, reporter: await formatUser(reporter, school), createdAt: report.createdAt.toISOString(), updatedAt: undefined });
});

router.get("/admin/dashboard", requireAdmin as any, async (req: AuthRequest, res): Promise<void> => {
  const params = GetAdminDashboardQueryParams.safeParse(req.query);
  const schoolId = params.success && params.data.schoolId ? Number(params.data.schoolId) : req.userSchoolId!;

  const [{ totalUsers }] = await db.select({ totalUsers: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.schoolId, schoolId));
  const [{ totalFreshmen }] = await db.select({ totalFreshmen: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.schoolId, schoolId), eq(usersTable.role, "freshman")));
  const [{ totalLeaders }] = await db.select({ totalLeaders: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.schoolId, schoolId), eq(usersTable.role, "leader")));
  const [{ totalMatches }] = await db.select({ totalMatches: sql<number>`count(*)` }).from(matchesTable);
  const [{ totalMessages }] = await db.select({ totalMessages: sql<number>`count(*)` }).from(messagesTable);
  const [{ totalPosts }] = await db.select({ totalPosts: sql<number>`count(*)` }).from(postsTable).where(eq(postsTable.schoolId, schoolId));
  const [{ quizCompleted }] = await db.select({ quizCompleted: sql<number>`count(*)` }).from(usersTable).where(and(eq(usersTable.schoolId, schoolId), eq(usersTable.quizCompleted, true)));
  const [{ pendingReports }] = await db.select({ pendingReports: sql<number>`count(*)` }).from(reportsTable).where(eq(reportsTable.status, "pending"));

  const quizCompletionRate = Number(totalFreshmen) > 0 ? (Number(quizCompleted) / Number(totalFreshmen)) * 100 : 0;

  res.json({
    totalUsers: Number(totalUsers),
    totalFreshmen: Number(totalFreshmen),
    totalLeaders: Number(totalLeaders),
    totalMatches: Number(totalMatches),
    totalMessages: Number(totalMessages),
    totalPosts: Number(totalPosts),
    quizCompletionRate: Math.round(quizCompletionRate),
    pendingReports: Number(pendingReports),
    recentActivity: [],
  });
});

router.get("/admin/users", requireAdmin as any, async (req: AuthRequest, res): Promise<void> => {
  const params = ListAdminUsersQueryParams.safeParse(req.query);
  const schoolId = params.success && params.data.schoolId ? Number(params.data.schoolId) : req.userSchoolId!;

  const conditions = [eq(usersTable.schoolId, schoolId)];
  if (params.success && params.data.role) conditions.push(eq(usersTable.role, params.data.role));
  if (params.success && params.data.search) conditions.push(like(usersTable.firstName, `%${params.data.search}%`));

  const users = await db.select().from(usersTable).where(and(...conditions));
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId));
  const result = await Promise.all(users.map(u => formatUser(u, school)));
  res.json(result);
});

export default router;
