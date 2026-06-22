import { Router, type IRouter } from "express";
import { db, leaderProfilesTable, usersTable, schoolsTable, quizResultsTable } from "@workspace/db";
import { eq, and, like, sql } from "drizzle-orm";
import { CreateLeaderProfileBody, UpdateLeaderProfileBody, GetLeaderProfileParams, ListLeadersQueryParams, GetFeaturedLeadersQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { formatUser } from "./auth";

const router: IRouter = Router();

async function buildLeaderResponse(profile: any, user: any, school: any) {
  const formattedUser = await formatUser(user, school);
  return {
    id: profile.id,
    userId: profile.userId,
    user: formattedUser,
    bio: profile.bio,
    interests: profile.interests ?? [],
    activities: profile.activities ?? [],
    favoriteClasses: profile.favoriteClasses ?? [],
    apHonorsExperience: profile.apHonorsExperience ?? null,
    satActExperience: profile.satActExperience ?? null,
    collegePlans: profile.collegePlans ?? null,
    availability: profile.availability,
    matchCount: profile.matchCount,
    rating: profile.rating ?? null,
    isApproved: profile.isApproved,
  };
}

router.get("/leaders", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const params = ListLeadersQueryParams.safeParse(req.query);
  const schoolId = params.success && params.data.schoolId ? Number(params.data.schoolId) : req.userSchoolId!;
  const search = params.success ? params.data.search : undefined;

  const profiles = await db.select().from(leaderProfilesTable)
    .innerJoin(usersTable, eq(leaderProfilesTable.userId, usersTable.id))
    .where(and(
      eq(usersTable.schoolId, schoolId),
      eq(usersTable.role, "leader"),
      search ? like(usersTable.firstName, `%${search}%`) : undefined,
    ));

  const school = (await db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId)))[0];
  const result = await Promise.all(profiles.map(p => buildLeaderResponse(p.leader_profiles, p.users, school)));
  res.json(result);
});

router.get("/leaders/featured", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const params = GetFeaturedLeadersQueryParams.safeParse(req.query);
  const schoolId = params.success && params.data.schoolId ? Number(params.data.schoolId) : req.userSchoolId!;

  const profiles = await db.select().from(leaderProfilesTable)
    .innerJoin(usersTable, eq(leaderProfilesTable.userId, usersTable.id))
    .where(and(eq(usersTable.schoolId, schoolId), eq(usersTable.role, "leader")))
    .orderBy(sql`${leaderProfilesTable.matchCount} DESC`)
    .limit(6);

  const school = (await db.select().from(schoolsTable).where(eq(schoolsTable.id, schoolId)))[0];
  const result = await Promise.all(profiles.map(p => buildLeaderResponse(p.leader_profiles, p.users, school)));
  res.json(result);
});

router.post("/leaders/profile", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateLeaderProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [profile] = await db.insert(leaderProfilesTable).values({
    userId: req.userId!,
    ...parsed.data,
  }).returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
  res.status(201).json(await buildLeaderResponse(profile, user, school));
});

router.patch("/leaders/profile", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const parsed = UpdateLeaderProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [profile] = await db.update(leaderProfilesTable)
    .set(parsed.data)
    .where(eq(leaderProfilesTable.userId, req.userId!))
    .returning();

  if (!profile) {
    res.status(404).json({ error: "Leader profile not found" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
  res.json(await buildLeaderResponse(profile, user, school));
});

router.patch("/leaders/:id/approve", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  if (req.userRole !== "admin" && req.userRole !== "school_admin") {
    res.status(403).json({ error: "School admin access required" }); return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const leaderId = parseInt(raw, 10);
  if (isNaN(leaderId)) { res.status(400).json({ error: "Invalid leader id" }); return; }

  const results = await db.select().from(leaderProfilesTable)
    .innerJoin(usersTable, eq(leaderProfilesTable.userId, usersTable.id))
    .where(eq(leaderProfilesTable.userId, leaderId));

  if (!results.length) { res.status(404).json({ error: "Leader profile not found" }); return; }

  const { users: leaderUser } = results[0];
  if (req.userRole === "school_admin" && leaderUser.schoolId !== req.userSchoolId) {
    res.status(403).json({ error: "Cannot approve leaders from another school" }); return;
  }

  const isApproved = req.body.isApproved !== false;
  const [profile] = await db.update(leaderProfilesTable)
    .set({ isApproved })
    .where(eq(leaderProfilesTable.userId, leaderId))
    .returning();

  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, leaderUser.schoolId));
  res.json(await buildLeaderResponse(profile, leaderUser, school));
});

router.get("/leaders/:id", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetLeaderProfileParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const results = await db.select().from(leaderProfilesTable)
    .innerJoin(usersTable, eq(leaderProfilesTable.userId, usersTable.id))
    .where(eq(leaderProfilesTable.userId, params.data.id));

  if (!results.length) {
    res.status(404).json({ error: "Leader profile not found" });
    return;
  }

  const { leader_profiles: profile, users: user } = results[0];
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, user.schoolId));
  res.json(await buildLeaderResponse(profile, user, school));
});

export default router;
