"use client";

import type { Slot } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";
import { SlotButton } from "@/components/ui/slot-button";

export function TimeSlotList({
  slots,
  selectedStartTime,
  onSelect
}: {
  slots: Slot[];
  selectedStartTime?: string;
  onSelect: (slot: Slot) => void;
}) {
  if (!slots.length) {
    return (
      <div className="rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-6 text-sm text-[#b8b8b8]">
        No open times for this day. Try another date.
      </div>
    );
  }

  return (
    <div className="grid gap-2.5">
      {slots.map((slot) => {
        const selected = selectedStartTime === slot.startTime;
        const unavailable = !slot.available;

        return (
          <SlotButton
            key={slot.startTime}
            type="button"
            onClick={() => {
              if (!unavailable) {
                onSelect(slot);
              }
            }}
            disabled={unavailable}
            selected={selected}
            unavailable={unavailable}
            className={cn("min-h-[44px]", selected && "ring-2 ring-white/10")}
          >
            <span className="flex items-center gap-2 text-base font-semibold">
              <span className={cn("h-2.5 w-2.5 rounded-full", unavailable ? "bg-[#4b5563]" : "bg-[#14d9a6]")} />
              {slot.label}
            </span>
            {typeof slot.remainingSeats === "number" ? (
              <span className="text-xs text-inherit">{slot.remainingSeats} left</span>
            ) : unavailable ? (
              <span className="text-xs text-inherit">Booked</span>
            ) : null}
          </SlotButton>
        );
      })}
    </div>
  );
}
