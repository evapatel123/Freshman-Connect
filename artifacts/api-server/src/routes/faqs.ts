import { Router, type IRouter } from "express";
import { db, faqsTable, usersTable, schoolsTable } from "@workspace/db";
import { eq, and, like } from "drizzle-orm";
import { CreateFaqBody, UpdateFaqParams, UpdateFaqBody, DeleteFaqParams, ListFaqsQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { formatUser } from "./auth";

const router: IRouter = Router();

router.get("/faqs", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const params = ListFaqsQueryParams.safeParse(req.query);
  const schoolId = params.success && params.data.schoolId ? Number(params.data.schoolId) : req.userSchoolId!;
  const category = params.success ? params.data.category : undefined;
  const search = params.success ? params.data.search : undefined;

  const conditions = [eq(faqsTable.schoolId, schoolId)];
  if (category) conditions.push(eq(faqsTable.category, category));
  if (search) conditions.push(like(faqsTable.question, `%${search}%`));

  const faqs = await db.select().from(faqsTable).where(and(...conditions));

  const result = await Promise.all(faqs.map(async faq => {
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, faq.authorId));
    const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, faq.schoolId));
    return { ...faq, author: await formatUser(author, school), createdAt: faq.createdAt.toISOString(), updatedAt: undefined };
  }));
  res.json(result);
});

router.post("/faqs", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateFaqBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [faq] = await db.insert(faqsTable).values({ ...parsed.data, authorId: req.userId! }).returning();
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, faq.schoolId));
  res.status(201).json({ ...faq, author: await formatUser(author, school), createdAt: faq.createdAt.toISOString(), updatedAt: undefined });
});

router.patch("/faqs/:id", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateFaqParams.safeParse({ id: parseInt(raw, 10) });
  const bodyParsed = UpdateFaqBody.safeParse(req.body);
  if (!params.success || !bodyParsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const [faq] = await db.update(faqsTable).set(bodyParsed.data).where(eq(faqsTable.id, params.data.id)).returning();
  if (!faq) { res.status(404).json({ error: "FAQ not found" }); return; }

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, faq.authorId));
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, faq.schoolId));
  res.json({ ...faq, author: await formatUser(author, school), createdAt: faq.createdAt.toISOString(), updatedAt: undefined });
});

router.delete("/faqs/:id", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteFaqParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  await db.delete(faqsTable).where(eq(faqsTable.id, params.data.id));
  res.json({ success: true, message: "FAQ deleted" });
});

export default router;
