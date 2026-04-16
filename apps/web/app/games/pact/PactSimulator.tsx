"use client";

import { useEffect, useRef, useState } from "react";

import type { SeatAssignment } from "@arena/contracts";
import {
  PACT_PAYOFF_MATRIX,
  PACT_TOTAL_ROUNDS,
  pactModule,
  type PactChoice,
  type PactPrivateState,
  type PactPublicState,
  type PactStrategySummary,
} from "@arena/game-pact";

import styles from "./pact.module.css";

type OpponentProfileKey = "tit_for_tat" | "grim_trigger" | "opportunist" | "always_betray";

interface OpponentProfile {
  key: OpponentProfileKey;
  label: string;
  summary: string;
}

const seatAssignments: SeatAssignment[] = [
  {
    publicSeat: {
      seatId: "seat_a",
      displayName: "Mask A",
      avatarId: "mask-amber",
      isConnected: true,
      isReady: true,
    },
    privateSeat: {
      seatId: "seat_a",
      backingType: "human",
    },
  },
  {
    publicSeat: {
      seatId: "seat_b",
      displayName: "Mask B",
      avatarId: "mask-cyan",
      isConnected: true,
      isReady: true,
    },
    privateSeat: {
      seatId: "seat_b",
      backingType: "llm",
      llmModelId: "pact-standalone-demo",
      promptVersionId: "pact-demo-v1",
    },
  },
];

const opponentProfiles: OpponentProfile[] = [
  {
    key: "tit_for_tat",
    label: "Tit for tat",
    summary: "Starts cooperative, then mirrors the last revealed move.",
  },
  {
    key: "grim_trigger",
    label: "Grim trigger",
    summary: "Stays cooperative until the first betrayal, then never reopens trust.",
  },
  {
    key: "opportunist",
    label: "Opportunist",
    summary: "Opens soft, then leans into exploitation once the table loosens.",
  },
  {
    key: "always_betray",
    label: "Always betray",
    summary: "Pure pressure test for retaliation and adaptation.",
  },
];

function createInitialState(seed: string): PactPrivateState {
  return pactModule.createInitialState(seed, seatAssignments);
}

function project(state: PactPrivateState): PactPublicState {
  return pactModule.projectPublicState(state);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return `${Math.round(value * 100)}%`;
}

function formatStrategyLabel(label: PactStrategySummary["label"] | undefined): string {
  return label ? label.replaceAll("_", " ") : "unclassified";
}

function pickOpponentChoice(
  profile: OpponentProfileKey,
  state: PactPrivateState,
): PactChoice {
  const history = state.history;
  const opponentHistory = history.map((round) => round.choices.seat_a);

  switch (profile) {
    case "always_betray":
      return "betray";
    case "opportunist":
      if (history.length === 0) {
        return "cooperate";
      }
      if (history.length >= 10) {
        return "betray";
      }
      return history.at(-1)?.outcomeCode === "CC" ? "betray" : "cooperate";
    case "grim_trigger":
      return opponentHistory.includes("betray") ? "betray" : "cooperate";
    case "tit_for_tat":
    default:
      return opponentHistory.at(-1) ?? "cooperate";
  }
}

function reduceChoice(
  state: PactPrivateState,
  seatId: "seat_a" | "seat_b",
  choice: PactChoice,
  nowIso: string,
): PactPrivateState {
  return pactModule.reduce(
    {
      seed: "pact-standalone",
      nowIso,
      state,
      seats: seatAssignments,
    },
    {
      seatId,
      submittedAt: nowIso,
      action: { type: "pact.choose", choice },
    },
  ).nextState;
}

export default function PactSimulator() {
  const [profile, setProfile] = useState<OpponentProfileKey>("tit_for_tat");
  const [state, setState] = useState<PactPrivateState>(() => createInitialState(`pact-${Date.now()}`));
  const [publicState, setPublicState] = useState<PactPublicState>(() => project(createInitialState("pact-initial")));
  const [pendingAgentChoice, setPendingAgentChoice] = useState<PactChoice | null>(null);
  const [pendingPlayerChoice, setPendingPlayerChoice] = useState<PactChoice | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const nextState = createInitialState(`pact-${profile}-${Date.now()}`);
    setState(nextState);
    setPublicState(project(nextState));
    setPendingAgentChoice(null);
    setPendingPlayerChoice(null);
  }, [profile]);

  useEffect(() => {
    setPublicState(project(state));
  }, [state]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const resetMatch = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const nextState = createInitialState(`pact-${profile}-${Date.now()}`);
    setState(nextState);
    setPublicState(project(nextState));
    setPendingAgentChoice(null);
    setPendingPlayerChoice(null);
  };

  const submitChoice = (choice: PactChoice) => {
    if (publicState.phase === "match_complete" || publicState.commitmentCount > 0) {
      return;
    }

    const submittedAt = new Date().toISOString();
    const afterPlayer = reduceChoice(state, "seat_a", choice, submittedAt);
    const agentChoice = pickOpponentChoice(profile, afterPlayer);

    setState(afterPlayer);
    setPendingPlayerChoice(choice);
    setPendingAgentChoice(agentChoice);

    timerRef.current = setTimeout(() => {
      const resolvedAt = new Date().toISOString();
      const afterAgent = reduceChoice(afterPlayer, "seat_b", agentChoice, resolvedAt);
      setState(afterAgent);
      setPendingPlayerChoice(null);
      setPendingAgentChoice(null);
      timerRef.current = null;
    }, 700);
  };

  const playerSeat = publicState.seats.find((seat) => seat.seatId === "seat_a");
  const opponentSeat = publicState.seats.find((seat) => seat.seatId === "seat_b");
  const latestRound = publicState.history.at(-1);
  const strategySummary = publicState.strategySummary ?? [];

  return (
    <section className={styles.simulatorSection}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionKicker}>Standalone demo loop</span>
        <h2>Play one full Pact match without leaving the page.</h2>
        <p className={styles.sectionCopy}>
          This is the real reducer, not a mock. Your click locks one hidden commitment, the opponent commits after a short veil,
          and the revealed ledger advances the same way the room runtime will.
        </p>
      </div>

      <div className={styles.simulatorGrid}>
        <div className={styles.simulatorStage}>
          <div className={styles.simulatorTopline}>
            <div>
              <span>Round status</span>
              <strong>
                {publicState.phase === "match_complete"
                  ? "Match complete"
                  : `Round ${publicState.currentRound} of ${PACT_TOTAL_ROUNDS}`}
              </strong>
            </div>
            <div>
              <span>Locked commitments</span>
              <strong>{publicState.commitmentCount}/2</strong>
            </div>
            <div>
              <span>Opponent profile</span>
              <strong>{opponentProfiles.find((item) => item.key === profile)?.label}</strong>
            </div>
          </div>

          <div className={styles.simulatorSeats}>
            <article className={styles.simulatorSeatCard}>
              <span>Your seat</span>
              <strong>{playerSeat?.displayName}</strong>
              <p>Visible score: {playerSeat?.score ?? 0}</p>
              <div className={styles.choiceRail}>
                <button
                  className="button primary"
                  disabled={publicState.phase === "match_complete" || publicState.commitmentCount > 0}
                  onClick={() => submitChoice("cooperate")}
                  type="button"
                >
                  Cooperate
                </button>
                <button
                  className="button"
                  disabled={publicState.phase === "match_complete" || publicState.commitmentCount > 0}
                  onClick={() => submitChoice("betray")}
                  type="button"
                >
                  Betray
                </button>
              </div>
              <p className={styles.simulatorNote}>
                {pendingPlayerChoice ? `Committed: ${pendingPlayerChoice}.` : "No live commitment yet."}
              </p>
            </article>

            <article className={styles.simulatorSeatCard}>
              <span>Hidden rival</span>
              <strong>{opponentSeat?.displayName}</strong>
              <p>Visible score: {opponentSeat?.score ?? 0}</p>
              <div className={styles.agentStatus}>
                <div className={styles.agentPulse} />
                <div>
                  <strong>{pendingAgentChoice ? "Choice locked in shadow" : "Waiting on your move"}</strong>
                  <p>{opponentProfiles.find((item) => item.key === profile)?.summary}</p>
                </div>
              </div>
            </article>
          </div>

          <div className={styles.revealCard}>
            <div>
              <span>Last reveal</span>
              <strong>{latestRound ? `Round ${latestRound.round} · ${latestRound.outcomeCode}` : "No resolved rounds yet"}</strong>
            </div>
            <p>
              {latestRound
                ? `Seat A ${latestRound.choices.seat_a}, Seat B ${latestRound.choices.seat_b}. Payoffs: ${latestRound.payoffs.seat_a}/${latestRound.payoffs.seat_b}.`
                : "The public rail shows only resolved outcomes. Pending choices stay hidden until both commitments land."}
            </p>
          </div>

          <div className={styles.roundLedger}>
            {publicState.history.length === 0 ? (
              <div className={styles.ledgerEmpty}>No rounds resolved yet. Lock one choice to start the trust filmstrip.</div>
            ) : (
              publicState.history.map((round) => (
                <article className={styles.ledgerRow} key={round.round}>
                  <div>
                    <span>R{round.round}</span>
                    <strong>{round.outcomeCode}</strong>
                  </div>
                  <p>
                    A:{round.choices.seat_a} / B:{round.choices.seat_b}
                  </p>
                  <p>
                    {round.cumulativeScores.seat_a} : {round.cumulativeScores.seat_b}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>

        <aside className={styles.simulatorSidebar}>
          <section className={styles.controlPanel}>
            <div className={styles.controlHeader}>
              <span>Opponent selector</span>
              <strong>Swap the hidden strategy</strong>
            </div>
            <div className={styles.profileList}>
              {opponentProfiles.map((item) => (
                <button
                  className={item.key === profile ? styles.profileButtonActive : styles.profileButton}
                  key={item.key}
                  onClick={() => setProfile(item.key)}
                  type="button"
                >
                  <strong>{item.label}</strong>
                  <span>{item.summary}</span>
                </button>
              ))}
            </div>
            <button className="button" onClick={resetMatch} type="button">
              Reset match
            </button>
          </section>

          <section className={styles.controlPanel}>
            <div className={styles.controlHeader}>
              <span>Payoff legend</span>
              <strong>One matrix, repeated fifteen times</strong>
            </div>
            <div className={styles.payoffTable}>
              {Object.entries(PACT_PAYOFF_MATRIX).map(([outcome, payoff]) => (
                <div className={styles.payoffRow} key={outcome}>
                  <span>{outcome}</span>
                  <strong>
                    {payoff.seatA} / {payoff.seatB}
                  </strong>
                  <p>{payoff.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.controlPanel}>
            <div className={styles.controlHeader}>
              <span>Terminal strategy read</span>
              <strong>Behavioral fingerprint after the final round</strong>
            </div>
            <div className={styles.summaryList}>
              {strategySummary.length === 0 ? (
                <div className={styles.pendingSummary}>Complete the match to unlock cooperation, retaliation, and forgiveness metrics.</div>
              ) : (
                strategySummary.map((summary) => (
                  <article className={styles.summaryCard} key={summary.seatId}>
                    <span>{summary.seatId === "seat_a" ? "Your seat" : "Hidden rival"}</span>
                    <strong>{formatStrategyLabel(summary.label)}</strong>
                    <p>
                      {formatPercent(summary.cooperationRate)} cooperation · {formatPercent(summary.forgivenessRate)} forgiveness ·{" "}
                      {formatPercent(summary.endgameBetrayalRate)} endgame betrayal
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
