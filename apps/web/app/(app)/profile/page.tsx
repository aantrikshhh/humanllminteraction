import { ProfileShell } from "./ProfileShell";
import { getProfileSnapshot } from "./data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const snapshot = await getProfileSnapshot("demo-player");

  return <ProfileShell snapshot={snapshot} />;
}
