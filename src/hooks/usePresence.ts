import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PresenceUser {
  user_id: string;
  full_name: string;
  online_at: string;
}

export function usePresenceBroadcast() {
  const { session, profile } = useAuth();

  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: session.user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {})
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: session.user.id,
            full_name: profile?.full_name || "Unknown",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, profile?.full_name]);
}

export function usePresenceTracker() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel("online-users-tracker", {
      config: { presence: { key: "tracker" } },
    });

    // Subscribe to the same presence channel to read state
    const presenceChannel = supabase.channel("online-users");

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const ids = new Set<string>();
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((p) => {
            if (p.user_id) ids.add(p.user_id);
          });
        });
        setOnlineUsers(ids);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  return onlineUsers;
}
