"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Modal({
  open,
  title,
  description,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full max-w-4xl rounded-[20px] border border-[var(--border)] bg-[var(--panel-muted)]"
        )}
      >
        <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-5 sm:px-8">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--panel-foreground)]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
          </div>
          <button
            className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-6 py-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
