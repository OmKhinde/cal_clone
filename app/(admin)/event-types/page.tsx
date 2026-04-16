import { EventTypesPage } from "@/components/event-types/event-types-page";
import { AppShell } from "@/components/layout/app-shell";

export default function EventTypesRoute() {
  return (
    <AppShell>
      <EventTypesPage />
    </AppShell>
  );
}
