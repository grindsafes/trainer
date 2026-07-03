import { T_CX, T_CY, T_RX, T_RY, S_RX, S_RY } from "../constants";
import { getSeatPos, getAngle, parseCombo } from "../utils";

interface PokerTableProps {
  positions: string[];
  heroPosition: string;
  onSelectHero?: (pos: string) => void;
  compact?: boolean;
  heroHand?: string | null;
  foldedPositions?: string[];
  betSizes?: Record<string, string>;
}

export function PokerTable({ positions, heroPosition, onSelectHero, compact = false, heroHand, foldedPositions = [], betSizes = {} }: PokerTableProps) {
  const N = positions.length;
  const heroIdx = positions.indexOf(heroPosition);
  const interactive = !!onSelectHero;

  function renderHeroCards(combo: string, cx: number, cy: number) {
    const { ranks, suits, colors } = parseCombo(combo);
    const cw = 22, ch = 32, gap = 2;
    const startX = cx - cw - gap / 2;

    return (
      <>
        {[0, 1].map((i) => (
          <g key={i}>
            <rect x={startX + i * (cw + gap)} y={cy - ch / 2} width={cw} height={ch} rx={3} style={{ fill: "var(--card)", stroke: "var(--border)" }} strokeWidth={1} />
            <text x={startX + i * (cw + gap) + cw / 2} y={cy - 3} textAnchor="middle" dominantBaseline="middle" fill={colors[i]} fontSize={10} fontWeight={700} fontFamily="JetBrains Mono, monospace">
              {ranks[i]}
            </text>
            <text x={startX + i * (cw + gap) + cw / 2} y={cy + 9} textAnchor="middle" dominantBaseline="middle" fill={colors[i]} fontSize={8}>
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
      style={{ maxWidth: compact ? 160 : "none" }}
    >
      <ellipse cx={T_CX} cy={T_CY + 6} rx={T_RX} ry={T_RY} fill="rgba(0,0,0,0.5)" />
      <ellipse cx={T_CX} cy={T_CY} rx={T_RX} ry={T_RY} fill="#0d3320" />
      <ellipse cx={T_CX} cy={T_CY} rx={T_RX} ry={T_RY} fill="none" stroke="#1a5c35" strokeWidth={7} />
      <ellipse cx={T_CX} cy={T_CY} rx={T_RX - 10} ry={T_RY - 10} fill="none" stroke="#22c55e" strokeWidth={0.75} opacity={0.25} />
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
            {isHero && (
              <circle cx={x} cy={y} r={r + 8} fill="#22c55e" fillOpacity={0.12} />
            )}
            {interactive && !isHero && (
              <circle cx={x} cy={y} r={r + 6} fill="white" fillOpacity={0} className="hover-ring" />
            )}

            {isHero && heroHand ? (
              renderHeroCards(heroHand, x, y)
            ) : (
              <>
                <circle
                  cx={x} cy={y} r={r}
                  style={{ fill: isHero ? "var(--accent)" : "var(--secondary)" }}
                  stroke={
                    isHero ? "var(--primary)" :
                    isFolded ? "var(--muted-foreground)" : "var(--border)"
                  }
                  strokeWidth={isHero ? 2.5 : 1.5}
                />
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
                  style={{ fill: isFolded ? "var(--muted-foreground)" : "#e8eaed" }}
                  fontSize={6.5}
                  fontWeight={600}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {betSize}
                </text>
              </>
            )}
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
