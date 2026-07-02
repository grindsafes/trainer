import { useCallback, useRef, useEffect } from "react";
import { RANKS } from "../constants";
import { getHandLabel, getActionStyle } from "../utils";
import type { ActionDef } from "../types";

interface RangeGridProps {
  grid: Record<string, string>;
  actions: ActionDef[];
  selectedAction: string;
  onPaint: (hand: string) => void;
  readOnly?: boolean;
  highlightHand?: string | null;
}

export function RangeGrid({
  grid, actions, selectedAction, onPaint, readOnly = false, highlightHand,
}: RangeGridProps) {
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
