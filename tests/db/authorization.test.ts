import { beforeAll, describe, expect, it } from "vitest";
import { anonClient, createUser, hasLocalStack, type Client } from "./helpers";
import { buildSeedPayload } from "@/lib/planning/seed";
import { SEED_TASKS } from "@/lib/planning/catalog";

const d = hasLocalStack ? describe : describe.skip;

d("workspace authorization (against local Supabase)", () => {
  let arghavan: { client: Client; email: string; id: string };
  let bayan: { client: Client; email: string; id: string };
  let outsider: { client: Client; email: string; id: string };
  let workspaceId: string;
  let token: string;

  beforeAll(async () => {
    arghavan = await createUser("arghavan", { displayName: "Arghavan" });
    bayan = await createUser("bayan", { displayName: "Bayan" });
    outsider = await createUser("outsider");

    const seed = buildSeedPayload({ weddingDate: null, weddingMonth: "2027-09-01" });
    const { data, error } = await arghavan.client.rpc("create_workspace", {
      p_partner_slot: 1,
      p_settings: { total_budget: "", wedding_date: "" },
      ...seed,
    });
    if (error) throw error;
    workspaceId = data!;
  });

  it("1. creates the workspace with the full seeded checklist and no duplicates", async () => {
    const { count } = await arghavan.client
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    expect(count).toBe(SEED_TASKS.length);

    const { data: settings } = await arghavan.client.from("wedding_settings").select("*").single();
    expect(settings).toMatchObject({
      partner1_name: "Arghavan",
      partner2_name: "Bayan",
      venue_name: "Bel Air Bay Club",
      wedding_date: null,
      wedding_month: "2027-09-01",
      total_budget: null,
      estimated_guest_count: 160,
      alcohol_served: false,
      sofreh_aghd: false,
    });

    const { data: milestones } = await arghavan.client.from("milestones").select("seed_key,is_completed,completed_on");
    const done = milestones!.filter((m) => m.is_completed).map((m) => m.seed_key).sort();
    expect(done).toEqual(["said_yes", "venue_secured"]);
    expect(milestones!.every((m) => m.completed_on === null)).toBe(true);
  });

  it("refuses to create a second workspace for the same account", async () => {
    const seed = buildSeedPayload({ weddingDate: null, weddingMonth: "2027-09-01" });
    const { error } = await arghavan.client.rpc("create_workspace", { p_partner_slot: 1, p_settings: {}, ...seed });
    expect(error?.message).toMatch(/already belong/);
  });

  it("22. an unrelated account cannot read or change any wedding data", async () => {
    for (const table of [
      "tasks",
      "wedding_settings",
      "workspace_members",
      "milestones",
      "activity_log",
      "vendor_needs",
      "task_activity",
      "workspace_invitations",
      "wedding_workspaces",
    ] as const) {
      const { data, error } = await outsider.client.from(table).select("*");
      expect(error, table).toBeNull();
      expect(data, table).toEqual([]);
    }

    const { data: aTask } = await arghavan.client.from("tasks").select("id,title").limit(1).single();
    const { data: updated } = await outsider.client
      .from("tasks")
      .update({ title: "hijacked" })
      .eq("id", aTask!.id)
      .select();
    expect(updated).toEqual([]);

    const { error: insertError } = await outsider.client
      .from("tasks")
      .insert({ workspace_id: workspaceId, title: "Sneaky task" });
    expect(insertError?.code).toBe("42501");

    const { data: stillThere } = await arghavan.client.from("tasks").select("title").eq("id", aTask!.id).single();
    expect(stillThere!.title).toBe(aTask!.title);
  });

  it("signed-out visitors cannot read anything", async () => {
    const { data, error } = await anonClient().from("tasks").select("*");
    expect(data ?? []).toEqual([]);
    if (error) expect(error.code).toBe("42501");
  });

  it("2-4. invitation: only the invited, confirmed email can accept, once", async () => {
    const { data, error } = await arghavan.client.rpc("create_partner_invitation", { p_email: bayan.email.toUpperCase() });
    expect(error).toBeNull();
    token = data!;

    const preview = await anonClient().rpc("get_invitation_preview", { p_token: token });
    expect(preview.data?.[0]).toMatchObject({ is_valid: true, invited_email: bayan.email, partner_slot: 2 });

    const wrong = await outsider.client.rpc("accept_partner_invitation", { p_token: token });
    expect(wrong.error?.message).toMatch(/different email/);

    const bad = await bayan.client.rpc("accept_partner_invitation", { p_token: "not-a-real-token" });
    expect(bad.error?.message).toMatch(/no longer valid/);

    const ok = await bayan.client.rpc("accept_partner_invitation", { p_token: token });
    expect(ok.error).toBeNull();
    expect(ok.data).toBe(workspaceId);

    const again = await bayan.client.rpc("accept_partner_invitation", { p_token: token });
    expect(again.error).not.toBeNull();

    const { data: members } = await bayan.client.from("workspace_members").select("user_id,partner_slot,role");
    expect(members).toHaveLength(2);
    expect(members!.find((m) => m.user_id === bayan.id)).toMatchObject({ partner_slot: 2, role: "partner" });

    const third = await arghavan.client.rpc("create_partner_invitation", { p_email: outsider.email });
    expect(third.error?.message).toMatch(/already joined/);
  });

  it("unconfirmed accounts cannot accept an invitation", async () => {
    const solo = await createUser("solo");
    await solo.client.rpc("create_workspace", {
      p_partner_slot: 2,
      p_settings: {},
      ...buildSeedPayload({ weddingDate: null, weddingMonth: "2027-09-01" }),
    });
    const pending = await createUser("pending", { confirmed: false });
    const { data: t } = await solo.client.rpc("create_partner_invitation", { p_email: pending.email });
    // An unconfirmed user can't even sign in, so the RPC sees no auth.uid().
    const res = await pending.client.rpc("accept_partner_invitation", { p_token: t! });
    expect(res.error).not.toBeNull();
  });

  it("5-8. a task created by one partner is visible to the other, and completion is attributed correctly", async () => {
    const { data: created, error } = await arghavan.client
      .from("tasks")
      .insert({ workspace_id: workspaceId, title: "Ask venue about candles", created_by: bayan.id })
      .select()
      .single();
    expect(error).toBeNull();
    // created_by comes from the session, not from what the client sent.
    expect(created!.created_by).toBe(arghavan.id);

    const { data: seen } = await bayan.client.from("tasks").select("id,title").eq("id", created!.id).single();
    expect(seen!.title).toBe("Ask venue about candles");

    const { data: done } = await bayan.client
      .from("tasks")
      .update({ status: "completed" })
      .eq("id", created!.id)
      .select()
      .single();
    expect(done!.completed_at).not.toBeNull();
    expect(done!.updated_by).toBe(bayan.id);

    const { data: feed } = await arghavan.client
      .from("activity_log")
      .select("actor_id,action,entity_label")
      .eq("entity_id", created!.id)
      .order("id");
    expect(feed!.map((f) => [f.action, f.actor_id])).toEqual([
      ["created", arghavan.id],
      ["completed", bayan.id],
    ]);

    const { data: reopened } = await arghavan.client
      .from("tasks")
      .update({ status: "in_progress" })
      .eq("id", created!.id)
      .select()
      .single();
    expect(reopened!.completed_at).toBeNull();
  });

  it("18. rescheduling keeps the original deadline in history", async () => {
    const { data: t } = await arghavan.client
      .from("tasks")
      .select("id,due_date")
      .eq("seed_key", "photo_research")
      .single();
    const original = t!.due_date;
    const { error } = await bayan.client.rpc("reschedule_task", {
      p_task_id: t!.id,
      p_new_date: "2026-12-31",
      p_reason: "moved_to_next_month",
    });
    expect(error).toBeNull();

    const { data: after } = await arghavan.client.from("tasks").select("due_date,date_source").eq("id", t!.id).single();
    expect(after).toEqual({ due_date: "2026-12-31", date_source: "manual" });

    const { data: history } = await arghavan.client
      .from("task_activity")
      .select("action,actor_id,details")
      .eq("task_id", t!.id)
      .eq("action", "due_date_changed");
    expect(history).toHaveLength(1);
    expect(history![0].actor_id).toBe(bayan.id);
    expect(history![0].details).toMatchObject({ from: original, to: "2026-12-31", reason: "moved_to_next_month" });
  });

  it("history cannot be edited or deleted by either partner", async () => {
    const { data: rows } = await arghavan.client.from("task_activity").select("id").limit(1);
    const id = rows![0].id;
    const del = await arghavan.client.from("task_activity").delete().eq("id", id).select();
    expect(del.data ?? []).toEqual([]);
    const { count } = await arghavan.client.from("task_activity").select("id", { count: "exact", head: true }).eq("id", id);
    expect(count).toBe(1);
  });

  it("19. wedding date change only moves the tasks that were approved", async () => {
    const { data: tasks } = await arghavan.client
      .from("tasks")
      .select("id,due_date,seed_key")
      .in("seed_key", ["guests_send_invitations", "dj_book"]);
    const invitations = tasks!.find((t) => t.seed_key === "guests_send_invitations")!;
    const dj = tasks!.find((t) => t.seed_key === "dj_book")!;

    const { data: count, error } = await bayan.client.rpc("apply_wedding_date_change", {
      p_wedding_date: "2027-09-18",
      p_wedding_month: "2027-09-01",
      p_changes: [{ task_id: invitations.id, due_date: "2027-06-26" }],
    });
    expect(error).toBeNull();
    expect(count).toBe(1);

    const { data: after } = await arghavan.client.from("tasks").select("id,due_date").in("id", [invitations.id, dj.id]);
    expect(after!.find((t) => t.id === invitations.id)!.due_date).toBe("2027-06-26");
    expect(after!.find((t) => t.id === dj.id)!.due_date).toBe(dj.due_date);

    const { data: s } = await arghavan.client.from("wedding_settings").select("wedding_date,wedding_month").single();
    expect(s).toEqual({ wedding_date: "2027-09-18", wedding_month: "2027-09-01" });
  });

  it("rejects a wedding date outside the stored wedding month", async () => {
    const { error } = await arghavan.client
      .from("wedding_settings")
      .update({ wedding_date: "2027-10-02" })
      .eq("workspace_id", workspaceId);
    expect(error?.code).toBe("23514");
  });

  it("rejects dependency loops", async () => {
    const { data: tasks } = await arghavan.client.from("tasks").select("id,seed_key").in("seed_key", ["photo_research", "photo_book"]);
    const research = tasks!.find((t) => t.seed_key === "photo_research")!;
    const book = tasks!.find((t) => t.seed_key === "photo_book")!;
    const { error } = await arghavan.client
      .from("task_dependencies")
      .insert({ workspace_id: workspaceId, task_id: research.id, depends_on_task_id: book.id });
    expect(error?.message).toMatch(/loop/);
  });

  it("deleting a task removes its children but keeps a readable feed entry", async () => {
    const { data: tk } = await arghavan.client
      .from("tasks")
      .insert({ workspace_id: workspaceId, title: "Temporary task" })
      .select()
      .single();
    await arghavan.client.from("task_subtasks").insert({ workspace_id: workspaceId, task_id: tk!.id, title: "Sub" });
    const { error } = await bayan.client.from("tasks").delete().eq("id", tk!.id);
    expect(error).toBeNull();

    const { data: subs } = await arghavan.client.from("task_subtasks").select("id").eq("task_id", tk!.id);
    expect(subs).toEqual([]);
    const { data: feed } = await arghavan.client
      .from("activity_log")
      .select("action,entity_label")
      .eq("entity_id", tk!.id)
      .eq("action", "deleted");
    expect(feed).toEqual([{ action: "deleted", entity_label: "Temporary task" }]);
  });

  it("each partner can update only their own profile", async () => {
    const { data } = await bayan.client.from("profiles").select("id,display_name");
    expect(data!.map((p) => p.id).sort()).toEqual([arghavan.id, bayan.id].sort());
    const { data: changed } = await bayan.client
      .from("profiles")
      .update({ display_name: "Hacked" })
      .eq("id", arghavan.id)
      .select();
    expect(changed).toEqual([]);
  });

  it("records cannot be moved into another workspace", async () => {
    const { data: tk } = await arghavan.client.from("tasks").select("id").limit(1).single();
    const { error } = await arghavan.client
      .from("tasks")
      .update({ workspace_id: crypto.randomUUID() })
      .eq("id", tk!.id);
    expect(error).not.toBeNull();
  });
});
