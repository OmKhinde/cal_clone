"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EventTypeForm } from "@/components/event-types/event-type-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";
import type { EventType } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

export function EventTypesPage() {
  const queryClient = useQueryClient();
  const [activeEvent, setActiveEvent] = useState<EventType | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["event-types"],
    queryFn: api.listEventTypes
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.updateEventType(id, { isActive }),
    onSuccess: async (updatedEventType) => {
      queryClient.setQueryData<EventType[]>(["event-types"], (current) =>
        current?.map((item) => (item.id === updatedEventType.id ? updatedEventType : item)) ?? current
      );
      await queryClient.invalidateQueries({ queryKey: ["event-types"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteEventType,
    onSuccess: async (deletedEventType) => {
      queryClient.setQueryData<EventType[]>(["event-types"], (current) =>
        current?.filter((item) => item.id !== deletedEventType.id) ?? current
      );
      await queryClient.invalidateQueries({ queryKey: ["event-types"] });
    }
  });

  const filteredEvents = data?.filter((eventType) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [eventType.title, eventType.slug, eventType.description ?? ""].some((value) =>
      value.toLowerCase().includes(query)
    );
  });

  return (
    <div>
      <PageHeader
        eyebrow="Event Types"
        title="Event types"
        description="Configure different events for people to book on your calendar."
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="sm:w-56"
            />
            <Button
              onClick={() => {
                setActiveEvent(undefined);
                setModalOpen(true);
              }}
            >
              + New
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid gap-0 rounded-[16px] border border-[var(--border)]">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-none border-b border-[var(--border)] last:border-b-0" />
          ))}
        </div>
      ) : !filteredEvents?.length ? (
        <Card className="p-10 text-center">
          <h2 className="text-xl font-semibold text-white">No event types found</h2>
          <p className="mt-2 text-sm text-[#b8b8b8]">Try a different search or create a new event type.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {filteredEvents?.map((eventType) => (
            <div
              key={eventType.id}
              className="grid gap-4 border-b border-[var(--border)] px-6 py-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[1.1rem] font-semibold text-white">{eventType.title}</h2>
                  <p className="truncate text-sm text-[#9f9f9f]">/{eventType.user?.username ?? "demo"}/{eventType.slug}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-[6px] bg-[#303030] px-2.5 py-1 text-xs font-medium text-white">
                    {eventType.duration}m
                  </span>
                  {!eventType.isActive ? (
                    <span className="rounded-[6px] bg-[#2b2b2b] px-2.5 py-1 text-xs font-medium text-[#cfcfcf]">
                      Archived
                    </span>
                  ) : null}
                  {eventType.isHidden ? (
                    <span className="rounded-[6px] border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[#b8b8b8]">
                      Hidden
                    </span>
                  ) : null}
                  <span className="rounded-[6px] border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[#b8b8b8]">
                    {eventType._count?.bookings ?? 0} bookings
                  </span>
                </div>
                {eventType.description ? (
                  <p className="mt-4 max-w-2xl text-sm text-[#b8b8b8]">{eventType.description}</p>
                ) : null}
              </div>

              <div className="flex items-start gap-3 md:items-center">
                <button
                  type="button"
                  aria-label={eventType.isActive ? "Disable event type" : "Enable event type"}
                  disabled={toggleActiveMutation.isPending || deleteMutation.isPending}
                  onClick={() =>
                    toggleActiveMutation.mutate({
                      id: eventType.id,
                      isActive: !eventType.isActive
                    })
                  }
                  className={cn(
                    "relative mt-1 h-7 w-11 rounded-full border border-[var(--border)] transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]",
                    eventType.isActive ? "bg-white" : "bg-[#2a2a2a]"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-[3px] h-5 w-5 rounded-full transition-all duration-150",
                      eventType.isActive ? "left-[21px] bg-black" : "left-[3px] bg-white"
                    )}
                  />
                </button>

                <div className="flex flex-wrap gap-0 rounded-[10px] border border-[var(--border)]">
                  <Link
                    href={`/booking/${eventType.user?.username ?? "demo"}/${eventType.slug}`}
                    className="px-4 py-2 text-sm text-white transition hover:bg-[var(--panel-soft)]"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    className="border-l border-[var(--border)] px-4 py-2 text-sm text-white transition hover:bg-[var(--panel-soft)]"
                    onClick={() => {
                      setActiveEvent(eventType);
                      setModalOpen(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="border-l border-[var(--border)] px-4 py-2 text-sm text-[#fca5a5] transition hover:bg-[var(--panel-soft)]"
                    disabled={toggleActiveMutation.isPending || deleteMutation.isPending}
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Delete "${eventType.title}" permanently? This will also remove its bookings.`
                      );

                      if (confirmed) {
                        deleteMutation.mutate(eventType.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={activeEvent ? "Edit event type" : "Create event type"}
        description="Everything here maps directly to the backend validation rules."
      >
        <EventTypeForm eventType={activeEvent} onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
