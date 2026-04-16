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
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7b7e87]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-white sm:text-[19px]">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-[14px] leading-6 text-[#d4d4d8]">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
