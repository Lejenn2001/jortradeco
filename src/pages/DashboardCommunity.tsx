import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Trash2, Pin, Reply, PinOff } from "lucide-react";
import biddieRobot from "@/assets/biddie-robot.png";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ChatRoomHeader from "@/components/dashboard/ChatRoomHeader";
import ChatTypingIndicator, { useTypingBroadcast } from "@/components/dashboard/chat/ChatTypingIndicator";
import ChatReactions from "@/components/dashboard/chat/ChatReactions";
import ChatPinnedBar from "@/components/dashboard/chat/ChatPinnedBar";
import ChatImageUpload from "@/components/dashboard/chat/ChatImageUpload";
import ChatUserBadge from "@/components/dashboard/chat/ChatUserBadge";
import ChatReplyPreview from "@/components/dashboard/chat/ChatReplyPreview";
import DailyRecapCard from "@/components/dashboard/chat/DailyRecapCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  pinned?: boolean;
  reply_to?: string | null;
  image_url?: string | null;
}

const BIDDIE_USER_ID = "00000000-0000-0000-0000-000000000000";

const DashboardCommunity = () => {
  const { session, profile, isAdmin } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Trader";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [biddieTyping, setBiddieTyping] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const broadcastTyping = useTypingBroadcast();

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  };

  const scrollToMessage = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary/50");
      setTimeout(() => el.classList.remove("ring-2", "ring-primary/50"), 2000);
    }
  }, []);

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
      }
    };
    load();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          if (newMsg.user_id === BIDDIE_USER_ID) setBiddieTyping(false);
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
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

  // Biddie typing is shown when a non-Biddie message arrives (DB trigger handles AI reply)
  // We set biddieTyping=true after sending, and clear it when Biddie's message arrives via realtime

  const sendMessage = async (imageUrl?: string) => {
    if (!session?.user?.id) {
      toast({ title: "Please log in", description: "You need to be signed in to send messages.", variant: "destructive" });
      return;
    }
    const messageText = imageUrl ? (input.trim() || "📸") : input.trim();
    if (!messageText || sending) return;

    setSending(true);
    const insertData: any = {
      user_id: session.user.id,
      user_name: profile?.full_name || "Trader",
      content: messageText,
    };
    if (replyTo) insertData.reply_to = replyTo.id;
    if (imageUrl) insertData.image_url = imageUrl;

    const { error } = await supabase.from("chat_messages").insert(insertData);
    if (error) {
      toast({ title: "Error sending message", description: error.message, variant: "destructive" });
    } else {
      setInput("");
      setReplyTo(null);
      // Show Biddie typing indicator — DB trigger handles the AI reply automatically
      setBiddieTyping(true);
      setTimeout(() => setBiddieTyping(false), 15000); // fallback clear
    }
    setSending(false);
  };

  const deleteMessage = async (id: string) => {
    await supabase.from("chat_messages").delete().eq("id", id);
  };

  const togglePin = async (msg: ChatMessage) => {
    await supabase
      .from("chat_messages")
      .update({ pinned: !msg.pinned } as any)
      .eq("id", msg.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    broadcastTyping();
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

  const pinnedMessages = messages.filter((m) => m.pinned);
  const getReplyParent = (id: string | null | undefined) => messages.find((m) => m.id === id);

  const handleImageUploaded = (url: string) => {
    sendMessage(url);
  };

  return (
    <DashboardLayout showTickerTape={false}>
      <div className="flex-1 flex flex-col overflow-hidden p-1.5 sm:p-2 lg:p-3 bg-mesh">
        {/* Header */}
        <div className="mb-1.5 sm:mb-2 shrink-0 hidden sm:block">
          <ChatRoomHeader onlineCount={onlineCount} firstName={firstName} />
        </div>

        {/* Pinned messages */}
        <ChatPinnedBar messages={pinnedMessages} onJumpTo={scrollToMessage} />

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 glass-panel rounded-xl border-glow-purple px-2.5 sm:px-4 py-2 sm:py-3 overflow-y-auto flex flex-col-reverse mb-1.5 sm:mb-2 min-h-0"
        >
          <div className="space-y-2">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center h-full">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-3"
              >
                <img src={biddieRobot} alt="Biddie" className="w-20 h-20 mx-auto animate-float drop-shadow-[0_0_15px_hsl(230_85%_60%_/_0.4)]" />
                <p className="text-muted-foreground text-sm">Biddie's waiting for the first message...</p>
                <p className="text-muted-foreground/60 text-xs">Be the one to break the ice!</p>
              </motion.div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isOwn = msg.user_id === session?.user?.id;
              const isBiddie = msg.user_id === BIDDIE_USER_ID;
              const parent = getReplyParent(msg.reply_to);

              return (
                <motion.div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`group flex gap-2.5 transition-all ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  {isBiddie ? (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-primary/20 border border-primary/40">
                      <img src={biddieRobot} alt="Biddie" className="w-full h-full object-contain" />
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
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 ${
                      isBiddie
                        ? "bg-primary/10 border border-primary/25 rounded-bl-sm"
                        : isOwn
                        ? "bg-primary/20 border border-primary/30 rounded-br-sm"
                        : "bg-muted/30 border border-border/40 rounded-bl-sm"
                    } ${msg.pinned ? "ring-1 ring-amber-500/30" : ""}`}
                  >
                    {/* Reply context */}
                    {parent && (
                      <button
                        onClick={() => scrollToMessage(parent.id)}
                        className="flex items-center gap-1 mb-1 px-2 py-0.5 bg-muted/30 rounded text-[10px] text-muted-foreground border-l-2 border-primary/30 hover:bg-muted/50 transition-colors w-full text-left"
                      >
                        <Reply className="h-2.5 w-2.5 shrink-0" />
                        <span className="font-semibold text-primary">{parent.user_name}:</span>
                        <span className="truncate">{parent.content.slice(0, 60)}</span>
                      </button>
                    )}

                    {/* Name + Badge */}
                    {!isOwn && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[11px] font-semibold ${userColor(msg.user_id)}`}>
                          {isBiddie ? "Biddie AI" : (msg.user_name || "Trader")}
                        </span>
                        <ChatUserBadge userId={msg.user_id} isAdmin={isBiddie ? false : false} />
                        {msg.pinned && <Pin className="h-2.5 w-2.5 text-amber-400" />}
                      </div>
                    )}

                    {/* Image */}
                    {msg.image_url && (
                      <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                        <img
                          src={msg.image_url}
                          alt="Shared image"
                          className="max-w-full max-h-48 rounded-lg border border-border/30 object-cover"
                        />
                      </a>
                    )}

                    {/* Content */}
                    {isBiddie ? (
                      <div className="prose prose-sm prose-invert max-w-none text-foreground [&_p]:text-xs [&_p]:leading-relaxed [&_p]:mb-1 [&_li]:text-xs [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_strong]:text-primary [&_h1]:text-primary [&_h2]:text-primary [&_h1]:font-bold [&_h2]:font-semibold [&_h1]:mb-1 [&_h2]:mb-0.5 [&_ul]:pl-3 [&_ol]:pl-3 [&_li]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content !== "📸" && (
                        <p className="text-xs text-foreground break-words leading-relaxed">{msg.content}</p>
                      )
                    )}

                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[9px] text-muted-foreground/60">{formatTime(msg.created_at)}</p>
                    </div>

                    {/* Reactions */}
                    <ChatReactions messageId={msg.id} />
                  </div>

                  {/* Action buttons */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center flex flex-col gap-0.5">
                    <button
                      onClick={() => setReplyTo(msg)}
                      className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                      title="Reply"
                    >
                      <Reply className="h-3 w-3" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => togglePin(msg)}
                        className="p-1 rounded hover:bg-amber-500/20 text-muted-foreground hover:text-amber-400 transition-colors"
                        title={msg.pinned ? "Unpin" : "Pin"}
                      >
                        {msg.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                      </button>
                    )}
                    {(isOwn || isAdmin) && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicators */}
          <ChatTypingIndicator biddieTyping={biddieTyping} />
          </div>
        </div>

        {/* Reply preview */}
        <ChatReplyPreview
          replyTo={replyTo ? { id: replyTo.id, user_name: replyTo.user_name, content: replyTo.content } : null}
          onCancel={() => setReplyTo(null)}
        />

        {/* Input */}
        <div className="glass-panel rounded-xl p-1.5 sm:p-2.5 flex gap-1.5 sm:gap-2 border-glow-blue shrink-0">
          <ChatImageUpload onImageUploaded={handleImageUploaded} disabled={sending} />
          <Input
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? `Reply to ${replyTo.user_name}...` : `Message as ${firstName}...`}
            className="bg-muted/30 border-border/50 flex-1 focus:border-primary/50 transition-colors h-9 text-sm"
            maxLength={500}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            variant="hero"
            size="icon"
            className="rounded-xl h-9 w-9"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardCommunity;
