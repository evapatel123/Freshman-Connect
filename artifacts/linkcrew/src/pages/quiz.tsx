import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetQuizQuestions, useSubmitQuiz } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Quiz() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: questions, isLoading } = useGetQuizQuestions();
  const submitQuiz = useSubmitQuiz();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  if (!user) { setLocation("/auth/login"); return null; }
  if (user.quizCompleted) { setLocation("/dashboard"); return null; }

  const q = questions?.[currentIndex];
  const total = questions?.length ?? 60;
  const progress = (Object.keys(answers).length / total) * 100;

  const handleAnswer = (answer: string) => {
    if (!q) return;
    setAnswers(prev => ({ ...prev, [q.id]: answer }));
    if (currentIndex < total - 1) {
      setTimeout(() => setCurrentIndex(i => i + 1), 300);
    }
  };

  const handleSubmit = () => {
    const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
      questionId: parseInt(questionId, 10),
      answer,
    }));
    submitQuiz.mutate({ data: { answers: answersArray } as any }, {
      onSuccess: () => { setSubmitted(true); setTimeout(() => setLocation("/matches"), 2000); },
    });
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Loading your quiz...</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
        <h2 className="text-2xl font-bold">Quiz Complete!</h2>
        <p className="text-muted-foreground">Finding your perfect leaders...</p>
      </div>
    </div>
  );

  const categoryLabels: Record<string, string> = {
    hobbies: "Hobbies & Interests",
    academic_interests: "Academic Interests",
    extracurriculars: "Extracurricular Activities",
    college_goals: "College Goals",
    career_interests: "Career Interests",
    exploration: "Your High School Journey",
  };

  const categoryColors: Record<string, string> = {
    hobbies: "bg-blue-500",
    academic_interests: "bg-green-500",
    extracurriculars: "bg-purple-500",
    college_goals: "bg-orange-500",
    career_interests: "bg-red-500",
    exploration: "bg-teal-500",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="py-4 px-6 flex items-center gap-3 border-b bg-card">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="font-bold text-primary">Link Crew Connect</span>
        <span className="ml-auto text-sm text-muted-foreground">{currentIndex + 1} of {total}</span>
      </header>

      <div className="sticky top-0 z-10 bg-background border-b px-6 py-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{Math.round(progress)}% complete</span>
          <span>{Object.keys(answers).length}/{total} answered</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-12">
        {q && (
          <div className="w-full max-w-2xl space-y-6">
            <div className="text-center space-y-2">
              <span className={cn("inline-block text-xs font-semibold text-white px-3 py-1 rounded-full", categoryColors[q.category] || "bg-primary")}>
                {categoryLabels[q.category] || q.category}
              </span>
              <h2 className="text-2xl font-bold text-foreground leading-tight">{q.text}</h2>
            </div>

            <Card className="border-border shadow-sm">
              <CardContent className="pt-6">
                <div className="grid gap-3">
                  {(q.options as string[])?.map((option, i) => {
                    const isSelected = answers[q.id] === option;
                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswer(option)}
                        className={cn(
                          "w-full text-left px-5 py-4 rounded-lg border-2 transition-all font-medium text-sm",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card hover:border-primary/50 hover:bg-muted"
                        )}
                      >
                        {isSelected && <CheckCircle2 className="inline h-4 w-4 mr-2 text-primary" />}
                        {option}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              {currentIndex < total - 1 ? (
                <Button onClick={() => setCurrentIndex(i => Math.min(total - 1, i + 1))} disabled={!answers[q.id]}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitQuiz.isPending || Object.keys(answers).length < total * 0.8}>
                  {submitQuiz.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Quiz"}
                </Button>
              )}
            </div>

            {currentIndex === total - 1 && Object.keys(answers).length < total * 0.8 && (
              <p className="text-center text-sm text-muted-foreground">Please answer at least {Math.ceil(total * 0.8)} questions to submit.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
