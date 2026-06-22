import { Router, type IRouter } from "express";
import { db, usersTable, schoolsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateMeBody, GetUserParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { formatUser } from "./auth";

const router: IRouter = Router();

router.patch("/users/me", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, req.userId!))
    .returning();

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
  res.json(await formatUser(user, school));
});

router.get("/users/:id", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUserParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
  res.json(await formatUser(user, school));
});

export default router;
