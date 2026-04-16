import { ManageBookingPage } from "@/components/booking/manage-page";

export default async function ManageBookingRoute({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <ManageBookingPage token={token} />;
}
