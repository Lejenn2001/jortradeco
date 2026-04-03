import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Trash2, Pin, Reply, PinOff, Settings2, X, CheckSquare } from "lucide-react";
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
  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const broadcastTyping = useTypingBroadcast();

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("chat_messages").delete().in("id", ids);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Deleted ${ids.length} message(s)` });
      setSelected(new Set());
      setManageMode(false);
    }
  };

  const selectAll = () => {
    setSelected(new Set(messages.map((m) => m.id)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const exitManage = () => {
    setManageMode(false);
    setSelected(new Set());
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }
    }, 50);
  }, []);

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
      <div className="flex-1 flex flex-col overflow-hidden p-1 sm:p-1.5 bg-mesh">
        {/* Header */}
        <div className="mb-0.5 shrink-0 hidden xl:block">
          <ChatRoomHeader onlineCount={onlineCount} firstName={firstName} />
        </div>

        {/* Daily Recap */}
        <div className="mb-0.5 shrink-0">
          <DailyRecapCard />
        </div>

        {/* Pinned messages */}
        {pinnedMessages.length > 0 && (
          <div className="mb-0.5 shrink-0">
            <ChatPinnedBar messages={pinnedMessages} onJumpTo={scrollToMessage} />
          </div>
        )}

        {/* Messages */}
        <div className="relative flex-1 flex flex-col min-h-0 mb-0.5">
          {/* Manage button - top right */}
          {isAdmin && !manageMode && (
            <div className="absolute right-2 top-1.5 z-10">
              <button
                onClick={() => setManageMode(true)}
                className="flex items-center gap-1 rounded-md bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
              >
                <Settings2 className="h-3 w-3" />
                Manage
              </button>
            </div>
          )}

          {/* Cancel button - top right in manage mode */}
          {manageMode && (
            <div className="absolute right-2 top-1.5 z-10">
              <button
                onClick={exitManage}
                className="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-[10px] font-medium text-destructive transition-colors hover:bg-muted"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            </div>
          )}

          <div
            ref={scrollRef}
            className="flex-1 glass-panel rounded-lg border-glow-purple px-1.5 sm:px-2 pt-7 pb-1 overflow-y-auto min-h-0"
          >
          <div className="space-y-0.5">
            {messages.length === 0 && (
              <div className="flex h-full flex-1 items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-2 text-center"
                >
                  <img src={biddieRobot} alt="Biddie" className="mx-auto h-14 w-14 animate-float drop-shadow-[0_0_15px_hsl(230_85%_60%_/_0.4)]" />
                  <p className="text-xs text-muted-foreground">Biddie's waiting for the first message...</p>
                  <p className="text-[10px] text-muted-foreground/60">Be the one to break the ice!</p>
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
                    className={`group flex gap-1.5 transition-all ${isOwn ? "flex-row-reverse" : ""} ${manageMode && selected.has(msg.id) ? "bg-primary/5 rounded-lg" : ""}`}
                    onClick={manageMode ? () => toggleSelect(msg.id) : undefined}
                  >
                    {/* Manage checkbox */}
                    {manageMode && (
                      <div className="flex shrink-0 items-center self-center">
                        <div className={`flex h-4 w-4 items-center justify-center rounded border ${selected.has(msg.id) ? "border-primary bg-primary" : "border-muted-foreground/40 bg-muted/20"} transition-colors`}>
                          {selected.has(msg.id) && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </div>
                    )}
                    {/* Avatar */}
                    {isBiddie ? (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/40 bg-primary/20">
                        <img src={biddieRobot} alt="Biddie" className="h-full w-full object-contain" />
                      </div>
                    ) : !isOwn ? (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/50">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {(msg.user_name || "T")[0].toUpperCase()}
                        </span>
                      </div>
                    ) : null}

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[92%] sm:max-w-[82%] rounded-lg px-2 sm:px-2.5 py-1 ${
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
                          className="mb-0.5 flex w-full items-center gap-1 rounded border-l-2 border-primary/30 bg-muted/30 px-1.5 py-0.5 text-left text-[9px] text-muted-foreground transition-colors hover:bg-muted/50"
                        >
                          <Reply className="h-2.5 w-2.5 shrink-0" />
                          <span className="font-semibold text-primary">{parent.user_name}:</span>
                          <span className="truncate">{parent.content.slice(0, 60)}</span>
                        </button>
                      )}

                      {/* Name + Badge */}
                      {!isOwn && (
                        <div className="mb-0.5 flex items-center gap-1">
                          <span className={`text-[10px] font-semibold ${userColor(msg.user_id)}`}>
                            {isBiddie ? "Biddie AI" : (msg.user_name || "Trader")}
                          </span>
                          <ChatUserBadge userId={msg.user_id} isAdmin={isBiddie ? false : false} />
                          {msg.pinned && <Pin className="h-2.5 w-2.5 text-amber-400" />}
                        </div>
                      )}

                      {/* Image */}
                      {msg.image_url && (
                        <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="mb-0.5 block">
                          <img
                            src={msg.image_url}
                            alt="Shared image"
                            className="max-h-40 max-w-full rounded-md border border-border/30 object-cover"
                          />
                        </a>
                      )}

                      {/* Content */}
                      {isBiddie ? (
                        <div className="prose prose-sm prose-invert max-w-none text-foreground [&_p]:mb-0.5 [&_p]:text-[11px] [&_p]:leading-5 [&_li]:mb-0 [&_li]:text-[11px] [&_h1]:mb-0.5 [&_h1]:text-xs [&_h2]:mb-0.5 [&_h2]:text-[11px] [&_h3]:text-[11px] [&_strong]:text-primary [&_h1]:font-bold [&_h1]:text-primary [&_h2]:font-semibold [&_h2]:text-primary [&_ol]:pl-3 [&_ul]:pl-3">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content !== "📸" && (
                          <p className="break-words text-[11px] leading-5 text-foreground">{msg.content}</p>
                        )
                      )}

                      <div className="mt-0.5 flex items-center justify-between">
                        <p className="text-[8px] text-muted-foreground/60">{formatTime(msg.created_at)}</p>
                      </div>

                      {/* Reactions */}
                      <ChatReactions messageId={msg.id} />
                    </div>

                    {/* Action buttons */}
                    <div className="self-center flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => setReplyTo(msg)}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-primary/20 hover:text-primary"
                        title="Reply"
                      >
                        <Reply className="h-3 w-3" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => togglePin(msg)}
                          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-amber-500/20 hover:text-amber-400"
                          title={msg.pinned ? "Unpin" : "Pin"}
                        >
                          {msg.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                        </button>
                      )}
                      {(isOwn || isAdmin) && (
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
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
        </div>

        {/* Reply preview */}
        <ChatReplyPreview
          replyTo={replyTo ? { id: replyTo.id, user_name: replyTo.user_name, content: replyTo.content } : null}
          onCancel={() => setReplyTo(null)}
        />

        {/* Input */}
        {/* Input / Manage bar */}
        {manageMode ? (
          <div className="glass-panel rounded-lg p-1.5 sm:p-2 flex items-center justify-between border-glow-blue shrink-0">
            <span className="text-xs font-medium text-muted-foreground">
              {selected.size} message{selected.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={selected.size === messages.length ? deselectAll : selectAll}
                className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {selected.size === messages.length ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={deleteSelected}
                disabled={selected.size === 0}
                className="flex items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-[11px] font-semibold text-destructive-foreground transition-colors hover:bg-destructive/80 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete {selected.size > 0 ? selected.size : ""}
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-lg p-1 sm:p-1.5 flex gap-1 border-glow-blue shrink-0">
            <ChatImageUpload onImageUploaded={handleImageUploaded} disabled={sending} />
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={replyTo ? `Reply to ${replyTo.user_name}...` : `Message as ${firstName}...`}
              className="h-8 flex-1 border-border/50 bg-muted/30 text-xs transition-colors focus:border-primary/50"
              maxLength={500}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending}
              variant="hero"
              size="icon"
              className="h-8 w-8 rounded-lg"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardCommunity;
