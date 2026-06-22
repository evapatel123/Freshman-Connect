import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetMyMatches, useCreateConversation } from "@workspace/api-client-react";
import { Users, MessageCircle, Star, Loader2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Matches() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: matches, isLoading } = useGetMyMatches();
  const createConversation = useCreateConversation();
  const { toast } = useToast();

  if (!user) { setLocation("/auth/login"); return null; }

  const handleMessage = (leaderId: number) => {
    createConversation.mutate(
      { data: { recipientId: leaderId, initialMessage: "Hi! I saw we were matched and would love to connect!" } as any },
      {
        onSuccess: () => setLocation("/messages"),
        onError: () => toast({ variant: "destructive", title: "Error", description: "Could not start conversation." }),
      }
    );
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Your Leader Matches</h1>
          <p className="text-muted-foreground mt-1">These leaders were matched to you based on your quiz answers.</p>
        </div>

        {!user.quizCompleted && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <h3 className="font-semibold">Complete your quiz first!</h3>
                <p className="text-sm text-muted-foreground">Take the 60-question quiz to get matched with leaders who share your interests.</p>
              </div>
              <Button asChild><Link href="/quiz">Take Quiz</Link></Button>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-40 bg-muted border-none" />)}
          </div>
        ) : (matches as any[])?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>{user.quizCompleted ? "No matches yet — leaders need to set up profiles." : "Complete the quiz to get your matches!"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(matches as any[])?.map((match: any, i: number) => (
              <Card key={match.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
                        {match.leaderProfile?.user?.firstName?.[0]}{match.leaderProfile?.user?.lastName?.[0]}
                      </div>
                      {i === 0 && <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5"><Star className="h-3 w-3 text-white fill-white" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{match.leaderProfile?.user?.firstName} {match.leaderProfile?.user?.lastName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-sm font-medium text-primary">
                              <Zap className="h-3 w-3" />
                              {Math.round(match.matchScore)}% match
                            </div>
                            {i === 0 && <Badge className="text-xs bg-yellow-400 text-yellow-900 border-0">Best Match</Badge>}
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleMessage(match.leaderId)} disabled={createConversation.isPending}>
                          {createConversation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><MessageCircle className="mr-1 h-3 w-3" />Message</>}
                        </Button>
                      </div>

                      {match.leaderProfile?.bio && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{match.leaderProfile.bio}</p>
                      )}

                      {match.sharedInterests?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground font-medium mb-1">Shared interests:</p>
                          <div className="flex flex-wrap gap-1">
                            {match.sharedInterests.map((interest: string) => (
                              <Badge key={interest} variant="secondary" className="text-xs">{interest}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
