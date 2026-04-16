import { cn } from "@/lib/utils/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--panel)] px-4 text-sm text-[var(--panel-foreground)] outline-none transition-all duration-150",
        "placeholder:text-[#737373] hover:border-neutral-500 focus:border-neutral-400 focus:ring-4 focus:ring-[var(--ring)]",
        "disabled:cursor-not-allowed disabled:bg-[var(--panel-muted)] disabled:text-[#737373]",
        className
      )}
      {...props}
    />
  );
}
