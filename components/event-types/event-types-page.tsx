"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EventTypeForm } from "@/components/event-types/event-type-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ClockIcon,
  CopyIcon,
  DotsHorizontalIcon,
  EditIcon,
  ExternalLinkIcon,
  LinkIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon
} from "@/components/ui/icons";
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

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

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div>
      <PageHeader
        eyebrow="Event Types"
        title="Event types"
        description="Configure different events for people to book on your calendar."
        action={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Input
              type="search"
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
              <PlusIcon className="h-4 w-4" />
              New
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
                  <h2 className="truncate text-[15px] font-semibold text-white">{eventType.title}</h2>
                  <p className="truncate text-[14px] text-[#8f949d]">/{eventType.user?.username ?? "demo"}/{eventType.slug}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#303236] px-2.5 py-1 text-[12px] font-medium text-white">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {eventType.duration}m
                  </span>
                  {!eventType.isActive ? (
                    <span className="rounded-[6px] bg-[#2b2b2b] px-2.5 py-1 text-[12px] font-medium text-[#cfcfcf]">
                      Archived
                    </span>
                  ) : null}
                  {eventType.isHidden ? (
                    <span className="rounded-[6px] border border-[var(--border)] px-2.5 py-1 text-[12px] font-medium text-[#b8b8b8]">
                      Hidden
                    </span>
                  ) : null}
                  <span className="rounded-[6px] border border-[var(--border)] px-2.5 py-1 text-[12px] font-medium text-[#b8b8b8]">
                    {eventType._count?.bookings ?? 0} bookings
                  </span>
                </div>
                {eventType.description ? (
                  <p className="mt-4 max-w-2xl text-[14px] text-[#b8b8b8]">{eventType.description}</p>
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

                <div className="relative flex flex-wrap gap-0 rounded-[10px] border border-[var(--border)]">
                  <Link
                    href={`/booking/${eventType.user?.username ?? "demo"}/${eventType.slug}`}
                    className="px-3 py-2 text-sm text-white transition hover:bg-[var(--panel-soft)]"
                  >
                    <ExternalLinkIcon className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    className="border-l border-[var(--border)] px-3 py-2 text-sm text-white transition hover:bg-[var(--panel-soft)]"
                    onClick={() => {
                      navigator.clipboard?.writeText(`${window.location.origin}/booking/${eventType.user?.username ?? "demo"}/${eventType.slug}`);
                    }}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="border-l border-[var(--border)] px-3 py-2 text-sm text-white transition hover:bg-[var(--panel-soft)]"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId((current) => (current === eventType.id ? null : eventType.id));
                    }}
                  >
                    <DotsHorizontalIcon className="h-4 w-4" />
                  </button>
                  {openMenuId === eventType.id ? (
                    <div
                      className="absolute right-0 top-[calc(100%+4px)] z-10 min-w-[188px] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-panel)]"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] text-white hover:bg-[var(--panel-soft)]"
                        onClick={() => {
                          setActiveEvent(eventType);
                          setModalOpen(true);
                          setOpenMenuId(null);
                        }}
                      >
                        <EditIcon className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 border-t border-[var(--border)] px-4 py-3 text-left text-[14px] text-white hover:bg-[var(--panel-soft)]"
                        onClick={() => {
                          navigator.clipboard?.writeText(`${window.location.origin}/booking/${eventType.user?.username ?? "demo"}/${eventType.slug}`);
                          setOpenMenuId(null);
                        }}
                      >
                        <CopyIcon className="h-4 w-4" />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 border-t border-[var(--border)] px-4 py-3 text-left text-[14px] text-[#fca5a5] hover:bg-[var(--panel-soft)]"
                        disabled={toggleActiveMutation.isPending || deleteMutation.isPending}
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Delete "${eventType.title}" permanently? This will also remove its bookings.`
                          );

                          if (confirmed) {
                            deleteMutation.mutate(eventType.id);
                          }
                          setOpenMenuId(null);
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
      </div>

      <Card className="hidden self-end p-4 xl:block">
        <h3 className="text-[16px] font-semibold text-white">Try our Teams plan</h3>
        <p className="mt-2 text-[14px] leading-6 text-[#a1a1aa]">
          Remove Cal branding and get round robin scheduling + insights.
        </p>
        <div className="mt-4 flex gap-2">
          <Button size="sm">Try it for free</Button>
          <Button variant="secondary" size="sm">Learn more</Button>
        </div>
        <div className="mt-6 rounded-[12px] bg-white p-4 text-black">
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <span>Customer</span>
            <span>Support</span>
          </div>
          <div className="mt-5 rounded-[12px] border border-neutral-200 p-5 text-center">
            <p className="text-sm font-semibold text-neutral-900">This event is scheduled</p>
            <p className="mt-2 text-xs text-neutral-500">We emailed you and the other attendees a calendar invitation.</p>
          </div>
        </div>
      </Card>

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
