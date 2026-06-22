import { Router, type IRouter } from "express";
import { db, postsTable, commentsTable, usersTable, schoolsTable } from "@workspace/db";
import { eq, and, like, sql, desc } from "drizzle-orm";
import { CreatePostBody, GetPostParams, DeletePostParams, CreateCommentParams, CreateCommentBody, DeleteCommentParams, ListPostsQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { formatUser } from "./auth";

const router: IRouter = Router();

async function buildPostResponse(post: any, author: any, school: any, commentCount: number) {
  return {
    id: post.id,
    schoolId: post.schoolId,
    authorId: post.authorId,
    author: await formatUser(author, school),
    title: post.title,
    content: post.content,
    category: post.category,
    commentCount,
    isPinned: post.isPinned,
    createdAt: post.createdAt.toISOString(),
  };
}

router.get("/posts", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const params = ListPostsQueryParams.safeParse(req.query);
  const schoolId = params.success && params.data.schoolId ? Number(params.data.schoolId) : req.userSchoolId!;
  const category = params.success ? params.data.category : undefined;
  const search = params.success ? params.data.search : undefined;

  const conditions = [eq(postsTable.schoolId, schoolId)];
  if (category) conditions.push(eq(postsTable.category, category));
  if (search) conditions.push(like(postsTable.title, `%${search}%`));

  const posts = await db.select().from(postsTable)
    .where(and(...conditions))
    .orderBy(desc(postsTable.isPinned), desc(postsTable.createdAt));

  const result = [];
  for (const post of posts) {
    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.authorId));
    const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, post.schoolId));
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(commentsTable).where(eq(commentsTable.postId, post.id));
    result.push(await buildPostResponse(post, author, school, Number(count)));
  }
  res.json(result);
});

router.post("/posts", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [post] = await db.insert(postsTable).values({
    ...parsed.data,
    authorId: req.userId!,
  }).returning();

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, post.schoolId));
  res.status(201).json(await buildPostResponse(post, author, school, 0));
});

router.get("/posts/:id", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPostParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.authorId));
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, post.schoolId));
  const rawComments = await db.select().from(commentsTable)
    .innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
    .where(eq(commentsTable.postId, post.id))
    .orderBy(commentsTable.createdAt);

  const comments = await Promise.all(rawComments.map(async ({ comments: c, users: u }) => {
    const [s] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));
    return { id: c.id, postId: c.postId, authorId: c.authorId, author: await formatUser(u, s), content: c.content, createdAt: c.createdAt.toISOString() };
  }));

  res.json({
    id: post.id, schoolId: post.schoolId, authorId: post.authorId,
    author: await formatUser(author, school), title: post.title, content: post.content,
    category: post.category, comments, isPinned: post.isPinned, createdAt: post.createdAt.toISOString(),
  });
});

router.patch("/posts/:id/pin", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid post id" }); return; }

  if (req.userRole !== "admin" && req.userRole !== "school_admin") {
    res.status(403).json({ error: "School admin access required" }); return;
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  if (req.userRole === "school_admin" && post.schoolId !== req.userSchoolId) {
    res.status(403).json({ error: "Cannot pin posts from another school" }); return;
  }

  const [updated] = await db.update(postsTable).set({ isPinned: !post.isPinned }).where(eq(postsTable.id, id)).returning();
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, updated.authorId));
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, updated.schoolId));
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(commentsTable).where(eq(commentsTable.postId, updated.id));
  res.json(await buildPostResponse(updated, author, school, Number(count)));
});

router.delete("/posts/:id", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePostParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));
  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  const isSchoolAdmin = req.userRole === "school_admin" && post.schoolId === req.userSchoolId;
  if (post.authorId !== req.userId && req.userRole !== "admin" && !isSchoolAdmin) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.postId, params.data.id));
  await db.delete(postsTable).where(eq(postsTable.id, params.data.id));
  res.json({ success: true, message: "Post deleted" });
});

router.post("/posts/:id/comments", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CreateCommentParams.safeParse({ id: parseInt(rawId, 10) });
  const bodyParsed = CreateCommentBody.safeParse(req.body);
  if (!params.success || !bodyParsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const [comment] = await db.insert(commentsTable).values({
    postId: params.data.id,
    authorId: req.userId!,
    content: bodyParsed.data.content,
  }).returning();

  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, u.schoolId));
  res.status(201).json({ id: comment.id, postId: comment.postId, authorId: comment.authorId, author: await formatUser(u, school), content: comment.content, createdAt: comment.createdAt.toISOString() });
});

router.delete("/posts/:id/comments/:commentId", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawCid = Array.isArray(req.params.commentId) ? req.params.commentId[0] : req.params.commentId;
  const params = DeleteCommentParams.safeParse({ id: parseInt(rawId, 10), commentId: parseInt(rawCid, 10) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, params.data.commentId));
  if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }

  const [parentPost] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));
  const isSchoolAdmin = req.userRole === "school_admin" && parentPost?.schoolId === req.userSchoolId;
  if (comment.authorId !== req.userId && req.userRole !== "admin" && !isSchoolAdmin) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, params.data.commentId));
  res.json({ success: true, message: "Comment deleted" });
});

export default router;
