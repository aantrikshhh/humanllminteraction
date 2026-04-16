"use client";

import { startTransition, useEffect, useState, type CSSProperties } from "react";

import type { ReplayEvent, SeatAssignment, SeatBackingType, SeatId } from "@arena/contracts";
import {
  SETTLEMENT_STANCES,
  settlementModule,
  type SettlementAction,
  type SettlementActionEnvelope,
  type SettlementBrief,
  type SettlementPrivateState,
  type SettlementStance,
} from "@arena/game-settlement";

import styles from "./settlement.module.css";

type DemoSeatProfile = {
  seatId: SeatId;
  displayName: string;
  avatarId: string;
  backingType: SeatBackingType;
  district: string;
  temperament: "steady" | "opportunist" | "honest" | "clutch";
  summary: string;
  hue: string;
};

type DemoSession = {
  state: SettlementPrivateState;
  replay: ReplayEvent[];
  actionStep: number;
};

const DEMO_VIEWER_SEAT_ID = "seat_1";
const DEMO_SEED = "settlement-route-demo";
const DEMO_START_ISO = Date.parse("2026-04-16T19:30:00.000Z");

const seatProfiles: DemoSeatProfile[] = [
  {
    seatId: "seat_1",
    displayName: "Harbor Ward",
    avatarId: "harbor",
    backingType: "human",
    district: "Outer quay lantern district",
    temperament: "steady",
    summary: "Reliable defenders who keep reserves for the last reveal.",
    hue: "#f4b259",
  },
  {
    seatId: "seat_2",
    displayName: "Stone Market",
    avatarId: "market",
    backingType: "llm",
    district: "Merchants and lift crews",
    temperament: "opportunist",
    summary: "Publicly generous, privately looking for cover from the table.",
    hue: "#72c4b3",
  },
  {
    seatId: "seat_3",
    displayName: "Old Mill",
    avatarId: "mill",
    backingType: "human",
    district: "Granary ridge and mill wheel",
    temperament: "honest",
    summary: "Usually honors pledges even when the board turns ugly.",
    hue: "#8ebf64",
  },
  {
    seatId: "seat_4",
    displayName: "Hill Shrine",
    avatarId: "shrine",
    backingType: "scripted",
    district: "Upper terraces and signal fires",
    temperament: "clutch",
    summary: "Holds back until the exact moment a round needs saving.",
    hue: "#d97863",
  },
];

const seatAssignments: SeatAssignment[] = seatProfiles.map((seat) =>
  createSeatAssignment(seat),
);

function createSeatAssignment(seat: DemoSeatProfile): SeatAssignment {
  return {
    publicSeat: {
      seatId: seat.seatId,
      displayName: seat.displayName,
      avatarId: seat.avatarId,
      isConnected: true,
      isReady: true,
    },
    privateSeat: {
      seatId: seat.seatId,
      backingType: seat.backingType,
    },
  };
}

function createInitialSession(): DemoSession {
  return {
    state: settlementModule.createInitialState(DEMO_SEED, seatAssignments),
    replay: [],
    actionStep: 0,
  };
}

function getActionIso(actionStep: number): string {
  return new Date(DEMO_START_ISO + actionStep * 1000).toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSeatProfile(seatId: SeatId): DemoSeatProfile {
  const profile = seatProfiles.find((candidate) => candidate.seatId === seatId);
  if (!profile) {
    throw new Error(`Unknown settlement demo seat: ${seatId}`);
  }
  return profile;
}

function applyAction(session: DemoSession, action: SettlementActionEnvelope): DemoSession {
  const nowIso = getActionIso(session.actionStep);
  const result = settlementModule.reduce(
    {
      seed: DEMO_SEED,
      nowIso,
      state: session.state,
      seats: seatAssignments,
    },
    {
      ...action,
      submittedAt: nowIso,
    },
  );

  return {
    state: result.nextState,
    replay: [...session.replay, ...result.events],
    actionStep: session.actionStep + 1,
  };
}

function chooseAutomatedAction(
  state: SettlementPrivateState,
  seatId: SeatId,
): SettlementAction {
  const round = state.rounds[state.roundIndex];
  if (!round) {
    throw new Error("Settlement round is missing.");
  }

  const seat = state.seats.find((candidate) => candidate.seatId === seatId);
  if (!seat) {
    throw new Error(`Unknown settlement seat: ${seatId}`);
  }

  const profile = getSeatProfile(seatId);
  const maxContribution = Math.min(round.config.maxContributionPerSeat, seat.suppliesRemaining);

  if (state.phase === "pledge") {
    const pledgedSoFar = state.seatOrder.reduce(
      (sum, currentSeatId) => sum + (round.pledges[currentSeatId]?.pledge ?? 0),
      0,
    );
    const remainingActors = state.seatOrder.filter(
      (currentSeatId) => typeof round.pledges[currentSeatId] === "undefined",
    ).length;
    const requiredShare = Math.ceil(
      Math.max(0, round.config.threshold - pledgedSoFar) / Math.max(1, remainingActors),
    );

    let pledge = requiredShare;
    switch (profile.temperament) {
      case "steady":
        pledge = Math.max(1, requiredShare);
        break;
      case "opportunist":
        pledge = Math.max(1, requiredShare + 1);
        break;
      case "honest":
        pledge = Math.max(1, requiredShare);
        break;
      case "clutch":
        pledge = Math.max(0, requiredShare - 1);
        break;
    }

    return {
      type: "settlement.pledge",
      pledge: clamp(pledge, 0, maxContribution),
      stance:
        round.config.scarcity === "grain"
          ? "trade"
          : round.config.scarcity === "stone"
            ? "fortify"
            : "appease",
    };
  }

  const committedSoFar = state.seatOrder.reduce(
    (sum, currentSeatId) => sum + (round.commitments[currentSeatId] ?? 0),
    0,
  );
  const remainingActors = state.seatOrder.filter(
    (currentSeatId) => typeof round.commitments[currentSeatId] === "undefined",
  ).length;
  const requiredShare = Math.ceil(
    Math.max(0, round.config.threshold - committedSoFar) / Math.max(1, remainingActors),
  );
  const pledged = round.pledges[seatId]?.pledge ?? 0;

  let contribution = requiredShare;
  switch (profile.temperament) {
    case "steady":
      contribution = Math.max(pledged, requiredShare);
      break;
    case "opportunist":
      contribution = Math.max(0, Math.min(pledged, requiredShare) - 1);
      break;
    case "honest":
      contribution = Math.max(pledged, requiredShare);
      break;
    case "clutch":
      contribution =
        committedSoFar + pledged >= round.config.threshold
          ? Math.max(0, pledged - 1)
          : Math.max(pledged, requiredShare + 1);
      break;
  }

  return {
    type: "settlement.commit",
    contribution: clamp(contribution, 0, maxContribution),
  };
}

function formatEvent(event: ReplayEvent): string {
  switch (event.type) {
    case "settlement.pledge": {
      const payload = event.publicPayload as { pledge?: number; stance?: string };
      return `${event.actorSeatId} pledged ${payload.pledge ?? 0} on ${payload.stance ?? "hold"}.`;
    }
    case "settlement.commit":
      return `${event.actorSeatId} locked a hidden contribution.`;
    case "settlement.round_resolved": {
      const payload = event.publicPayload as {
        title?: string;
        success?: boolean;
        totalContribution?: number;
        threshold?: number;
      };
      return `${payload.title ?? "Round"} ${payload.success ? "held" : "collapsed"} at ${
        payload.totalContribution ?? 0
      } / ${payload.threshold ?? 0}.`;
    }
    default:
      return event.type;
  }
}

type SettlementDemoProps = {
  brief: SettlementBrief;
  actionWindowSeconds: number;
};

export function SettlementDemo({ brief, actionWindowSeconds }: SettlementDemoProps) {
  const [session, setSession] = useState<DemoSession>(() => createInitialSession());
  const [pledgeValue, setPledgeValue] = useState(2);
  const [stance, setStance] = useState<SettlementStance>("fortify");
  const [commitValue, setCommitValue] = useState(2);

  const publicState = settlementModule.projectPublicState(session.state, DEMO_VIEWER_SEAT_ID);
  const currentRound = publicState.currentRound;
  const viewerSeat = publicState.seats.find((seat) => seat.seatId === DEMO_VIEWER_SEAT_ID);
  const activeSeatProfile = session.state.phase === "settled"
    ? undefined
    : getSeatProfile(session.state.currentTurnSeatId);
  const recommendedViewerAction = chooseAutomatedAction(session.state, DEMO_VIEWER_SEAT_ID);
  const totalPledged = currentRound.pledges.reduce(
    (sum, pledge) => sum + (pledge.pledge ?? 0),
    0,
  );
  const lockedCount = currentRound.lockedSeatIds.length;
  const recentEvents = session.replay.slice(-6).reverse();

  useEffect(() => {
    if (publicState.phase === "settled" || session.state.currentTurnSeatId === DEMO_VIEWER_SEAT_ID) {
      return;
    }

    const timer = window.setTimeout(() => {
      startTransition(() => {
        setSession((current) =>
          applyAction(current, {
            seatId: current.state.currentTurnSeatId,
            submittedAt: getActionIso(current.actionStep),
            action: chooseAutomatedAction(current.state, current.state.currentTurnSeatId),
          }),
        );
      });
    }, 850);

    return () => window.clearTimeout(timer);
  }, [publicState.phase, session.state.currentTurnSeatId]);

  useEffect(() => {
    if (recommendedViewerAction.type === "settlement.pledge") {
      setPledgeValue(recommendedViewerAction.pledge);
      setStance(recommendedViewerAction.stance);
      return;
    }

    setCommitValue(recommendedViewerAction.contribution);
  }, [recommendedViewerAction]);

  function submitViewerAction(action: SettlementAction) {
    startTransition(() => {
      setSession((current) =>
        applyAction(current, {
          seatId: DEMO_VIEWER_SEAT_ID,
          submittedAt: getActionIso(current.actionStep),
          action,
        }),
      );
    });
  }

  const viewerMaxContribution = Math.min(
    currentRound.threshold,
    viewerSeat?.visibleSuppliesRemaining ?? 0,
  );

  return (
    <main className={`app-shell ${styles.page}`}>
      <div className={`shell ${styles.stack}`}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Settlement Lite / local multiplayer demo slice</p>
            <h1 className={styles.headline}>Keep the village alive without ever revealing who bluffed.</h1>
            <p className={styles.lede}>
              {brief.summary} This route runs the real deterministic rules locally: you pilot{" "}
              <strong>Harbor Ward</strong>, the other seats advance on their own, and the room only
              reveals hidden commitments when the crisis resolves.
            </p>

            <div className={styles.ctaRow}>
              <button
                className="button primary"
                type="button"
                onClick={() => setSession(createInitialSession())}
              >
                Reset demo room
              </button>
              <button
                className="button"
                type="button"
                onClick={() => submitViewerAction(recommendedViewerAction)}
                disabled={!publicState.viewerCanAct}
              >
                Auto-pilot my turn
              </button>
            </div>

            <div className={styles.heroMeta}>
              <div>
                <span>Viewer seat</span>
                <strong>Harbor Ward</strong>
              </div>
              <div>
                <span>Timer</span>
                <strong>{actionWindowSeconds}s action window</strong>
              </div>
              <div>
                <span>Public rule</span>
                <strong>Pledges public, commitments private until reveal</strong>
              </div>
            </div>
          </div>

          <aside className={styles.mapStage}>
            <div className={styles.mapGlow} />
            <div className={styles.stageHeader}>
              <span>Village board</span>
              <strong>
                Round {currentRound.index + 1} / {publicState.totalRounds}
              </strong>
            </div>

            {seatProfiles.map((seat) => {
              const publicSeat = publicState.seats.find((candidate) => candidate.seatId === seat.seatId);
              const isCurrent = publicState.currentTurnSeatId === seat.seatId;
              const isWinner = publicState.winnerSeatIds?.includes(seat.seatId);

              return (
                <article
                  className={styles.district}
                  key={seat.seatId}
                  style={{ "--district-accent": seat.hue } as CSSProperties}
                  data-current={isCurrent || undefined}
                  data-winner={isWinner || undefined}
                >
                  <div className={styles.districtCrest}>{seat.displayName.slice(0, 2)}</div>
                  <div>
                    <strong>{seat.displayName}</strong>
                    <p>{seat.district}</p>
                    <span>
                      {publicSeat?.hasCommittedThisRound
                        ? "Commitment locked"
                        : isCurrent
                          ? "Acting now"
                          : "Watching"}
                    </span>
                  </div>
                </article>
              );
            })}
          </aside>
        </section>

        <section className={styles.signalStrip}>
          <article>
            <span>Current crisis</span>
            <strong>{currentRound.title}</strong>
          </article>
          <article>
            <span>Threshold</span>
            <strong>{currentRound.threshold} supplies</strong>
          </article>
          <article>
            <span>Publicly pledged</span>
            <strong>{totalPledged}</strong>
          </article>
          <article>
            <span>Locked seats</span>
            <strong>{lockedCount} / {publicState.seats.length}</strong>
          </article>
          <article>
            <span>Village stability</span>
            <strong>{publicState.stability}</strong>
          </article>
        </section>

        <section className={styles.mainGrid}>
          <article className={styles.commandDeck}>
            <div className={styles.sectionHead}>
              <span>Your command rail</span>
              <h2>{publicState.viewerCanAct ? "Your seat is on the clock." : "The room is still moving around you."}</h2>
            </div>

            <p className={styles.sectionCopy}>{currentRound.summary}</p>

            <div className={styles.progressRail}>
              <div className={styles.progressCopy}>
                <span>{currentRound.phase === "commit" ? "Hidden contributions" : "Public pledges"}</span>
                <strong>
                  {currentRound.phase === "commit" ? lockedCount : totalPledged} / {currentRound.threshold}
                </strong>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${
                      (100 *
                        (currentRound.phase === "commit" ? lockedCount : totalPledged)) /
                      Math.max(1, currentRound.threshold)
                    }%`,
                  }}
                />
              </div>
            </div>

            {publicState.phase === "settled" ? (
              <div className={styles.outcomeBlock}>
                <span>Match resolved</span>
                <strong>
                  {publicState.winnerSeatIds?.map((seatId) => getSeatProfile(seatId).displayName).join(", ")} win
                </strong>
                <p>Final score mixes prestige earned from visible reliability and supplies still in reserve.</p>
              </div>
            ) : currentRound.phase === "pledge" ? (
              <form
                className={styles.actionForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  submitViewerAction({
                    type: "settlement.pledge",
                    pledge: pledgeValue,
                    stance,
                  });
                }}
              >
                <label className={styles.field}>
                  <span>Pledge</span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, Math.min(3, viewerMaxContribution))}
                    value={pledgeValue}
                    onChange={(event) => setPledgeValue(Number(event.target.value))}
                    disabled={!publicState.viewerCanAct}
                  />
                  <strong>{pledgeValue} supplies</strong>
                </label>

                <div className={styles.stanceGrid}>
                  {SETTLEMENT_STANCES.map((candidate) => (
                    <button
                      className={styles.stanceButton}
                      type="button"
                      key={candidate}
                      data-active={candidate === stance || undefined}
                      onClick={() => setStance(candidate)}
                      disabled={!publicState.viewerCanAct}
                    >
                      {candidate}
                    </button>
                  ))}
                </div>

                <button className="button primary" type="submit" disabled={!publicState.viewerCanAct}>
                  Broadcast pledge
                </button>
              </form>
            ) : (
              <form
                className={styles.actionForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  submitViewerAction({
                    type: "settlement.commit",
                    contribution: commitValue,
                  });
                }}
              >
                <label className={styles.field}>
                  <span>Hidden contribution</span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, Math.min(3, viewerMaxContribution))}
                    value={commitValue}
                    onChange={(event) => setCommitValue(Number(event.target.value))}
                    disabled={!publicState.viewerCanAct}
                  />
                  <strong>{commitValue} supplies</strong>
                </label>

                <div className={styles.privateHint}>
                  <span>Your secret ledger</span>
                  <strong>
                    {typeof currentRound.viewerPendingContribution === "number"
                      ? `Locked ${currentRound.viewerPendingContribution}`
                      : "Nothing locked yet"}
                  </strong>
                </div>

                <button className="button primary" type="submit" disabled={!publicState.viewerCanAct}>
                  Lock hidden aid
                </button>
              </form>
            )}

            <div className={styles.advisor}>
              <span>Suggested move</span>
              <strong>
                {recommendedViewerAction.type === "settlement.pledge"
                  ? `${recommendedViewerAction.pledge} on ${recommendedViewerAction.stance}`
                  : `${recommendedViewerAction.contribution} hidden`}
              </strong>
              <p>
                The local advisor uses the same deterministic seat policy as the auto-playing table,
                which makes this page useful for demos and repeatable screenshots.
              </p>
            </div>
          </article>

          <article className={styles.seatLedger}>
            <div className={styles.sectionHead}>
              <span>Public seat ledger</span>
              <h2>Everything the room can legitimately know</h2>
            </div>

            <div className={styles.seatList}>
              {seatProfiles.map((seat) => {
                const publicSeat = publicState.seats.find((candidate) => candidate.seatId === seat.seatId);
                return (
                  <article className={styles.seatRow} key={seat.seatId} style={{ "--seat-accent": seat.hue } as CSSProperties}>
                    <div className={styles.seatHeader}>
                      <div>
                        <strong>{seat.displayName}</strong>
                        <p>{seat.summary}</p>
                      </div>
                      <span>{seat.temperament}</span>
                    </div>

                    <dl className={styles.seatStats}>
                      <div>
                        <dt>Visible reserves</dt>
                        <dd>{publicSeat?.visibleSuppliesRemaining}</dd>
                      </div>
                      <div>
                        <dt>Prestige</dt>
                        <dd>{publicSeat?.prestige}</dd>
                      </div>
                      <div>
                        <dt>Honesty</dt>
                        <dd>{publicSeat?.honesty}</dd>
                      </div>
                      <div>
                        <dt>This round</dt>
                        <dd>
                          {publicSeat?.hasCommittedThisRound
                            ? "locked"
                            : publicState.currentTurnSeatId === seat.seatId
                              ? "acting"
                              : "waiting"}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </article>
        </section>

        <section className={styles.detailGrid}>
          <article className={styles.historyPanel}>
            <div className={styles.sectionHead}>
              <span>Resolved history</span>
              <h2>Every reveal becomes evidence.</h2>
            </div>
            <div className={styles.historyList}>
              {publicState.history.length === 0 ? (
                <p className={styles.placeholder}>No rounds have resolved yet. Once every seat locks a contribution, the reveal lands here with totals and success state.</p>
              ) : (
                publicState.history.map((round) => (
                  <article className={styles.historyRow} key={round.index} data-success={round.success || undefined}>
                    <div>
                      <strong>{round.title}</strong>
                      <p>{round.scarcity}</p>
                    </div>
                    <div>
                      <span>Outcome</span>
                      <strong>{round.success ? "Held" : "Collapsed"}</strong>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>{round.totalContribution}</strong>
                    </div>
                    <div>
                      <span>Threshold</span>
                      <strong>{round.threshold}</strong>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>

          <article className={styles.logPanel}>
            <div className={styles.sectionHead}>
              <span>Public replay trail</span>
              <h2>Only public events make the log.</h2>
            </div>

            <div className={styles.logList}>
              {recentEvents.length === 0 ? (
                <p className={styles.placeholder}>Kick off the room to start generating pledges, hidden locks, and resolution events.</p>
              ) : (
                recentEvents.map((event) => (
                  <article className={styles.logRow} key={`${event.sequence}-${event.type}`}>
                    <span>{event.type}</span>
                    <strong>{formatEvent(event)}</strong>
                  </article>
                ))
              )}
            </div>

            <div className={styles.hiddenRail}>
              <span>Hidden-seat reminder</span>
              <p>
                The replay never contains backing-type labels. It records pledges, locks, and round
                outcomes exactly the same way whether a seat is human, LLM-backed, or scripted.
              </p>
              {activeSeatProfile ? (
                <strong>{activeSeatProfile.displayName} is acting now.</strong>
              ) : (
                <strong>The village has settled.</strong>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
