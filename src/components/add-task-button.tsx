"use client";

import { useApp } from "@/components/app-context";
import { Button } from "@/components/ui";

export function AddTaskButton({ label = "Add Task", size = "sm" as const }: { label?: string; size?: "sm" | "md" }) {
  const { openTask } = useApp();
  return (
    <Button size={size} variant="secondary" onClick={() => openTask()}>
      {label}
    </Button>
  );
}
