"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_partner_invitation", { p_token: token });
  if (error) {
    console.error("[invite] accept", error.code, error.message);
    const code = /different email/.test(error.message)
      ? "email"
      : /confirm your email/i.test(error.message)
        ? "unconfirmed"
        : /already belongs/.test(error.message)
          ? "has_workspace"
          : /already joined/.test(error.message)
            ? "full"
            : /no longer valid/.test(error.message)
              ? "invalid"
              : "unknown";
    redirect(`/invite/${encodeURIComponent(token)}?error=${code}`);
  }
  redirect("/?joined=1");
}
