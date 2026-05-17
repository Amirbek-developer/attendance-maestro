import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  kicked: boolean;
}
const Ctx = React.createContext<AuthCtx>({ user: null, session: null, loading: true, kicked: false });

const TOKEN_KEY = "upro.session_token";

function getOrCreateLocalToken(userId: string) {
  const key = `${TOKEN_KEY}.${userId}`;
  let t = localStorage.getItem(key);
  if (!t) {
    t = crypto.randomUUID();
    localStorage.setItem(key, t);
  }
  return t;
}
function rotateLocalToken(userId: string) {
  const key = `${TOKEN_KEY}.${userId}`;
  const t = crypto.randomUUID();
  localStorage.setItem(key, t);
  return t;
}
function getDeviceLabel() {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  const platform = /iPhone|iPad/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Mac/.test(ua) ? "Mac"
    : /Windows/.test(ua) ? "Windows"
    : /Linux/.test(ua) ? "Linux"
    : "Device";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "Browser";
  return `${platform} · ${browser}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [kicked, setKicked] = React.useState(false);

  // Track auth state
  React.useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (event === "SIGNED_OUT") setKicked(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Enforce single active session
  React.useEffect(() => {
    if (!user) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const evict = async (reason: "kicked" | "expired") => {
      if (cancelled) return;
      cancelled = true;
      setKicked(true);
      toast.error(
        reason === "kicked"
          ? "Sizning hisobingizga boshqa qurilmadan kirildi. Ushbu sessiya tugatildi."
          : "Sessiya muddati tugadi. Iltimos qayta kiring.",
        { duration: 6000 }
      );
      await supabase.auth.signOut();
    };

    (async () => {
      // Read current DB token
      const { data: existing } = await supabase
        .from("active_sessions")
        .select("session_token")
        .eq("user_id", user.id)
        .maybeSingle();

      const localToken = getOrCreateLocalToken(user.id);
      let activeToken = localToken;

      if (!existing || existing.session_token !== localToken) {
        // Either no session yet, or another device holds it.
        // Claim ownership — this kicks any previous device.
        activeToken = rotateLocalToken(user.id);
        await supabase.from("active_sessions").upsert({
          user_id: user.id,
          session_token: activeToken,
          device: getDeviceLabel(),
          user_agent: navigator.userAgent.slice(0, 500),
          last_seen: new Date().toISOString(),
        });
      } else {
        // Touch last_seen
        await supabase.from("active_sessions").update({
          last_seen: new Date().toISOString(),
          device: getDeviceLabel(),
        }).eq("user_id", user.id);
      }

      if (cancelled) return;

      // Realtime: if our row's token changes to something else, we got kicked.
      channel = supabase
        .channel(`session:${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "active_sessions", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const newToken = (payload.new as { session_token?: string })?.session_token;
            if (newToken && newToken !== activeToken) evict("kicked");
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "active_sessions", filter: `user_id=eq.${user.id}` },
          () => evict("kicked")
        )
        .subscribe();

      const verify = async () => {
        if (cancelled) return;
        const { data, error } = await supabase
          .from("active_sessions")
          .select("session_token")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) return;
        if (!data || data.session_token !== activeToken) {
          evict("kicked");
          return;
        }
        await supabase.from("active_sessions").update({
          last_seen: new Date().toISOString(),
        }).eq("user_id", user.id);
      };

      // Aggressive heartbeat — every 5s
      heartbeat = setInterval(verify, 5_000);

      // Verify on tab focus / visibility / network reconnect
      const onFocus = () => { verify(); };
      const onVisible = () => { if (document.visibilityState === "visible") verify(); };
      window.addEventListener("focus", onFocus);
      window.addEventListener("online", onFocus);
      document.addEventListener("visibilitychange", onVisible);

      // Cross-tab instant kick within same browser
      let bc: BroadcastChannel | null = null;
      try {
        bc = new BroadcastChannel(`upro-session-${user.id}`);
        bc.postMessage({ type: "claim", token: activeToken });
        bc.onmessage = (ev) => {
          if (ev.data?.type === "claim" && ev.data.token !== activeToken) {
            evict("kicked");
          }
        };
      } catch {}

      cleanup = () => {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("online", onFocus);
        document.removeEventListener("visibilitychange", onVisible);
        if (bc) bc.close();
      };
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (heartbeat) clearInterval(heartbeat);
      if (cleanup) cleanup();
    };
  }, [user]);

  return <Ctx.Provider value={{ user, session, loading, kicked }}>{children}</Ctx.Provider>;
}

export const useAuth = () => React.useContext(Ctx);
