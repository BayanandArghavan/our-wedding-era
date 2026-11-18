"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/dialog";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useCelebrate } from "@/components/shell/celebration";
import { createTask, updateTask } from "@/app/(app)/actions/tasks";
import { taskSchema, type TaskInput } from "@/lib/validation/task";
import { TASK_PRIORITIES, TASK_STATUSES, type PartnerNames } from "@/lib/types";

export interface TaskDialogTask {
  id: string;
  title: string;
  description: string;
  notes: string;
  categoryId: string | null;
  assignee: TaskInput["assignee"];
  status: TaskInput["status"];
  priority: TaskInput["priority"];
  dueDate: string | null;
}

export function TaskDialog({
  open,
  onClose,
  task,
  names,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  task?: TaskDialogTask;
  names: PartnerNames;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { celebrate, notify } = useCelebrate();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError, reset } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema, undefined, { raw: true }),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      notes: task?.notes ?? "",
      categoryId: task?.categoryId ?? "",
      assignee: task?.assignee ?? "unassigned",
      status: task?.status ?? "not_started",
      priority: task?.priority ?? "medium",
      dueDate: task?.dueDate ?? "",
    },
  });
  const errors = formState.errors;

  return (
    <Dialog open={open} onClose={onClose} title={task ? "Edit task" : "Add a task"}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          setServerError(null);
          const res = task ? await updateTask(task.id, values) : await createTask(values);
          if (!res.ok) {
            for (const [k, msg] of Object.entries(res.fieldErrors ?? {})) setError(k as keyof TaskInput, { message: msg });
            setServerError(res.error);
            return;
          }
          celebrate(res.celebrate);
          notify(task ? "Task saved" : "Task added");
          if (!task) reset();
          onClose();
          router.refresh();
        })}
      >
        {serverError ? <Alert tone="danger">{serverError}</Alert> : null}
        <Field label="Title" htmlFor="task-title" error={errors.title?.message}>
          <Input id="task-title" autoFocus {...register("title")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Due date" htmlFor="task-due" error={errors.dueDate?.message}>
            <Input id="task-due" type="date" {...register("dueDate")} />
          </Field>
          <Field label="Assigned to" htmlFor="task-assignee">
            <Select id="task-assignee" {...register("assignee")}>
              <option value="unassigned">Unassigned</option>
              <option value="partner1">{names.partner1}</option>
              <option value="partner2">{names.partner2}</option>
              <option value="together">Together</option>
            </Select>
          </Field>
          <Field label="Priority" htmlFor="task-priority">
            <Select id="task-priority" {...register("priority")}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="task-status">
            <Select id="task-status" {...register("status")}>
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category" htmlFor="task-category" className="sm:col-span-2">
            <Select id="task-category" {...register("categoryId")}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description" htmlFor="task-description" error={errors.description?.message}>
          <Textarea id="task-description" rows={3} {...register("description")} />
        </Field>
        <Field label="Notes" htmlFor="task-notes" error={errors.notes?.message}>
          <Textarea id="task-notes" rows={3} {...register("notes")} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Saving…" : task ? "Save changes" : "Add task"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
