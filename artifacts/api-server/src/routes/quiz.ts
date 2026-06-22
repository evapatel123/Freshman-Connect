import { Router, type IRouter } from "express";
import { db, quizQuestionsTable, quizResultsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SubmitQuizBody } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

// 60 hard-coded quiz questions seeded in DB on first run
const QUIZ_QUESTIONS = [
  // Hobbies (10 questions)
  { questionNumber: 1, category: "hobbies", text: "I enjoy playing video games or board games.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 2, category: "hobbies", text: "I like drawing, painting, or other visual arts.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 3, category: "hobbies", text: "I enjoy playing a musical instrument or singing.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 4, category: "hobbies", text: "I like outdoor activities like hiking or sports.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 5, category: "hobbies", text: "I enjoy reading books or writing.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 6, category: "hobbies", text: "I like cooking, baking, or food-related activities.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 7, category: "hobbies", text: "I enjoy watching movies, TV shows, or anime.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 8, category: "hobbies", text: "I like photography or videography.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 9, category: "hobbies", text: "I enjoy coding or building tech projects.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 10, category: "hobbies", text: "I like volunteering and community service.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  // Academic interests (10 questions)
  { questionNumber: 11, category: "academic_interests", text: "I love math and working with numbers.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 12, category: "academic_interests", text: "Science classes are my favorite (bio, chem, physics).", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 13, category: "academic_interests", text: "I enjoy English, writing essays, and analyzing literature.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 14, category: "academic_interests", text: "History and social studies are subjects I enjoy.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 15, category: "academic_interests", text: "I am interested in foreign languages.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 16, category: "academic_interests", text: "Computer science and programming interest me.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 17, category: "academic_interests", text: "Art or music classes are important to me.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 18, category: "academic_interests", text: "I am interested in economics or business.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 19, category: "academic_interests", text: "Psychology or philosophy sounds interesting to me.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  { questionNumber: 20, category: "academic_interests", text: "I am interested in environmental science or sustainability.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
  // Extracurriculars (10 questions)
  { questionNumber: 21, category: "extracurriculars", text: "I want to join or currently play a school sport.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 22, category: "extracurriculars", text: "I am interested in joining student government or leadership.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 23, category: "extracurriculars", text: "I want to participate in drama, theater, or performance arts.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 24, category: "extracurriculars", text: "I am interested in joining a robotics or STEM club.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 25, category: "extracurriculars", text: "I want to be part of journalism, yearbook, or news.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 26, category: "extracurriculars", text: "Community service clubs interest me.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 27, category: "extracurriculars", text: "I want to join academic competitions like math or science olympiad.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 28, category: "extracurriculars", text: "Music groups like band, orchestra, or choir interest me.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 29, category: "extracurriculars", text: "I am interested in cultural or heritage clubs.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 30, category: "extracurriculars", text: "Debate or mock trial clubs sound interesting.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  // College goals (10 questions)
  { questionNumber: 31, category: "college_goals", text: "I plan to attend a 4-year university after high school.", type: "boolean", options: ["Yes", "No", "Unsure"] },
  { questionNumber: 32, category: "college_goals", text: "I am interested in attending a community college first.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 33, category: "college_goals", text: "I want to study at a highly selective or Ivy League school.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  { questionNumber: 34, category: "college_goals", text: "I am interested in athletic scholarships.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 35, category: "college_goals", text: "I plan to study STEM in college.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  { questionNumber: 36, category: "college_goals", text: "I am interested in studying business or economics in college.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  { questionNumber: 37, category: "college_goals", text: "I plan to take a gap year before college.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 38, category: "college_goals", text: "I want to attend college close to home.", type: "scale", options: ["1 - Not at all", "2", "3 - No preference", "4", "5 - Definitely"] },
  { questionNumber: 39, category: "college_goals", text: "Financial aid and scholarships are very important to me.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very important"] },
  { questionNumber: 40, category: "college_goals", text: "I want to study arts, humanities, or social sciences.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  // Career interests (10 questions)
  { questionNumber: 41, category: "career_interests", text: "I am interested in a career in medicine or healthcare.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  { questionNumber: 42, category: "career_interests", text: "I want to work in technology or software engineering.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  { questionNumber: 43, category: "career_interests", text: "A career in law or government interests me.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  { questionNumber: 44, category: "career_interests", text: "I want to be an entrepreneur or start my own business.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  { questionNumber: 45, category: "career_interests", text: "Teaching or education as a career appeals to me.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  { questionNumber: 46, category: "career_interests", text: "I am interested in arts, music, or entertainment careers.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  { questionNumber: 47, category: "career_interests", text: "Engineering or architecture interests me.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  { questionNumber: 48, category: "career_interests", text: "I want to work in sports, fitness, or coaching.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  { questionNumber: 49, category: "career_interests", text: "Environmental or conservation work appeals to me.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  { questionNumber: 50, category: "career_interests", text: "I am interested in social work, counseling, or non-profit work.", type: "scale", options: ["1 - Not at all", "2", "3 - Maybe", "4", "5 - Definitely"] },
  // Exploration (10 questions)
  { questionNumber: 51, category: "exploration", text: "I am still figuring out what I am passionate about.", type: "boolean", options: ["Yes", "No", "Sort of"] },
  { questionNumber: 52, category: "exploration", text: "I would like help understanding how to choose classes.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 53, category: "exploration", text: "I am nervous about making new friends in high school.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very nervous"] },
  { questionNumber: 54, category: "exploration", text: "I want guidance on how to balance schoolwork and activities.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 55, category: "exploration", text: "I would like a mentor who has taken AP or honors classes.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 56, category: "exploration", text: "I would like SAT/ACT preparation advice from my leader.", type: "boolean", options: ["Yes", "No", "Maybe"] },
  { questionNumber: 57, category: "exploration", text: "Understanding the college application process is a priority for me.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very important"] },
  { questionNumber: 58, category: "exploration", text: "I am open to trying new clubs or activities I have not done before.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very open"] },
  { questionNumber: 59, category: "exploration", text: "Making good grades is the most important thing to me in high school.", type: "scale", options: ["1 - Not at all", "2", "3 - Balanced", "4", "5 - Top priority"] },
  { questionNumber: 60, category: "exploration", text: "I want to be involved in my school community and make an impact.", type: "scale", options: ["1 - Not at all", "2", "3 - Somewhat", "4", "5 - Very much"] },
];

async function seedQuizQuestions() {
  const existing = await db.select().from(quizQuestionsTable).limit(1);
  if (existing.length > 0) return;
  await db.insert(quizQuestionsTable).values(QUIZ_QUESTIONS);
}

seedQuizQuestions().catch(() => {});

router.get("/quiz/questions", async (_req, res): Promise<void> => {
  await seedQuizQuestions();
  const questions = await db.select().from(quizQuestionsTable).orderBy(quizQuestionsTable.questionNumber);
  res.json(questions.map(q => ({
    ...q,
    createdAt: undefined,
    options: q.options ?? null,
  })));
});

router.post("/quiz/submit", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const parsed = SubmitQuizBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { answers } = parsed.data;
  const rawAnswers: Record<string, string> = {};
  answers.forEach((a: { questionId: number; answer: string }) => {
    rawAnswers[String(a.questionId)] = a.answer;
  });

  // Build interest profile from answers
  const questions = await db.select().from(quizQuestionsTable);
  const qMap = new Map(questions.map(q => [q.id, q]));

  const hobbies: string[] = [];
  const academicInterests: string[] = [];
  const extracurriculars: string[] = [];
  const collegeGoals: string[] = [];
  const careerInterests: string[] = [];
  let isExploring = false;

  const hobbyLabels: Record<number, string> = { 1: "Gaming", 2: "Visual Arts", 3: "Music", 4: "Outdoors & Sports", 5: "Reading & Writing", 6: "Cooking", 7: "Film & TV", 8: "Photography", 9: "Tech & Coding", 10: "Volunteering" };
  const academicLabels: Record<number, string> = { 11: "Math", 12: "Science", 13: "English & Literature", 14: "History & Social Studies", 15: "Foreign Languages", 16: "Computer Science", 17: "Arts & Music", 18: "Economics & Business", 19: "Psychology & Philosophy", 20: "Environmental Science" };
  const extraLabels: Record<number, string> = { 21: "Sports", 22: "Student Government", 23: "Theater & Drama", 24: "Robotics & STEM", 25: "Journalism & Yearbook", 26: "Community Service", 27: "Academic Competitions", 28: "Band, Orchestra & Choir", 29: "Cultural Clubs", 30: "Debate & Mock Trial" };
  const collegeLabels: Record<number, string> = { 31: "4-Year University", 32: "Community College", 33: "Selective/Ivy League", 34: "Athletic Scholarship", 35: "STEM Focus", 36: "Business Focus", 37: "Gap Year", 38: "Stay Local", 39: "Financial Aid Priority", 40: "Arts & Humanities" };
  const careerLabels: Record<number, string> = { 41: "Medicine & Healthcare", 42: "Technology & Engineering", 43: "Law & Government", 44: "Entrepreneurship", 45: "Education & Teaching", 46: "Arts & Entertainment", 47: "Engineering & Architecture", 48: "Sports & Fitness", 49: "Environment & Conservation", 50: "Social Work & Non-profit" };

  for (const [qIdStr, answer] of Object.entries(rawAnswers)) {
    const qId = parseInt(qIdStr, 10);
    const q = qMap.get(qId);
    if (!q) continue;

    if (q.category === "hobbies") {
      const score = parseInt(answer, 10);
      if (score >= 3 && hobbyLabels[q.questionNumber]) hobbies.push(hobbyLabels[q.questionNumber]);
    } else if (q.category === "academic_interests") {
      const score = parseInt(answer, 10);
      if (score >= 3 && academicLabels[q.questionNumber]) academicInterests.push(academicLabels[q.questionNumber]);
    } else if (q.category === "extracurriculars") {
      if ((answer === "Yes" || answer === "Maybe") && extraLabels[q.questionNumber]) extracurriculars.push(extraLabels[q.questionNumber]);
    } else if (q.category === "college_goals") {
      const score = parseInt(answer, 10);
      const boolMatch = answer === "Yes" || answer === "Maybe";
      if ((isNaN(score) ? boolMatch : score >= 3) && collegeLabels[q.questionNumber]) collegeGoals.push(collegeLabels[q.questionNumber]);
    } else if (q.category === "career_interests") {
      const score = parseInt(answer, 10);
      if (score >= 3 && careerLabels[q.questionNumber]) careerInterests.push(careerLabels[q.questionNumber]);
    } else if (q.category === "exploration") {
      if (q.questionNumber === 51 && answer === "Yes") isExploring = true;
    }
  }

  const [existing] = await db.select().from(quizResultsTable).where(eq(quizResultsTable.userId, req.userId!));

  let result;
  if (existing) {
    [result] = await db.update(quizResultsTable).set({
      hobbies, academicInterests, extracurriculars, collegeGoals, careerInterests, isExploring, rawAnswers,
    }).where(eq(quizResultsTable.userId, req.userId!)).returning();
  } else {
    [result] = await db.insert(quizResultsTable).values({
      userId: req.userId!,
      hobbies, academicInterests, extracurriculars, collegeGoals, careerInterests, isExploring, rawAnswers,
    }).returning();
  }

  // Mark quiz as completed
  await db.update(usersTable).set({ quizCompleted: true }).where(eq(usersTable.id, req.userId!));

  res.json({
    id: result.id,
    userId: result.userId,
    hobbies: result.hobbies,
    academicInterests: result.academicInterests,
    extracurriculars: result.extracurriculars,
    collegeGoals: result.collegeGoals,
    careerInterests: result.careerInterests,
    isExploring: result.isExploring,
    completedAt: result.completedAt.toISOString(),
  });
});

router.get("/quiz/result", requireAuth as any, async (req: AuthRequest, res): Promise<void> => {
  const [result] = await db.select().from(quizResultsTable).where(eq(quizResultsTable.userId, req.userId!));
  if (!result) {
    res.status(404).json({ error: "Quiz not completed yet" });
    return;
  }
  res.json({
    id: result.id,
    userId: result.userId,
    hobbies: result.hobbies,
    academicInterests: result.academicInterests,
    extracurriculars: result.extracurriculars,
    collegeGoals: result.collegeGoals,
    careerInterests: result.careerInterests,
    isExploring: result.isExploring,
    completedAt: result.completedAt.toISOString(),
  });
});

export default router;
