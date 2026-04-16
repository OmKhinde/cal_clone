"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "dark" | "darkGhost";
  size?: "sm" | "md" | "lg" | "icon";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border text-sm font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-sm",
        size === "icon" && "h-10 w-10 text-sm",
        variant === "primary" &&
          "border-white bg-white text-black hover:bg-neutral-200",
        variant === "secondary" &&
          "border-[var(--border-strong)] bg-transparent text-white hover:border-neutral-500 hover:bg-[var(--panel-soft)]",
        variant === "ghost" &&
          "border-transparent bg-transparent text-[var(--muted-strong)] shadow-none hover:bg-[var(--panel-soft)] hover:text-white",
        variant === "danger" &&
          "border-[rgba(248,113,113,0.18)] bg-[var(--danger-soft)] text-[var(--danger)] shadow-none hover:border-[rgba(248,113,113,0.28)] hover:bg-[rgba(127,29,29,0.4)]",
        variant === "dark" &&
          "border-[var(--border)] bg-[var(--panel-soft)] text-white shadow-none hover:border-[var(--border-strong)] hover:bg-[#2d2d2d]",
        variant === "darkGhost" &&
          "border-transparent bg-transparent text-[var(--muted)] shadow-none hover:bg-[var(--panel-soft)] hover:text-white",
        className
      )}
      {...props}
    />
  );
});
