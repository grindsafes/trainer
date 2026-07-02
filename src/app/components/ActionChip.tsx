import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Pencil, X, GripVertical } from "lucide-react";
import { DND_ACTION, COLOR_PRESETS } from "../constants";
import type { ActionDef } from "../types";

interface ActionChipProps {
  action: ActionDef; index: number; actionsLength: number;
  isSelected: boolean; editingLabelId: string | null; editLabel: string; openColorId: string | null;
  onSelect: () => void;
  onStartEdit: (id: string, label: string) => void;
  onEditLabelChange: (v: string) => void;
  onCommitEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onToggleColor: (id: string) => void;
  onSelectColor: (id: string, preset: { color: string; bg: string; border: string }) => void;
  onMoveAction: (fromIdx: number, toIdx: number) => void;
}

export function ActionChip({
  action, index, actionsLength, isSelected, editingLabelId, editLabel, openColorId,
  onSelect, onStartEdit, onEditLabelChange, onCommitEdit, onCancelEdit,
  onDelete, onToggleColor, onSelectColor, onMoveAction,
}: ActionChipProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: DND_ACTION,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [index]);

  const [, dropRef] = useDrop(() => ({
    accept: DND_ACTION,
    drop: (item: { index: number }) => {
      if (item.index !== index) onMoveAction(item.index, index);
    },
  }), [index, onMoveAction]);

  dragRef(dropRef(ref));

  const isEditing = editingLabelId === action.id;

  return (
    <div
      ref={ref}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${isSelected ? "ring-1" : ""} ${isDragging ? "opacity-40" : ""}`}
      style={{ borderColor: isSelected ? action.color : "var(--border)", backgroundColor: isSelected ? `${action.color}15` : "transparent" }}
    >
      <span className="text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0" onMouseDown={(e) => e.stopPropagation()}>
        <GripVertical size={12} />
      </span>
      <div className="relative flex-shrink-0">
        <div className="w-3 h-3 rounded-full border cursor-pointer" style={{ backgroundColor: action.color, borderColor: action.border }}
          onClick={(e) => { e.stopPropagation(); onToggleColor(action.id); }} />
        {openColorId === action.id && (
          <div className="absolute left-0 top-4 z-20 flex flex-wrap gap-1 bg-popover border border-border rounded-md p-1.5 w-32 shadow-xl">
            {COLOR_PRESETS.map((p, i) => (
              <div key={i} onClick={() => { onSelectColor(action.id, p); }}
                className="w-4 h-4 rounded-full border-2 cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: p.color, borderColor: p.border }} />
            ))}
          </div>
        )}
      </div>
      {isEditing ? (
        <input autoFocus value={editLabel} onClick={(e) => e.stopPropagation()}
          onChange={(e) => onEditLabelChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onCommitEdit(action.id); if (e.key === "Escape") onCancelEdit(); }}
          onBlur={() => onCommitEdit(action.id)}
          className="w-14 bg-transparent text-foreground text-xs font-semibold focus:outline-none border-b border-primary" />
      ) : (
        <span className="cursor-pointer whitespace-nowrap text-muted-foreground hover:text-foreground" onClick={onSelect}>{action.label}</span>
      )}
      <button onClick={(e) => { e.stopPropagation(); onStartEdit(action.id, action.label); }}
        className="text-muted-foreground hover:text-foreground flex-shrink-0"><Pencil size={12} /></button>
      {actionsLength > 1 && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(action.id); }}
          className="text-muted-foreground hover:text-destructive flex-shrink-0"><X size={12} /></button>
      )}
    </div>
  );
}
