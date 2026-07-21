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

export interface LineNodeData {
  label: string;
  street: 'preflop' | 'flop' | 'turn' | 'river';
  actor: 'hero' | 'villain' | 'none';
  nodeType: 'root' | 'action' | 'street-header' | 'street-group' | 'street';
  actionType?: 'check' | 'bet' | 'raise' | 'fold' | 'call' | 'allin';
  betSize?: string;
  correct?: boolean;
  weight?: number;
  stats?: { total: number; correct: number };
  boardCards?: string;
  heroCards?: string;
}

export interface LineTree {
  id: string;
  name: string;
  folderId: string | null;
  nodes: string;
  edges: string;
  viewport?: { x: number; y: number; zoom: number };
}

export interface LineDrill {
  id: string;
  name: string;
  lineTreeId: string;
  heroPosition: string;
  description: string;
  folderId: string | null;
}

export interface AppData {
  ranges: Range[];
  drills: Drill[];
  rangeFolders: Folder[];
  drillFolders: Folder[];
  lineTrees: LineTree[];
  lineFolders: Folder[];
  lineDrills: LineDrill[];
  lineDrillFolders: Folder[];
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

export interface LineSessionData {
  id: string;
  lineTreeId: string;
  lineDrillId?: string;
  heroPosition: string;
  startedAt: number;
  endedAt: number | null;
  total: number;
  correct: number;
  history: { nodeId: string; nodeLabel: string; correct: boolean; boardCards?: string }[];
  usedFlopNodeIds?: string[];
  pathStats?: Record<string, { total: number; correct: number; pathLabels: string[] }>;
}
