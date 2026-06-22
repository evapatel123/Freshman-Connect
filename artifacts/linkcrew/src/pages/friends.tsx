import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetFriendSuggestions, useListFriends, useSendFriendRequest } from "@workspace/api-client-react";
import { Users, UserPlus, Loader2, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Friends() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: suggestions, isLoading: loadingSuggestions } = useGetFriendSuggestions();
  const { data: friends, isLoading: loadingFriends } = useListFriends();
  const sendRequest = useSendFriendRequest();

  if (!user) { setLocation("/auth/login"); return null; }

  const handleAdd = (userId: number) => {
    sendRequest.mutate({ data: { recipientId: userId } as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/friends/suggestions"] });
        toast({ title: "Friend request sent!" });
      },
      onError: () => toast({ variant: "destructive", title: "Error", description: "Could not send friend request." }),
    });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Friends</h1>
          <p className="text-muted-foreground mt-1">Connect with fellow freshmen who share your interests.</p>
        </div>

        {/* Current friends */}
        <div>
          <h2 className="text-lg font-semibold mb-4">My Friends ({(friends as any[])?.length ?? 0})</h2>
          {loadingFriends ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-20 bg-muted border-none" />)}
            </div>
          ) : (friends as any[])?.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>No friends yet. Check out suggestions below!</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(friends as any[])?.map((friendship: any) => {
                const friend = friendship.requesterId === user.id ? friendship.recipient : friendship.requester;
                return (
                  <Card key={friendship.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                        {friend.firstName?.[0]}{friend.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{friend.firstName} {friend.lastName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{friend.role}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Suggestions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Suggested Friends</h2>
          {loadingSuggestions ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => <Card key={i} className="animate-pulse h-36 bg-muted border-none" />)}
            </div>
          ) : (suggestions as any[])?.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>Complete the quiz to get friend suggestions based on shared interests!</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(suggestions as any[])?.map((s: any) => (
                <Card key={s.user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                        {s.user.firstName?.[0]}{s.user.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{s.user.firstName} {s.user.lastName}</p>
                          <div className="flex items-center gap-1 text-sm font-medium text-primary">
                            <Zap className="h-3 w-3" />{s.compatibilityScore}%
                          </div>
                        </div>
                        {s.sharedInterests?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {s.sharedInterests.slice(0, 3).map((i: string) => (
                              <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
                            ))}
                            {s.sharedInterests.length > 3 && <Badge variant="outline" className="text-xs">+{s.sharedInterests.length - 3}</Badge>}
                          </div>
                        )}
                        <Button size="sm" className="mt-3 w-full" onClick={() => handleAdd(s.user.id)} disabled={sendRequest.isPending}>
                          {sendRequest.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <UserPlus className="mr-1 h-3 w-3" />}
                          Add Friend
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
