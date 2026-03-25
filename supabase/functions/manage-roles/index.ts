import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: callerRole } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!callerRole) {
    return new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, user_id, role } = await req.json();

    if (action === "list") {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, full_name, created_at, selected_plan, email")
        .order("created_at", { ascending: false });

      // Also fetch emails from auth.users for profiles missing email
      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

      const emailMap: Record<string, string> = {};
      (authUsers || []).forEach((u: any) => {
        emailMap[u.id] = u.email || "";
      });

      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, role");

      const roleMap: Record<string, string[]> = {};
      (roles || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      const members = (profiles || []).map((p: any) => ({
        ...p,
        email: p.email || emailMap[p.id] || "",
        roles: roleMap[p.id] || [],
      }));

      return new Response(JSON.stringify({ members }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "grant") {
      if (!user_id || !role) {
        return new Response(JSON.stringify({ error: "user_id and role required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await adminClient
        .from("user_roles")
        .upsert({ user_id, role }, { onConflict: "user_id,role" });
      if (error) throw error;
      return new Response(JSON.stringify({ status: "granted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "revoke") {
      if (!user_id || !role) {
        return new Response(JSON.stringify({ error: "user_id and role required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (user_id === user.id && role === "admin") {
        return new Response(JSON.stringify({ error: "Cannot remove your own admin role" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .eq("role", role);
      if (error) throw error;
      return new Response(JSON.stringify({ status: "revoked" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (user_id === user.id) {
        return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Delete profile, roles, and auth user
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.from("trades").delete().eq("user_id", user_id);
      await adminClient.from("user_alert_preferences").delete().eq("user_id", user_id);
      await adminClient.from("profiles").delete().eq("id", user_id);
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ status: "deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
