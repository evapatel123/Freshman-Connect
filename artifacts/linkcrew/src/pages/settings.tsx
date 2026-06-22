import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUpdateMe, useCreateLeaderProfile } from "@workspace/api-client-react";
import { Settings as SettingsIcon, User, BookOpen, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateMe = useUpdateMe();
  const createLeaderProfile = useCreateLeaderProfile();

  const [profile, setProfile] = useState({ firstName: "", lastName: "", bio: "" });
  const [leaderProfile, setLeaderProfile] = useState({ bio: "", interests: "", activities: "", favoriteClasses: "", apHonorsExperience: "", satActExperience: "", collegePlans: "", availability: "weekdays" });

  useEffect(() => {
    if (user) {
      setProfile({ firstName: user.firstName, lastName: user.lastName, bio: (user as any).bio || "" });
    }
  }, [user]);

  if (!user) { setLocation("/auth/login"); return null; }

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMe.mutate({ data: profile as any }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "Profile updated!" });
      },
      onError: () => toast({ variant: "destructive", title: "Error", description: "Could not update profile." }),
    });
  };

  const handleLeaderProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      bio: leaderProfile.bio,
      interests: leaderProfile.interests.split(",").map(s => s.trim()).filter(Boolean),
      activities: leaderProfile.activities.split(",").map(s => s.trim()).filter(Boolean),
      favoriteClasses: leaderProfile.favoriteClasses.split(",").map(s => s.trim()).filter(Boolean),
      apHonorsExperience: leaderProfile.apHonorsExperience || null,
      satActExperience: leaderProfile.satActExperience || null,
      collegePlans: leaderProfile.collegePlans || null,
      availability: leaderProfile.availability,
    };
    createLeaderProfile.mutate({ data: data as any }, {
      onSuccess: () => toast({ title: "Leader profile updated!" }),
      onError: () => toast({ variant: "destructive", title: "Error", description: "Could not update leader profile. Try editing instead." }),
    });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        </div>

        {/* Basic profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea placeholder="Tell the community about yourself..." rows={3} value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
              </div>
              <Button type="submit" disabled={updateMe.isPending}>
                {updateMe.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Leader profile section */}
        {user.role === "leader" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4" />Leader Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">This information will be shown to freshmen when they browse leaders.</p>
              <form onSubmit={handleLeaderProfileSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Leader Bio</Label>
                  <Textarea placeholder="Tell freshmen about yourself and what you can help with..." rows={3} value={leaderProfile.bio} onChange={e => setLeaderProfile(p => ({ ...p, bio: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Interests <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                  <Input placeholder="e.g. Music, Soccer, Coding, Art" value={leaderProfile.interests} onChange={e => setLeaderProfile(p => ({ ...p, interests: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Activities / Clubs <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                  <Input placeholder="e.g. Drama Club, Student Government, Band" value={leaderProfile.activities} onChange={e => setLeaderProfile(p => ({ ...p, activities: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Favorite Classes <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                  <Input placeholder="e.g. AP Biology, Honors English, Statistics" value={leaderProfile.favoriteClasses} onChange={e => setLeaderProfile(p => ({ ...p, favoriteClasses: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>AP/Honors Experience</Label>
                  <Textarea placeholder="Share which AP or honors courses you've taken..." rows={2} value={leaderProfile.apHonorsExperience} onChange={e => setLeaderProfile(p => ({ ...p, apHonorsExperience: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>SAT/ACT Experience</Label>
                  <Textarea placeholder="Share your SAT/ACT prep tips..." rows={2} value={leaderProfile.satActExperience} onChange={e => setLeaderProfile(p => ({ ...p, satActExperience: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>College Plans</Label>
                  <Input placeholder="e.g. Planning to study Computer Science at UC Berkeley" value={leaderProfile.collegePlans} onChange={e => setLeaderProfile(p => ({ ...p, collegePlans: e.target.value }))} />
                </div>
                <Button type="submit" disabled={createLeaderProfile.isPending}>
                  {createLeaderProfile.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Leader Profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Account info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email</span><span>{user.email}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Role</span><span className="capitalize">{user.role}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">School</span><span>{(user as any).schoolName}</span></div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
