import Link from "next/link";

import { gameSuiteEntries, getGameSuiteEntry, type GameSuiteKey } from "./suite-data";
import styles from "./suite.module.css";

interface GameSuiteMastheadProps {
  currentGame: GameSuiteKey;
  statusLabel: string;
  statusDetail: string;
  primaryHref: string;
  primaryLabel: string;
}

export function GameSuiteMasthead({
  currentGame,
  statusLabel,
  statusDetail,
  primaryHref,
  primaryLabel,
}: GameSuiteMastheadProps) {
  const entry = getGameSuiteEntry(currentGame);

  return (
    <section
      className={styles.masthead}
      style={
        {
          "--suite-accent": entry.accent,
          "--suite-accent-soft": entry.accentSoft,
        } as React.CSSProperties
      }
    >
      <div className={styles.mastheadLead}>
        <div className={styles.iconPanel}>
          <div className={styles.iconFrame}>{entry.icon}</div>
          <div className={styles.iconCopy}>
            <p className={styles.kicker}>Turing Games suite</p>
            <h1 className={styles.title}>{entry.name}</h1>
            <p className={styles.tagline}>{entry.strapline}</p>
          </div>
        </div>

        <div className={styles.statusRail}>
          <div className={styles.statusCard}>
            <span>Current route</span>
            <strong>{entry.eyebrow}</strong>
            <p>{entry.demoLabel}</p>
          </div>
          <div className={styles.statusCard}>
            <span>Live room</span>
            <strong>{statusLabel}</strong>
            <p>{statusDetail}</p>
          </div>
        </div>
      </div>

      <div className={styles.actionRow}>
        <Link className="button primary" href={primaryHref}>
          {primaryLabel}
        </Link>
        <Link className="button" href="/games">
          Browse all games
        </Link>
        <Link className="button" href="/lobby">
          Open lobby
        </Link>
      </div>

      <nav className={styles.nav} aria-label="Turing Games">
        {gameSuiteEntries.map((candidate) => (
          <Link
            key={candidate.key}
            className={styles.navLink}
            data-active={candidate.key === currentGame || undefined}
            href={candidate.href}
          >
            <span className={styles.navIcon}>{candidate.icon}</span>
            <span>
              <strong>{candidate.name}</strong>
              <em>{candidate.eyebrow}</em>
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
