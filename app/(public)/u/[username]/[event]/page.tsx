import { PublicBookingPage } from "@/components/booking/booking-page";

export default async function PublicEventRoute({
  params
}: {
  params: Promise<{ username: string; event: string }>;
}) {
  const { username, event } = await params;

  return <PublicBookingPage username={username} eventSlug={event} />;
}
