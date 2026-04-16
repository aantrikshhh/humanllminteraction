import { ProfileShell } from "../ProfileShell";
import { getProfileSnapshot } from "../data";

export const dynamic = "force-dynamic";

interface PlayerProfilePageProps {
  params: Promise<{
    playerId: string;
  }>;
}

export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const { playerId } = await params;
  const snapshot = await getProfileSnapshot(playerId);

  return <ProfileShell snapshot={snapshot} />;
}
