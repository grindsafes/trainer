import { useState, useCallback, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Download, Upload, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp, ChevronRight, Square, Sun, Moon, FolderPlus } from "lucide-react";
import logoSvg from "./imgs/logo.svg";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";


// ─── Position constants ───────────────────────────────────────────────────────

const ALL_POSITIONS = ["EP", "MP", "LJ", "BU", "SB", "BB"];

function getPositions(numPlayers: number): string[] {
  return ALL_POSITIONS.slice(ALL_POSITIONS.length - numPlayers);
}

// ─── Poker table geometry ─────────────────────────────────────────────────────

const T_CX = 230, T_CY = 180;
const T_RX = 178, T_RY = 108; // felt ellipse
const S_RX = 200, S_RY = 132; // seat placement radii

function getSeatPos(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: T_CX + S_RX * Math.sin(rad), y: T_CY - S_RY * Math.cos(rad) };
}

// Hero is always at the bottom (180° in our clockwise-from-top system).
// Each subsequent position going clockwise from hero is at 180 + rel*(360/N).
function getAngle(posIdx: number, heroIdx: number, N: number): number {
  const rel = (posIdx - heroIdx + N) % N;
  const raw = 180 + rel * (360 / N);
  return ((raw % 360) + 360) % 360;
}

// ─── Poker table component ────────────────────────────────────────────────────

interface PokerTableProps {
  positions: string[];
  heroPosition: string;
  onSelectHero?: (pos: string) => void;
  compact?: boolean;
  heroHand?: string | null;
  foldedPositions?: string[];
  betSizes?: Record<string, string>;
}

function PokerTable({ positions, heroPosition, onSelectHero, compact = false, heroHand, foldedPositions = [], betSizes = {} }: PokerTableProps) {
  const N = positions.length;
  const heroIdx = positions.indexOf(heroPosition);
  const interactive = !!onSelectHero;

  function renderHeroCards(hand: string, cx: number, cy: number) {
    const isPair = hand.length === 2;
    const isSuited = hand.endsWith("s");
    const suits = isPair ? ["♠", "♥"] : isSuited ? ["♠", "♠"] : ["♠", "♥"];
    const suitColors = ["var(--card-foreground)", "#ef4444"];
    const cw = 22, ch = 32, gap = 2;
    const startX = cx - cw - gap / 2;

    return (
      <>
        {[0, 1].map((i) => (
          <g key={i}>
            <rect x={startX + i * (cw + gap)} y={cy - ch / 2} width={cw} height={ch} rx={3} style={{ fill: "var(--card)", stroke: "var(--border)" }} strokeWidth={1} />
            <text x={startX + i * (cw + gap) + cw / 2} y={cy - 3} textAnchor="middle" dominantBaseline="middle" fill={suitColors[i]} fontSize={10} fontWeight={700} fontFamily="JetBrains Mono, monospace">
              {hand[i]}
            </text>
            <text x={startX + i * (cw + gap) + cw / 2} y={cy + 9} textAnchor="middle" dominantBaseline="middle" fill={suitColors[i]} fontSize={8}>
              {suits[i]}
            </text>
          </g>
        ))}
      </>
    );
  }

  return (
    <svg
      viewBox="0 0 460 380"
      className="w-full"
      style={{ maxWidth: compact ? 160 : 960 }}
    >
      {/* Shadow */}
      <ellipse cx={T_CX} cy={T_CY + 6} rx={T_RX} ry={T_RY} fill="rgba(0,0,0,0.5)" />
      {/* Felt */}
      <ellipse cx={T_CX} cy={T_CY} rx={T_RX} ry={T_RY} fill="#0d3320" />
      {/* Rail */}
      <ellipse cx={T_CX} cy={T_CY} rx={T_RX} ry={T_RY} fill="none" stroke="#1a5c35" strokeWidth={7} />
      {/* Inner rail line */}
      <ellipse cx={T_CX} cy={T_CY} rx={T_RX - 10} ry={T_RY - 10} fill="none" stroke="#22c55e" strokeWidth={0.75} opacity={0.25} />
      {/* Center logo */}
      <text
        x={T_CX} y={T_CY}
        textAnchor="middle" dominantBaseline="middle"
        fill="#22c55e" fillOpacity={0.08}
        fontSize={36} fontWeight={700}
        fontFamily="JetBrains Mono, monospace"
      >
        ♠
      </text>

      {positions.map((pos, i) => {
        const angle = getAngle(i, heroIdx, N);
        const { x, y } = getSeatPos(angle);
        const isHero = pos === heroPosition;
        const r = compact ? 18 : 24;
        const isFolded = !isHero && foldedPositions.includes(pos);
        const betSize = betSizes[pos];

        return (
          <g
            key={pos}
            onClick={() => onSelectHero?.(pos)}
            style={{ cursor: interactive && !isHero ? "pointer" : "default", opacity: isFolded ? 0.35 : 1 }}
          >
            {/* Glow for hero */}
            {isHero && (
              <circle cx={x} cy={y} r={r + 8} fill="#22c55e" fillOpacity={0.12} />
            )}
            {/* Hover ring for non-hero (interactive) */}
            {interactive && !isHero && (
              <circle cx={x} cy={y} r={r + 6} fill="white" fillOpacity={0} className="hover-ring" />
            )}

            {isHero && heroHand ? (
              renderHeroCards(heroHand, x, y)
            ) : (
              <>
                {/* Chip */}
                <circle
                  cx={x} cy={y} r={r}
                  style={{ fill: isHero ? "var(--accent)" : "var(--secondary)" }}
                  stroke={
                    isHero ? "var(--primary)" :
                    isFolded ? "var(--muted-foreground)" : "var(--border)"
                  }
                  strokeWidth={isHero ? 2.5 : 1.5}
                />
                {/* Position label */}
                <text
                  x={x} y={y}
                  textAnchor="middle" dominantBaseline="middle"
                  style={{ fill: isHero ? "var(--primary)" : "var(--muted-foreground)" }}
                  fontSize={compact ? 7 : 9}
                  fontWeight={700}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {pos}
                </text>
                {isHero && !compact && (
                  <text
                    x={x} y={y + 11}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#4ade80" fontSize={6.5}
                    fontFamily="Inter, sans-serif"
                    letterSpacing={0.8}
                  >
                    HERO
                  </text>
                )}
                {isFolded && (
                  <text
                    x={x} y={y + 11}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="var(--muted-foreground)" fontSize={5.5}
                    fontFamily="Inter, sans-serif"
                    letterSpacing={0.5}
                  >
                    FOLD
                  </text>
                )}
              </>
            )}
            {/* Bet size chip on the felt */}
            {betSize && !compact && (
              <>
                <circle
                  cx={T_CX + (x - T_CX) * 0.72}
                  cy={T_CY + (y - T_CY) * 0.72}
                  r={5.5}
                  style={{ fill: isFolded ? "var(--muted)" : "var(--card)" }}
                  stroke={isFolded ? "var(--muted-foreground)" : "#1a5c35"}
                  strokeWidth={1.5}
                />
                <circle
                  cx={T_CX + (x - T_CX) * 0.72}
                  cy={T_CY + (y - T_CY) * 0.72}
                  r={3.5}
                  fill="none"
                  stroke={isFolded ? "var(--muted-foreground)" : "#1a5c35"}
                  strokeWidth={0.8}
                />
                <circle
                  cx={T_CX + (x - T_CX) * 0.72}
                  cy={T_CY + (y - T_CY) * 0.72}
                  r={1.2}
                  fill={isFolded ? "var(--muted-foreground)" : "#1a5c35"}
                />
                <text
                  x={T_CX + (x - T_CX) * 0.72 + 9}
                  y={T_CY + (y - T_CY) * 0.72 + 0.5}
                  textAnchor="start" dominantBaseline="middle"
                  style={{ fill: isFolded ? "var(--muted-foreground)" : "var(--card-foreground)" }}
                  fontSize={6.5}
                  fontWeight={600}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {betSize}
                </text>
              </>
            )}
            {/* Interactive hint */}
            {interactive && !isHero && (
              <circle
                cx={x} cy={y} r={r}
                fill="white" fillOpacity={0}
                className="seat-hover"
              />
            )}
          </g>
        );
      })}

      <style>{`
        .seat-hover:hover { fill-opacity: 0.08; }
        .seat-hover { transition: fill-opacity 0.15s; }
      `}</style>
    </svg>
  );
}

// ─── Drill types ──────────────────────────────────────────────────────────────

interface Drill {
  id: string;
  name: string;
  numPlayers: number;
  heroPosition: string;
  rangeId: string;
  foldedPositions: string[];
  betSizes: Record<string, string>;
  folderId: string | null;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

// ─── Drill editor ─────────────────────────────────────────────────────────────

interface DrillEditorProps {
  initial?: Drill;
  ranges: Range[];
  onSave: (drill: Drill) => void;
  onCancel: () => void;
}

function DrillEditor({ initial, ranges, onSave, onCancel }: DrillEditorProps) {
  const [name, setName] = useState(initial?.name ?? "New Drill");
  const [numPlayers, setNumPlayers] = useState(initial?.numPlayers ?? 6);
  const positions = getPositions(numPlayers);
  const defaultHero = initial?.heroPosition && positions.includes(initial.heroPosition)
    ? initial.heroPosition
    : positions[0];
  const [heroPosition, setHeroPosition] = useState(defaultHero);
  const [rangeId, setRangeId] = useState(initial?.rangeId ?? "");
  const [foldedPositions, setFoldedPositions] = useState<string[]>(initial?.foldedPositions ?? []);
  const [betSizes, setBetSizes] = useState<Record<string, string>>(initial?.betSizes ?? {});

  // When numPlayers changes, pick a valid heroPosition
  useEffect(() => {
    const pos = getPositions(numPlayers);
    if (!pos.includes(heroPosition)) setHeroPosition(pos[0]);
  }, [numPlayers, heroPosition]);

  // Auto-fold positions before hero (except SB/BB stay active)
  const prevConfig = useRef({ heroPosition, numPlayers });
  useEffect(() => {
    if (prevConfig.current.heroPosition === heroPosition && prevConfig.current.numPlayers === numPlayers) return;
    prevConfig.current = { heroPosition, numPlayers };
    const pos = getPositions(numPlayers);
    const heroIdx = pos.indexOf(heroPosition);
    if (heroIdx === -1) return;
    const alwaysActive = new Set(["SB", "BB"]);
    setFoldedPositions(pos.filter((p, i) => i < heroIdx && !alwaysActive.has(p)));
  }, [heroPosition, numPlayers]);

  function toggleFolded(pos: string) {
    setFoldedPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  }

  function setBetSize(pos: string, value: string) {
    setBetSizes((prev) => ({ ...prev, [pos]: value }));
  }

  function save() {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? `drill-${Date.now()}`,
      name: name.trim(),
      numPlayers,
      heroPosition,
      rangeId,
      foldedPositions,
      betSizes,
      folderId: initial?.folderId ?? null,
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drill name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-secondary text-foreground text-sm font-medium px-3 py-2 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="e.g. 6-max BTN vs SB"
        />
      </div>

      {/* Player count */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Number of players
        </label>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => setNumPlayers(n)}
              className="w-10 h-10 rounded-full border text-sm font-semibold transition-all"
              style={{
                backgroundColor: numPlayers === n ? "var(--accent)" : "transparent",
                borderColor: numPlayers === n ? "var(--primary)" : "var(--border)",
                color: numPlayers === n ? "var(--accent-foreground)" : "var(--muted-foreground)",
                boxShadow: numPlayers === n ? "0 0 8px var(--primary)" : undefined,
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Positions: <span className="text-foreground font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {getPositions(numPlayers).join(" → ")}
          </span>
        </p>
      </div>

      {/* Hero seat — interactive table */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Hero seat — click to select
        </label>
        <div className="bg-card rounded-xl border border-border p-4 flex justify-center">
          <PokerTable
            positions={getPositions(numPlayers)}
            heroPosition={heroPosition}
            onSelectHero={setHeroPosition}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Hero is <span style={{ color: "var(--primary)", fontWeight: 600 }}>{heroPosition}</span> — always shown at center bottom during training
        </p>
      </div>

      {/* Range selection */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Range</label>
        <select
          value={rangeId}
          onChange={(e) => setRangeId(e.target.value)}
          className="bg-secondary text-foreground text-sm px-3 py-2 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Select a range...</option>
          {ranges.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* Players in hand */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Players in hand</label>
        <div className="flex flex-col gap-2">
          {positions.map((pos) => {
            const isHeroPos = pos === heroPosition;
            const isFolded = foldedPositions.includes(pos);
            const isDisabled = isHeroPos;
            return (
              <div key={pos} className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!isFolded}
                    disabled={isDisabled}
                    onChange={() => toggleFolded(pos)}
                    className="accent-green-500 w-3.5 h-3.5"
                  />
                  <span className={`text-xs font-medium ${isHeroPos ? "text-green-500" : isFolded ? "text-muted-foreground" : "text-foreground"}`}>
                    {pos}{isHeroPos ? " (Hero)" : ""}
                  </span>
                </label>
                <span className="text-muted-foreground text-[10px]">Bet:</span>
                <input
                  value={betSizes[pos] ?? ""}
                  onChange={(e) => setBetSize(pos, e.target.value)}
                  placeholder={isHeroPos ? "e.g. raise 3bb" : "e.g. call"}
                  className="flex-1 bg-secondary text-foreground text-xs px-2 py-1.5 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary max-w-28"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={!rangeId}
          className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {initial ? "Update Drill" : "Save Drill"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-full border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Range Grid ──────────────────────────────────────────────────────────────

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

function getHandLabel(row: number, col: number): string {
  if (row === col) return RANKS[row] + RANKS[row];
  if (col > row) return RANKS[row] + RANKS[col] + "s";
  return RANKS[col] + RANKS[row] + "o";
}

interface ActionDef {
  id: string;
  label: string;
  color: string;
  bg: string;
  border: string;
}

const DEFAULT_ACTIONS: ActionDef[] = [
  { id: "raise",  label: "Raise",   color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  { id: "3bet",   label: "3-Bet",   color: "#2563eb", bg: "#dbeafe", border: "#93c5fd" },
  { id: "call",   label: "Call",    color: "#ca8a04", bg: "#fef9c3", border: "#fde047" },
  { id: "limp",   label: "Limp",    color: "#9333ea", bg: "#f3e8ff", border: "#d8b4fe" },
  { id: "fold",   label: "Fold",    color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
  { id: "allin",  label: "All-In",  color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
];

const DEFAULT_ACTION_IDS = new Set(DEFAULT_ACTIONS.map((a) => a.id));

function getActionStyle(a: ActionDef) {
  if (DEFAULT_ACTION_IDS.has(a.id)) {
    return {
      backgroundColor: `var(--action-${a.id}-bg, ${a.bg})`,
      borderColor: `var(--action-${a.id}-border, ${a.border})`,
      color: `var(--action-${a.id}-c, ${a.color})`,
    };
  }
  return {
    backgroundColor: a.bg,
    borderColor: a.border,
    color: a.color,
  };
}

const COLOR_PRESETS = [
  { color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  { color: "#2563eb", bg: "#dbeafe", border: "#93c5fd" },
  { color: "#ca8a04", bg: "#fef9c3", border: "#fde047" },
  { color: "#9333ea", bg: "#f3e8ff", border: "#d8b4fe" },
  { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  { color: "#059669", bg: "#d1fae5", border: "#6ee7b7" },
  { color: "#ea580c", bg: "#ffedd5", border: "#fdba74" },
  { color: "#c026d3", bg: "#fae8ff", border: "#f0abfc" },
];

interface Range {
  id: string;
  name: string;
  grid: Record<string, string>;
  folderId: string | null;
}

interface AppData {
  actions: ActionDef[];
  ranges: Range[];
  drills: Drill[];
  rangeFolders: Folder[];
  drillFolders: Folder[];
}

interface ComboStat {
  correct: number;
  total: number;
}

interface SessionData {
  id: string;
  drillId: string;
  startedAt: number;
  endedAt: number | null;
  total: number;
  correct: number;
  history: { hand: string; correct: boolean }[];
  comboStats: Record<string, ComboStat>;
}

function RangeGrid({
  grid, actions, selectedAction, onPaint, readOnly = false, highlightHand,
}: {
  grid: Record<string, string>;
  actions: ActionDef[];
  selectedAction: string;
  onPaint: (hand: string) => void;
  readOnly?: boolean;
  highlightHand?: string | null;
}) {
  const isPainting = useRef(false);
  const actionMap = Object.fromEntries(actions.map((a) => [a.id, a]));

  const handleMouseDown = useCallback((hand: string) => {
    if (readOnly) return;
    isPainting.current = true;
    onPaint(hand);
  }, [readOnly, onPaint]);

  const handleMouseEnter = useCallback((hand: string) => {
    if (readOnly || !isPainting.current) return;
    onPaint(hand);
  }, [readOnly, onPaint]);

  useEffect(() => {
    const stop = () => { isPainting.current = false; };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  return (
    <div className="select-none" style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)", gap: "2px" }}>
      {RANKS.map((_, row) =>
        RANKS.map((_, col) => {
          const hand = getHandLabel(row, col);
          const actionId = grid[hand];
          const action = actionId ? actionMap[actionId] : null;
          const isPair = row === col;
          const isHighlight = highlightHand === hand;
          let cellBg = "var(--muted)", cellBorder = "var(--border)", textColor = "var(--muted-foreground)";
          if (action) { const s = getActionStyle(action); cellBg = s.backgroundColor; cellBorder = s.borderColor; textColor = s.color; }
          else if (isPair) { cellBg = "var(--secondary)"; cellBorder = "var(--border)"; textColor = "var(--muted-foreground)"; }
          if (isHighlight) { cellBorder = "var(--ring)"; cellBg = action ? cellBg : "var(--accent)"; }
          return (
            <div
              key={hand}
              title={action ? `${hand} → ${action.label}` : hand}
              onMouseDown={() => handleMouseDown(hand)}
              onMouseEnter={() => handleMouseEnter(hand)}
              style={{ backgroundColor: cellBg, border: `1px solid ${cellBorder}`, color: textColor, boxShadow: isHighlight ? `0 0 0 2px var(--ring), 0 0 12px color-mix(in srgb, var(--ring) 50%, transparent)` : undefined }}
              className="aspect-square flex items-center justify-center cursor-pointer rounded-[2px] transition-all duration-75 hover:brightness-125"
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "clamp(5px, 0.9vw, 10px)", fontWeight: 600, lineHeight: 1 }}>
                {hand}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Session Grid ───────────────────────────────────────────────────────────

function SessionGrid({ comboStats }: { comboStats: Record<string, ComboStat> }) {
  function getAccuracyColor(cs: ComboStat | undefined) {
    if (!cs || cs.total === 0) return { bg: "var(--muted)", text: "var(--muted-foreground)", border: "var(--border)" };
    const pct = cs.correct / cs.total;
    if (pct >= 0.8) return { bg: "#dcfce7", text: "#16a34a", border: "#86efac" };
    if (pct >= 0.6) return { bg: "#fef9c3", text: "#ca8a04", border: "#fde047" };
    return { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" };
  }

  return (
    <div className="select-none" style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)", gap: "2px" }}>
      {RANKS.map((_, row) =>
        RANKS.map((_, col) => {
          const hand = getHandLabel(row, col);
          const cs = comboStats[hand];
          const { bg, text, border } = getAccuracyColor(cs);
          return (
            <div
              key={hand}
              title={cs ? `${hand}: ${cs.correct}/${cs.total} (${((cs.correct / cs.total) * 100).toFixed(1)}%)` : hand}
              style={{ backgroundColor: bg, color: text, border: `1px solid ${border}` }}
              className="aspect-square flex flex-col items-center justify-center rounded-[2px]"
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "clamp(4px, 0.7vw, 8px)", fontWeight: 700, lineHeight: 1.2 }}>
                {hand}
              </span>
              {cs && (
                <span style={{ fontSize: "clamp(3px, 0.5vw, 6px)", lineHeight: 1.2, opacity: 0.8 }}>
                  {cs.correct}/{cs.total}
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Action manager ───────────────────────────────────────────────────────────

function ActionManager({ actions, onChange }: { actions: ActionDef[]; onChange: (a: ActionDef[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  function startEdit(a: ActionDef) { setEditingId(a.id); setEditLabel(a.label); }
  function commitEdit(id: string) {
    if (!editLabel.trim()) return;
    onChange(actions.map((a) => a.id === id ? { ...a, label: editLabel.trim() } : a));
    setEditingId(null);
  }
  function addAction() {
    const preset = COLOR_PRESETS[actions.length % COLOR_PRESETS.length];
    const id = `action-${Date.now()}`;
    onChange([...actions, { id, label: "New Action", ...preset }]);
    setEditingId(id); setEditLabel("New Action");
  }

  return (
    <div className="flex flex-col gap-2">
      {actions.map((a) => (
        <div key={a.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 border border-border bg-secondary">
          <div className="relative group/color flex-shrink-0">
            <div className="w-3.5 h-3.5 rounded-full border-2 cursor-pointer" style={{ backgroundColor: a.color, borderColor: a.border }} />
            <div className="absolute left-0 top-5 z-20 hidden group-hover/color:flex flex-wrap gap-1 bg-popover border border-border rounded-md p-2 w-36 shadow-xl">
              {COLOR_PRESETS.map((p, i) => (
                <div key={i} onClick={() => onChange(actions.map((x) => x.id === a.id ? { ...x, ...p } : x))}
                  className="w-5 h-5 rounded-full border-2 cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: p.color, borderColor: p.border }} />
              ))}
            </div>
          </div>
          {editingId === a.id ? (
            <input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(a.id); if (e.key === "Escape") setEditingId(null); }}
              className="flex-1 bg-transparent text-foreground text-xs font-medium focus:outline-none border-b border-primary" />
          ) : (
            <span className="flex-1 text-xs font-medium truncate" style={{ color: a.color }}>{a.label}</span>
          )}
          <div className="flex gap-1 flex-shrink-0">
            {editingId === a.id ? (
              <>
                <button onClick={() => commitEdit(a.id)} className="text-primary hover:text-primary/80"><Check size={12} /></button>
                <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
              </>
            ) : (
              <>
                <button onClick={() => startEdit(a)} className="text-muted-foreground hover:text-foreground"><Pencil size={11} /></button>
                {actions.length > 1 && <button onClick={() => onChange(actions.filter((x) => x.id !== a.id))} className="text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>}
              </>
            )}
          </div>
        </div>
      ))}
      <button onClick={addAction} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1">
        <Plus size={12} /> Add action
      </button>
    </div>
  );
}

// ─── Range Builder ────────────────────────────────────────────────────────────

interface BuilderProps {
  ranges: Range[];
  actions: ActionDef[];
  rangeFolders: Folder[];
  onSaveRange: (r: Range) => void;
  onDeleteRange: (id: string) => void;
  onMoveRange: (id: string, folderId: string | null) => void;
  onNewRangeFolder: (parentId: string | null) => void;
  onRenameRangeFolder: (id: string, name: string) => void;
  onDeleteRangeFolder: (id: string) => void;
  onActionsChange: (a: ActionDef[]) => void;
}

function Builder({ ranges, actions, rangeFolders, onSaveRange, onDeleteRange, onMoveRange, onNewRangeFolder, onRenameRangeFolder, onDeleteRangeFolder, onActionsChange }: BuilderProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rangeName, setRangeName] = useState("New Range");
  const [grid, setGrid] = useState<Record<string, string>>({});
  const [selectedAction, setSelectedAction] = useState<string>(actions[0]?.id ?? "");
  const [showActionManager, setShowActionManager] = useState(false);

  useEffect(() => {
    if (!actions.find((a) => a.id === selectedAction)) setSelectedAction(actions[0]?.id ?? "");
  }, [actions, selectedAction]);

  function newRange() { setEditingId(null); setRangeName("New Range"); setGrid({}); }
  function loadRange(r: Range) { setEditingId(r.id); setRangeName(r.name); setGrid({ ...r.grid }); }
  function saveRange() {
    if (!rangeName.trim()) return;
    const id = editingId ?? `range-${Date.now()}`;
    const existing = ranges.find((r) => r.id === id);
    onSaveRange({ id, name: rangeName.trim(), grid, folderId: existing?.folderId ?? null });
    setEditingId(id);
  }
  const paint = useCallback((hand: string) => {
    setGrid((prev) => {
      if (prev[hand] === selectedAction) { const next = { ...prev }; delete next[hand]; return next; }
      return { ...prev, [hand]: selectedAction };
    });
  }, [selectedAction]);

  const filledCount = Object.keys(grid).length;
  const actionCounts = actions.map((a) => ({ ...a, count: Object.values(grid).filter((v) => v === a.id).length })).filter((a) => a.count > 0);

  return (
    <div className="flex gap-5 h-full">
      <aside className="w-52 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
        <button onClick={newRange} className="w-full text-sm font-semibold py-2 px-3 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex-shrink-0">
          + New Range
        </button>
        <div className="flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Folders</span>
          <button onClick={() => onNewRangeFolder(null)} className="text-muted-foreground hover:text-primary transition-colors"><FolderPlus size={12} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <FolderTree
            items={ranges}
            folders={rangeFolders}
            onMoveItem={onMoveRange}
            onDeleteFolder={onDeleteRangeFolder}
            onRenameFolder={onRenameRangeFolder}
            selectedItemId={editingId}
            onSelectItem={(item) => { const r = ranges.find((x) => x.id === item.id); if (r) loadRange(r); }}
            renderItem={(item) => {
              const isSelected = item.id === editingId;
              return (
                <div className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors text-xs ${isSelected ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                  <span className="truncate font-medium">{item.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteRange(item.id); if (editingId === item.id) newRange(); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"><X size={10} /></button>
                </div>
              );
            }}
          />
        </div>
        <div className="border-t border-border pt-3 flex-shrink-0">
          <button onClick={() => setShowActionManager((v) => !v)} className="text-xs font-medium text-muted-foreground hover:text-foreground w-full flex items-center justify-between mb-2 transition-colors">
            <span className="uppercase tracking-wider">Actions</span>
            {showActionManager ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showActionManager && <ActionManager actions={actions} onChange={onActionsChange} />}
        </div>
      </aside>

      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-3">
          <input value={rangeName} onChange={(e) => setRangeName(e.target.value)} className="flex-1 bg-secondary text-foreground text-sm font-medium px-3 py-2 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Range name..." />
          <button onClick={() => setGrid({})} className="text-xs px-3 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">Clear</button>
          <button onClick={saveRange} className="text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">Save</button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {actions.map((a) => {
            const aStyle = getActionStyle(a);
            return (
              <button key={a.id} onClick={() => setSelectedAction(a.id)} style={{ backgroundColor: selectedAction === a.id ? aStyle.backgroundColor : "transparent", borderColor: selectedAction === a.id ? aStyle.borderColor : "var(--border)", color: selectedAction === a.id ? aStyle.color : "var(--muted-foreground)", boxShadow: selectedAction === a.id ? `0 0 8px ${aStyle.color}40` : undefined }} className="px-3 py-1.5 rounded-full border text-xs font-semibold transition-all whitespace-nowrap">
                {a.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex gap-5 min-h-0">
          <div className="flex-1 overflow-y-auto">
            <RangeGrid grid={grid} actions={actions} selectedAction={selectedAction} onPaint={paint} />
          </div>
          <div className="w-36 flex-shrink-0 flex flex-col gap-3">
            <div className="bg-card rounded-md border border-border p-3 text-center">
              <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{filledCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">hands assigned</p>
              <p className="text-xs text-muted-foreground">{((filledCount / 169) * 100).toFixed(1)}% of range</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {actionCounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <span style={{ color: a.color }} className="font-medium truncate mr-1">{a.label}</span>
                  <span className="text-muted-foreground flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{a.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Trainer ──────────────────────────────────────────────────────────────────

type TrainerPhase = "idle" | "question" | "result";
type TrainerView = "drills" | "edit-drill" | "training";

function pickRandomHand(grid: Record<string, string>): string | null {
  const hands = Object.keys(grid);
  return hands.length === 0 ? null : hands[Math.floor(Math.random() * hands.length)];
}

interface TrainerProps {
  ranges: Range[];
  actions: ActionDef[];
  drills: Drill[];
  drillFolders: Folder[];
  onSaveDrill: (d: Drill) => void;
  onDeleteDrill: (id: string) => void;
  onMoveDrill: (id: string, folderId: string | null) => void;
  onNewDrillFolder: (parentId: string | null) => void;
  onRenameDrillFolder: (id: string, name: string) => void;
  onDeleteDrillFolder: (id: string) => void;
}

function Trainer({ ranges, actions, drills, drillFolders, onSaveDrill, onDeleteDrill, onMoveDrill, onNewDrillFolder, onRenameDrillFolder, onDeleteDrillFolder }: TrainerProps) {
  const [view, setView] = useState<TrainerView>("drills");
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const [editingDrill, setEditingDrill] = useState<Drill | undefined>(undefined);

  // Training state
  const [phase, setPhase] = useState<TrainerPhase>("idle");
  const [currentHand, setCurrentHand] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [revealGrid, setRevealGrid] = useState(false);

  // Session state
  const [sessions, setSessions] = useState<SessionData[]>(() => loadSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);

  const selectedDrill = drills.find((d) => d.id === selectedDrillId) ?? null;
  const selectedRange = selectedDrill ? ranges.find((r) => r.id === selectedDrill.rangeId) ?? null : null;
  const actionMap = Object.fromEntries(actions.map((a) => [a.id, a]));
  const rangeActions = selectedRange ? actions.filter((a) => Object.values(selectedRange.grid).includes(a.id)) : actions;
  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null;
  const viewingSession = sessions.find((s) => s.id === viewingSessionId) ?? null;
  const activeSession = sessions.find((s) => s.drillId === selectedDrillId && s.endedAt === null) ?? null;
  const stats = { correct: currentSession?.correct ?? 0, total: currentSession?.total ?? 0 };
  const accuracy = stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) : null;
  const correctActionId = currentHand && selectedRange ? selectedRange.grid[currentHand] : null;
  const correctAction = correctActionId ? actionMap[correctActionId] : null;
  const isCorrect = userAnswer === correctActionId;

  function selectDrill(drill: Drill) {
    setSelectedDrillId(drill.id);
    setViewingSessionId(null);
    const loaded = loadSessions();
    setSessions(loaded);
    const active = loaded.find((s) => s.drillId === drill.id && s.endedAt === null);
    setCurrentSessionId(active?.id ?? null);
    setView("training");
    setPhase("idle");
    setCurrentHand(null);
    setUserAnswer(null);
    setRevealGrid(false);
  }

  function startNewDrill() {
    setEditingDrill(undefined);
    setView("edit-drill");
  }

  function editDrill(drill: Drill) {
    setEditingDrill(drill);
    setView("edit-drill");
  }

  function saveDrill(drill: Drill) {
    onSaveDrill(drill);
    setSelectedDrillId(drill.id);
    setView("training");
  }

  function startTraining() {
    if (!selectedDrill || !selectedRange) return;
    const updated = sessions.map((s) =>
      s.drillId === selectedDrill.id && s.endedAt === null
        ? { ...s, endedAt: Date.now() }
        : s
    );
    const newSession: SessionData = {
      id: `session-${Date.now()}`,
      drillId: selectedDrill.id,
      startedAt: Date.now(),
      endedAt: null,
      total: 0,
      correct: 0,
      history: [],
      comboStats: {},
    };
    const allSessions = [...updated, newSession];
    setSessions(allSessions);
    setCurrentSessionId(newSession.id);
    saveSessions(allSessions);
    nextHand(selectedRange);
  }

  function resumeTraining() {
    if (!selectedRange || !activeSession) return;
    setPhase("question");
    nextHand(selectedRange);
  }

  function stopTraining() {
    if (!currentSession) return;
    const updatedSessions = sessions.map((s) =>
      s.id === currentSession.id ? { ...s, endedAt: Date.now() } : s
    );
    setSessions(updatedSessions);
    setCurrentSessionId(null);
    saveSessions(updatedSessions);
    setPhase("idle");
    setCurrentHand(null);
    setUserAnswer(null);
    setRevealGrid(false);
  }

  function nextHand(range: Range) {
    const hand = pickRandomHand(range.grid);
    setCurrentHand(hand);
    setUserAnswer(null);
    setRevealGrid(false);
    setPhase(hand ? "question" : "idle");
  }

  function answer(actionId: string) {
    if (phase !== "question" || !currentHand || !selectedRange || !currentSession) return;
    const correct = selectedRange.grid[currentHand];
    const isCorrect = actionId === correct;
    setUserAnswer(actionId);
    setRevealGrid(true);
    if (isCorrect) {
      toast("Correct", { icon: <Check size={18} className="text-green-500" /> });
    } else {
      toast(`Incorrect — ${correctAction?.label ?? correctActionId}`, { icon: <X size={18} className="text-red-500" /> });
    }
    const updatedSessions = sessions.map((s) => {
      if (s.id !== currentSession.id) return s;
      const prevCombo = s.comboStats[currentHand] ?? { correct: 0, total: 0 };
      return {
        ...s,
        total: s.total + 1,
        correct: s.correct + (isCorrect ? 1 : 0),
        history: [{ hand: currentHand, correct: isCorrect }, ...s.history],
        comboStats: {
          ...s.comboStats,
          [currentHand]: {
            correct: prevCombo.correct + (isCorrect ? 1 : 0),
            total: prevCombo.total + 1,
          },
        },
      };
    });
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
    setTimeout(() => nextHand(selectedRange), 1500);
  }

  function viewSession(sessionId: string) {
    setViewingSessionId(sessionId);
  }

  function backToTraining() {
    setViewingSessionId(null);
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function renderHandCards(hand: string) {
    const isPair = hand.length === 2;
    const isSuited = hand.endsWith("s");
    const suits = isPair ? ["♠", "♥"] : isSuited ? ["♠", "♠"] : ["♠", "♥"];
    const suitColors = ["var(--card-foreground)", "#ef4444"];
    return (
      <div className="flex gap-3 justify-center">
        {[hand[0], hand[1]].map((rank, i) => (
          <div key={i} className="rounded-xl border border-border flex flex-col items-center justify-center" style={{ width: 72, height: 96, backgroundColor: "var(--card)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: "var(--card-foreground)", lineHeight: 1 }}>{rank}</span>
            <span style={{ fontSize: 22, color: suitColors[i], lineHeight: 1, marginTop: 4 }}>{suits[i]}</span>
          </div>
        ))}
      </div>
    );
  }

  function renderMiniHandCards(hand: string) {
    const isPair = hand.length === 2;
    const isSuited = hand.endsWith("s");
    const suits = isPair ? ["♠", "♥"] : isSuited ? ["♠", "♠"] : ["♠", "♥"];
    const suitColors = ["var(--card-foreground)", "#ef4444"];
    return (
      <div className="flex gap-0.5">
        {[hand[0], hand[1]].map((rank, i) => (
          <div key={i} className="rounded border border-border flex flex-col items-center justify-center" style={{ width: 36, height: 48, backgroundColor: "var(--card)" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: "var(--card-foreground)", lineHeight: 1 }}>{rank}</span>
            <span style={{ fontSize: 11, color: suitColors[i], lineHeight: 1 }}>{suits[i]}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-5 h-full">
      {/* ── Sidebar ── */}
      <aside className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto border-r border-border pr-4">
        {/* Drills section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drills</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onNewDrillFolder(null)}
                className="text-muted-foreground hover:text-primary transition-colors"
                title="New folder"
              >
                <FolderPlus size={12} />
              </button>
              <button
                onClick={startNewDrill}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus size={11} /> New
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <FolderTree
              items={drills}
              folders={drillFolders}
              onMoveItem={onMoveDrill}
              onDeleteFolder={onDeleteDrillFolder}
              onRenameFolder={onRenameDrillFolder}
              selectedItemId={selectedDrillId}
              onSelectItem={(item) => { const d = drills.find((x) => x.id === item.id); if (d) selectDrill(d); }}
              renderItem={(item) => {
                const d = drills.find((x) => x.id === item.id);
                const active = item.id === selectedDrillId;
                return (
                  <div className={`group flex items-start justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${active ? "bg-accent" : "hover:bg-secondary"}`}>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-medium truncate ${active ? "text-accent-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{item.name}</span>
                      {d && (
                        <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {d.numPlayers}p · {d.heroPosition}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-1">
                      <button onClick={(e) => { e.stopPropagation(); if (d) editDrill(d); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"><Pencil size={9} /></button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteDrill(item.id); if (selectedDrillId === item.id) { setSelectedDrillId(null); setView("drills"); } }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"><Trash2 size={9} /></button>
                    </div>
                  </div>
                );
              }}
              emptyMessage="No drills yet — create one to get started."
            />
          </div>
        </div>

        {/* Training section (only when a drill is active) */}
        {selectedDrill && view === "training" && (
          <>
            {/* Active session card (shown when idle and active session exists) */}
            {activeSession && phase === "idle" && (
              <div className="bg-card rounded-md border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Active Session</p>
                <p className="text-2xl font-bold text-center" style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: parseFloat(accuracy!) >= 80 ? "#22c55e" : parseFloat(accuracy!) >= 60 ? "#fbbf24" : "#ef4444",
                }}>
                  {accuracy}%
                </p>
                <p className="text-xs text-muted-foreground text-center">{stats.correct}/{stats.total} correct</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={resumeTraining} className="flex-1 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                    Resume
                  </button>
                  <button onClick={stopTraining} className="flex-1 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">
                    End
                  </button>
                </div>
              </div>
            )}

            {/* Live training stats (shown during active training) */}
            {phase !== "idle" && stats.total > 0 && (
              <div className="bg-card rounded-md border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Session</p>
                <p className="text-2xl font-bold text-center" style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: parseFloat(accuracy!) >= 80 ? "#22c55e" : parseFloat(accuracy!) >= 60 ? "#fbbf24" : "#ef4444",
                }}>
                  {accuracy}%
                </p>
                <p className="text-xs text-muted-foreground text-center">{stats.correct}/{stats.total} correct</p>
              </div>
            )}

            {/* History (shown during active training) */}
            {phase !== "idle" && currentSession && currentSession.history.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</span>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                  {currentSession.history.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between">
                      {renderMiniHandCards(entry.hand)}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${entry.correct ? "bg-green-500" : "bg-red-500"}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* End Session button (shown during active training) */}
            {phase !== "idle" && (
              <button onClick={stopTraining} className="flex items-center justify-center gap-2 w-full py-2 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">
                <Square size={10} /> End Session
              </button>
            )}

            {/* Range map toggle (shown during training) */}
            {selectedRange && phase !== "idle" && (
              <div className="flex flex-col gap-1.5">
                <button onClick={() => setRevealGrid((v) => !v)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors text-left">
                  {revealGrid ? "▼ Range map" : "▶ Range map"}
                </button>
                {revealGrid && (
                  <RangeGrid grid={selectedRange.grid} actions={actions} selectedAction="" onPaint={() => {}} readOnly highlightHand={currentHand} />
                )}
              </div>
            )}

            {/* Past sessions */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Past Sessions</span>
              {sessions.filter((s) => s.drillId === selectedDrill.id && s.endedAt !== null).length === 0 && (
                <p className="text-xs text-muted-foreground">No completed sessions yet.</p>
              )}
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                {sessions
                  .filter((s) => s.drillId === selectedDrill.id && s.endedAt !== null)
                  .sort((a, b) => b.startedAt - a.startedAt)
                  .map((s) => {
                    const pct = s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : "0.0";
                    return (
                      <div
                        key={s.id}
                        onClick={() => viewSession(s.id)}
                        className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-xs ${
                          viewingSessionId === s.id ? "bg-accent text-accent-foreground" : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">{formatDate(s.startedAt)}</span>
                          <span className="text-[10px] opacity-70">{s.total} hands</span>
                        </div>
                        <span className="font-bold flex-shrink-0 ml-2" style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: parseFloat(pct) >= 80 ? "#22c55e" : parseFloat(pct) >= 60 ? "#fbbf24" : "#ef4444",
                        }}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 overflow-y-auto min-w-0">

        {/* No drill selected — show overview */}
        {view === "drills" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-primary/30 flex items-center justify-center" style={{ backgroundColor: "var(--accent)" }}>
              <span style={{ fontSize: 28 }}>🃏</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Drill Trainer</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {drills.length === 0 ? "Create a drill to define your table setup and start training." : "Select a drill from the sidebar or create a new one."}
              </p>
            </div>
            <button onClick={startNewDrill} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
              <Plus size={15} /> Create Drill
            </button>
          </div>
        )}

        {/* Drill editor */}
        {view === "edit-drill" && (
          <div className="p-2">
            <h2 className="text-base font-semibold text-foreground mb-5">
              {editingDrill ? "Edit Drill" : "New Drill"}
            </h2>
            <DrillEditor
              initial={editingDrill}
              ranges={ranges}
              onSave={saveDrill}
              onCancel={() => setView(selectedDrill ? "training" : "drills")}
            />
          </div>
        )}

        {/* Session detail view */}
        {view === "training" && selectedDrill && viewingSession && (
          <div className="flex flex-col gap-6 h-full overflow-y-auto">
            <button onClick={backToTraining} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start">
              ← Back to Training
            </button>
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Session Details</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(viewingSession.startedAt)} — {viewingSession.endedAt ? formatDate(viewingSession.endedAt) : "In progress"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold" style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: viewingSession.total > 0 && (viewingSession.correct / viewingSession.total) >= 0.8 ? "#22c55e" : viewingSession.total > 0 && (viewingSession.correct / viewingSession.total) >= 0.6 ? "#fbbf24" : "#ef4444",
                  }}>
                    {viewingSession.total > 0 ? ((viewingSession.correct / viewingSession.total) * 100).toFixed(1) : "0.0"}%
                  </p>
                  <p className="text-xs text-muted-foreground">{viewingSession.correct}/{viewingSession.total} correct</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Per-Combo Accuracy</h4>
                  <SessionGrid comboStats={viewingSession.comboStats} />
                </div>
                <div className="w-48 flex-shrink-0">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Combo Breakdown</h4>
                  <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
                    {Object.entries(viewingSession.comboStats)
                      .sort(([, a], [, b]) => (b.correct / b.total) - (a.correct / a.total))
                      .map(([hand, cs]) => {
                        const pct = (cs.correct / cs.total) * 100;
                        return (
                          <div key={hand} className="flex items-center justify-between text-xs py-0.5 px-1 rounded hover:bg-secondary">
                            <span className="font-mono font-medium">{hand}</span>
                            <span style={{ color: pct >= 80 ? "#22c55e" : pct >= 60 ? "#ca8a04" : "#dc2626" }}>
                              {cs.correct}/{cs.total}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Training view */}
        {view === "training" && selectedDrill && !viewingSession && (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            {phase === "idle" && (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  {!selectedRange
                    ? "No range configured for this drill. Edit the drill to select a range."
                    : `"${selectedRange.name}" · ${Object.keys(selectedRange.grid).length} hands`}
                </p>
                {activeSession ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-card rounded-xl border border-border p-5 text-center min-w-60">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Active Session</p>
                      <p className="text-4xl font-bold" style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: parseFloat(accuracy!) >= 80 ? "#22c55e" : parseFloat(accuracy!) >= 60 ? "#fbbf24" : "#ef4444",
                      }}>
                        {accuracy}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{stats.correct}/{stats.total} correct</p>
                    </div>
                    <button onClick={resumeTraining} disabled={!selectedRange} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      Resume Current Session
                    </button>
                    <button onClick={startTraining} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                      Start New Session
                    </button>
                  </div>
                ) : (
                  <button onClick={startTraining} disabled={!selectedRange} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    Start Training
                  </button>
                )}
              </div>
            )}

            {phase === "question" && currentHand && (
              <div className="flex flex-col items-center gap-6 w-full max-w-6xl">
                {/* Big poker table with hero cards */}
                <div className="w-full">
                  <PokerTable
                    positions={getPositions(selectedDrill.numPlayers)}
                    heroPosition={selectedDrill.heroPosition}
                    heroHand={currentHand}
                    foldedPositions={selectedDrill.foldedPositions}
                    betSizes={selectedDrill.betSizes}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex justify-center w-full">
                  <div className="grid grid-cols-3 gap-3 max-w-lg w-full">
                    {rangeActions.map((a) => (
                      <button key={a.id} onClick={() => answer(a.id)} disabled={userAnswer !== null}
                        style={getActionStyle(a)}
                        className="py-3 rounded-full border font-semibold text-sm hover:brightness-125 transition-all active:scale-95 truncate px-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:brightness-75">
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Folder Tree ─────────────────────────────────────────────────────────────

const DND_ITEM = "TREE_ITEM";

function FolderTree({
  items,
  folders,
  onMoveItem,
  onDeleteFolder,
  onRenameFolder,
  onSelectItem,
  renderItem,
  emptyMessage = "No items yet",
}: {
  items: { id: string; name: string; folderId: string | null }[];
  folders: Folder[];
  onMoveItem: (itemId: string, toFolderId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onSelectItem: (item: { id: string; name: string; folderId: string | null }) => void;
  renderItem: (item: { id: string; name: string; folderId: string | null }) => React.ReactNode;
  emptyMessage?: string;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const prevFolderIds = useRef(new Set(folders.map((f) => f.id)));
  useEffect(() => {
    const currentIds = new Set(folders.map((f) => f.id));
    const newIds = [...currentIds].filter((id) => !prevFolderIds.current.has(id));
    if (newIds.length > 0) {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        return next;
      });
    }
    prevFolderIds.current = currentIds;
  }, [folders]);

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      onRenameFolder(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }

  const rootFolders = folders.filter((f) => f.parentId === null);
  const rootItems = items.filter((i) => i.folderId === null);
  const hasContent = rootFolders.length > 0 || rootItems.length > 0;

  const [{ isOver: isRootOver }, rootDropRef] = useDrop(() => ({
    accept: DND_ITEM,
    drop: (dragItem: { id: string }) => { onMoveItem(dragItem.id, null); },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [items, folders]);

  return (
    <div className="flex flex-col gap-1">
      {rootFolders.map((f) => (
        <FolderNode
          key={f.id}
          folder={f}
          depth={0}
          items={items}
          folders={folders}
          expandedFolders={expandedFolders}
          renamingId={renamingId}
          renameValue={renameValue}
          onToggleFolder={toggleFolder}
          onRenameChange={setRenameValue}
          onCommitRename={commitRename}
          onCancelRename={() => setRenamingId(null)}
          onStartRename={(id, name) => { setRenamingId(id); setRenameValue(name); }}
          onMoveItem={onMoveItem}
          onDeleteFolder={onDeleteFolder}
          onSelectItem={onSelectItem}
          renderItem={renderItem}
        />
      ))}
      <div ref={rootDropRef} className={`flex flex-col gap-1 rounded-sm ${isRootOver ? "bg-accent/50" : ""}`}>
        {rootItems.map((item) => (
          <ItemNode
            key={item.id}
            item={item}
            depth={0}
            onSelectItem={onSelectItem}
            renderItem={renderItem}
          />
        ))}
      </div>
      {!hasContent && (
        <p className="text-xs text-muted-foreground text-center mt-2">{emptyMessage}</p>
      )}
    </div>
  );
}

function FolderNode({
  folder, depth, items, folders, expandedFolders,
  renamingId, renameValue,
  onToggleFolder, onRenameChange, onCommitRename, onCancelRename, onStartRename,
  onMoveItem, onDeleteFolder, onSelectItem, renderItem,
}: {
  folder: Folder; depth: number;
  items: { id: string; name: string; folderId: string | null }[];
  folders: Folder[];
  expandedFolders: Set<string>;
  renamingId: string | null; renameValue: string;
  onToggleFolder: (id: string) => void;
  onRenameChange: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onStartRename: (id: string, name: string) => void;
  onMoveItem: (itemId: string, toFolderId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onSelectItem: (item: { id: string; name: string; folderId: string | null }) => void;
  renderItem: (item: { id: string; name: string; folderId: string | null }) => React.ReactNode;
}) {
  const isExpanded = expandedFolders.has(folder.id);
  const childFolders = folders.filter((f) => f.parentId === folder.id);
  const childItems = items.filter((i) => i.folderId === folder.id);

  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: DND_ITEM,
    drop: (dragItem: { id: string }) => { onMoveItem(dragItem.id, folder.id); },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [folder.id, items, folders]);

  return (
    <div ref={dropRef} className={`transition-colors rounded-sm ${isOver ? "bg-accent/50" : ""}`}>
      <div
        className="flex items-center gap-1 px-1 py-1 rounded-sm hover:bg-secondary cursor-pointer group"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onToggleFolder(folder.id)}
      >
        {isExpanded ? <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />}
        {renamingId === folder.id ? (
          <input
            autoFocus
            value={renameValue}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onCommitRename(); if (e.key === "Escape") onCancelRename(); }}
            onBlur={onCommitRename}
            className="flex-1 bg-secondary text-foreground text-xs font-medium px-2 py-0.5 rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <span className="text-xs font-medium text-muted-foreground truncate flex-1">{folder.name}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onStartRename(folder.id, folder.name); }}
          className="text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
          title="Rename folder"
        >
          <Pencil size={10} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }}
          className="text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
          title="Delete folder"
        >
          <Trash2 size={10} />
        </button>
      </div>
      {isExpanded && (
        <div>
          {childFolders.map((cf) => (
            <FolderNode
              key={cf.id}
              folder={cf}
              depth={depth + 1}
              items={items}
              folders={folders}
              expandedFolders={expandedFolders}
              renamingId={renamingId}
              renameValue={renameValue}
              onToggleFolder={onToggleFolder}
              onRenameChange={onRenameChange}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
              onStartRename={onStartRename}
              onMoveItem={onMoveItem}
              onDeleteFolder={onDeleteFolder}
              onSelectItem={onSelectItem}
              renderItem={renderItem}
            />
          ))}
          {childItems.map((item) => (
            <ItemNode
              key={item.id}
              item={item}
              depth={depth + 1}
              onSelectItem={onSelectItem}
              renderItem={renderItem}
            />
          ))}
          {childFolders.length === 0 && childItems.length === 0 && (
            <div style={{ paddingLeft: `${16 + (depth + 1) * 16}px` }} className="text-[10px] text-muted-foreground py-1">Empty folder</div>
          )}
        </div>
      )}
    </div>
  );
}

function ItemNode({
  item, depth, onSelectItem, renderItem,
}: {
  item: { id: string; name: string; folderId: string | null };
  depth: number;
  onSelectItem: (item: { id: string; name: string; folderId: string | null }) => void;
  renderItem: (item: { id: string; name: string; folderId: string | null }) => React.ReactNode;
}) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: DND_ITEM,
    item: { id: item.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [item.id]);

  return (
    <div
      ref={dragRef}
      className={`transition-opacity ${isDragging ? "opacity-40" : ""}`}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={() => onSelectItem(item)}
    >
      {renderItem(item)}
    </div>
  );
}

// ─── LocalStorage persistence ─────────────────────────────────────────────────

const STORAGE_KEY = "poker-trainer-data";

function loadFromStorage(): Partial<AppData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveToStorage(data: AppData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

const SESSIONS_KEY = "poker-trainer-sessions";

function loadSessions(): SessionData[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: SessionData[]) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch { /* quota */ }
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { theme, setTheme } = useTheme();
  const saved = useRef(loadFromStorage()).current;
  const [tab, setTab] = useState<"builder" | "trainer">("builder");
  const [ranges, setRanges] = useState<Range[]>(() => (saved.ranges ?? []).map((r) => ({ ...r, folderId: r.folderId ?? null })));
  const [actions, setActions] = useState<ActionDef[]>(saved.actions ?? DEFAULT_ACTIONS);
  const [drills, setDrills] = useState<Drill[]>(() => (saved.drills ?? []).map((d) => ({ ...d, folderId: d.folderId ?? null })));
  const [rangeFolders, setRangeFolders] = useState<Folder[]>(saved.rangeFolders ?? []);
  const [drillFolders, setDrillFolders] = useState<Folder[]>(saved.drillFolders ?? []);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => { saveToStorage({ actions, ranges, drills, rangeFolders, drillFolders }); }, [actions, ranges, drills, rangeFolders, drillFolders]);

  function saveRange(range: Range) {
    setRanges((prev) => {
      const idx = prev.findIndex((r) => r.id === range.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = range; return next; }
      return [...prev, range];
    });
  }

  function saveDrill(drill: Drill) {
    setDrills((prev) => {
      const idx = prev.findIndex((d) => d.id === drill.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = drill; return next; }
      return [...prev, drill];
    });
  }

  function deleteRange(id: string) {
    setRanges((p) => p.filter((r) => r.id !== id));
  }

  function deleteDrill(id: string) {
    setDrills((p) => p.filter((d) => d.id !== id));
  }

  function moveRange(id: string, folderId: string | null) {
    setRanges((prev) => prev.map((r) => r.id === id ? { ...r, folderId } : r));
  }

  function moveDrill(id: string, folderId: string | null) {
    setDrills((prev) => prev.map((d) => d.id === id ? { ...d, folderId } : d));
  }

  function newRangeFolder(parentId: string | null) {
    const id = `rfolder-${Date.now()}`;
    setRangeFolders((prev) => [...prev, { id, name: "New Folder", parentId }]);
  }

  function renameRangeFolder(id: string, name: string) {
    setRangeFolders((prev) => prev.map((f) => f.id === id ? { ...f, name } : f));
  }

  function deleteRangeFolder(id: string) {
    const idsToDelete = new Set<string>();
    function collectIds(fid: string) {
      idsToDelete.add(fid);
      rangeFolders.filter((f) => f.parentId === fid).forEach((f) => collectIds(f.id));
    }
    collectIds(id);
    setRangeFolders((prev) => prev.filter((f) => !idsToDelete.has(f.id)));
    setRanges((prev) => prev.map((r) => idsToDelete.has(r.folderId ?? "") ? { ...r, folderId: null } : r));
  }

  function newDrillFolder(parentId: string | null) {
    const id = `dfolder-${Date.now()}`;
    setDrillFolders((prev) => [...prev, { id, name: "New Folder", parentId }]);
  }

  function renameDrillFolder(id: string, name: string) {
    setDrillFolders((prev) => prev.map((f) => f.id === id ? { ...f, name } : f));
  }

  function deleteDrillFolder(id: string) {
    const idsToDelete = new Set<string>();
    function collectIds(fid: string) {
      idsToDelete.add(fid);
      drillFolders.filter((f) => f.parentId === fid).forEach((f) => collectIds(f.id));
    }
    collectIds(id);
    setDrillFolders((prev) => prev.filter((f) => !idsToDelete.has(f.id)));
    setDrills((prev) => prev.map((d) => idsToDelete.has(d.folderId ?? "") ? { ...d, folderId: null } : d));
  }

  function exportData() {
    const data: AppData = { actions, ranges, drills, rangeFolders, drillFolders };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poker-ranges-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Partial<AppData>;
        if (data.actions && Array.isArray(data.actions)) setActions(data.actions);
        if (data.ranges && Array.isArray(data.ranges)) setRanges(data.ranges.map((r) => ({ ...r, folderId: r.folderId ?? null })));
        if (data.drills && Array.isArray(data.drills)) setDrills(data.drills.map((d) => ({ ...d, folderId: d.folderId ?? null })));
        if (data.rangeFolders && Array.isArray(data.rangeFolders)) setRangeFolders(data.rangeFolders);
        if (data.drillFolders && Array.isArray(data.drillFolders)) setDrillFolders(data.drillFolders);
      } catch { alert("Invalid file format."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full h-screen flex flex-col overflow-hidden bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
        <header className="flex-shrink-0 border-b border-border px-6 py-3 flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <img src={logoSvg as string} alt="GrindSafe Trainer" className="h-[22px]" />
              <a href="https://github.com/grindsafes/preflop-trainer" target="_blank" rel="noopener noreferrer"><img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/grindsafes/preflop-trainer" className="h-5" /></a>
          </div>
          <nav className="flex gap-1">
            {(["builder", "trainer"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "builder" ? "Range Builder" : "Trainer"}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-2">{ranges.length} range{ranges.length !== 1 ? "s" : ""} · {drills.length} drill{drills.length !== 1 ? "s" : ""}</span>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <button onClick={exportData} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
              <Download size={13} /> Export
            </button>
            <button onClick={() => importRef.current?.click()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
              <Upload size={13} /> Import
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={importData} />
          </div>
        </header>

        <main className="flex-1 overflow-hidden p-5">
          {tab === "builder" ? (
            <Builder ranges={ranges} actions={actions} rangeFolders={rangeFolders} onSaveRange={saveRange} onDeleteRange={deleteRange} onMoveRange={moveRange} onNewRangeFolder={newRangeFolder} onRenameRangeFolder={renameRangeFolder} onDeleteRangeFolder={deleteRangeFolder} onActionsChange={setActions} />
          ) : (
            <Trainer ranges={ranges} actions={actions} drills={drills} drillFolders={drillFolders} onSaveDrill={saveDrill} onDeleteDrill={deleteDrill} onMoveDrill={moveDrill} onNewDrillFolder={newDrillFolder} onRenameDrillFolder={renameDrillFolder} onDeleteDrillFolder={deleteDrillFolder} />
          )}
        </main>
      </div>
    </DndProvider>
  );
}
