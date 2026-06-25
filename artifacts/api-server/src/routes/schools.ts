import { Router, type IRouter } from "express";
import { db, schoolsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateSchoolBody, GetSchoolParams } from "@workspace/api-zod";
import { requireAdmin, requireSchoolAdmin, type AuthRequest } from "../middlewares/requireAuth";
import { formatUser } from "./auth";

const router: IRouter = Router();

router.get("/schools", async (_req, res): Promise<void> => {
  const schools = await db.select({
    id: schoolsTable.id,
    name: schoolsTable.name,
    city: schoolsTable.city,
    state: schoolsTable.state,
    logoUrl: schoolsTable.logoUrl,
    colors: schoolsTable.colors,
    memberCount: schoolsTable.memberCount,
    createdAt: schoolsTable.createdAt,
    studentCount: sql<number>`(SELECT count(*) FROM users WHERE school_id = schools.id)`,
  }).from(schoolsTable).orderBy(schoolsTable.name);
  res.json(schools);
});

router.post("/schools", requireAdmin as any, async (req, res): Promise<void> => {
  const parsed = CreateSchoolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [school] = await db.insert(schoolsTable).values(parsed.data).returning();
  res.status(201).json(school);
});

router.get("/schools/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetSchoolParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, params.data.id));
  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }
  res.json(school);
});

router.put("/schools/:id", requireAdmin as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid school id" }); return; }

  const { name, city, state, logoUrl, colors } = req.body;
  if (!name && !city && !state && logoUrl === undefined && colors === undefined) {
    res.status(400).json({ error: "No fields to update" }); return;
  }

  const updates: Record<string, string | null | undefined> = {};
  if (name) updates.name = name;
  if (city) updates.city = city;
  if (state) updates.state = state;
  if (logoUrl !== undefined) updates.logoUrl = logoUrl || null;
  if (colors !== undefined) updates.colors = colors || null;

  const [school] = await db.update(schoolsTable).set(updates).where(eq(schoolsTable.id, id)).returning();
  if (!school) { res.status(404).json({ error: "School not found" }); return; }
  res.json(school);
});

router.delete("/schools/:id", requireAdmin as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid school id" }); return; }

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, id));
  if (!school) { res.status(404).json({ error: "School not found" }); return; }

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.schoolId, id));
  if (Number(count) > 0) {
    res.status(409).json({ error: `Cannot delete school with ${count} registered student(s). Reassign or remove them first.` });
    return;
  }

  await db.delete(schoolsTable).where(eq(schoolsTable.id, id));
  res.json({ success: true, message: "School deleted" });
});

router.get("/schools/:id/students", requireSchoolAdmin as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid school id" }); return; }

  // school_admin can only view their own school's students
  if (req.userRole === "school_admin" && req.userSchoolId !== id) {
    res.status(403).json({ error: "Cannot view students from another school" }); return;
  }

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, id));
  if (!school) { res.status(404).json({ error: "School not found" }); return; }

  const students = await db.select().from(usersTable).where(eq(usersTable.schoolId, id)).orderBy(usersTable.createdAt);
  const result = await Promise.all(students.map(u => formatUser(u, school)));
  res.json(result);
});

export default router;
