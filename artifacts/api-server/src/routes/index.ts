import { Router, type IRouter } from "express";
import healthRouter from "./health";
import schoolsRouter from "./schools";
import authRouter from "./auth";
import usersRouter from "./users";
import quizRouter from "./quiz";
import leadersRouter from "./leaders";
import matchesRouter from "./matches";
import conversationsRouter from "./conversations";
import postsRouter from "./posts";
import faqsRouter from "./faqs";
import notificationsRouter from "./notifications";
import friendsRouter from "./friends";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(schoolsRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(quizRouter);
router.use(leadersRouter);
router.use(matchesRouter);
router.use(conversationsRouter);
router.use(postsRouter);
router.use(faqsRouter);
router.use(notificationsRouter);
router.use(friendsRouter);
router.use(adminRouter);

export default router;
