import { useState, useRef, useEffect } from "react";
import { Send, Trash2, Bot } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ChatRoomHeader from "@/components/dashboard/ChatRoomHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

const BIDDIE_USER_ID = "00000000-0000-0000-0000-000000000000";

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

  const userColor = (userId: string) => {
    if (userId === BIDDIE_USER_ID) return "text-primary";
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
        <main className="flex-1 flex flex-col overflow-hidden p-4 lg:p-6 bg-mesh">
          {/* Enhanced Header */}
          <div className="mb-3">
            <ChatRoomHeader onlineCount={onlineCount} firstName={firstName} />
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 glass-panel rounded-xl border-glow-purple p-4 overflow-y-auto space-y-2 mb-3"
          >
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center h-full">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-3"
                >
                  <div className="text-5xl animate-float">🤖</div>
                  <p className="text-muted-foreground text-sm">Biddie's waiting for the first message...</p>
                  <p className="text-muted-foreground/60 text-xs">Be the one to break the ice!</p>
                </motion.div>
              </div>
            )}
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isOwn = msg.user_id === session?.user?.id;
                const isBiddie = msg.user_id === BIDDIE_USER_ID;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`group flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    {isBiddie ? (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    ) : !isOwn ? (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">
                          {(msg.user_name || "T")[0].toUpperCase()}
                        </span>
                      </div>
                    ) : null}

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                        isBiddie
                          ? "bg-primary/10 border border-primary/25 rounded-bl-sm"
                          : isOwn
                          ? "bg-primary/20 border border-primary/30 rounded-br-sm"
                          : "bg-muted/30 border border-border/40 rounded-bl-sm"
                      }`}
                    >
                      {!isOwn && (
                        <p className={`text-[11px] font-semibold mb-0.5 ${userColor(msg.user_id)}`}>
                          {msg.user_name || "Trader"}
                        </p>
                      )}
                      <p className="text-sm text-foreground break-words leading-relaxed">{msg.content}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{formatTime(msg.created_at)}</p>
                    </div>

                    {/* Delete button */}
                    {isOwn && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity self-center p-1 rounded hover:bg-destructive/20"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Input */}
          <div className="glass-panel rounded-xl p-3 flex gap-3 border-glow-blue">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message as ${firstName}...`}
              className="bg-muted/30 border-border/50 flex-1 focus:border-primary/50 transition-colors"
              maxLength={500}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              variant="hero"
              size="icon"
              className="rounded-xl"
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
