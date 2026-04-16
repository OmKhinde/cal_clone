"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subMonths
} from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";

export function BookingCalendar({
  value,
  onChange
}: {
  value: Date;
  onChange: (date: Date) => void;
}) {
  const monthStart = startOfMonth(value);
  const monthEnd = endOfMonth(value);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const offset = monthStart.getDay();
  const blanks = Array.from({ length: offset }, (_, index) => index);

  return (
    <div className="rounded-[16px] bg-transparent">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-[1.05rem] font-semibold text-white">{format(value, "MMMM yyyy")}</p>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="darkGhost"
            size="icon"
            className="h-8 w-8 rounded-full border border-transparent text-[#8f949d] hover:border-[var(--border)]"
            onClick={() => onChange(subMonths(value, 1))}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="darkGhost"
            size="icon"
            className="h-8 w-8 rounded-full border border-transparent text-[#8f949d] hover:border-[var(--border)]"
            onClick={() => onChange(addMonths(value, 1))}
          >
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f3f4f6]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
        {blanks.map((blank) => (
          <div key={`blank-${blank}`} />
        ))}
        {days.map((day) => {
          const selected = isSameDay(day, value);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onChange(day)}
              className={cn(
                "aspect-square rounded-[10px] text-[20px] font-medium transition-all duration-150 sm:text-[18px]",
                selected
                  ? "bg-[#f3f4f6] font-semibold text-[#09090b]"
                  : "text-[#e5e7eb] hover:bg-[#2f3339]"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
