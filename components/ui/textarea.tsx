import { cn } from "@/lib/utils/cn";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--panel)] px-3.5 py-3 text-[14px] text-[var(--panel-foreground)] outline-none transition-all duration-150",
        "placeholder:text-[#71717a] hover:border-[#4b5563] focus:border-[#52525b] focus:ring-4 focus:ring-[var(--ring)]",
        "disabled:cursor-not-allowed disabled:bg-[var(--panel-muted)] disabled:text-[#737373]",
        className
      )}
      {...props}
    />
  );
}
