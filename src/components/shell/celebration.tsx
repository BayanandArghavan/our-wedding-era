"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface Ctx {
  celebrate: (titles: string[] | undefined) => void;
  notify: (message: string) => void;
}
const CelebrationContext = createContext<Ctx>({ celebrate: () => {}, notify: () => {} });

export function useCelebrate() {
  return useContext(CelebrationContext);
}

const COLORS = ["#EAD7D5", "#B98C94", "#C6A675", "#F4EDE5"];

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [burst, setBurst] = useState<{ id: number; titles: string[] } | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const celebrate = useCallback((titles: string[] | undefined) => {
    if (!titles || titles.length === 0) return;
    const id = Date.now();
    setBurst({ id, titles });
    setTimeout(() => setBurst((b) => (b?.id === id ? null : b)), 4200);
  }, []);

  const notify = useCallback((message: string) => {
    const id = Date.now();
    setToast({ id, message });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3200);
  }, []);

  return (
    <CelebrationContext value={{ celebrate, notify }}>
      {children}
      {burst ? (
        <>
          <div aria-hidden key={burst.id}>
            {Array.from({ length: 28 }, (_, i) => (
              <span
                key={i}
                className="petal"
                style={
                  {
                    left: `${(i * 37) % 100}%`,
                    background: COLORS[i % COLORS.length],
                    animationDelay: `${(i % 7) * 0.12}s`,
                    "--dur": `${2.6 + (i % 5) * 0.3}s`,
                    "--drift": `${((i % 9) - 4) * 14}px`,
                    "--spin": `${200 + (i % 6) * 60}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
          <div
            role="status"
            className="rise-in fixed inset-x-4 top-6 z-[70] mx-auto max-w-sm rounded-2xl border border-accent/60 bg-surface p-4 text-center shadow-lg"
          >
            <p className="eyebrow">Milestone reached</p>
            <p className="font-display mt-1 text-2xl">{burst.titles.join(" · ")}</p>
          </div>
        </>
      ) : null}
      {toast ? (
        <div
          role="status"
          className="rise-in fixed inset-x-4 bottom-24 z-[70] mx-auto max-w-sm rounded-xl bg-text px-4 py-3 text-center text-sm text-bg shadow-lg lg:bottom-8"
        >
          {toast.message}
        </div>
      ) : null}
    </CelebrationContext>
  );
}
