import { Router, type IRouter } from "express";
import { db, matchesTable, leaderProfilesTable, usersTable, schoolsTable, quizResultsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { formatUser } from "./auth";

const router: IRouter = Router();

async function buildMatchResponse(match: any, leaderProfile: any, leaderUser: any, school: any) {
  const formattedUser = await formatUser(leaderUser, school);
  return {
    id: match.id,
    freshmanId: match.freshmanId,
    leaderId: match.leaderId,
    leaderProfile: {
      id: leaderProfile.id,
      userId: leaderProfile.userId,
      user: formattedUser,
      bio: leaderProfile.bio,
      interests: leaderProfile.interests ?? [],
      activities: leaderProfile.activities ?? [],
      favoriteClasses: leaderProfile.favoriteClasses ?? [],
      apHonorsExperience: leaderProfile.apHonorsExperience ?? null,
      satActExperience: leaderProfile.satActExperience ?? null,
      collegePlans: leaderProfile.collegePlans ?? null,
      availability: leaderProfile.availability,
      matchCount: leaderProfile.matchCount,
      rating: leaderProfile.rating ?? null,
    },
    matchScore: match.matchScore,
    sharedInterests: match.sharedInterests ?? [],
    status: match.status,
    createdAt: match.createdAt.toISOString(),
  };
}

async function generateMatches(freshmanId: number, schoolId: number) {
  const [quizResult] = await db.select().from(quizResultsTable).where(eq(quizResultsTable.userId, freshmanId));
  if (!quizResult) return [];

  const freshmanInterests = [
    ...(quizResult.hobbies as string[]),
    ...(quizResult.academicInterests as string[]),
    ...(quizResult.extracurriculars as string[]),
    ...(quizResult.careerInterests as string[]),
  ];

  const leaders = await db.select().from(leaderProfilesTable)
    .innerJoin(usersTable, eq(leaderProfilesTable.userId, usersTable.id))
    .where(and(eq(usersTable.schoolId, schoolId), eq(usersTable.role, "leader")));

  const matches = leaders.map(({ leader_profiles: lp, users: lu }) => {
    const leaderInterests = [...(lp.interests as string[]), ...(lp.activities as string[]), ...(lp.favoriteClasses as string[])];
    const shared = freshmanInterests.filter(i => leaderInterests.some(li => li.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(li.toLowerCase())));
    const score = Math.min(100, (shared.length / Math.max(freshmanInterests.length, 1)) * 100 + Math.random() * 20);
    return { leaderId: lu.id, score, shared };
  });

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 5);
}

router.get("/matches/me", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const existing = await db.select().from(matchesTable).where(eq(matchesTable.freshmanId, req.userId!));
  
  if (existing.length === 0 && req.userRole === "freshman") {
    const newMatches = await generateMatches(req.userId!, req.userSchoolId!);
    for (const m of newMatches) {
      await db.insert(matchesTable).values({
        freshmanId: req.userId!,
        leaderId: m.leaderId,
        matchScore: m.score,
        sharedInterests: m.shared,
        status: "pending",
      });
    }
  }

  const matches = await db.select().from(matchesTable).where(eq(matchesTable.freshmanId, req.userId!));
  const result = [];
  for (const match of matches) {
    const lps = await db.select().from(leaderProfilesTable).innerJoin(usersTable, eq(leaderProfilesTable.userId, usersTable.id)).where(eq(leaderProfilesTable.userId, match.leaderId));
    if (!lps.length) continue;
    const { leader_profiles: lp, users: lu } = lps[0];
    const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, lu.schoolId));
    result.push(await buildMatchResponse(match, lp, lu, school));
  }
  res.json(result);
});

router.get("/matches/suggestions", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const suggestions = await generateMatches(req.userId!, req.userSchoolId!);
  const result = [];
  for (const s of suggestions) {
    const lps = await db.select().from(leaderProfilesTable).innerJoin(usersTable, eq(leaderProfilesTable.userId, usersTable.id)).where(eq(leaderProfilesTable.userId, s.leaderId));
    if (!lps.length) continue;
    const { leader_profiles: lp, users: lu } = lps[0];
    const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, lu.schoolId));
    const fakeMatch = { id: 0, freshmanId: req.userId!, leaderId: s.leaderId, matchScore: s.score, sharedInterests: s.shared, status: "pending", createdAt: new Date() };
    result.push(await buildMatchResponse(fakeMatch, lp, lu, school));
  }
  res.json(result);
});

export default router;
