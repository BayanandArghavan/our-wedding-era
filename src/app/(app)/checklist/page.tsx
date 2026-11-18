import { requireWorkspace } from "@/lib/data/viewer";
import { listCategories, listTasks } from "@/lib/data/queries";
import { isProvisional } from "@/lib/planning/schedule";
import { PageHeader } from "@/components/ui";
import { AddTaskButton } from "@/components/add-task-button";
import { ChecklistView, type ChecklistTask } from "./checklist-view";

export const metadata = { title: "Checklist · Our Wedding Era" };

export default async function ChecklistPage({ searchParams }: PageProps<"/checklist">) {
  const params = await searchParams;
  const ctx = await requireWorkspace();
  const [tasks, categories] = await Promise.all([listTasks(ctx.workspaceId), listCategories(ctx.workspaceId)]);
  const timing = { weddingDate: ctx.settings.wedding_date, weddingMonth: ctx.settings.wedding_month };
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const rows: ChecklistTask[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    notes: t.notes,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date,
    assignee: t.assignee,
    categoryId: t.category_id,
    category: t.category_id ? (catName.get(t.category_id) ?? null) : null,
    provisional: t.date_source === "suggested" && isProvisional({ monthsBefore: t.months_before, daysBefore: t.days_before }, timing),
  }));

  const view = typeof params.view === "string" ? params.view : undefined;

  return (
    <>
      <PageHeader eyebrow="Master checklist" title="Everything, in order" action={<AddTaskButton label="Add a task" size="md" />}>
        {ctx.settings.wedding_date
          ? "Dates are planned from your wedding date. Change any of them; dates you set by hand stay put."
          : "Dates marked provisional are planned around your wedding month. Add the exact date in Settings to firm them up."}
      </PageHeader>
      <ChecklistView
        tasks={rows}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        names={ctx.names}
        today={ctx.today}
        initialView={view === "overdue" || view === "upcoming" || view === "completed" ? view : "all"}
      />
    </>
  );
}
