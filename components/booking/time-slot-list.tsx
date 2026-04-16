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
      <div className="rounded-[12px] border border-dashed border-[var(--border)] bg-[var(--panel-muted)] p-6 text-sm text-[#b8b8b8]">
        No open times for this day. Try another date.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
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
            className={cn(selected && "ring-4 ring-[var(--ring)]")}
          >
            <span className="text-sm font-medium">{slot.label}</span>
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
