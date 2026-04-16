"use client";

import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ChevronDownIcon } from "@/components/ui/icons";

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
  const offset = (monthStart.getDay() + 6) % 7;
  const blanks = Array.from({ length: offset }, (_, index) => index);

  return (
    <div className="rounded-[16px] bg-transparent">
      <div className="mb-4 flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" className="rounded-xl px-2.5" onClick={() => onChange(subMonths(value, 1))}>
          <ChevronDownIcon className="h-4 w-4 rotate-90" />
        </Button>
        <p className="text-sm font-semibold text-white">{format(value, "MMMM yyyy")}</p>
        <Button type="button" variant="ghost" size="sm" className="rounded-xl px-2.5" onClick={() => onChange(addMonths(value, 1))}>
          <ChevronDownIcon className="h-4 w-4 -rotate-90" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-[#71717a]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
        {blanks.map((blank) => (
          <div key={`blank-${blank}`} />
        ))}
        {days.map((day) => {
          const selected = isSameDay(day, value);
          const isCurrentMonth = isSameMonth(day, value);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onChange(day)}
              className={cn(
                "aspect-square rounded-[10px] text-[13px] transition-all duration-150",
                selected
                  ? "bg-white font-semibold text-black"
                  : "hover:bg-[var(--panel-soft)]",
                isCurrentMonth ? "text-white" : "text-[#666666]"
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
