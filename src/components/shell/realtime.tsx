"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/browser";

const TABLES = ["tasks", "task_subtasks", "milestones", "vendor_needs", "wedding_settings", "activity_log", "workspace_members"] as const;

/**
 * Listens for changes your partner makes and refreshes the page data.
 * Realtime delivers only rows that row level security lets this user read,
 * so the socket must carry the signed-in user's token before subscribing.
 */
export function RealtimeRefresher({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase.channel(`ws-${workspaceId}`);
      for (const table of TABLES) {
        channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `workspace_id=eq.${workspaceId}` }, refresh);
      }
      channel.subscribe();
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void supabase.realtime.setAuth(session.access_token);
    });

    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      authListener.subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [workspaceId, router]);

  return null;
}
