"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { PartnerNames } from "@/lib/types";
import { TaskDialog, type TaskDialogTask } from "@/components/task-dialog";

export interface AppData {
  names: PartnerNames;
  mySlot: 1 | 2;
  categories: { id: string; name: string }[];
  today: string;
}

interface Ctx extends AppData {
  openTask: (task?: TaskDialogTask) => void;
}

const AppContext = createContext<Ctx | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function AppProvider({ data, children }: { data: AppData; children: ReactNode }) {
  const [editing, setEditing] = useState<{ open: boolean; task?: TaskDialogTask }>({ open: false });
  const openTask = useCallback((task?: TaskDialogTask) => setEditing({ open: true, task }), []);
  return (
    <AppContext value={{ ...data, openTask }}>
      {children}
      <TaskDialog
        key={editing.task?.id ?? "new"}
        open={editing.open}
        task={editing.task}
        onClose={() => setEditing({ open: false })}
        names={data.names}
        categories={data.categories}
      />
    </AppContext>
  );
}
