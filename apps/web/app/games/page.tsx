import Link from "next/link";

import styles from "./suite.module.css";
import { gameSuiteEntries } from "./suite-data";

export default function GamesPage() {
  return (
    <main className={`app-shell ${styles.page}`}>
      <div className={`shell ${styles.stack}`}>
        <section className={styles.overviewHero}>
          <div className={styles.overviewCopy}>
            <p className={styles.kicker}>ARENA playable suite</p>
            <h1 className={styles.overviewTitle}>Five games, one hidden-seat protocol.</h1>
            <p className={styles.overviewBody}>
              Start with Auction for the cleanest live multiplayer demo. The rest of the suite
              expands the same masked-seat idea into fairness, trust, public-goods blame, and
              village coordination without changing the core room logic.
            </p>
          </div>

          <div className={styles.overviewActions}>
            <Link className="button primary" href="/games/auction">
              Start with Auction
            </Link>
            <Link className="button" href="/lobby">
              Open lobby
            </Link>
          </div>
        </section>

        <section className={styles.cardGrid}>
          {gameSuiteEntries.map((entry) => (
            <article
              className={styles.gameCard}
              key={entry.key}
              style={
                {
                  "--suite-accent": entry.accent,
                  "--suite-accent-soft": entry.accentSoft,
                } as React.CSSProperties
              }
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>{entry.icon}</div>
                <div>
                  <p className={styles.cardEyebrow}>{entry.eyebrow}</p>
                  <h2>{entry.name}</h2>
                </div>
              </div>
              <p className={styles.cardBody}>{entry.strapline}</p>
              <div className={styles.cardMeta}>{entry.demoLabel}</div>
              <div className={styles.cardActions}>
                <Link className="button primary" href={entry.href}>
                  Open {entry.name}
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
