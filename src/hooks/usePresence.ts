import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
    // Use a different channel name that subscribes to the same presence room
    const channel = supabase.channel("online-users-reader", {
      config: { presence: { key: "reader" } },
    });

    // We need to join the same presence topic — use the "online-users" channel
    // Instead, poll the presence state from a matching channel
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
      .on("presence", { event: "join" }, () => {
        const state = presenceChannel.presenceState();
        const ids = new Set<string>();
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((p) => {
            if (p.user_id) ids.add(p.user_id);
          });
        });
        setOnlineUsers(ids);
      })
      .on("presence", { event: "leave" }, () => {
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

    // Clean up the unused reader channel
    supabase.removeChannel(channel);

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, []);

  return onlineUsers;
}
