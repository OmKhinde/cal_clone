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
        "flex w-full items-center justify-between rounded-[14px] border px-4 py-3.5 text-left text-[14px] font-medium transition-all duration-150",
        selected
          ? "border-[#f2f4f8] bg-[#16181c] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          : unavailable
            ? "border-[var(--border)] bg-[var(--panel-muted)] text-[#737373] opacity-70"
            : "border-[#4a4f57] bg-transparent text-[var(--panel-foreground)] hover:border-[#d1d5db] hover:bg-[#16181c]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
