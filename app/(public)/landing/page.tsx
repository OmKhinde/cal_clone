import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-8 sm:p-12">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-[#8f8f8f]">Cal Clone</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
            Scheduling with a dark, focused interface that stays honest to the backend.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#b8b8b8]">
            Event types, weekly availability, public booking, and booking operations are all wired to the existing Express + Prisma API.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button size="lg">Open dashboard</Button>
            </Link>
            <Link href="/booking/demo/30min">
              <Button variant="secondary" size="lg">Try public booking</Button>
            </Link>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              ["Unified theme", "Shared colors, typography, and surfaces across admin and public flows."],
              ["Readable states", "Higher contrast text, clearer hierarchy, and consistent interactive feedback."],
              ["Responsive polish", "Cards, forms, and scheduling layouts stay aligned from mobile to desktop."]
            ].map(([title, description]) => (
              <div key={title} className="rounded-[16px] border border-[var(--border)] bg-[var(--panel-muted)] p-5">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#b8b8b8]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
