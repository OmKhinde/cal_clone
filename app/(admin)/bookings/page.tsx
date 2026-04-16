import { BookingsPage } from "@/components/bookings/bookings-page";
import { AppShell } from "@/components/layout/app-shell";

export default function BookingsRoute() {
  return (
    <AppShell>
      <BookingsPage />
    </AppShell>
  );
}
