import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListConversations, useGetMessages, useSendMessage } from "@workspace/api-client-react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function Messages() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: loadingConvs } = useListConversations();
  const { data: messages, isLoading: loadingMessages } = useGetMessages(selectedConvId as number, { query: { enabled: !!selectedConvId } });
  const sendMessage = useSendMessage();

  if (!user) { setLocation("/auth/login"); return null; }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if ((conversations as any[])?.length > 0 && !selectedConvId) {
      setSelectedConvId((conversations as any[])[0].id);
    }
  }, [conversations]);

  const selectedConv = (conversations as any[])?.find(c => c.id === selectedConvId);

  const getOtherParticipant = (conv: any) => conv.participants?.find((p: any) => p.id !== user.id);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvId) return;
    sendMessage.mutate({ id: selectedConvId, data: { content: newMessage } as any }, {
      onSuccess: () => {
        setNewMessage("");
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConvId}/messages`] });
      },
    });
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Conversations list */}
        <div className="w-80 border-r bg-card flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="flex items-center justify-center h-24"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
            ) : (conversations as any[])?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm px-4">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>No conversations yet. Message a leader to get started!</p>
              </div>
            ) : (
              (conversations as any[])?.map(conv => {
                const other = getOtherParticipant(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted transition-colors border-b",
                      selectedConvId === conv.id && "bg-primary/10 border-l-2 border-l-primary"
                    )}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                      {other?.firstName?.[0]}{other?.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-sm truncate">{other?.firstName} {other?.lastName}</p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 flex-shrink-0">{conv.unreadCount}</span>
                        )}
                      </div>
                      {conv.lastMessage && <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message view */}
        <div className="flex-1 flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b bg-card px-6 py-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {getOtherParticipant(selectedConv)?.firstName?.[0]}{getOtherParticipant(selectedConv)?.lastName?.[0]}
                </div>
                <div>
                  <p className="font-semibold">{getOtherParticipant(selectedConv)?.firstName} {getOtherParticipant(selectedConv)?.lastName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{getOtherParticipant(selectedConv)?.role}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-24"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
                ) : (
                  (messages as any[])?.map((msg: any) => {
                    const isMe = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-sm rounded-2xl px-4 py-2 text-sm",
                          isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"
                        )}>
                          {msg.content}
                          <p className={cn("text-xs mt-1 opacity-70", isMe ? "text-right" : "text-left")}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="border-t bg-card p-4 flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={sendMessage.isPending || !newMessage.trim()}>
                  {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
