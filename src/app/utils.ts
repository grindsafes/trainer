import {
  ALL_POSITIONS, T_CX, T_CY, S_RX, S_RY, RANKS,
  SUIT_MAP, BLACK_SUIT_CHARS, RED_SUIT_CHARS, ALL_SUIT_CHARS,
} from "./constants";
import type { ActionDef, AppData, SessionData } from "./types";

export function getPositions(numPlayers: number): string[] {
  return ALL_POSITIONS.slice(ALL_POSITIONS.length - numPlayers);
}

export function getSeatPos(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: T_CX + S_RX * Math.sin(rad), y: T_CY - S_RY * Math.cos(rad) };
}

export function getAngle(posIdx: number, heroIdx: number, N: number): number {
  const rel = (posIdx - heroIdx + N) % N;
  const raw = 180 + rel * (360 / N);
  return ((raw % 360) + 360) % 360;
}

export function getHandLabel(row: number, col: number): string {
  if (row === col) return RANKS[row] + RANKS[row];
  if (col > row) return RANKS[row] + RANKS[col] + "s";
  return RANKS[col] + RANKS[row] + "o";
}

export function expandHand(hand: string): string {
  const isSuited = hand.endsWith("s");
  const isPair = hand.length === 2;
  if (isSuited) {
    const suit = ALL_SUIT_CHARS[Math.floor(Math.random() * 4)];
    return hand[0] + suit + hand[1] + suit;
  }
  if (isPair) {
    const s1 = BLACK_SUIT_CHARS[Math.floor(Math.random() * 2)];
    const s2 = RED_SUIT_CHARS[Math.floor(Math.random() * 2)];
    return hand[0] + s1 + hand[1] + s2;
  }
  const s1 = BLACK_SUIT_CHARS[Math.floor(Math.random() * 2)];
  const s2 = RED_SUIT_CHARS[Math.floor(Math.random() * 2)];
  return hand[0] + s1 + hand[1] + s2;
}

const SUIT_COLORS: Record<string, string> = {
  c: "#22c55e",
  h: "#ef4444",
  d: "#3b82f6",
  s: "#000000",
};

export function parseCombo(combo: string): { ranks: string[]; suits: string[]; colors: string[] } {
  return {
    ranks: [combo[0], combo[2]],
    suits: [SUIT_MAP[combo[1]], SUIT_MAP[combo[3]]],
    colors: [
      SUIT_COLORS[combo[1]] ?? "var(--card-foreground)",
      SUIT_COLORS[combo[3]] ?? "var(--card-foreground)",
    ],
  };
}

export function getActionStyle(a: ActionDef) {
  return {
    backgroundColor: a.bg,
    borderColor: a.border,
    color: a.color,
  };
}

const STORAGE_KEY = "poker-trainer-data";

export function loadFromStorage(): Partial<AppData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveToStorage(data: AppData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

const SESSIONS_KEY = "poker-trainer-sessions";

export function loadSessions(): SessionData[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveSessions(sessions: SessionData[]) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch { /* quota */ }
}
