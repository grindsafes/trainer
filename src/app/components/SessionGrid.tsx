import { RANKS } from "../constants";
import { getHandLabel } from "../utils";
import type { ComboStat } from "../types";

interface SessionGridProps {
  comboStats: Record<string, ComboStat>;
}

export function SessionGrid({ comboStats }: SessionGridProps) {
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
