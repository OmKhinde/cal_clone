import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export function Card({
  className,
  children,
  tone = "light"
}: {
  className?: string;
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-panel)] border shadow-[var(--shadow-soft)] transition-all duration-150",
        tone === "dark"
          ? "border-[var(--border)] bg-[var(--panel-muted)] text-white"
          : "border-[var(--border)] bg-[var(--panel)] text-[var(--panel-foreground)]",
        className
      )}
    >
      {children}
    </div>
  );
}
