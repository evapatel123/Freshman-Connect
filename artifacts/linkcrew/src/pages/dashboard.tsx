import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetMyMatches, useListConversations, useListNotifications, useGetAdminDashboard } from "@workspace/api-client-react";
import { Users, MessageCircle, Bell, BookOpen, ClipboardList, GraduationCap, AlertTriangle, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: matches } = useGetMyMatches();
  const { data: conversations } = useListConversations();
  const { data: notifications } = useListNotifications();
  const { data: adminStats } = useGetAdminDashboard({}, { query: { enabled: user?.role === "admin" } });

  if (!user) { setLocation("/auth/login"); return null; }

  const unreadNotifications = (notifications as any[])?.filter((n: any) => !n.isRead).length ?? 0;
  const unreadMessages = (conversations as any[])?.reduce((acc: number, c: any) => acc + (c.unreadCount ?? 0), 0) ?? 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user.firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {user.role === "freshman" ? "Here's what's happening in your Link Crew journey." :
             user.role === "leader" ? "See how you're connecting with freshmen." :
             "Your school admin overview."}
          </p>
        </div>

        {/* Freshman dashboard */}
        {user.role === "freshman" && (
          <>
            {!user.quizCompleted && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 rounded-full p-3"><ClipboardList className="h-6 w-6 text-primary" /></div>
                    <div>
                      <h3 className="font-semibold">Complete Your Interest Quiz</h3>
                      <p className="text-sm text-muted-foreground">Answer 60 questions so we can match you with the perfect leader.</p>
                    </div>
                  </div>
                  <Button asChild><Link href="/quiz">Start Quiz <ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/matches")}>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />My Leaders</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold">{(matches as any[])?.length ?? 0}</div><p className="text-xs text-muted-foreground mt-1">matched leaders</p></CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/messages")}>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><MessageCircle className="h-4 w-4" />Messages</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold">{unreadMessages}</div><p className="text-xs text-muted-foreground mt-1">unread messages</p></CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/notifications")}>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Bell className="h-4 w-4" />Notifications</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold">{unreadNotifications}</div><p className="text-xs text-muted-foreground mt-1">unread notifications</p></CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/leaders"><Users className="mr-2 h-4 w-4" />Browse Leaders</Link></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/community"><BookOpen className="mr-2 h-4 w-4" />Discussion Board</Link></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/faqs"><GraduationCap className="mr-2 h-4 w-4" />Browse FAQs</Link></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><Link href="/friends"><Users className="mr-2 h-4 w-4" />Find Friends</Link></Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Your Matches</CardTitle></CardHeader>
                <CardContent>
                  {(matches as any[])?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {user.quizCompleted ? "No matches yet. Check back soon!" : "Complete the quiz to get matched!"}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {(matches as any[])?.slice(0, 3).map((m: any) => (
                        <div key={m.id} className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {m.leaderProfile?.user?.firstName?.[0]}{m.leaderProfile?.user?.lastName?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{m.leaderProfile?.user?.firstName} {m.leaderProfile?.user?.lastName}</p>
                            <p className="text-xs text-muted-foreground">{Math.round(m.matchScore)}% match</p>
                          </div>
                          <Button size="sm" variant="ghost" asChild><Link href="/messages">Message</Link></Button>
                        </div>
                      ))}
                      {(matches as any[])?.length > 3 && <Button variant="link" size="sm" asChild><Link href="/matches">View all matches</Link></Button>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Leader dashboard */}
        {user.role === "leader" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Freshmen Connected</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">—</div><p className="text-xs text-muted-foreground mt-1">Update your profile to get matched</p></CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/messages")}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><MessageCircle className="h-4 w-4" />Messages</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{unreadMessages}</div><p className="text-xs text-muted-foreground mt-1">unread messages</p></CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation("/notifications")}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Bell className="h-4 w-4" />Notifications</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{unreadNotifications}</div><p className="text-xs text-muted-foreground mt-1">unread</p></CardContent>
            </Card>
            <Card className="md:col-span-3">
              <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="outline" asChild><Link href="/leaders">Edit My Profile</Link></Button>
                <Button variant="outline" asChild><Link href="/community">Post in Community</Link></Button>
                <Button variant="outline" asChild><Link href="/faqs">Answer FAQs</Link></Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin dashboard */}
        {user.role === "admin" && adminStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: (adminStats as any).totalUsers, icon: Users },
              { label: "Freshmen", value: (adminStats as any).totalFreshmen, icon: GraduationCap },
              { label: "Leaders", value: (adminStats as any).totalLeaders, icon: Users },
              { label: "Matches Made", value: (adminStats as any).totalMatches, icon: Users },
              { label: "Messages", value: (adminStats as any).totalMessages, icon: MessageCircle },
              { label: "Posts", value: (adminStats as any).totalPosts, icon: BookOpen },
              { label: "Quiz Completion", value: `${(adminStats as any).quizCompletionRate}%`, icon: ClipboardList },
              { label: "Pending Reports", value: (adminStats as any).pendingReports, icon: AlertTriangle },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" />{label}</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
