import type { ActionDef } from "./types";

export const ALL_POSITIONS = ["EP", "MP", "LJ", "BU", "SB", "BB"];

export const POSITION_IMAGES: Record<string, string> = {
  EP: "/profiles/output.jpg",
  MP: "/profiles/output (1).jpg",
  LJ: "/profiles/output (2).jpg",
  BU: "/profiles/output (3).jpg",
  SB: "/profiles/output (4).jpg",
  BB: "/profiles/output (5).jpg",
};

export const PLAYER_NAMES: Record<string, string> = {
  EP: "Player 1",
  MP: "Player 2",
  LJ: "Player 3",
  BU: "Player 4",
  SB: "Player 5",
  BB: "Player 6",
};

export const PLAYER_STACKS: Record<string, string> = {
  EP: "1,200",
  MP: "1,200",
  LJ: "1,200",
  BU: "1,200",
  SB: "1,200",
  BB: "1,200",
};

export const T_CX = 230, T_CY = 180;
export const T_RX = 178, T_RY = 108;
export const S_RX = 200, S_RY = 132;

export const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

export const SUIT_MAP: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
export const BLACK_SUIT_CHARS = ["s", "c"];
export const RED_SUIT_CHARS = ["h", "d"];
export const ALL_SUIT_CHARS = ["s", "h", "d", "c"];

export const DND_ITEM = "TREE_ITEM";
export const DND_ACTION = "ACTION_ITEM";

export const COLOR_PRESETS = [
  { color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  { color: "#2563eb", bg: "#dbeafe", border: "#93c5fd" },
  { color: "#ca8a04", bg: "#fef9c3", border: "#fde047" },
  { color: "#9333ea", bg: "#f3e8ff", border: "#d8b4fe" },
  { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  { color: "#059669", bg: "#d1fae5", border: "#6ee7b7" },
  { color: "#ea580c", bg: "#ffedd5", border: "#fdba74" },
  { color: "#c026d3", bg: "#fae8ff", border: "#f0abfc" },
];

export const DEFAULT_ACTIONS: ActionDef[] = [
  { id: "a1", label: "Action 1", color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  { id: "a2", label: "Action 2", color: "#2563eb", bg: "#dbeafe", border: "#93c5fd" },
];

export const LEGACY_ACTIONS: ActionDef[] = [
  { id: "raise",  label: "Raise",   color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  { id: "3bet",   label: "3-Bet",   color: "#2563eb", bg: "#dbeafe", border: "#93c5fd" },
  { id: "call",   label: "Call",    color: "#ca8a04", bg: "#fef9c3", border: "#fde047" },
  { id: "limp",   label: "Limp",    color: "#9333ea", bg: "#f3e8ff", border: "#d8b4fe" },
  { id: "fold",   label: "Fold",    color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
  { id: "allin",  label: "All-In",  color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
];
