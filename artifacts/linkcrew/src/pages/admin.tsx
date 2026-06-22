import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetAdminDashboard, useListAdminUsers, useListReports, useResolveReport } from "@workspace/api-client-react";
import { Users, AlertTriangle, BarChart3, Shield, Loader2, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type AdminTab = "overview" | "users" | "reports";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<AdminTab>("overview");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stats } = useGetAdminDashboard({});
  const { data: users } = useListAdminUsers({}, { query: { enabled: tab === "users" } });
  const { data: reports } = useListReports({}, { query: { enabled: tab === "reports" } });
  const resolveReport = useResolveReport();

  if (!user) { setLocation("/auth/login"); return null; }
  if (user.role !== "admin") { setLocation("/dashboard"); return null; }

  const handleResolve = (id: number) => {
    resolveReport.mutate({ id, data: { status: "resolved" } as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
        toast({ title: "Report resolved" });
      },
    });
  };

  const tabs: { key: AdminTab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "users", label: "Users", icon: Users },
    { key: "reports", label: "Reports", icon: AlertTriangle },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground mt-0.5">Manage your school's Link Crew community.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: (stats as any).totalUsers },
                { label: "Freshmen", value: (stats as any).totalFreshmen },
                { label: "Leaders", value: (stats as any).totalLeaders },
                { label: "Matches Made", value: (stats as any).totalMatches },
                { label: "Messages Sent", value: (stats as any).totalMessages },
                { label: "Community Posts", value: (stats as any).totalPosts },
                { label: "Quiz Completion", value: `${(stats as any).quizCompletionRate}%` },
                { label: "Pending Reports", value: (stats as any).pendingReports },
              ].map(({ label, value }) => (
                <Card key={label}>
                  <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div className="space-y-3">
            {(users as any[])?.map((u: any) => (
              <Card key={u.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                    {u.firstName?.[0]}{u.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{u.firstName} {u.lastName}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={u.role === "admin" ? "default" : u.role === "leader" ? "secondary" : "outline"} className="capitalize">{u.role}</Badge>
                    {u.quizCompleted && <Badge variant="outline" className="text-xs text-green-600 border-green-300">Quiz Done</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(users as any[])?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>No users found.</p>
              </div>
            )}
          </div>
        )}

        {/* Reports */}
        {tab === "reports" && (
          <div className="space-y-3">
            {(reports as any[])?.map((report: any) => (
              <Card key={report.id} className={report.status === "pending" ? "border-orange-300/50 bg-orange-50/30 dark:bg-orange-900/10" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={report.status === "pending" ? "destructive" : "secondary"} className="text-xs capitalize">{report.status}</Badge>
                        <span className="text-xs text-muted-foreground capitalize">{report.contentType} #{report.contentId}</span>
                      </div>
                      <p className="font-medium text-sm">{report.reason}</p>
                      {report.details && <p className="text-sm text-muted-foreground mt-1">{report.details}</p>}
                      <p className="text-xs text-muted-foreground mt-2">Reported by {report.reporter?.firstName} {report.reporter?.lastName} · {new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                    {report.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => handleResolve(report.id)} disabled={resolveReport.isPending}>
                        {resolveReport.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                        Resolve
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(reports as any[])?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>No reports yet. All clear!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
