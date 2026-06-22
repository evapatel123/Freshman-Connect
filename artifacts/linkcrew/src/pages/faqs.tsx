import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useListFaqs, useCreateFaq } from "@workspace/api-client-react";
import { HelpCircle, ChevronDown, ChevronUp, Plus, X, Loader2, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const FAQ_CATEGORIES = ["academics", "clubs", "social", "college", "schedule", "general"];

export default function FAQs() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", category: "general", schoolId: 0 });
  const queryClient = useQueryClient();

  const { data: faqs, isLoading } = useListFaqs({ search: search || undefined as any, category: selectedCategory || undefined as any });
  const createFaq = useCreateFaq();

  if (!user) { setLocation("/auth/login"); return null; }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createFaq.mutate({ data: { ...newFaq, schoolId: user.schoolId } as any }, {
      onSuccess: () => {
        setShowCreate(false);
        setNewFaq({ question: "", answer: "", category: "general", schoolId: 0 });
        queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      },
    });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">FAQs</h1>
            <p className="text-muted-foreground mt-1">Answers to common questions about high school life.</p>
          </div>
          {(user.role === "leader" || user.role === "admin") && (
            <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Add FAQ</Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search FAQs..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1">
            {FAQ_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
                className={cn("capitalize text-sm px-3 py-1 rounded-full border transition-colors",
                  selectedCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50")}
              >{cat}</button>
            ))}
          </div>
        </div>

        {showCreate && (
          <Card className="border-primary/30">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Add New FAQ</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Input placeholder="What do freshmen often ask?" value={newFaq.question} onChange={e => setNewFaq(f => ({ ...f, question: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Answer</Label>
                  <Textarea placeholder="Provide a helpful answer..." rows={4} value={newFaq.answer} onChange={e => setNewFaq(f => ({ ...f, answer: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {FAQ_CATEGORIES.map(cat => (
                      <button key={cat} type="button"
                        onClick={() => setNewFaq(f => ({ ...f, category: cat }))}
                        className={cn("capitalize text-sm px-3 py-1 rounded-full border transition-colors",
                          newFaq.category === cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50")}
                      >{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button type="submit" disabled={createFaq.isPending}>
                    {createFaq.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Card key={i} className="animate-pulse h-16 bg-muted border-none" />)}
          </div>
        ) : (faqs as any[])?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No FAQs yet. Leaders can add helpful answers!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(faqs as any[])?.map((faq: any) => (
              <Card key={faq.id} className="overflow-hidden">
                <button
                  className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{faq.question}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{faq.category}</p>
                  </div>
                  {expandedId === faq.id ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {expandedId === faq.id && (
                  <CardContent className="px-5 pb-5 pt-0 border-t bg-muted/30">
                    <p className="text-sm text-muted-foreground mt-3">{faq.answer}</p>
                    <p className="text-xs text-muted-foreground mt-3">Answered by {faq.author?.firstName} {faq.author?.lastName}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
