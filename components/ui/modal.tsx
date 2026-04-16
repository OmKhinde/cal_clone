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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full max-w-5xl overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-panel)]"
        )}
      >
        <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-5 sm:px-8">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight text-[var(--panel-foreground)]">{title}</h2>
            {description ? <p className="mt-1 text-[14px] text-[var(--muted)]">{description}</p> : null}
          </div>
          <button
            className="rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-1.5 text-[14px] font-medium text-[var(--muted)] transition hover:bg-[var(--panel-soft)] hover:text-white"
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
