import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SmilePlus } from "lucide-react";

const REACTION_EMOJIS = ["🔥", "📈", "📉", "💎", "🙌"];

interface ReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface ChatReactionsProps {
  messageId: string;
}

const ChatReactions = ({ messageId }: ChatReactionsProps) => {
  const { session } = useAuth();
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const loadReactions = async () => {
    const { data } = await supabase
      .from("chat_reactions")
      .select("emoji, user_id")
      .eq("message_id", messageId);

    if (!data) return;

    const counts = new Map<string, { count: number; hasReacted: boolean }>();
    data.forEach((r: any) => {
      const existing = counts.get(r.emoji) || { count: 0, hasReacted: false };
      existing.count++;
      if (r.user_id === session?.user?.id) existing.hasReacted = true;
      counts.set(r.emoji, existing);
    });

    setReactions(
      Array.from(counts.entries()).map(([emoji, val]) => ({
        emoji,
        ...val,
      }))
    );
  };

  useEffect(() => {
    loadReactions();

    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reactions", filter: `message_id=eq.${messageId}` },
        () => loadReactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, session?.user?.id]);

  const toggleReaction = async (emoji: string) => {
    if (!session?.user?.id) return;

    const existing = reactions.find((r) => r.emoji === emoji);
    if (existing?.hasReacted) {
      await supabase
        .from("chat_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", session.user.id)
        .eq("emoji", emoji);
    } else {
      await supabase.from("chat_reactions").insert({
        message_id: messageId,
        user_id: session.user.id,
        emoji,
      });
    }
    setShowPicker(false);
  };

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => toggleReaction(r.emoji)}
          className={`inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full border transition-colors ${
            r.hasReacted
              ? "bg-primary/20 border-primary/40 text-primary"
              : "bg-muted/30 border-border/40 text-muted-foreground hover:border-primary/30"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="font-medium">{r.count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground/50 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>

        {showPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
            <div className="absolute bottom-full left-0 mb-1 z-50 flex gap-0.5 bg-card border border-border/60 rounded-lg p-1 shadow-lg">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="text-base hover:scale-125 transition-transform p-0.5"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatReactions;
