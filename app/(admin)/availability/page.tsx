import { AvailabilityEditor } from "@/components/availability/availability-editor";
import { AppShell } from "@/components/layout/app-shell";

export default function AvailabilityRoute() {
  return (
    <AppShell>
      <AvailabilityEditor />
    </AppShell>
  );
}
