import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useListPosts, useCreatePost, useCreateComment } from "@workspace/api-client-react";
import { BookOpen, Plus, MessageSquare, Pin, X, Loader2, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = ["general", "academics", "clubs", "sports", "college", "social"];

export default function Community() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "general", schoolId: 0 });
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: posts, isLoading } = useListPosts({ schoolId: user?.schoolId as any, category: selectedCategory || undefined as any, search: search || undefined as any });
  const createPost = useCreatePost();
  const createComment = useCreateComment();

  if (!user) { setLocation("/auth/login"); return null; }

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    createPost.mutate(
      { data: { ...newPost, schoolId: user.schoolId } as any },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewPost({ title: "", content: "", category: "general", schoolId: 0 });
          queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
          toast({ title: "Post created!" });
        },
      }
    );
  };

  const handleComment = (postId: number) => {
    if (!commentText.trim()) return;
    createComment.mutate(
      { id: postId, data: { content: commentText } as any },
      {
        onSuccess: () => {
          setCommentText("");
          queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Discussion Board</h1>
            <p className="text-muted-foreground mt-1">Share, ask, and connect with your school community.</p>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />New Post</Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search posts..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
                className={cn("capitalize text-sm px-3 py-1 rounded-full border transition-colors",
                  selectedCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50")}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Create post modal */}
        {showCreate && (
          <Card className="border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Create Post</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input placeholder="What's on your mind?" value={newPost.title} onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea placeholder="Share more details..." rows={4} value={newPost.content} onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat} type="button"
                        onClick={() => setNewPost(p => ({ ...p, category: cat }))}
                        className={cn("capitalize text-sm px-3 py-1 rounded-full border transition-colors",
                          newPost.category === cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50")}
                      >{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="submit" disabled={createPost.isPending}>
                    {createPost.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Post"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Posts list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-32 bg-muted border-none" />)}
          </div>
        ) : (posts as any[])?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No posts yet. Be the first to start a discussion!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(posts as any[])?.map((post: any) => (
              <Card key={post.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {post.isPinned && <Pin className="h-3 w-3 text-primary flex-shrink-0" />}
                        <Badge variant="secondary" className="capitalize text-xs">{post.category}</Badge>
                      </div>
                      <h3 className="font-semibold text-base">{post.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>{post.author?.firstName} {post.author?.lastName}</span>
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        <button onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)} className="flex items-center gap-1 hover:text-foreground">
                          <MessageSquare className="h-3 w-3" /> {post.commentCount} comments
                        </button>
                      </div>
                    </div>
                  </div>

                  {expandedPost === post.id && (
                    <div className="mt-4 border-t pt-4 space-y-3">
                      {post.comments?.map((c: any) => (
                        <div key={c.id} className="flex gap-3">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {c.author?.firstName?.[0]}
                          </div>
                          <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm">
                            <p className="font-medium text-xs mb-0.5">{c.author?.firstName} {c.author?.lastName}</p>
                            {c.content}
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-3">
                        <Input placeholder="Write a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} className="flex-1 h-8 text-sm" />
                        <Button size="sm" onClick={() => handleComment(post.id)} disabled={createComment.isPending || !commentText.trim()}>
                          {createComment.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reply"}
                        </Button>
                      </div>
                    </div>
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
