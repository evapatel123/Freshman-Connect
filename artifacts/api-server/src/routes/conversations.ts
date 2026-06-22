import { Router, type IRouter } from "express";
import { db, conversationsTable, conversationParticipantsTable, messagesTable, usersTable, schoolsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { CreateConversationBody, GetMessagesParams, SendMessageParams, SendMessageBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { formatUser } from "./auth";

const router: IRouter = Router();

async function getConversationParticipants(conversationId: number) {
  const parts = await db.select().from(conversationParticipantsTable)
    .innerJoin(usersTable, eq(conversationParticipantsTable.userId, usersTable.id))
    .where(eq(conversationParticipantsTable.conversationId, conversationId));
  
  return Promise.all(parts.map(async ({ users: u, conversation_participants: cp }) => {
    const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));
    return { user: await formatUser(u, school), unreadCount: cp.unreadCount };
  }));
}

router.get("/conversations", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const myParts = await db.select().from(conversationParticipantsTable)
    .where(eq(conversationParticipantsTable.userId, req.userId!));

  const result = [];
  for (const part of myParts) {
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, part.conversationId));
    if (!conv) continue;
    const participants = await getConversationParticipants(conv.id);
    const [lastMsg] = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, conv.id))
      .orderBy(sql`${messagesTable.createdAt} DESC`)
      .limit(1);
    result.push({
      id: conv.id,
      participants: participants.map(p => p.user),
      lastMessage: lastMsg?.content ?? null,
      lastMessageAt: lastMsg?.createdAt.toISOString() ?? null,
      unreadCount: part.unreadCount,
      createdAt: conv.createdAt.toISOString(),
    });
  }
  result.sort((a, b) => (b.lastMessageAt ?? b.createdAt) > (a.lastMessageAt ?? a.createdAt) ? 1 : -1);
  res.json(result);
});

router.post("/conversations", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { recipientId, initialMessage } = parsed.data;

  const [conv] = await db.insert(conversationsTable).values({}).returning();
  await db.insert(conversationParticipantsTable).values([
    { conversationId: conv.id, userId: req.userId! },
    { conversationId: conv.id, userId: recipientId },
  ]);
  await db.insert(messagesTable).values({
    conversationId: conv.id,
    senderId: req.userId!,
    content: initialMessage,
  });
  await db.update(conversationsTable).set({ lastMessageAt: new Date() }).where(eq(conversationsTable.id, conv.id));

  const participants = await getConversationParticipants(conv.id);
  res.status(201).json({
    id: conv.id,
    participants: participants.map(p => p.user),
    lastMessage: initialMessage,
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    createdAt: conv.createdAt.toISOString(),
  });
});

router.get("/conversations/:id/messages", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetMessagesParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const messages = await db.select().from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  const result = await Promise.all(messages.map(async ({ messages: m, users: u }) => {
    const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      sender: await formatUser(u, school),
      content: m.content,
      readAt: m.readAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    };
  }));

  // Mark as read
  await db.update(conversationParticipantsTable).set({ unreadCount: 0 })
    .where(and(eq(conversationParticipantsTable.conversationId, params.data.id), eq(conversationParticipantsTable.userId, req.userId!)));

  res.json(result);
});

router.post("/conversations/:id/messages", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = SendMessageParams.safeParse({ id: parseInt(rawId, 10) });
  const bodyParsed = SendMessageBody.safeParse(req.body);
  if (!params.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [msg] = await db.insert(messagesTable).values({
    conversationId: params.data.id,
    senderId: req.userId!,
    content: bodyParsed.data.content,
  }).returning();

  await db.update(conversationsTable).set({ lastMessageAt: new Date() }).where(eq(conversationsTable.id, params.data.id));

  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));

  res.status(201).json({
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    sender: await formatUser(u, school),
    content: msg.content,
    readAt: null,
    createdAt: msg.createdAt.toISOString(),
  });
});

export default router;
