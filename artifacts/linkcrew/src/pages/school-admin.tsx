import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useGetAdminDashboard,
  useListAdminUsers,
  useListLeaders,
  useListFaqs,
  useListPosts,
} from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { 
  LayoutDashboard, Users, BookOpen, MessageSquare, 
  CheckCircle, XCircle, Pin, PinOff, Trash2, UserCog,
  GraduationCap
} from "lucide-react";

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <Icon className="w-8 h-8 text-primary opacity-60" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SchoolAdmin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && user.role !== "school_admin" && user.role !== "admin") setLocation("/dashboard");
    else if (!user) setLocation("/auth/login");
  }, [user]);

  if (!user || (user.role !== "school_admin" && user.role !== "admin")) return null;

  const { data: stats } = useGetAdminDashboard({});
  const { data: users, refetch: refetchUsers } = useListAdminUsers({});
  const { data: leaders, refetch: refetchLeaders } = useListLeaders({});
  const { data: faqs, refetch: refetchFaqs } = useListFaqs({});
  const { data: posts, refetch: refetchPosts } = useListPosts({});

  const approveMutation = useMutation({
    mutationFn: ({ leaderId, isApproved }: { leaderId: number; isApproved: boolean }) =>
      customFetch(`/api/leaders/${leaderId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ isApproved }),
      }),
    onSuccess: () => {
      refetchLeaders();
      toast({ title: "Leader profile updated" });
    },
    onError: () => toast({ title: "Error updating leader", variant: "destructive" }),
  });

  const pinMutation = useMutation({
    mutationFn: (postId: number) =>
      customFetch(`/api/posts/${postId}/pin`, { method: "PATCH" }),
    onSuccess: () => {
      refetchPosts();
      toast({ title: "Post pin status updated" });
    },
    onError: () => toast({ title: "Error updating post", variant: "destructive" }),
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: number) =>
      customFetch(`/api/posts/${postId}`, { method: "DELETE" }),
    onSuccess: () => {
      refetchPosts();
      toast({ title: "Post deleted" });
    },
    onError: () => toast({ title: "Error deleting post", variant: "destructive" }),
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (faqId: number) =>
      customFetch(`/api/faqs/${faqId}`, { method: "DELETE" }),
    onSuccess: () => {
      refetchFaqs();
      toast({ title: "FAQ deleted" });
    },
    onError: () => toast({ title: "Error deleting FAQ", variant: "destructive" }),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      customFetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      refetchUsers();
      toast({ title: "User role updated" });
    },
    onError: () => toast({ title: "Error updating role", variant: "destructive" }),
  });

  const pendingLeaders = (leaders ?? []).filter((l: any) => !l.isApproved);
  const approvedLeaders = (leaders ?? []).filter((l: any) => l.isApproved);

  const allowedRoles = user.role === "admin"
    ? ["freshman", "leader", "school_admin", "admin"]
    : ["freshman", "leader", "school_admin"];

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">School Admin Panel</h1>
          <p className="text-muted-foreground">Manage your school's content, leaders, and members.</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Members" value={stats.totalUsers} icon={Users} />
            <StatCard label="Freshmen" value={stats.totalFreshmen} icon={GraduationCap} />
            <StatCard label="Leaders" value={stats.totalLeaders} icon={Users} />
            <StatCard label="Posts" value={stats.totalPosts} icon={MessageSquare} />
          </div>
        )}

        <Tabs defaultValue="leaders">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leaders">
              Leaders
              {pendingLeaders.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">{pendingLeaders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="faqs">FAQs</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          {/* Leader Approvals */}
          <TabsContent value="leaders" className="space-y-4">
            {pendingLeaders.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  Pending Approval ({pendingLeaders.length})
                </h3>
                <div className="space-y-3">
                  {pendingLeaders.map((leader: any) => (
                    <Card key={leader.id} className="border-amber-200 bg-amber-50/40">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {leader.user?.firstName?.[0]}{leader.user?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{leader.user?.firstName} {leader.user?.lastName}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">{leader.bio}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate({ leaderId: leader.userId, isApproved: true })}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveMutation.mutate({ leaderId: leader.userId, isApproved: false })}
                              disabled={approveMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                        {leader.interests?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {leader.interests.slice(0, 4).map((i: string) => (
                              <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {approvedLeaders.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  Approved Leaders ({approvedLeaders.length})
                </h3>
                <div className="space-y-3">
                  {approvedLeaders.map((leader: any) => (
                    <Card key={leader.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-emerald-100 text-emerald-700">
                                {leader.user?.firstName?.[0]}{leader.user?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{leader.user?.firstName} {leader.user?.lastName}</p>
                                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">Approved</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">{leader.bio}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => approveMutation.mutate({ leaderId: leader.userId, isApproved: false })}
                            disabled={approveMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Revoke
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {(!leaders || leaders.length === 0) && (
              <Card>
                <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
                  No leader profiles have been created yet.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Posts Management */}
          <TabsContent value="posts" className="space-y-3">
            {(posts ?? []).map((post: any) => (
              <Card key={post.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{post.title}</p>
                        {post.isPinned && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">📌 Pinned</Badge>}
                        <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        by {post.author?.firstName} {post.author?.lastName} · {post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => pinMutation.mutate(post.id)}
                        disabled={pinMutation.isPending}
                        title={post.isPinned ? "Unpin post" : "Pin post"}
                      >
                        {post.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deletePostMutation.mutate(post.id)}
                        disabled={deletePostMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!posts || posts.length === 0) && (
              <Card>
                <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
                  No posts in your school yet.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* FAQs Management */}
          <TabsContent value="faqs" className="space-y-3">
            {(faqs ?? []).map((faq: any) => (
              <Card key={faq.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{faq.question}</p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{faq.answer}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{faq.category}</Badge>
                        <span className="text-xs text-muted-foreground">by {faq.author?.firstName} {faq.author?.lastName}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteFaqMutation.mutate(faq.id)}
                      disabled={deleteFaqMutation.isPending}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!faqs || faqs.length === 0) && (
              <Card>
                <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
                  No FAQs posted yet.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Members / Role Management */}
          <TabsContent value="members" className="space-y-3">
            {(users ?? []).map((member: any) => (
              <Card key={member.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.firstName} {member.lastName}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        member.role === "admin" ? "destructive" :
                        member.role === "school_admin" ? "default" :
                        member.role === "leader" ? "secondary" : "outline"
                      }>
                        {member.role === "school_admin" ? "School Admin" : member.role}
                      </Badge>
                      {member.id !== user.id && (
                        <Select
                          value={member.role}
                          onValueChange={(role) => changeRoleMutation.mutate({ userId: member.id, role })}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <UserCog className="w-3 h-3 mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allowedRoles.map(r => (
                              <SelectItem key={r} value={r} className="text-sm">
                                {r === "school_admin" ? "School Admin" : r.charAt(0).toUpperCase() + r.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!users || users.length === 0) && (
              <Card>
                <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
                  No members found.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
