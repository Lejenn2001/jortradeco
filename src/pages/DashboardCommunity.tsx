import { useState, useRef, useEffect } from "react";
import { Send, Trash2, Users, Bot } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

const DashboardCommunity = () => {
  const { session, profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Trader";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  // Load initial messages
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) {
        setMessages(data as ChatMessage[]);
        scrollToBottom();
      }
    };
    load();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("community-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && session?.user?.id) {
          await channel.track({ user_id: session.user.id, name: firstName });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, firstName]);

  const sendMessage = async () => {
    if (!input.trim() || !session?.user?.id || sending) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      user_id: session.user.id,
      user_name: profile?.full_name || "Trader",
      content: input.trim(),
    } as any);
    if (error) {
      toast({ title: "Error sending message", description: error.message, variant: "destructive" });
    } else {
      setInput("");
    }
    setSending(false);
  };

  const deleteMessage = async (id: string) => {
    await supabase.from("chat_messages").delete().eq("id", id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // Generate a consistent color for each user
  const userColor = (userId: string) => {
    const colors = [
      "text-blue-400", "text-emerald-400", "text-purple-400",
      "text-amber-400", "text-pink-400", "text-cyan-400",
      "text-orange-400", "text-lime-400",
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 flex flex-col overflow-hidden p-4 lg:p-6">
          {/* Header */}
          <div className="glass-panel rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">JORTRADE Chat Room</h1>
              <p className="text-xs text-muted-foreground">Talk trades, share setups, build together</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">{onlineCount} online</span>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 glass-panel rounded-xl border-glow-purple p-4 overflow-y-auto space-y-3 mb-4"
          >
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">No messages yet. Be the first to say something!</p>
                </div>
              </div>
            )}
            {messages.map((msg) => {
              const isOwn = msg.user_id === session?.user?.id;
              return (
                <div
                  key={msg.id}
                  className={`group flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isOwn
                        ? "bg-primary/20 border border-primary/30 rounded-br-md"
                        : "bg-muted/30 border border-border/40 rounded-bl-md"
                    }`}
                  >
                    {!isOwn && (
                      <p className={`text-xs font-semibold mb-0.5 ${userColor(msg.user_id)}`}>
                        {msg.user_name || "Trader"}
                      </p>
                    )}
                    <p className="text-sm text-foreground break-words">{msg.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatTime(msg.created_at)}</p>
                  </div>
                  {isOwn && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity self-center p-1 rounded hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3 w-3 text-red-400" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="glass-panel rounded-xl p-3 flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message as ${firstName}...`}
              className="bg-muted/30 border-border/50 flex-1"
              maxLength={500}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              variant="hero"
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardCommunity;
