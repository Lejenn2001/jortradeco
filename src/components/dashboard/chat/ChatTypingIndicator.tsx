import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import biddieRobot from "@/assets/biddie-robot.png";

const CHANNEL = "community-typing";

interface TypingUser {
  name: string;
  user_id: string;
}

export function useTypingBroadcast() {
  const { session, profile } = useAuth();
  const [lastSent, setLastSent] = useState(0);

  const broadcastTyping = () => {
    if (!session?.user?.id) return;
    const now = Date.now();
    if (now - lastSent < 2000) return; // throttle to every 2s
    setLastSent(now);

    const channel = supabase.channel(CHANNEL);
    channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: session.user.id,
        name: profile?.full_name?.split(" ")[0] || "Trader",
      },
    });
  };

  return broadcastTyping;
}

interface ChatTypingIndicatorProps {
  biddieTyping?: boolean;
}

const ChatTypingIndicator = ({ biddieTyping }: ChatTypingIndicatorProps) => {
  const { session } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());

  useEffect(() => {
    const channel = supabase
      .channel(CHANNEL)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.user_id === session?.user?.id) return;
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.set(payload.user_id, payload);
          return next;
        });

        // Clear after 3s
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(payload.user_id);
            return next;
          });
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const names = Array.from(typingUsers.values()).map((u) => u.name);

  if (!biddieTyping && names.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-1 py-1">
      {biddieTyping && (
        <div className="flex items-center gap-2">
          <img src={biddieRobot} alt="Biddie" className="w-5 h-5 rounded-full" />
          <span className="text-xs text-primary font-medium">Biddie is analyzing</span>
          <BouncingDots className="text-primary" />
        </div>
      )}
      {!biddieTyping && names.length > 0 && (
        <div className="flex items-center gap-1.5">
          <BouncingDots className="text-muted-foreground" />
          <span className="text-[11px] text-muted-foreground">
            {names.length === 1
              ? `${names[0]} is typing...`
              : names.length === 2
              ? `${names[0]} and ${names[1]} are typing...`
              : `${names[0]} and ${names.length - 1} others are typing...`}
          </span>
        </div>
      )}
    </div>
  );
};

function BouncingDots({ className }: { className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${className}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.6s" }}
        />
      ))}
    </span>
  );
}

export default ChatTypingIndicator;
