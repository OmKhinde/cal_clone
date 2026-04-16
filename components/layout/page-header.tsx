import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#8c8c8c]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.035em] text-white">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#cfcfcf]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
