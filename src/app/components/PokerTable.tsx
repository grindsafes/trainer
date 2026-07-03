import { T_CX, T_CY, T_RX, T_RY, S_RX, S_RY, POSITION_IMAGES, PLAYER_NAMES, PLAYER_STACKS } from "../constants";
import { getSeatPos, getAngle, parseCombo } from "../utils";

interface PokerTableProps {
  positions: string[];
  heroPosition: string;
  onSelectHero?: (pos: string) => void;
  compact?: boolean;
  heroHand?: string | null;
  foldedPositions?: string[];
  betSizes?: Record<string, string>;
  flippingOut?: boolean;
}

export function PokerTable({ positions, heroPosition, onSelectHero, compact = false, heroHand, foldedPositions = [], betSizes = {}, flippingOut = false }: PokerTableProps) {
  const N = positions.length;
  const heroIdx = positions.indexOf(heroPosition);
  const interactive = !!onSelectHero;

    function renderHeroCards(combo: string, cx: number, cy: number) {
    const { ranks, suits, colors } = parseCombo(combo);
    const cw = 34, ch = 58, gap = 2;
    const startX = cx - cw - gap / 2;

    return (
      <>
        {[0, 1].map((i) => {
          const delay = i === 0 ? "0.12s" : "0s";
          return (
          <g key={`${combo}-${i}`} className={flippingOut ? "card-flip-out" : "card-flip-in"}
            style={{ animationDelay: flippingOut ? "0s" : delay, transformOrigin: "center" }}>
            <g className={flippingOut ? "front-flip-out" : "front-flip-in"}
              style={{ animationDelay: flippingOut ? "0s" : delay }}>
              <rect x={startX + i * (cw + gap)} y={cy - ch / 2} width={cw} height={ch} rx={5} style={{ fill: colors[i], stroke: "var(--border)" }} strokeWidth={1} />
              <text x={startX + i * (cw + gap) + cw / 2} y={cy - 7} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={16} fontWeight={700} fontFamily="JetBrains Mono, monospace">
                {ranks[i]}
              </text>
              <text x={startX + i * (cw + gap) + cw - 5} y={cy - 20} textAnchor="end" dominantBaseline="middle" fill="white" fontSize={8}>
                {suits[i]}
              </text>
              <text x={startX + i * (cw + gap) + cw / 2} y={cy + 15} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12}>
                {suits[i]}
              </text>
            </g>
            <g className={flippingOut ? "back-flip-out" : "back-flip-in"}
              style={{ animationDelay: flippingOut ? "0s" : delay }}>
              <rect x={startX + i * (cw + gap)} y={cy - ch / 2} width={cw} height={ch} rx={5} fill="url(#card-back)" stroke="var(--border)" strokeWidth={1} />
              <rect x={startX + i * (cw + gap) + 2} y={cy - ch / 2 + 2} width={cw - 4} height={ch - 4} rx={3} fill="none" stroke="white" strokeWidth={3} />
            </g>
          </g>
          );
        })}
      </>
    );
  }

  return (
    <svg
      viewBox="0 0 460 380"
      className="w-full"
      style={{ maxWidth: compact ? 160 : "none" }}
    >
      <defs>
        <pattern id="card-back" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#1a1a2e" />
          <rect width="4" height="4" fill="#e8eaed" />
          <rect x="4" y="4" width="4" height="4" fill="#e8eaed" />
        </pattern>
        <filter id="hero-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
      </defs>
      <ellipse cx={T_CX} cy={T_CY + 6} rx={T_RX} ry={T_RY} fill="rgba(0,0,0,0.6)" />
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

        const isTop = y < T_CY;
        const bodyTop = isTop ? y + 4 : y - 40;
        const avatarCy = bodyTop - 12;
        const ndx = (x - T_CX) / S_RX;
        const ndy = (y - T_CY) / S_RY;
        const isHorizontal = Math.abs(ndx) > Math.abs(ndy);

        let chipX: number, chipY: number;
        if (isHorizontal) {
          const sign = x < T_CX ? 1 : -1;
          chipX = x + sign * 44;
          chipY = y;
        } else {
          const innerExtent = isTop ? bodyTop + 32 : avatarCy - 24;
          const chipOffset = Math.abs(y - innerExtent) + 4;
          chipX = x;
          chipY = isTop ? y + chipOffset : y - chipOffset;
        }

        return (
          <g
            key={pos}
            onClick={() => onSelectHero?.(pos)}
            style={{ cursor: interactive && !isHero ? "pointer" : "default", opacity: isFolded ? 0.3 : 1 }}
          >
            {compact ? (
              <>
                <circle cx={x} cy={y} r={r} fill="var(--secondary)" stroke="var(--border)" strokeWidth={1.5} />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="var(--muted-foreground)" fontSize={7} fontWeight={700} fontFamily="JetBrains Mono, monospace">{pos}</text>
              </>
            ) : (
              <>
                {(() => {
                  const bodyW = 80, bodyH = 32, avatarR = 24;
                  const glowY = isTop ? y - 30 : y - 74;
                  const heroY = isTop ? y + 52 : y - 78;

                  return (
                    <>

                      <defs>
                        <clipPath id={`avatar-${pos}`}>
                          <circle cx={x} cy={avatarCy} r={avatarR} />
                        </clipPath>
                      </defs>
                      {isHero && (
                        <circle cx={x} cy={avatarCy} r={avatarR + 4}
                          fill="white" opacity={0.35}
                          filter="url(#hero-glow)"
                          className="hero-pulse"
                        />
                      )}
                      <image href={POSITION_IMAGES[pos]}
                        x={x - avatarR} y={avatarCy - avatarR}
                        width={2 * avatarR} height={2 * avatarR}
                        clipPath={`url(#avatar-${pos})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                      <circle cx={x} cy={avatarCy} r={avatarR}
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth={1}
                      />
                      {isHero && heroHand && renderHeroCards(heroHand, x, bodyTop - 2)}
                      <rect x={x - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} rx={8}
                        fill="var(--card)"
                        stroke={isHero ? "#6b7280" : "var(--border)"}
                        strokeWidth={1}
                      />
                      <text x={x} y={bodyTop + 11}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="var(--muted-foreground)"
                        fontSize={7.5} fontWeight={500}
                        fontFamily="Inter, sans-serif"
                      >
                        {isHero ? "Hero" : PLAYER_NAMES[pos]}
                      </text>
                      <text x={x} y={bodyTop + 22}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="var(--muted-foreground)"
                        fontSize={7}
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {PLAYER_STACKS[pos]}
                      </text>
                    </>
                  );
                })()}
              </>
            )}
            {!compact && (pos === "BU" || betSize) && (
              <g transform={`translate(${chipX}, ${chipY})`}>
                {pos === "BU" && (
                  <>
                    <circle cx={0} cy={0} r={7} fill="#facc15" stroke="#1a5c35" strokeWidth={1.5} />
                    <circle cx={0} cy={0} r={5} fill="none" stroke="#1a5c35" strokeWidth={0.6} />
                    <text x={0} y={0.5} textAnchor="middle" dominantBaseline="middle" fill="#1a5c35" fontSize={7} fontWeight={800} fontFamily="JetBrains Mono, monospace">D</text>
                  </>
                )}
                {betSize && (
                  <g transform={`translate(${pos === "BU" ? 18 : 0}, 0)`}>
                    <circle cx={0} cy={0} r={5.5} style={{ fill: isFolded ? "var(--muted)" : "var(--card)" }} stroke={isFolded ? "var(--muted-foreground)" : "#1a5c35"} strokeWidth={1.5} />
                    <circle cx={0} cy={0} r={3.5} fill="none" stroke={isFolded ? "var(--muted-foreground)" : "#1a5c35"} strokeWidth={0.8} />
                    <circle cx={0} cy={0} r={1.2} fill={isFolded ? "var(--muted-foreground)" : "#1a5c35"} />
                    <text x={9} y={0.5} textAnchor="start" dominantBaseline="middle" style={{ fill: isFolded ? "var(--muted-foreground)" : "#e8eaed" }} fontSize={6.5} fontWeight={600} fontFamily="JetBrains Mono, monospace">{betSize}</text>
                  </g>
                )}
              </g>
            )}
            {interactive && !isHero && (
              <rect x={x - 40} y={y < T_CY ? y - 36 : y - 80} width={80} height={76} rx={14}
                fill="white" fillOpacity={0} className="seat-hover"
              />
            )}
          </g>
        );
      })}

      <style>{`
        @keyframes flipIn {
          from { transform: perspective(600px) rotateY(180deg); opacity: 0; }
          to { transform: perspective(600px) rotateY(0deg); opacity: 1; }
        }
        @keyframes flipOut {
          from { transform: perspective(600px) rotateY(0deg); opacity: 1; }
          to { transform: perspective(600px) rotateY(-180deg); opacity: 0; }
        }
        .card-flip-in { animation: flipIn 0.35s ease-out forwards; }
        .card-flip-out { animation: flipOut 0.35s ease-in forwards; }

        @keyframes frontFlipIn {
          0%, 40% { opacity: 0; }
          60%, 100% { opacity: 1; }
        }
        @keyframes frontFlipOut {
          0%, 40% { opacity: 1; }
          60%, 100% { opacity: 0; }
        }
        @keyframes backFlipIn {
          0%, 40% { opacity: 1; }
          60%, 100% { opacity: 0; }
        }
        @keyframes backFlipOut {
          0%, 40% { opacity: 0; }
          60%, 100% { opacity: 1; }
        }
        .front-flip-in { animation: frontFlipIn 0.35s ease-out forwards; }
        .front-flip-out { animation: frontFlipOut 0.35s ease-in forwards; }
        .back-flip-in { animation: backFlipIn 0.35s ease-out forwards; }
        .back-flip-out { animation: backFlipOut 0.35s ease-in forwards; }

        .seat-hover:hover { fill-opacity: 0.08; }
        .seat-hover { transition: fill-opacity 0.15s; }

        @keyframes heroPulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.5; }
        }
        .hero-pulse { animation: heroPulse 2s ease-in-out infinite; }
      `}</style>
    </svg>
  );
}
