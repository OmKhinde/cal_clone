import { PublicBookingPage } from "@/components/booking/booking-page";

export default async function BookingRoute({
  params
}: {
  params: Promise<{ username: string; event: string }>;
}) {
  const { username, event } = await params;

  return <PublicBookingPage username={username} eventSlug={event} />;
}
