import { getRoomsSnapshot } from "../../../lib/service-data";
import { GameSuiteMasthead } from "../GameSuiteMasthead";
import { settlementBrief, settlementModule } from "@arena/game-settlement";

import { SettlementDemo } from "./SettlementDemo";

export const dynamic = "force-dynamic";

export default async function SettlementGamePage() {
  const roomsSnapshot = await getRoomsSnapshot();
  const liveSettlementRoom = roomsSnapshot.data.find((room) => room.game === "settlement") ?? null;
  const statusLabel = liveSettlementRoom
    ? `Live room ${liveSettlementRoom.roomId.slice(0, 8)}`
    : "No live settlement room detected";
  const statusDetail = liveSettlementRoom
    ? `Phase ${liveSettlementRoom.phase} · round ${liveSettlementRoom.round} · ${liveSettlementRoom.seats.length} visible seats`
    : "Use the lobby to create a settlement room, then return here for the richer village simulation.";
  const primaryHref = liveSettlementRoom ? `/rooms/${liveSettlementRoom.roomId}` : "/lobby";
  const primaryLabel = liveSettlementRoom ? "Enter live settlement room" : "Create a settlement room";

  return (
    <main className="app-shell">
      <div className="shell" style={{ display: "grid", gap: "1.5rem" }}>
        <GameSuiteMasthead
          currentGame="settlement"
          statusLabel={statusLabel}
          statusDetail={statusDetail}
          primaryHref={primaryHref}
          primaryLabel={primaryLabel}
        />
        <SettlementDemo
          brief={settlementBrief}
          actionWindowSeconds={Math.floor(settlementModule.timers.actionMs / 1000)}
        />
      </div>
    </main>
  );
}
