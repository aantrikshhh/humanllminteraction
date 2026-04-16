import { settlementBrief, settlementModule } from "@arena/game-settlement";

import { SettlementDemo } from "./SettlementDemo";

export default function SettlementGamePage() {
  return (
    <SettlementDemo
      brief={settlementBrief}
      actionWindowSeconds={Math.floor(settlementModule.timers.actionMs / 1000)}
    />
  );
}
