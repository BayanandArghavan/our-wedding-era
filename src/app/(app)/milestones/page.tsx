import { requireWorkspace } from "@/lib/data/viewer";
import { listMilestones, listTasks } from "@/lib/data/queries";
import { PageHeader } from "@/components/ui";
import { MilestoneJourney, type JourneyMilestone } from "./journey";

export const metadata = { title: "Milestones · Our Wedding Era" };

export default async function MilestonesPage() {
  const ctx = await requireWorkspace();
  const [{ milestones, links }, tasks] = await Promise.all([listMilestones(ctx.workspaceId), listTasks(ctx.workspaceId)]);
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const journey: JourneyMilestone[] = milestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    isCompleted: m.is_completed,
    completedOn: m.completed_on,
    isCustom: m.is_custom,
    isWeddingDay: m.seed_key === "wedding_day",
    tasks: links
      .filter((l) => l.milestone_id === m.id)
      .map((l) => taskById.get(l.task_id))
      .filter((t) => t !== undefined)
      .map((t) => ({ id: t.id, title: t.title, done: t.status === "completed" || t.status === "not_applicable" })),
  }));

  return (
    <>
      <PageHeader eyebrow="Our journey" title="Milestones">
        Milestones with linked tasks complete themselves when every linked task is done. You can also mark them yourselves.
      </PageHeader>
      <MilestoneJourney milestones={journey} today={ctx.today} weddingDate={ctx.settings.wedding_date} />
    </>
  );
}
