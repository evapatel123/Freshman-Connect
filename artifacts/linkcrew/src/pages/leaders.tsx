import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useListLeaders, useCreateConversation } from "@workspace/api-client-react";
import { Search, MessageCircle, Users, BookOpen, GraduationCap, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Leaders() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const { data: leaders, isLoading } = useListLeaders({});
  const createConversation = useCreateConversation();
  const { toast } = useToast();

  if (!user) { setLocation("/auth/login"); return null; }

  const filtered = (leaders as any[])?.filter((l: any) =>
    !search || `${l.user.firstName} ${l.user.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleMessage = (leaderId: number) => {
    createConversation.mutate(
      { data: { recipientId: leaderId, initialMessage: "Hi! I'd love to connect with you." } as any },
      {
        onSuccess: () => { setLocation("/messages"); },
        onError: () => toast({ variant: "destructive", title: "Error", description: "Could not start conversation." }),
      }
    );
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Link Crew Leaders</h1>
          <p className="text-muted-foreground mt-1">Browse and connect with your school's upperclassmen leaders.</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input className="pl-10" placeholder="Search leaders by name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="animate-pulse h-64 bg-muted border-none" />)}
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No leaders found. Check back once leaders set up their profiles!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered?.map((leader: any) => (
              <Card key={leader.id} className="hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-2 bg-primary" />
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                      {leader.user.firstName?.[0]}{leader.user.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{leader.user.firstName} {leader.user.lastName}</CardTitle>
                      <p className="text-xs text-muted-foreground">Link Crew Leader</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {leader.bio && <p className="text-sm text-muted-foreground line-clamp-2">{leader.bio}</p>}

                  {leader.interests?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> Interests
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {leader.interests.slice(0, 4).map((int: string) => (
                          <Badge key={int} variant="secondary" className="text-xs">{int}</Badge>
                        ))}
                        {leader.interests.length > 4 && <Badge variant="outline" className="text-xs">+{leader.interests.length - 4} more</Badge>}
                      </div>
                    </div>
                  )}

                  {leader.favoriteClasses?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" /> Favorite Classes
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {leader.favoriteClasses.slice(0, 3).map((cls: string) => (
                          <Badge key={cls} variant="outline" className="text-xs">{cls}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {user.role === "freshman" && (
                    <Button className="w-full" size="sm" onClick={() => handleMessage(leader.userId)} disabled={createConversation.isPending}>
                      {createConversation.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <MessageCircle className="mr-2 h-3 w-3" />}
                      Message Leader
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
