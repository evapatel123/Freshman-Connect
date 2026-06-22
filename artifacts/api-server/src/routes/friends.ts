import { Router, type IRouter } from "express";
import { db, friendshipsTable, usersTable, schoolsTable, quizResultsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { SendFriendRequestBody, AcceptFriendRequestParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { formatUser } from "./auth";

const router: IRouter = Router();

router.get("/friends/suggestions", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const [myResult] = await db.select().from(quizResultsTable).where(eq(quizResultsTable.userId, req.userId!));
  
  const myInterests = myResult ? [
    ...(myResult.hobbies as string[]),
    ...(myResult.academicInterests as string[]),
    ...(myResult.careerInterests as string[]),
  ] : [];

  const peers = await db.select().from(usersTable).where(
    and(eq(usersTable.schoolId, req.userSchoolId!), eq(usersTable.role, "freshman"))
  );

  const suggestions = [];
  for (const peer of peers) {
    if (peer.id === req.userId) continue;
    const [peerResult] = await db.select().from(quizResultsTable).where(eq(quizResultsTable.userId, peer.id));
    if (!peerResult) continue;
    const peerInterests = [...(peerResult.hobbies as string[]), ...(peerResult.academicInterests as string[]), ...(peerResult.careerInterests as string[])];
    const shared = myInterests.filter(i => peerInterests.some(pi => pi.toLowerCase() === i.toLowerCase()));
    const score = (shared.length / Math.max(myInterests.length, 1)) * 100;
    if (score > 0) {
      const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, peer.schoolId));
      suggestions.push({ user: await formatUser(peer, school), sharedInterests: shared, compatibilityScore: Math.round(score) });
    }
  }
  suggestions.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  res.json(suggestions.slice(0, 10));
});

router.get("/friends", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const friendships = await db.select().from(friendshipsTable)
    .where(and(
      or(eq(friendshipsTable.requesterId, req.userId!), eq(friendshipsTable.recipientId, req.userId!)),
      eq(friendshipsTable.status, "accepted")
    ));

  const result = await Promise.all(friendships.map(async f => {
    const [requester] = await db.select().from(usersTable).where(eq(usersTable.id, f.requesterId));
    const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, f.recipientId));
    const [rs] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, requester.schoolId));
    const [rcs] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, recipient.schoolId));
    return {
      id: f.id, requesterId: f.requesterId, recipientId: f.recipientId,
      requester: await formatUser(requester, rs), recipient: await formatUser(recipient, rcs),
      status: f.status, createdAt: f.createdAt.toISOString(),
    };
  }));
  res.json(result);
});

router.post("/friends", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const parsed = SendFriendRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [f] = await db.insert(friendshipsTable).values({
    requesterId: req.userId!,
    recipientId: parsed.data.recipientId,
    status: "pending",
  }).returning();

  const [requester] = await db.select().from(usersTable).where(eq(usersTable.id, f.requesterId));
  const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, f.recipientId));
  const [rs] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, requester.schoolId));
  const [rcs] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, recipient.schoolId));
  res.status(201).json({
    id: f.id, requesterId: f.requesterId, recipientId: f.recipientId,
    requester: await formatUser(requester, rs), recipient: await formatUser(recipient, rcs),
    status: f.status, createdAt: f.createdAt.toISOString(),
  });
});

router.patch("/friends/:id/accept", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AcceptFriendRequestParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [f] = await db.update(friendshipsTable).set({ status: "accepted" }).where(eq(friendshipsTable.id, params.data.id)).returning();
  if (!f) { res.status(404).json({ error: "Friendship not found" }); return; }

  const [requester] = await db.select().from(usersTable).where(eq(usersTable.id, f.requesterId));
  const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, f.recipientId));
  const [rs] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, requester.schoolId));
  const [rcs] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, recipient.schoolId));
  res.json({
    id: f.id, requesterId: f.requesterId, recipientId: f.recipientId,
    requester: await formatUser(requester, rs), recipient: await formatUser(recipient, rcs),
    status: f.status, createdAt: f.createdAt.toISOString(),
  });
});

export default router;
