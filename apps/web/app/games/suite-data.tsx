import type { ReactNode } from "react";

export type GameSuiteKey = "auction" | "split" | "pact" | "vault" | "settlement";

export interface GameSuiteEntry {
  key: GameSuiteKey;
  name: string;
  href: string;
  eyebrow: string;
  strapline: string;
  demoLabel: string;
  accent: string;
  accentSoft: string;
  icon: ReactNode;
}

function SuiteIconShell({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="72" height="72" rx="22" stroke="currentColor" strokeOpacity="0.16" />
      {children}
    </svg>
  );
}

function AuctionIcon() {
  return (
    <SuiteIconShell>
      <circle cx="28" cy="50" r="10" fill="currentColor" fillOpacity="0.16" />
      <path d="M49 18 61 30" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M42 25 56 39" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      <path d="M19 59h38" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </SuiteIconShell>
  );
}

function SplitIcon() {
  return (
    <SuiteIconShell>
      <path d="M40 16v48" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M18 26h16c5.5 0 10 4.5 10 10v0" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M62 54H46c-5.5 0-10-4.5-10-10v0" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="24" cy="26" r="6" fill="currentColor" />
      <circle cx="56" cy="54" r="6" fill="currentColor" />
    </SuiteIconShell>
  );
}

function PactIcon() {
  return (
    <SuiteIconShell>
      <path
        d="M24 34c0-6.6 5.4-12 12-12 4.6 0 8.7 2.6 10.7 6.5 2-3.9 6.1-6.5 10.7-6.5 6.6 0 12 5.4 12 12 0 16.5-22.7 24.2-22.7 24.2S24 50.5 24 34Z"
        fill="currentColor"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path d="M30 41h20" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M42 29h8" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </SuiteIconShell>
  );
}

function VaultIcon() {
  return (
    <SuiteIconShell>
      <rect x="20" y="34" width="40" height="26" rx="8" stroke="currentColor" strokeWidth="5" />
      <path d="M28 34v-4c0-6.6 5.4-12 12-12s12 5.4 12 12v4" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="40" cy="47" r="4.5" fill="currentColor" />
      <path d="M40 51v6" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </SuiteIconShell>
  );
}

function SettlementIcon() {
  return (
    <SuiteIconShell>
      <path d="M16 58h48" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M22 58V42l8-8 8 8v16" stroke="currentColor" strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M42 58V34l9-7 9 7v24" stroke="currentColor" strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M50 18v12" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
    </SuiteIconShell>
  );
}

export const gameSuiteEntries: GameSuiteEntry[] = [
  {
    key: "auction",
    name: "Auction",
    href: "/games/auction",
    eyebrow: "Flagship live demo",
    strapline: "All-pay bidding with hidden seats and immediate spectator tension.",
    demoLabel: "Best for first 2-minute demo",
    accent: "#f1c064",
    accentSoft: "rgba(241, 192, 100, 0.18)",
    icon: <AuctionIcon />,
  },
  {
    key: "split",
    name: "Split",
    href: "/games/split",
    eyebrow: "Fairness threshold duel",
    strapline: "A minimal ultimatum game where every offer exposes a tolerance curve.",
    demoLabel: "Best for fairness and rejection pressure",
    accent: "#72dfff",
    accentSoft: "rgba(114, 223, 255, 0.18)",
    icon: <SplitIcon />,
  },
  {
    key: "pact",
    name: "Pact",
    href: "/games/pact",
    eyebrow: "Trust and betrayal loop",
    strapline: "Two seats lock commitments in secret and reveal strategy residue over time.",
    demoLabel: "Best for trust and reciprocity signals",
    accent: "#91b9ff",
    accentSoft: "rgba(145, 185, 255, 0.18)",
    icon: <PactIcon />,
  },
  {
    key: "vault",
    name: "Vault",
    href: "/games/vault",
    eyebrow: "Public-goods accusation chamber",
    strapline: "Private contributions turn into pooled returns, blame, and consensus pressure.",
    demoLabel: "Best for generosity and suspicion",
    accent: "#d8c27b",
    accentSoft: "rgba(216, 194, 123, 0.18)",
    icon: <VaultIcon />,
  },
  {
    key: "settlement",
    name: "Settlement",
    href: "/games/settlement",
    eyebrow: "Village coordination board",
    strapline: "A more theatrical group game about pledges, shortages, and last-round rescue moves.",
    demoLabel: "Best for richer worldbuilding",
    accent: "#95c16d",
    accentSoft: "rgba(149, 193, 109, 0.18)",
    icon: <SettlementIcon />,
  },
];

export function getGameSuiteEntry(key: GameSuiteKey): GameSuiteEntry {
  const entry = gameSuiteEntries.find((candidate) => candidate.key === key);
  if (!entry) {
    throw new Error(`Unknown game suite entry: ${key}`);
  }

  return entry;
}
