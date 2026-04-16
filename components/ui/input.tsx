import { cn } from "@/lib/utils/cn";
import { SearchIcon } from "@/components/ui/icons";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  const isSearch = props.type === "search";

  return (
    <div className="relative">
      {isSearch ? (
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717a]" />
      ) : null}
      <input
        className={cn(
          "h-10 w-full rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--panel)] px-3.5 text-[14px] text-[var(--panel-foreground)] outline-none transition-all duration-150",
          "placeholder:text-[#71717a] hover:border-[#4b5563] focus:border-[#52525b] focus:ring-4 focus:ring-[var(--ring)]",
          "disabled:cursor-not-allowed disabled:bg-[var(--panel-muted)] disabled:text-[#737373]",
          isSearch && "pl-9",
          className
        )}
        {...props}
      />
    </div>
  );
}
