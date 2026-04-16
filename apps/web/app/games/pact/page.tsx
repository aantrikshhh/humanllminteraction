import type { SeatAssignment } from "@arena/contracts";
import { pactModule } from "@arena/game-pact";

function makeSeat(seatId: string, displayName: string): SeatAssignment {
  return {
    publicSeat: {
      seatId,
      displayName,
      avatarId: `${seatId}-avatar`,
      isConnected: true,
      isReady: true,
    },
    privateSeat: {
      seatId,
      backingType: "scripted",
    },
  };
}

function buildSampleState() {
  const seats = [makeSeat("seat-a", "Seat Alpha"), makeSeat("seat-b", "Seat Beta")];
  let state = pactModule.createInitialState("pact-route-seed", seats);
  let now = new Date("2026-01-01T00:00:00.000Z").getTime();

  const scriptedRounds: Array<[seatId: string, choice: "cooperate" | "betray"]> = [
    ["seat-a", "cooperate"],
    ["seat-b", "cooperate"],
    ["seat-a", "cooperate"],
    ["seat-b", "betray"],
    ["seat-a", "betray"],
    ["seat-b", "betray"],
    ["seat-a", "cooperate"],
    ["seat-b", "cooperate"],
    ["seat-a", "betray"],
    ["seat-b", "cooperate"],
    ["seat-a", "cooperate"],
  ];

  for (const [seatId, choice] of scriptedRounds) {
    state = pactModule.reduce(
      {
        seed: "pact-route-seed",
        nowIso: new Date(now).toISOString(),
        state,
        seats,
      },
      {
        seatId,
        submittedAt: new Date(now).toISOString(),
        action: { type: "pact.choose", choice },
      },
    ).nextState;

    now += 1_000;
  }

  return pactModule.projectPublicState(state);
}

const sampleState = buildSampleState();

export default function PactPage() {
  return (
    <main className="app-shell">
      <div className="shell app-grid">
        <aside className="sidebar">
          <div className="stack">
            <h2>The Pact</h2>
            <p className="muted">
              Two seats enter a 15-round trust duel. Some seats are human, some are
              LLM-backed, and the room never discloses which is which.
            </p>

            <div className="panel">
              <strong>Room rule</strong>
              <p className="muted">
                Each round is a simultaneous hidden commit. The UI only exposes how
                many choices are locked, never who locked first.
              </p>
            </div>

            <div className="panel">
              <strong>What this slice measures</strong>
              <p className="muted">
                Cooperation rate, retaliation after betrayal, forgiveness windows,
                and endgame defection pressure.
              </p>
            </div>
          </div>
        </aside>

        <section className="workspace">
          <div className="stack">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div className="stack">
                <h1>The Pact</h1>
                <p className="muted" style={{ maxWidth: "46rem" }}>
                  This route is intentionally thin: it demonstrates the public state
                  shape the real multiplayer room will project, with shared history,
                  running scores, and an unrevealed live round.
                </p>
              </div>

              <div className="panel" style={{ minWidth: "240px" }}>
                <strong>{sampleState.status}</strong>
                <p className="muted" style={{ marginTop: "8px" }}>
                  Commitments locked: {sampleState.commitmentCount} of 2
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 0.9fr)",
                gap: "18px",
              }}
            >
              <div className="panel">
                <div className="stack">
                  <strong>Sample room state</strong>
                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    {sampleState.seats.map((seat) => (
                      <div
                        key={seat.seatId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          padding: "14px 0",
                          borderBottom: "1px solid rgba(168, 203, 255, 0.12)",
                        }}
                      >
                        <div>
                          <strong>{seat.displayName}</strong>
                          <p className="muted" style={{ marginTop: "6px" }}>
                            Hidden-seat room identity preserved
                          </p>
                        </div>
                        <strong>{seat.score} pts</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="stack">
                  <strong>Payoff matrix</strong>
                  {sampleState.payoffLegend.map((row) => (
                    <div key={row.outcome} style={{ display: "grid", gap: "4px" }}>
                      <span>{row.label}</span>
                      <span className="muted">
                        Seat A {row.seatA} / Seat B {row.seatB}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="stack">
                <strong>Resolved history</strong>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {sampleState.history.map((round) => (
                    <div
                      key={round.round}
                      style={{
                        border: "1px solid rgba(168, 203, 255, 0.12)",
                        borderRadius: "16px",
                        padding: "14px",
                        background: "rgba(255, 255, 255, 0.02)",
                      }}
                    >
                      <strong>Round {round.round}</strong>
                      <p className="muted" style={{ marginTop: "8px" }}>
                        {round.outcomeCode}
                      </p>
                      <p className="muted">
                        Alpha {round.choices["seat-a"]} / Beta {round.choices["seat-b"]}
                      </p>
                      <p className="muted">
                        {round.cumulativeScores["seat-a"]} - {round.cumulativeScores["seat-b"]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
