export interface Drill {
  id: string;
  name: string;
  numPlayers: number;
  heroPosition: string;
  rangeId: string;
  foldedPositions: string[];
  betSizes: Record<string, string>;
  folderId: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface ActionDef {
  id: string;
  label: string;
  color: string;
  bg: string;
  border: string;
}

export interface Range {
  id: string;
  name: string;
  grid: Record<string, string>;
  folderId: string | null;
  actions: ActionDef[];
}

export interface AppData {
  ranges: Range[];
  drills: Drill[];
  rangeFolders: Folder[];
  drillFolders: Folder[];
}

export interface ComboStat {
  correct: number;
  total: number;
}

export interface SessionData {
  id: string;
  drillId: string;
  startedAt: number;
  endedAt: number | null;
  total: number;
  correct: number;
  history: { hand: string; combo?: string; correct: boolean }[];
  comboStats: Record<string, ComboStat>;
}
