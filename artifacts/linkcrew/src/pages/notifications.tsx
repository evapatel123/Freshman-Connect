import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (!user) { setLocation("/auth/login"); return null; }

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id } as any, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined as any, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    });
  };

  const unreadCount = (notifications as any[])?.filter(n => !n.isRead).length ?? 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground mt-1">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
              {markAllRead.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
              Mark All Read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Card key={i} className="animate-pulse h-16 bg-muted border-none" />)}
          </div>
        ) : (notifications as any[])?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No notifications yet. You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(notifications as any[])?.map((n: any) => (
              <Card key={n.id} className={cn("transition-colors", !n.isRead && "border-primary/30 bg-primary/5")}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={cn("h-2 w-2 rounded-full mt-2 flex-shrink-0", n.isRead ? "bg-transparent" : "bg-primary")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", !n.isRead && "font-medium")}>{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                  </div>
                  {!n.isRead && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkRead(n.id)} className="flex-shrink-0 text-xs">
                      Mark read
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
