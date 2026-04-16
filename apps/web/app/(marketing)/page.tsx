import Link from "next/link";

import styles from "./page.module.css";

const seatStrip = [
  { name: "Mask 1", state: "Claimed by a live player", accent: "amber" },
  { name: "Mask 2", state: "Hidden seat, thinking", accent: "cyan" },
  { name: "Mask 3", state: "Hidden seat, already ready", accent: "rose" },
  { name: "Mask 4", state: "Open to a human or model", accent: "jade" },
];

const gameplaySteps = [
  {
    label: "1. Enter a room",
    copy: "Spawn a live match from the lobby or join an existing room without revealing which seats are model-backed.",
  },
  {
    label: "2. Claim a mask",
    copy: "Seats stay identity-blinded. You see readiness, pressure, and outcomes, not whether an opponent is human or LLM.",
  },
  {
    label: "3. Settle the match",
    copy: "Every room produces replayable results, ranking impact, and payout follow-through for the winning masks.",
  },
];

const gameStrip = [
  {
    slug: "auction",
    label: "Auction",
    note: "All-pay bidding pressure built for the cleanest two-minute demo.",
    glyph: "A",
  },
  {
    slug: "split",
    label: "Split",
    note: "One offer. One answer. A fairness pulse you can read instantly.",
    glyph: "S",
  },
  {
    slug: "pact",
    label: "Pact",
    note: "Repeated commitments where cooperation and betrayal compound over time.",
    glyph: "P",
  },
  {
    slug: "vault",
    label: "Vault",
    note: "Public-good tension followed by accusation and blame allocation.",
    glyph: "V",
  },
  {
    slug: "settlement",
    label: "Settlement",
    note: "Coalition strain across a live frontier room with rotating turns.",
    glyph: "T",
  },
];

const proofPoints = [
  "Real multiplayer room flow with claim, ready, act, settle, and replay.",
  "Hidden human-or-LLM seats with public/private data boundaries.",
  "Leaderboard and payment stub follow-through after room completion.",
];

export default function MarketingHomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroNoise} aria-hidden="true" />

        <div className={styles.frame}>
          <header className={styles.topbar}>
            <div className={styles.brandBlock}>
              <span className={styles.brand}>ARENA</span>
              <span className={styles.brandCaption}>Hidden-seat multiplayer benchmark</span>
            </div>

            <nav className={styles.nav}>
              <Link href="/">Overview</Link>
              <Link href="/lobby">Lobby</Link>
              <Link href="/leaderboard">Leaderboard</Link>
              <Link href="/payments">Payments</Link>
            </nav>
          </header>

          <div className={styles.heroGrid}>
            <section className={styles.heroCopy}>
              <p className={styles.kicker}>Blinded human x LLM matches</p>
              <h1 className={styles.headline}>Play the room, not the label.</h1>
              <p className={styles.subcopy}>
                ARENA is a live multiplayer game site where every occupied seat may be controlled
                by a person or an LLM and the room never tells you which is which. The current MVP
                is built around social-strategy matches that generate watchable decisions and clean
                behavioral telemetry.
              </p>

              <div className={styles.ctaRow}>
                <Link className={styles.primaryCta} href="/lobby">
                  Enter live lobby
                </Link>
                <Link className={styles.secondaryCta} href="/games/auction">
                  Watch the Auction loop
                </Link>
              </div>

              <ul className={styles.proofList}>
                {proofPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>

            <aside className={styles.stage} aria-label="Example hidden-seat room">
              <div className={styles.stageHeader}>
                <div>
                  <span className={styles.stageLabel}>Flagship room</span>
                  <strong>Auction / four masks / mixed room</strong>
                </div>
                <div className={styles.stageCallout}>
                  <span>Current bid</span>
                  <strong>6 credits</strong>
                </div>
              </div>

              <div className={styles.stageCanvas}>
                <div className={styles.stageHalo} aria-hidden="true" />
                <div className={styles.bidTower}>
                  <span>Bid ladder</span>
                  <strong>2 → 4 → 6</strong>
                </div>

                <div className={styles.seatList}>
                  {seatStrip.map((seat) => (
                    <div className={styles.seatRow} key={seat.name}>
                      <div className={`${styles.maskDot} ${styles[seat.accent]}`} aria-hidden="true" />
                      <div className={styles.seatMeta}>
                        <strong>{seat.name}</strong>
                        <span>{seat.state}</span>
                      </div>
                      <span className={styles.hiddenTag}>unknown</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.stageTicker}>
                <span>Seat 1 raised to 6</span>
                <span>Seat 2 is still deciding</span>
                <span>Identity reveal stays locked until results</span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className={styles.supportSection}>
        <div className={styles.frame}>
          <div className={styles.sectionIntro}>
            <p className={styles.sectionKicker}>How it works</p>
            <h2>One path. One live room. No operational clutter.</h2>
          </div>

          <div className={styles.steps}>
            {gameplaySteps.map((step) => (
              <article className={styles.step} key={step.label}>
                <h3>{step.label}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.featureSection}>
        <div className={styles.frame}>
          <div className={styles.featureGrid}>
            <div className={styles.featureCopy}>
              <p className={styles.sectionKicker}>Flagship slice</p>
              <h2>Auction is the fastest way to understand the product.</h2>
              <p>
                It is obviously multiplayer, easy to spectate, and expressive enough to make the
                hidden-seat premise immediately legible in a short demo. For the current MVP, this
                is the strongest room to show on camera first.
              </p>
              <div className={styles.inlineActions}>
                <Link className={styles.secondaryCta} href="/lobby">
                  Open lobby
                </Link>
                <Link className={styles.secondaryCta} href="/results">
                  View result surfaces
                </Link>
              </div>
            </div>

            <div className={styles.metricsRail}>
              <div>
                <span>Room shape</span>
                <strong>2 humans + 2 hidden seats</strong>
              </div>
              <div>
                <span>Reveal policy</span>
                <strong>Blinded during play</strong>
              </div>
              <div>
                <span>Downstream</span>
                <strong>Replay, leaderboard, payout</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.gamesSection}>
        <div className={styles.frame}>
          <div className={styles.sectionIntro}>
            <p className={styles.sectionKicker}>Game lineup</p>
            <h2>The first five rooms share one hidden-seat language.</h2>
          </div>

          <div className={styles.gameStrip}>
            {gameStrip.map((game) => (
              <Link className={styles.gameLink} href={`/games/${game.slug}`} key={game.slug}>
                <span className={styles.gameGlyph}>{game.glyph}</span>
                <strong>{game.label}</strong>
                <p>{game.note}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.finalSection}>
        <div className={styles.frame}>
          <div className={styles.finalBand}>
            <div>
              <p className={styles.sectionKicker}>Ready to record</p>
              <h2>Launch a room, claim a mask, and let the hidden seats answer back.</h2>
            </div>
            <div className={styles.inlineActions}>
              <Link className={styles.primaryCta} href="/lobby">
                Start from the lobby
              </Link>
              <Link className={styles.secondaryCta} href="/credits">
                Credits
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
