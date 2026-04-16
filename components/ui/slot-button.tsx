"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type SlotButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  unavailable?: boolean;
};

export function SlotButton({
  className,
  selected = false,
  unavailable = false,
  children,
  ...props
}: SlotButtonProps) {
  return (
    <button
      className={cn(
        "flex w-full items-center justify-between rounded-[var(--radius-control)] border px-4 py-3.5 text-left text-sm font-medium transition-all duration-150",
        selected
          ? "border-neutral-500 bg-[#2c2c2c] text-white"
          : unavailable
            ? "border-[var(--border)] bg-[var(--panel-muted)] text-[#737373] opacity-70"
            : "border-[var(--border)] bg-[var(--panel)] text-[var(--panel-foreground)] hover:border-neutral-500 hover:bg-[var(--panel-soft)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
