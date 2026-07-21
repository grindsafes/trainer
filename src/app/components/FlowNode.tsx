import { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import type { LineNodeData } from "../types";

const RANKS = "23456789TJQKA";
const SUITS = ["s", "h", "d", "c"] as const;
const SUIT_SYMBOLS: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_COLORS: Record<string, string> = { s: "#000", h: "#ef4444", d: "#3b82f6", c: "#22c55e" };

function parseSingleCard(card: string) {
  if (card.length < 2) return null;
  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();
  return { rank, suit: SUIT_SYMBOLS[suit], color: SUIT_COLORS[suit] ?? "var(--card-foreground)", rawSuit: suit };
}

function parseBoardCards(boardCards: string) {
  return boardCards.split(",").map(c => c.trim()).filter(Boolean).map(parseSingleCard).filter(Boolean) as { rank: string; suit: string; color: string; rawSuit: string }[];
}

const STREET_COLORS: Record<string, { bg: string; border: string; text: string; headerBg: string }> = {
  preflop: { bg: "bg-violet-500/5", border: "border-violet-500/25", text: "text-violet-500", headerBg: "bg-violet-500/10" },
  flop: { bg: "bg-emerald-500/5", border: "border-emerald-500/25", text: "text-emerald-500", headerBg: "bg-emerald-500/10" },
  turn: { bg: "bg-amber-500/5", border: "border-amber-500/25", text: "text-amber-500", headerBg: "bg-amber-500/10" },
  river: { bg: "bg-rose-500/5", border: "border-rose-500/25", text: "text-rose-500", headerBg: "bg-rose-500/10" },
};

const NEUTRAL_BG = "bg-secondary dark:bg-secondary";
const NEUTRAL_BORDER = "border-border";
const CORRECT_BORDER = "border-green-500 dark:border-green-400";
const SELECTED_RING = "ring-2 ring-primary";

const ACTOR_LABELS: Record<string, string> = {
  hero: "H",
  villain: "V",
  none: "",
};

const ACTION_LABELS: Record<string, string> = {
  check: "Check",
  bet: "Bet",
  raise: "Raise",
  call: "Call",
  fold: "Fold",
  allin: "All-in",
};

export const RootNode = memo(({ id, data, selected }: NodeProps<LineNodeData>) => {
  const { updateNodeData } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = useCallback(() => {
    const val = editValue.trim();
    if (val && val !== data.label) {
      updateNodeData(id, { label: val });
    }
    setEditing(false);
  }, [editValue, data.label, id, updateNodeData]);

  const startEditing = useCallback(() => {
    setEditValue(data.label || "");
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [data.label]);

  const stopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className={`px-5 py-3 rounded-xl border-2 bg-foreground text-background dark:bg-white dark:text-black font-bold text-sm tracking-wide shadow-md transition-shadow ${
        selected ? "shadow-lg ring-2 ring-primary" : ""
      }`}
    >
      <Handle type="source" position={Position.Bottom} className="!bg-foreground dark:!bg-white" />
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setEditing(false);
            e.stopPropagation();
          }}
          onPointerDown={stopPropagation}
          className="bg-transparent text-background dark:text-black outline-none w-full min-w-[80px]"
        />
      ) : (
        <span onDoubleClick={startEditing} className="cursor-pointer">
          {data.label || "New Scenario"}
        </span>
      )}
    </div>
  );
});

const BET_SIZE_RE = /^\d+(\.\d+)?%$/;

function isValidBetSize(val: string) {
  return val === "" || BET_SIZE_RE.test(val);
}

export const ActionNode = memo(({ id, data, selected }: NodeProps<LineNodeData>) => {
  const { updateNodeData } = useReactFlow();

  const stopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  const borderClass = data.correct ? CORRECT_BORDER : NEUTRAL_BORDER;

  return (
    <div
      className={`rounded-md border-2 w-[200px] transition-shadow ${NEUTRAL_BG} ${borderClass} ${
        selected ? `shadow-lg ${SELECTED_RING}` : "shadow-sm"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-border" />
      <div className="p-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <select
            value={data.actionType ?? "check"}
            onChange={(e) => {
              const at = e.target.value as LineNodeData["actionType"];
              const updates: Partial<LineNodeData> = { actionType: at };
              if (at === "check" || at === "call" || at === "allin" || at === "fold") {
                updates.betSize = "";
              }
              updateNodeData(id, updates);
            }}
            onPointerDown={stopPropagation}
            className="flex-1 text-[11px] font-semibold rounded px-1.5 py-1 border bg-background text-foreground border-border focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
          >
            {(["check", "bet", "raise", "call", "fold", "allin"] as const)
              .map((at) => (
              <option key={at} value={at}>{ACTION_LABELS[at]}</option>
            ))}
          </select>
          <select
            value={data.actor}
            onChange={(e) => {
              const newActor = e.target.value as LineNodeData["actor"];
              updateNodeData(id, { actor: newActor });
            }}
            onPointerDown={stopPropagation}
            className="text-[10px] rounded px-1.5 py-1 border bg-background text-muted-foreground border-border focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer uppercase"
          >
            {(["hero", "villain", "none"] as const).map((a) => (
              <option key={a} value={a}>{ACTOR_LABELS[a] || "—"}</option>
            ))}
          </select>
          {data.correct && (
            <span className="text-[10px] leading-none font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-1 py-0.5 rounded flex-shrink-0">
              ✓
            </span>
          )}
        </div>
        {data.actionType && data.actionType !== "check" && data.actionType !== "call" && data.actionType !== "allin" && data.actionType !== "fold" && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{ACTION_LABELS[data.actionType]}</span>
            <input
              type="text"
              value={data.betSize ?? ""}
              onChange={(e) => updateNodeData(id, { betSize: e.target.value })}
              onPointerDown={stopPropagation}
              placeholder="e.g. 33%"
              className={`flex-1 text-[10px] rounded px-1.5 py-1 border font-mono ${
                data.betSize && !isValidBetSize(data.betSize)
                  ? "border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600"
                  : "bg-background text-foreground border-border"
              } focus:outline-none focus:ring-1 focus:ring-primary`}
            />
          </div>
        )}
        <label className="flex items-center gap-1.5 cursor-pointer" onPointerDown={stopPropagation}>
          <input
            type="checkbox"
            checked={data.correct ?? false}
            onChange={(e) => updateNodeData(id, { correct: e.target.checked })}
            className="accent-green-600 w-3 h-3"
          />
          <span className="text-[9px] text-muted-foreground">Correct</span>
        </label>
        {data.actor === "villain" && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">Weight</span>
            <input
              type="number"
              min={0}
              max={100}
              value={data.weight ?? ""}
              onChange={(e) => updateNodeData(id, { weight: e.target.value === "" ? undefined : Number(e.target.value) })}
              onPointerDown={stopPropagation}
              placeholder="50"
              className="flex-1 text-[10px] rounded px-1.5 py-1 border font-mono bg-background text-foreground border-border focus:outline-none focus:ring-1 focus:ring-primary w-14"
            />
            <span className="text-[10px] text-muted-foreground">%</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-border" />
    </div>
  );
});

export const StreetNode = memo(({ data, selected }: NodeProps<LineNodeData>) => {
  const sc = STREET_COLORS[data.street] ?? STREET_COLORS.flop;
  const cards = data.street !== "preflop" && data.boardCards ? parseBoardCards(data.boardCards) : [];
  return (
    <div
      className={`rounded-xl border-2 ${sc.bg} ${sc.border} transition-shadow ${
        selected ? "shadow-lg ring-2 ring-primary/40" : ""
      }`}
      style={{ minWidth: 200, minHeight: 80 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-border" />
      <div className={`px-3 py-1 rounded-t-xl border-b ${sc.headerBg} ${sc.border}`}>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${sc.text}`}>
          {data.label || data.street}
        </span>
      </div>
      {cards.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-2 justify-center">
          {cards.map((c, i) => (
            <div
              key={i}
              className="rounded border border-border flex flex-col items-center justify-center"
              style={{ width: 28, height: 38, backgroundColor: "var(--card)" }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.rank}</span>
              <span style={{ fontSize: 8, color: c.color, lineHeight: 1 }}>{c.suit}</span>
            </div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-border" />
    </div>
  );
});

export const StreetGroupNode = StreetNode; // backward compat
