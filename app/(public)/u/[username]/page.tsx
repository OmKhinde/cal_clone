import { PublicProfilePage } from "@/components/public/public-profile-page";

export default async function PublicProfileRoute({
  params
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return <PublicProfilePage username={username} />;
}
