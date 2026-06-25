import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useGetAdminDashboard, useListAdminUsers, useListReports, useResolveReport, useListSchools, customFetch } from "@workspace/api-client-react";
import { Users, AlertTriangle, BarChart3, Shield, Loader2, CheckCircle, School, Plus, Pencil, Trash2, ArrowLeft, GraduationCap, MapPin, Calendar } from "lucide-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type AdminTab = "overview" | "schools" | "users" | "reports";

interface SchoolForm {
  name: string;
  city: string;
  state: string;
  logoUrl: string;
  colors: string;
}

const emptyForm: SchoolForm = { name: "", city: "", state: "", logoUrl: "", colors: "" };

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<AdminTab>("overview");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // School management state
  const [showSchoolDialog, setShowSchoolDialog] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any | null>(null);
  const [schoolForm, setSchoolForm] = useState<SchoolForm>(emptyForm);
  const [deletingSchool, setDeletingSchool] = useState<any | null>(null);
  const [viewingSchool, setViewingSchool] = useState<any | null>(null);

  const { data: stats } = useGetAdminDashboard({});
  const { data: users } = useListAdminUsers({}, { query: { enabled: tab === "users" } });
  const { data: reports } = useListReports({}, { query: { enabled: tab === "reports" } });
  const { data: schools, refetch: refetchSchools } = useListSchools({ query: { enabled: tab === "schools" } });
  const resolveReport = useResolveReport();

  // Students for a selected school
  const { data: schoolStudents, isLoading: loadingStudents } = useQuery({
    queryKey: ["/api/schools", viewingSchool?.id, "students"],
    queryFn: () => customFetch<any[]>(`/api/schools/${viewingSchool.id}/students`),
    enabled: !!viewingSchool,
  });

  useEffect(() => {
    if (!user) setLocation("/auth/login");
    else if (user.role !== "admin") setLocation("/dashboard");
  }, [user]);

  if (!user || user.role !== "admin") return null;

  const handleResolve = (id: number) => {
    resolveReport.mutate({ id, data: { status: "resolved" } as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
        toast({ title: "Report resolved" });
      },
    });
  };

  const saveSchoolMutation = useMutation({
    mutationFn: (data: SchoolForm) => {
      const body = {
        name: data.name,
        city: data.city,
        state: data.state,
        ...(data.logoUrl ? { logoUrl: data.logoUrl } : {}),
        ...(data.colors ? { colors: data.colors } : {}),
      };
      if (editingSchool) {
        return customFetch(`/api/schools/${editingSchool.id}`, { method: "PUT", body: JSON.stringify(body) });
      }
      return customFetch("/api/schools", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => {
      refetchSchools();
      setShowSchoolDialog(false);
      setEditingSchool(null);
      setSchoolForm(emptyForm);
      toast({ title: editingSchool ? "School updated" : "School added" });
    },
    onError: (e: any) => toast({ title: e?.message || "Error saving school", variant: "destructive" }),
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: (id: number) => customFetch(`/api/schools/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      refetchSchools();
      setDeletingSchool(null);
      toast({ title: "School deleted" });
    },
    onError: (e: any) => toast({ title: e?.message || "Cannot delete school", variant: "destructive" }),
  });

  const openAdd = () => {
    setEditingSchool(null);
    setSchoolForm(emptyForm);
    setShowSchoolDialog(true);
  };

  const openEdit = (school: any) => {
    setEditingSchool(school);
    setSchoolForm({
      name: school.name ?? "",
      city: school.city ?? "",
      state: school.state ?? "",
      logoUrl: school.logoUrl ?? "",
      colors: school.colors ?? "",
    });
    setShowSchoolDialog(true);
  };

  const tabs: { key: AdminTab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "schools", label: "Schools", icon: School },
    { key: "users", label: "Users", icon: Users },
    { key: "reports", label: "Reports", icon: AlertTriangle },
  ];

  const US_STATES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
    "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
    "VA","WA","WV","WI","WY","DC",
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground mt-0.5">Manage schools, users, and the Link Crew community.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setViewingSchool(null); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && stats && (
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
        )}

        {/* Schools */}
        {tab === "schools" && (
          <div className="space-y-4">
            {viewingSchool ? (
              /* Student roster for a school */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setViewingSchool(null)}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <div>
                    <h2 className="text-xl font-bold">{viewingSchool.name}</h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {viewingSchool.city}, {viewingSchool.state}
                    </p>
                  </div>
                </div>

                {loadingStudents ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (schoolStudents as any[])?.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>No students registered at this school yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">{(schoolStudents as any[])?.length} registered student{(schoolStudents as any[])?.length !== 1 ? "s" : ""}</p>
                    {(schoolStudents as any[])?.map((student: any) => (
                      <Card key={student.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                              {student.firstName?.[0]}{student.lastName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold">{student.firstName} {student.lastName}</p>
                                <Badge
                                  variant={
                                    student.role === "admin" ? "destructive" :
                                    student.role === "school_admin" ? "default" :
                                    student.role === "leader" ? "secondary" : "outline"
                                  }
                                  className="text-xs capitalize"
                                >
                                  {student.role === "school_admin" ? "School Admin" : student.role}
                                </Badge>
                                {student.quizCompleted && (
                                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">Quiz ✓</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                              {student.bio && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{student.bio}</p>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                <Calendar className="h-3 w-3" />
                                Joined {new Date(student.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                              {student.grade && (
                                <p className="text-xs text-muted-foreground mt-0.5">Grade {student.grade}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* School list */
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{(schools as any[])?.length ?? 0} schools registered</p>
                  <Button onClick={openAdd} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add School
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {(schools as any[])?.map((school: any) => (
                    <Card key={school.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {school.logoUrl ? (
                                <img src={school.logoUrl} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0" />
                              ) : (
                                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <School className="h-4 w-4 text-primary" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{school.name}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />{school.city}, {school.state}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-3 text-sm">
                              <button
                                onClick={() => setViewingSchool(school)}
                                className="flex items-center gap-1 text-primary hover:underline font-medium"
                              >
                                <Users className="h-3.5 w-3.5" />
                                {Number(school.studentCount ?? school.memberCount ?? 0)} student{Number(school.studentCount ?? school.memberCount ?? 0) !== 1 ? "s" : ""}
                              </button>
                              {school.colors && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <span className="inline-block h-3 w-3 rounded-full border" style={{ background: school.colors }} />
                                  {school.colors}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground mt-1">
                              Added {new Date(school.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>

                          <div className="flex gap-1 flex-shrink-0">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(school)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingSchool(school)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {(!schools || (schools as any[]).length === 0) && (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <School className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>No schools yet. Add the first one.</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
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
                    <p className="text-xs text-muted-foreground">{u.schoolName}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={u.role === "admin" ? "destructive" : u.role === "school_admin" ? "default" : u.role === "leader" ? "secondary" : "outline"} className="capitalize">
                      {u.role === "school_admin" ? "School Admin" : u.role}
                    </Badge>
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
              <Card key={report.id} className={report.status === "pending" ? "border-orange-300/50 bg-orange-50/30" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={report.status === "pending" ? "destructive" : "secondary"} className="text-xs capitalize">{report.status}</Badge>
                        <span className="text-xs text-muted-foreground capitalize">{report.contentType} #{report.contentId}</span>
                      </div>
                      <p className="font-medium text-sm">{report.reason}</p>
                      {report.details && <p className="text-sm text-muted-foreground mt-1">{report.details}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        Reported by {report.reporter?.firstName} {report.reporter?.lastName} · {new Date(report.createdAt).toLocaleDateString()}
                      </p>
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

      {/* Add/Edit School Dialog */}
      <Dialog open={showSchoolDialog} onOpenChange={(o) => { if (!o) { setShowSchoolDialog(false); setEditingSchool(null); setSchoolForm(emptyForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSchool ? "Edit School" : "Add New School"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">School Name *</Label>
              <Input
                id="s-name"
                placeholder="e.g. Beachside High School"
                value={schoolForm.name}
                onChange={(e) => setSchoolForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-city">City *</Label>
                <Input
                  id="s-city"
                  placeholder="e.g. Jacksonville"
                  value={schoolForm.city}
                  onChange={(e) => setSchoolForm(f => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-state">State *</Label>
                <Input
                  id="s-state"
                  placeholder="e.g. FL"
                  maxLength={2}
                  value={schoolForm.state}
                  onChange={(e) => setSchoolForm(f => ({ ...f, state: e.target.value.toUpperCase() }))}
                  list="us-states"
                />
                <datalist id="us-states">
                  {US_STATES.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-logo">Logo URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="s-logo"
                placeholder="https://example.com/logo.png"
                value={schoolForm.logoUrl}
                onChange={(e) => setSchoolForm(f => ({ ...f, logoUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-colors">School Colors <span className="text-muted-foreground text-xs">(optional, e.g. #003087)</span></Label>
              <div className="flex gap-2">
                <Input
                  id="s-colors"
                  placeholder="#003087"
                  value={schoolForm.colors}
                  onChange={(e) => setSchoolForm(f => ({ ...f, colors: e.target.value }))}
                />
                {schoolForm.colors && (
                  <div className="h-10 w-10 rounded border flex-shrink-0" style={{ background: schoolForm.colors }} />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSchoolDialog(false); setEditingSchool(null); setSchoolForm(emptyForm); }}>
              Cancel
            </Button>
            <Button
              onClick={() => saveSchoolMutation.mutate(schoolForm)}
              disabled={!schoolForm.name.trim() || !schoolForm.city.trim() || !schoolForm.state.trim() || saveSchoolMutation.isPending}
            >
              {saveSchoolMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editingSchool ? "Save Changes" : "Add School"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSchool} onOpenChange={(o) => { if (!o) setDeletingSchool(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingSchool?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the school. Schools with registered students cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingSchool && deleteSchoolMutation.mutate(deletingSchool.id)}
              disabled={deleteSchoolMutation.isPending}
            >
              {deleteSchoolMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
