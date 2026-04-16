import type { SeatAssignment, SeatBackingType } from "@arena/contracts";
import {
  settlementBrief,
  settlementModule,
  type SettlementActionEnvelope,
} from "@arena/game-settlement";

function makeSeat(
  seatId: string,
  displayName: string,
  avatarId: string,
  backingType: SeatBackingType,
): SeatAssignment {
  return {
    publicSeat: {
      seatId,
      displayName,
      avatarId,
      isConnected: true,
      isReady: true,
    },
    privateSeat: {
      seatId,
      backingType,
    },
  };
}

function buildSampleState() {
  const seats = [
    makeSeat("s1", "Harbor Ward", "lantern", "human"),
    makeSeat("s2", "Stone Market", "brick", "llm"),
    makeSeat("s3", "Old Mill", "wheat", "human"),
    makeSeat("s4", "Hill Shrine", "banner", "scripted"),
  ];

  const actions: SettlementActionEnvelope[] = [
    {
      seatId: "s1",
      submittedAt: "2026-04-16T12:00:00.000Z",
      action: { type: "settlement.pledge", pledge: 2, stance: "fortify" },
    },
    {
      seatId: "s2",
      submittedAt: "2026-04-16T12:00:01.000Z",
      action: { type: "settlement.pledge", pledge: 2, stance: "trade" },
    },
    {
      seatId: "s3",
      submittedAt: "2026-04-16T12:00:02.000Z",
      action: { type: "settlement.pledge", pledge: 1, stance: "appease" },
    },
    {
      seatId: "s4",
      submittedAt: "2026-04-16T12:00:03.000Z",
      action: { type: "settlement.pledge", pledge: 3, stance: "fortify" },
    },
    {
      seatId: "s1",
      submittedAt: "2026-04-16T12:00:04.000Z",
      action: { type: "settlement.commit", contribution: 2 },
    },
    {
      seatId: "s2",
      submittedAt: "2026-04-16T12:00:05.000Z",
      action: { type: "settlement.commit", contribution: 2 },
    },
    {
      seatId: "s3",
      submittedAt: "2026-04-16T12:00:06.000Z",
      action: { type: "settlement.commit", contribution: 1 },
    },
    {
      seatId: "s4",
      submittedAt: "2026-04-16T12:00:07.000Z",
      action: { type: "settlement.commit", contribution: 3 },
    },
    {
      seatId: "s1",
      submittedAt: "2026-04-16T12:00:08.000Z",
      action: { type: "settlement.pledge", pledge: 1, stance: "trade" },
    },
    {
      seatId: "s2",
      submittedAt: "2026-04-16T12:00:09.000Z",
      action: { type: "settlement.pledge", pledge: 2, stance: "fortify" },
    },
    {
      seatId: "s3",
      submittedAt: "2026-04-16T12:00:10.000Z",
      action: { type: "settlement.pledge", pledge: 0, stance: "appease" },
    },
    {
      seatId: "s4",
      submittedAt: "2026-04-16T12:00:11.000Z",
      action: { type: "settlement.pledge", pledge: 2, stance: "fortify" },
    },
    {
      seatId: "s1",
      submittedAt: "2026-04-16T12:00:12.000Z",
      action: { type: "settlement.commit", contribution: 1 },
    },
    {
      seatId: "s2",
      submittedAt: "2026-04-16T12:00:13.000Z",
      action: { type: "settlement.commit", contribution: 2 },
    },
  ];

  let state = settlementModule.createInitialState("settlement-demo", seats);
  let nowIso = "2026-04-16T12:00:00.000Z";

  for (const action of actions) {
    const result = settlementModule.reduce({
      seed: "settlement-demo",
      nowIso,
      state,
      seats,
    }, action);
    state = result.nextState;
    nowIso = new Date(Date.parse(nowIso) + 1_000).toISOString();
  }

  return {
    publicState: settlementModule.projectPublicState(state, "s2"),
    seats,
  };
}

const boardStyle = {
  display: "grid",
  gap: "18px",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
} as const;

export default function SettlementGamePage() {
  const { publicState } = buildSampleState();

  return (
    <main className="app-shell">
      <div className="shell" style={{ display: "grid", gap: "24px" }}>
        <section
          className="workspace"
          style={{
            background:
              "linear-gradient(150deg, rgba(10, 24, 38, 0.96), rgba(6, 10, 16, 0.92))",
          }}
        >
          <div className="stack" style={{ gap: "18px" }}>
            <div
              className="eyebrow"
              style={{ marginBottom: 0 }}
            >
              Settlement Lite / hidden-seat multiplayer slice
            </div>
            <div style={boardStyle}>
              <div className="stack" style={{ gap: "12px", maxWidth: "40rem" }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display), serif",
                    fontSize: "clamp(2.6rem, 6vw, 4.8rem)",
                    lineHeight: 0.94,
                    letterSpacing: "-0.04em",
                  }}
                >
                  Public promises. Private relief. One village left standing.
                </h1>
                <p className="muted" style={{ fontSize: "1.02rem", lineHeight: 1.7 }}>
                  {settlementBrief.summary} This route intentionally renders a
                  deterministic sample board instead of fake transport. The room
                  still feels multiplayer because every seat can pledge out loud,
                  lock a hidden contribution, and reveal the round only after the
                  table commits.
                </p>
              </div>

              <div
                className="panel"
                style={{
                  minHeight: "100%",
                  display: "grid",
                  gap: "12px",
                  alignContent: "start",
                  background:
                    "linear-gradient(180deg, rgba(9, 17, 28, 0.92), rgba(12, 23, 38, 0.92))",
                }}
              >
                <div className="poster-label">Sample Room</div>
                <div style={{ fontSize: "1.3rem" }}>4 seats / viewer is Stone Market</div>
                <div className="muted">
                  Seat backing types remain server-side. This board only shows
                  public pledges, readiness, and which seats have locked the
                  current crisis.
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "10px",
                  }}
                >
                  <div className="panel">
                    <div className="poster-label">Round</div>
                    <strong>
                      {publicState.currentRound.index + 1} / {publicState.totalRounds}
                    </strong>
                  </div>
                  <div className="panel">
                    <div className="poster-label">Stability</div>
                    <strong>{publicState.stability}</strong>
                  </div>
                  <div className="panel">
                    <div className="poster-label">Current Turn</div>
                    <strong>{publicState.currentTurnSeatId ?? "Reveal"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={boardStyle}>
          <article className="workspace">
            <div className="stack">
              <div className="poster-label">Active Crisis</div>
              <h2 style={{ margin: 0 }}>{publicState.currentRound.title}</h2>
              <p className="muted" style={{ lineHeight: 1.7 }}>
                {publicState.currentRound.summary}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                <div className="panel">
                  <div className="poster-label">Scarcity</div>
                  <strong>{publicState.currentRound.scarcity}</strong>
                </div>
                <div className="panel">
                  <div className="poster-label">Threshold</div>
                  <strong>{publicState.currentRound.threshold}</strong>
                </div>
                <div className="panel">
                  <div className="poster-label">Locked Seats</div>
                  <strong>{publicState.currentRound.lockedSeatIds.length}</strong>
                </div>
              </div>

              <div className="stack">
                {publicState.currentRound.pledges.map((pledge) => (
                  <div
                    className="panel"
                    key={pledge.seatId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.1fr 0.8fr 0.8fr",
                      gap: "12px",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>{pledge.displayName}</strong>
                      <div className="muted">{pledge.seatId}</div>
                    </div>
                    <div>
                      <div className="poster-label">Public Pledge</div>
                      <strong>{pledge.pledge ?? "Pending"}</strong>
                    </div>
                    <div>
                      <div className="poster-label">Current Line</div>
                      <strong>{pledge.stance ?? "Waiting"}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="workspace">
            <div className="stack">
              <div className="poster-label">Seat Ledger</div>
              <h2 style={{ margin: 0 }}>What the room can actually see</h2>
              <p className="muted" style={{ lineHeight: 1.7 }}>
                Commitments stay hidden until a round resolves. The viewer only
                sees who has locked, current public pledges, and the revealed
                history from earlier crises.
              </p>
              <div className="stack">
                {publicState.seats.map((seat) => (
                  <div
                    className="panel"
                    key={seat.seatId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr repeat(4, minmax(0, 1fr))",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>{seat.displayName}</strong>
                      <div className="muted">
                        {seat.seatId} / {seat.hasCommittedThisRound ? "locked" : "waiting"}
                      </div>
                    </div>
                    <div>
                      <div className="poster-label">Visible Reserves</div>
                      <strong>{seat.visibleSuppliesRemaining}</strong>
                    </div>
                    <div>
                      <div className="poster-label">Prestige</div>
                      <strong>{seat.prestige}</strong>
                    </div>
                    <div>
                      <div className="poster-label">Honesty</div>
                      <strong>{seat.honesty}</strong>
                    </div>
                    <div>
                      <div className="poster-label">Viewer-only</div>
                      <strong>
                        {typeof seat.viewerPendingContribution === "number"
                          ? `locked ${seat.viewerPendingContribution}`
                          : "hidden"}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>

        <section style={boardStyle}>
          <article className="workspace">
            <div className="stack">
              <div className="poster-label">Resolved History</div>
              <h2 style={{ margin: 0 }}>Round reveals become the replay trail</h2>
              <div className="stack">
                {publicState.history.map((round) => (
                  <div
                    className="panel"
                    key={round.index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr repeat(3, minmax(0, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <strong>{round.title}</strong>
                      <div className="muted">{round.scarcity}</div>
                    </div>
                    <div>
                      <div className="poster-label">Outcome</div>
                      <strong>{round.success ? "Held" : "Collapsed"}</strong>
                    </div>
                    <div>
                      <div className="poster-label">Committed</div>
                      <strong>{round.totalContribution}</strong>
                    </div>
                    <div>
                      <div className="poster-label">Threshold</div>
                      <strong>{round.threshold}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="workspace">
            <div className="stack">
              <div className="poster-label">Why this MVP works</div>
              <h2 style={{ margin: 0 }}>Negotiation first, transport later</h2>
              <div className="panel">
                <strong>1. Public pledges create bluff pressure.</strong>
                <p className="muted" style={{ margin: "8px 0 0", lineHeight: 1.7 }}>
                  Every seat must say something in the clear before the hidden
                  commitment phase starts.
                </p>
              </div>
              <div className="panel">
                <strong>2. Hidden commitments protect the human-vs-LLM premise.</strong>
                <p className="muted" style={{ margin: "8px 0 0", lineHeight: 1.7 }}>
                  The room logic cares only about seat actions. Backing type never
                  appears in public state or replay payloads.
                </p>
              </div>
              <div className="panel">
                <strong>3. Round reveals produce a clean leaderboard and payout seam.</strong>
                <p className="muted" style={{ margin: "8px 0 0", lineHeight: 1.7 }}>
                  Each crisis resolves to explicit seat scores, broken pledges, and
                  contribution totals without pretending spatial movement is already
                  live.
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
