"use client";

import { useApp } from "@/components/app-context";
import { Icon } from "@/components/shell/nav";

/** Floating "add a task" button, reachable from every screen. */
export function QuickAddButton() {
  const { openTask } = useApp();
  return (
    <button
      type="button"
      onClick={() => openTask()}
      aria-label="Add a task"
      className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lg transition-transform hover:scale-105 lg:right-8 lg:bottom-8"
    >
      <Icon name="plus" className="h-6 w-6" />
    </button>
  );
}
