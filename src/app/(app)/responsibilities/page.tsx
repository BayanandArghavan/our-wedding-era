import { requireWorkspace } from "@/lib/data/viewer";
import { actorNamer, listCategories, listMembers, listTasks, toInsightTask } from "@/lib/data/queries";
import { workloadByAssignee } from "@/lib/planning/insights";
import { isOpen, type Assignee } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { ResponsibilityBoard, type BoardTask } from "./board";

export const metadata = { title: "Who's Doing What? · Our Wedding Era" };

export default async function ResponsibilitiesPage() {
  const ctx = await requireWorkspace();
  const [tasks, categories, members] = await Promise.all([
    listTasks(ctx.workspaceId),
    listCategories(ctx.workspaceId),
    listMembers(ctx.workspaceId),
  ]);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const nameOf = actorNamer(members, ctx.names);
  const open = tasks.filter((t) => isOpen(t.status));

  const toBoard = (t: (typeof tasks)[number]): BoardTask => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date,
    assignee: t.assignee,
    category: t.category_id ? (catName.get(t.category_id) ?? null) : null,
    reassignRequestedBy: t.reassign_requested_by ? nameOf(t.reassign_requested_by) : null,
    requestedByMe: t.reassign_requested_by === ctx.userId,
  });

  const columns: { key: Assignee; title: string }[] = [
    { key: "partner1", title: `${ctx.names.partner1}'s Tasks` },
    { key: "partner2", title: `${ctx.names.partner2}'s Tasks` },
    { key: "together", title: "Together" },
  ];

  return (
    <>
      <PageHeader eyebrow="Responsibilities" title="Who's Doing What?">
        Open tasks by person. Claim anything, or ask to hand something off. Nothing is assigned automatically.
      </PageHeader>
      <ResponsibilityBoard
        columns={columns.map((c) => ({ ...c, tasks: open.filter((t) => t.assignee === c.key).map(toBoard) }))}
        unassigned={open.filter((t) => t.assignee === "unassigned").map(toBoard)}
        workload={workloadByAssignee(tasks.map(toInsightTask), ctx.today)}
        today={ctx.today}
      />
    </>
  );
}
