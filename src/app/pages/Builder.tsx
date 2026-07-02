import { useState, useEffect, useCallback } from "react";
import { FolderPlus, Plus } from "lucide-react";
import { useTrainerContext } from "../TrainerContext";
import { DEFAULT_ACTIONS, LEGACY_ACTIONS, COLOR_PRESETS } from "../constants";
import { RangeGrid } from "../components/RangeGrid";
import { ActionChip } from "../components/ActionChip";
import { FolderTree } from "../components/FolderTree";
import type { Range, ActionDef } from "../types";

export default function Builder() {
  const { ranges, rangeFolders, saveRange: onSaveRange, deleteRange: onDeleteRange, duplicateRange: onDuplicateRange, moveRange: onMoveRange, newRangeFolder, renameRangeFolder, deleteRangeFolder, moveRangeFolder } = useTrainerContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [rangeName, setRangeName] = useState("New Range");
  const [grid, setGrid] = useState<Record<string, string>>({});
  const [actions, setActions] = useState<ActionDef[]>(DEFAULT_ACTIONS.map((a, i) => ({ ...a, id: `a${i + 1}` })));
  const [selectedAction, setSelectedAction] = useState<string>(actions[0]?.id ?? "");
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [openColorId, setOpenColorId] = useState<string | null>(null);

  useEffect(() => {
    if (!actions.find((a) => a.id === selectedAction)) setSelectedAction(actions[0]?.id ?? "");
  }, [actions, selectedAction]);

  function commitEdit(id: string) {
    if (editLabel.trim()) {
      setActions((prev) => prev.map((a) => a.id === id ? { ...a, label: editLabel.trim() } : a));
    }
    setEditingLabelId(null);
  }

  function newActionId() {
    const max = actions.reduce((m, a) => Math.max(m, parseInt(a.id.replace(/\D/g, "")) || 0), 0);
    return `a${max + 1}`;
  }

  function newRange() { setEditingId(null); setRangeName("New Range"); setGrid({}); setActions(DEFAULT_ACTIONS.map((a, i) => ({ ...a, id: `a${i + 1}` }))); setEditingLabelId(null); setOpenColorId(null); }
  function loadRange(r: Range) { setEditingId(r.id); setRangeName(r.name); setGrid({ ...r.grid }); setActions(r.actions ?? LEGACY_ACTIONS); setEditingLabelId(null); setOpenColorId(null); }
  function saveRange() {
    if (!rangeName.trim()) return;
    const id = editingId ?? `range-${Date.now()}`;
    const existing = ranges.find((r) => r.id === id);
    onSaveRange({ id, name: rangeName.trim(), grid, folderId: existing?.folderId ?? null, actions });
    setEditingId(id);
  }
  const paint = useCallback((hand: string) => {
    setGrid((prev) => {
      if (prev[hand] === selectedAction) { const next = { ...prev }; delete next[hand]; return next; }
      return { ...prev, [hand]: selectedAction };
    });
  }, [selectedAction]);

  function moveAction(fromIndex: number, toIndex: number) {
    setActions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  const filledCount = Object.keys(grid).length;
  const actionCounts = actions.map((a) => ({ ...a, count: Object.values(grid).filter((v) => v === a.id).length })).filter((a) => a.count > 0);

  return (
    <div className="flex gap-5 h-full px-6 py-5">
      <aside className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto border-r border-border pr-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ranges</span>
            <div className="flex items-center gap-1">
              <button onClick={() => newRangeFolder(null)} className="text-muted-foreground hover:text-primary transition-colors" title="New folder"><FolderPlus size={12} /></button>
              <button onClick={newRange} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"><Plus size={11} /> New</button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <FolderTree
            items={ranges}
            folders={rangeFolders}
            onMoveItem={onMoveRange}
            onMoveFolder={moveRangeFolder}
            allFolders={rangeFolders}
            onDeleteFolder={deleteRangeFolder}
            onRenameFolder={renameRangeFolder}
            selectedItemId={editingId}
            onSelectItem={(item) => { const r = ranges.find((x) => x.id === item.id); if (r) loadRange(r); }}
            onDuplicateItem={onDuplicateRange}
            onDeleteItem={(id) => { onDeleteRange(id); if (editingId === id) newRange(); }}
            renderItem={(item) => {
              const sel = item.id === editingId;
              return (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className={`text-xs font-medium truncate ${sel ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{item.name}</span>
                    <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>RANGE</span>
                  </div>
                </div>
              );
            }}
          />
        </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-3">
          <input value={rangeName} onChange={(e) => setRangeName(e.target.value)} className="flex-1 bg-secondary text-foreground text-sm font-medium px-3 py-2 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Range name..." />
          <button onClick={() => setGrid({})} className="text-xs px-3 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">Clear</button>
          <button onClick={saveRange} className="text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">Save</button>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          {actions.map((a, index) => (
            <ActionChip
              key={a.id}
              action={a}
              index={index}
              actionsLength={actions.length}
              isSelected={selectedAction === a.id}
              editingLabelId={editingLabelId}
              editLabel={editLabel}
              openColorId={openColorId}
              onSelect={() => setSelectedAction(a.id)}
              onStartEdit={(id, label) => { setEditingLabelId(id); setEditLabel(label); }}
              onEditLabelChange={setEditLabel}
              onCommitEdit={commitEdit}
              onCancelEdit={() => setEditingLabelId(null)}
              onDelete={(id) => { setActions((prev) => prev.filter((x) => x.id !== id)); if (selectedAction === id) setSelectedAction(actions.find((x) => x.id !== id)?.id ?? ""); }}
              onToggleColor={(id) => setOpenColorId(openColorId === id ? null : id)}
              onSelectColor={(id, preset) => { setActions((prev) => prev.map((x) => x.id === id ? { ...x, ...preset } : x)); setOpenColorId(null); }}
              onMoveAction={moveAction}
            />
          ))}
          <button onClick={() => { const id = newActionId(); const preset = COLOR_PRESETS[actions.length % COLOR_PRESETS.length]; setActions((prev) => [...prev, { id, label: "New Action", ...preset }]); setEditingLabelId(id); setEditLabel("New Action"); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:text-primary hover:border-primary transition-colors">
            <Plus size={14} /> Add action
          </button>
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
                  <span className="text-muted-foreground flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{a.count} ({(a.count / 169 * 100).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
