import { Router, type IRouter } from "express";
import { db, usersTable, schoolsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth";

const router: IRouter = Router();

// In-memory session store (keyed by token)
const sessions = new Map<string, number>();

export function getSessionUserId(token: string): number | undefined {
  return sessions.get(token);
}

export function createSession(userId: number): string {
  const token = generateToken();
  sessions.set(token, userId);
  return token;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

function extractToken(req: any): string | null {
  const auth = req.headers["authorization"];
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

async function formatUser(user: any, school: any) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    schoolId: user.schoolId,
    schoolName: school?.name ?? "",
    avatarUrl: user.avatarUrl ?? null,
    bio: user.bio ?? null,
    grade: user.grade ?? null,
    privacyLevel: user.privacyLevel,
    quizCompleted: user.quizCompleted,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password, firstName, lastName, role, schoolId } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId));
  if (!school) {
    res.status(404).json({ error: "School not found" });
    return;
  }

  const passwordHash = hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
    firstName,
    lastName,
    role,
    schoolId,
  }).returning();

  // Increment school member count
  await db.update(schoolsTable).set({ memberCount: school.memberCount + 1 }).where(eq(schoolsTable.id, schoolId));

  const token = createSession(user.id);
  res.status(201).json({ user: await formatUser(user, school), token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password, schoolId } = parsed.data;

  const [user] = await db.select().from(usersTable).where(
    and(eq(usersTable.email, email), eq(usersTable.schoolId, schoolId))
  );

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId));
  const token = createSession(user.id);
  res.json({ user: await formatUser(user, school), token });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (token) destroySession(token);
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const userId = getSessionUserId(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid session" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
  res.json(await formatUser(user, school));
});

export { extractToken, formatUser };
export default router;
