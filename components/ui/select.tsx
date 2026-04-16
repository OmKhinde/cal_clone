import { cn } from "@/lib/utils/cn";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--panel)] px-3.5 text-[14px] text-[var(--panel-foreground)] outline-none transition-all duration-150",
        "hover:border-[#4b5563] focus:border-[#52525b] focus:ring-4 focus:ring-[var(--ring)]",
        "disabled:cursor-not-allowed disabled:bg-[var(--panel-muted)] disabled:text-[#737373]",
        className
      )}
      {...props}
    />
  );
}
