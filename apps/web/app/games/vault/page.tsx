import Link from "next/link";

const seatRows = [
  {
    seatId: "s1",
    displayName: "Seat 1",
    totalScore: 2_900,
    roundsPlayed: 5,
    correctDetections: 3,
    timesFlagged: 1,
    state: "Contribution locked",
  },
  {
    seatId: "s2",
    displayName: "Seat 2",
    totalScore: 3_100,
    roundsPlayed: 5,
    correctDetections: 4,
    timesFlagged: 0,
    state: "Accusation pending",
  },
  {
    seatId: "s3",
    displayName: "Seat 3",
    totalScore: 3_450,
    roundsPlayed: 5,
    correctDetections: 2,
    timesFlagged: 2,
    state: "Accusation pending",
  },
  {
    seatId: "s4",
    displayName: "Seat 4",
    totalScore: 2_780,
    roundsPlayed: 5,
    correctDetections: 3,
    timesFlagged: 1,
    state: "Contribution locked",
  },
];

const roundTrail = [
  {
    label: "Pool reveal",
    value: "1,240 credits in vault / 620 back to every seat",
  },
  {
    label: "Detection target",
    value: "Lowest contribution has not been revealed yet",
  },
  {
    label: "Viewer state",
    value: "You contributed 180 and have not cast an accusation",
  },
];

const lastResolved = {
  roundNumber: 5,
  lowestSeatIds: ["Seat 3"],
  correctAccusers: ["Seat 1", "Seat 2", "Seat 4"],
  penalized: ["Seat 3"],
};

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(168, 203, 255, 0.16)",
  background: "rgba(7, 15, 27, 0.86)",
  borderRadius: 26,
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.28)",
  backdropFilter: "blur(14px)",
};

export default function VaultGamePage() {
  return (
    <main
      className="app-shell"
      style={{
        background:
          "radial-gradient(circle at 15% 15%, rgba(255, 222, 145, 0.2), transparent 22%), radial-gradient(circle at 82% 18%, rgba(108, 242, 200, 0.12), transparent 20%), linear-gradient(180deg, #09111c 0%, #04080f 100%)",
      }}
    >
      <div className="shell" style={{ display: "grid", gap: 24 }}>
        <section
          style={{
            ...panelStyle,
            overflow: "hidden",
            position: "relative",
            padding: "28px 28px 32px",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "auto -12% -30% 45%",
              height: 260,
              background:
                "radial-gradient(circle, rgba(255, 211, 120, 0.22), transparent 62%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.95fr)",
              gap: 28,
              alignItems: "stretch",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
              <div
                style={{
                  color: "var(--accent)",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  fontSize: "0.78rem",
                }}
              >
                The Vault / Hidden human-or-LLM seats
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display), serif",
                    fontSize: "clamp(2.8rem, 6vw, 5.2rem)",
                    lineHeight: 0.96,
                    letterSpacing: "-0.04em",
                  }}
                >
                  Build the pool. Then decide who held back.
                </h1>
                <p
                  style={{
                    margin: 0,
                    maxWidth: 560,
                    color: "var(--muted)",
                    lineHeight: 1.7,
                    fontSize: "1.02rem",
                  }}
                >
                  Each round starts with a private endowment. Everyone chooses
                  how much to lock into the vault, the room sees only the pooled
                  return, and then every seat has to accuse the weakest
                  contributor without knowing who is human and who is model-backed.
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <Link className="button primary" href="/lobby">
                  Back to lobby
                </Link>
                <a className="button" href="#vault-sample">
                  Inspect sample room state
                </a>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                {[
                  { label: "Seats", value: "4-6" },
                  { label: "Rounds", value: "8" },
                  { label: "Reveal rule", value: "Pool totals first" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 18,
                      padding: "14px 16px",
                      background: "rgba(255, 255, 255, 0.03)",
                    }}
                  >
                    <div style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                      {stat.label}
                    </div>
                    <div style={{ marginTop: 6, fontSize: "1.05rem" }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <aside
              id="vault-sample"
              style={{
                ...panelStyle,
                padding: 22,
                display: "grid",
                gap: 16,
                background:
                  "linear-gradient(180deg, rgba(13, 26, 43, 0.94), rgba(6, 12, 22, 0.94))",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div className="poster-label">Sample Live Room</div>
                  <div className="poster-value">Round 6 / accusation window</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="poster-label">Vault Return</div>
                  <div className="poster-value">620 per seat</div>
                </div>
              </div>

              <div
                style={{
                  borderRadius: 22,
                  padding: 18,
                  border: "1px solid rgba(255, 211, 120, 0.22)",
                  background:
                    "linear-gradient(135deg, rgba(255, 211, 120, 0.14), rgba(82, 213, 255, 0.08))",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    color: "var(--muted)",
                    fontSize: "0.88rem",
                  }}
                >
                  <span>Contribution status</span>
                  <span>4 / 4 locked</span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "rgba(255, 255, 255, 0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background:
                        "linear-gradient(90deg, rgba(255, 211, 120, 0.85), rgba(108, 242, 200, 0.85))",
                    }}
                  />
                </div>
                <div style={{ fontSize: "1.7rem", fontWeight: 700 }}>1,240 credits in vault</div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {seatRows.map((seat) => (
                  <div
                    key={seat.seatId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 14,
                      alignItems: "center",
                      padding: "14px 16px",
                      borderRadius: 18,
                      border: "1px solid rgba(168, 203, 255, 0.1)",
                      background: "rgba(255, 255, 255, 0.025)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{seat.displayName}</div>
                      <div
                        style={{
                          color: "var(--muted)",
                          fontSize: "0.9rem",
                          marginTop: 4,
                        }}
                      >
                        {seat.state}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 128 }}>
                      <div style={{ fontSize: "1.02rem" }}>{seat.totalScore} pts</div>
                      <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 4 }}>
                        {seat.correctDetections} correct / {seat.timesFlagged} flagged
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {roundTrail.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "grid",
                      gap: 4,
                      paddingBottom: 10,
                      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{item.label}</div>
                    <div>{item.value}</div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 20,
          }}
        >
          <article style={{ ...panelStyle, padding: 24, display: "grid", gap: 16 }}>
            <div className="poster-label">Round Structure</div>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                "Every seat starts each round with 500 credits and submits a private contribution from 0 to 500.",
                "The vault doubles the pooled amount and redistributes it equally across all seats.",
                "Only after the pool reveal does the room accuse the weakest contributor.",
                "Correct accusations earn a bonus, and correctly flagged free-riders take a penalty.",
              ].map((line, index) => (
                <div
                  key={line}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px minmax(0, 1fr)",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "rgba(255, 211, 120, 0.18)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "0.8rem",
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ color: "var(--muted)", lineHeight: 1.7 }}>{line}</div>
                </div>
              ))}
            </div>
          </article>

          <article style={{ ...panelStyle, padding: 24, display: "grid", gap: 16 }}>
            <div className="poster-label">Latest Resolved Round</div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                Round {lastResolved.roundNumber}
              </div>
              <div style={{ color: "var(--muted)", lineHeight: 1.7 }}>
                The room previously converged on {lastResolved.lowestSeatIds.join(", ")} as the
                weakest contributor. The correct accusers were {lastResolved.correctAccusers.join(", ")}.
              </div>
              <div
                style={{
                  borderRadius: 18,
                  padding: "14px 16px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(168, 203, 255, 0.08)",
                }}
              >
                <div style={{ color: "var(--muted)", fontSize: "0.84rem" }}>Penalty applied</div>
                <div style={{ marginTop: 6 }}>{lastResolved.penalized.join(", ")}</div>
              </div>
              <div
                style={{
                  color: "var(--muted)",
                  lineHeight: 1.7,
                }}
              >
                The public page stays blind to seat backing type. The point of
                the room is reading contribution behavior, not reading a model badge.
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
