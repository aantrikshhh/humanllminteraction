import type { SeatAssignment } from "@arena/contracts";
import { splitBrief, splitModule } from "@arena/game-split";

function makeSeat(
  seatId: string,
  displayName: string,
  avatarId: string,
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
      backingType: "llm",
    },
  };
}

function buildSampleState() {
  const seats = [
    makeSeat("seat_a", "Seat A", "amber-mask"),
    makeSeat("seat_b", "Seat B", "teal-mask"),
  ];

  let state = splitModule.createInitialState("split-demo-seed", seats);

  state = splitModule.reduce(
    {
      seed: "split-demo-seed",
      nowIso: "2026-04-16T10:00:00.000Z",
      state,
      seats,
    },
    {
      seatId: "seat_a",
      submittedAt: "2026-04-16T10:00:00.000Z",
      action: { type: "split.offer", amount: 35 },
    },
  ).nextState;

  state = splitModule.reduce(
    {
      seed: "split-demo-seed",
      nowIso: "2026-04-16T10:00:01.000Z",
      state,
      seats,
    },
    {
      seatId: "seat_b",
      submittedAt: "2026-04-16T10:00:01.000Z",
      action: { type: "split.accept" },
    },
  ).nextState;

  state = splitModule.reduce(
    {
      seed: "split-demo-seed",
      nowIso: "2026-04-16T10:00:02.000Z",
      state,
      seats,
    },
    {
      seatId: "seat_b",
      submittedAt: "2026-04-16T10:00:02.000Z",
      action: { type: "split.offer", amount: 22 },
    },
  ).nextState;

  return splitModule.projectPublicState(state, "seat_a");
}

const sample = buildSampleState();

const shellStyle: React.CSSProperties = {
  width: "min(1120px, calc(100vw - 40px))",
  margin: "0 auto",
  display: "grid",
  gap: "24px",
};

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(168, 203, 255, 0.14)",
  borderRadius: 24,
  background:
    "linear-gradient(180deg, rgba(10, 21, 36, 0.94), rgba(6, 11, 19, 0.96))",
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.32)",
  padding: 24,
};

const metricStyle: React.CSSProperties = {
  border: "1px solid rgba(168, 203, 255, 0.12)",
  borderRadius: 18,
  padding: 16,
  background: "rgba(255, 255, 255, 0.02)",
};

export default function SplitPage() {
  return (
    <main className="app-shell">
      <div style={shellStyle}>
        <section
          style={{
            ...panelStyle,
            display: "grid",
            gap: 20,
            background:
              "radial-gradient(circle at top right, rgba(108, 242, 200, 0.12), transparent 24%), linear-gradient(180deg, rgba(10, 21, 36, 0.95), rgba(6, 11, 19, 0.98))",
          }}
        >
          <div className="stack">
            <span className="eyebrow">Game Slice</span>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-display), serif",
                fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
                lineHeight: 0.94,
                letterSpacing: "-0.04em",
              }}
            >
              {splitBrief.title}
            </h1>
            <p className="muted" style={{ maxWidth: 760, fontSize: "1.05rem", lineHeight: 1.7 }}>
              {splitBrief.summary} One seat proposes the cut, the other can accept
              or burn the whole pot. Roles alternate, scores persist, and the room
              never reveals who is human.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            <div style={metricStyle}>
              <div className="muted">Pot Per Round</div>
              <strong style={{ fontSize: "1.65rem" }}>{sample.potTotal}</strong>
            </div>
            <div style={metricStyle}>
              <div className="muted">Current Round</div>
              <strong style={{ fontSize: "1.65rem" }}>
                {sample.currentRound} / {sample.maxRounds}
              </strong>
            </div>
            <div style={metricStyle}>
              <div className="muted">Viewer Role</div>
              <strong style={{ fontSize: "1.65rem", textTransform: "capitalize" }}>
                {sample.viewerRole ?? "observer"}
              </strong>
            </div>
            <div style={metricStyle}>
              <div className="muted">Tension Index</div>
              <strong style={{ fontSize: "1.65rem" }}>{sample.tensionIndex}</strong>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 0.9fr)",
            gap: 24,
          }}
        >
          <div style={{ ...panelStyle, display: "grid", gap: 16 }}>
            <div className="stack">
              <h2 style={{ margin: 0 }}>Live Public State</h2>
              <p className="muted" style={{ margin: 0 }}>
                This route is intentionally transport-agnostic. It renders the exact
                public-state shape that a room server can stream later.
              </p>
            </div>

            <div
              style={{
                border: "1px solid rgba(168, 203, 255, 0.1)",
                borderRadius: 20,
                padding: 18,
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <div className="muted" style={{ marginBottom: 10 }}>
                Narrative
              </div>
              <strong style={{ fontSize: "1.1rem" }}>{sample.narrative}</strong>
              {sample.pendingOffer ? (
                <div
                  style={{
                    marginTop: 18,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div style={metricStyle}>
                    <div className="muted">Responder Take</div>
                    <strong style={{ fontSize: "1.6rem" }}>
                      {sample.pendingOffer.amountToResponder}
                    </strong>
                  </div>
                  <div style={metricStyle}>
                    <div className="muted">Proposer Keep</div>
                    <strong style={{ fontSize: "1.6rem" }}>
                      {sample.pendingOffer.amountToProposer}
                    </strong>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {sample.seats.map((seat) => (
                <article
                  key={seat.seatId}
                  style={{
                    border: "1px solid rgba(168, 203, 255, 0.12)",
                    borderRadius: 20,
                    padding: 18,
                    background:
                      seat.role === "proposer"
                        ? "linear-gradient(135deg, rgba(82, 213, 255, 0.11), rgba(255, 255, 255, 0.02))"
                        : "linear-gradient(135deg, rgba(108, 242, 200, 0.12), rgba(255, 255, 255, 0.02))",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ display: "block", fontSize: "1.1rem" }}>
                        {seat.displayName}
                      </strong>
                      <span className="muted" style={{ fontSize: ".92rem" }}>
                        {seat.seatId}
                      </span>
                    </div>
                    <span
                      style={{
                        border: "1px solid rgba(108, 242, 200, 0.24)",
                        borderRadius: 999,
                        padding: "8px 12px",
                        textTransform: "uppercase",
                        letterSpacing: ".08em",
                        fontSize: ".75rem",
                      }}
                    >
                      {seat.role}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    <div style={metricStyle}>
                      <div className="muted">Score</div>
                      <strong>{seat.cumulativeScore}</strong>
                    </div>
                    <div style={metricStyle}>
                      <div className="muted">Accepted</div>
                      <strong>{seat.acceptedCount}</strong>
                    </div>
                    <div style={metricStyle}>
                      <div className="muted">Rejected</div>
                      <strong>{seat.rejectedCount}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div style={{ ...panelStyle, display: "grid", gap: 16 }}>
            <div className="stack">
              <h2 style={{ margin: 0 }}>History</h2>
              <p className="muted" style={{ margin: 0 }}>
                Accepted and rejected rounds remain visible. Seat identity stays
                masked at the transport level, but strategic behavior still reads
                clearly to observers.
              </p>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {sample.history.map((entry) => (
                <div
                  key={entry.roundNumber}
                  style={{
                    border: "1px solid rgba(168, 203, 255, 0.12)",
                    borderRadius: 18,
                    padding: 16,
                    background: "rgba(255, 255, 255, 0.02)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <strong>Round {entry.roundNumber}</strong>
                    <span
                      style={{
                        color:
                          entry.decision === "accepted"
                            ? "var(--accent)"
                            : "var(--danger)",
                        textTransform: "uppercase",
                        letterSpacing: ".08em",
                        fontSize: ".75rem",
                      }}
                    >
                      {entry.decision}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: ".95rem" }}>
                    {entry.proposerSeatId} offered {entry.amountToResponder} to{" "}
                    {entry.responderSeatId} ({Math.round(entry.offerShare * 100)}% of
                    the pot).
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    <div style={metricStyle}>
                      <div className="muted">Proposer Delta</div>
                      <strong>{entry.proposerDelta}</strong>
                    </div>
                    <div style={metricStyle}>
                      <div className="muted">Responder Delta</div>
                      <strong>{entry.responderDelta}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...metricStyle, lineHeight: 1.7 }}>
              <strong>Implementation note</strong>
              <p className="muted" style={{ margin: "8px 0 0" }}>
                The public state intentionally carries role, offer, score, and history
                only. Human-vs-LLM backing remains private metadata on the room server.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
