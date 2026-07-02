import { useState, useEffect, useRef } from "react";
import { getPositions } from "../utils";
import { PokerTable } from "./PokerTable";
import type { Drill, Range } from "../types";

interface DrillEditorProps {
  initial?: Drill;
  ranges: Range[];
  onSave: (drill: Drill) => void;
  onCancel: () => void;
}

export function DrillEditor({ initial, ranges, onSave, onCancel }: DrillEditorProps) {
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

  useEffect(() => {
    const pos = getPositions(numPlayers);
    if (!pos.includes(heroPosition)) setHeroPosition(pos[0]);
  }, [numPlayers, heroPosition]);

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
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drill name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-secondary text-foreground text-sm font-medium px-3 py-2 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="e.g. 6-max BTN vs SB"
        />
      </div>

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

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Hero seat — click to select
        </label>
        <div className="bg-card rounded-xl border border-border p-4 flex justify-center">
          <PokerTable
            positions={getPositions(numPlayers)}
            heroPosition={heroPosition}
            onSelectHero={setHeroPosition}
            betSizes={betSizes}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Hero is <span style={{ color: "var(--primary)", fontWeight: 600 }}>{heroPosition}</span> — always shown at center bottom during training
        </p>
      </div>

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
