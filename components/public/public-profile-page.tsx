"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { ClockIcon, ExternalLinkIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api/client";

function createAvatarUrl(name: string, username: string) {
  const seed = encodeURIComponent(`${name}-${username}`);
  return `https://api.dicebear.com/9.x/glass/svg?seed=${seed}`;
}

export function PublicProfilePage({ username }: { username: string }) {
  const profileQuery = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => api.getPublicProfile(username)
  });

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] px-4 py-8">
        <div className="mx-auto grid max-w-[760px] gap-6">
          <Skeleton className="h-40 w-full rounded-[24px]" />
          <Skeleton className="h-72 w-full rounded-[24px]" />
        </div>
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
        <Card className="w-full p-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Public page not found</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            We could not find a public profile for this username.
          </p>
        </Card>
      </div>
    );
  }

  const profile = profileQuery.data;
  const avatarUrl = createAvatarUrl(profile.name, profile.username);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1a1d22,transparent_35%),var(--background)] px-4 py-8 sm:py-12">
      <div className="mx-auto grid max-w-[760px] gap-6">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <img
              src={avatarUrl}
              alt={`${profile.name} profile`}
              className="h-16 w-16 rounded-full border border-[var(--border)] bg-[var(--panel-muted)] object-cover"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--muted)]">@{profile.username}</p>
              <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                {profile.name}
              </h1>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Available Events
            </p>
          </div>

          {profile.events.length ? (
            <div>
              {profile.events.map((event, index) => (
                <Link
                  key={event.id}
                  href={`/u/${profile.username}/${event.slug}`}
                  className="group flex items-center justify-between gap-4 px-5 py-5 transition hover:bg-[var(--panel-soft)] sm:px-6"
                >
                  <div className={index < profile.events.length - 1 ? "pb-0" : ""}>
                    <p className="text-lg font-semibold text-[var(--foreground)]">{event.title}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)]">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {event.duration}m
                      </span>
                      {event.description ? (
                        <span className="text-sm text-[var(--muted)]">{event.description}</span>
                      ) : null}
                    </div>
                  </div>
                  <ExternalLinkIcon className="h-5 w-5 shrink-0 text-[var(--muted)] transition group-hover:text-[var(--foreground)]" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-sm text-[var(--muted)] sm:px-6">
              No public event types are active for this profile yet.
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
