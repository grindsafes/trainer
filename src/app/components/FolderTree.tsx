import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { useDrag, useDrop } from "react-dnd";
import { ChevronDown, ChevronRight, Move, Pencil, Trash2, Copy, EllipsisVertical } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "../components/ui/popover";
import { DND_ITEM } from "../constants";
import type { Folder } from "../types";

const DND_ACTION_LOCAL = "ACTION_ITEM";

interface FolderTreeProps {
  items: { id: string; name: string; folderId: string | null }[];
  folders: Folder[];
  onMoveItem: (itemId: string, toFolderId: string | null) => void;
  onMoveFolder: (folderId: string, newParentId: string | null) => void;
  allFolders: Folder[];
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onSelectItem: (item: { id: string; name: string; folderId: string | null }) => void;
  renderItem: (item: { id: string; name: string; folderId: string | null }) => ReactNode;
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  selectedItemId?: string;
  emptyMessage?: string;
}

export function FolderTree({
  items, folders, onMoveItem, onMoveFolder, allFolders,
  onDeleteFolder, onRenameFolder, onSelectItem, renderItem,
  onEditItem, onDeleteItem, onDuplicateItem, selectedItemId,
  emptyMessage = "No items yet",
}: FolderTreeProps) {
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
          allFolders={allFolders}
          expandedFolders={expandedFolders}
          renamingId={renamingId}
          renameValue={renameValue}
          onToggleFolder={toggleFolder}
          onRenameChange={setRenameValue}
          onCommitRename={commitRename}
          onCancelRename={() => setRenamingId(null)}
          onStartRename={(id, name) => { setRenamingId(id); setRenameValue(name); }}
          onMoveItem={onMoveItem}
          onMoveFolder={onMoveFolder}
          onDeleteFolder={onDeleteFolder}
          onSelectItem={onSelectItem}
          renderItem={renderItem}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
          onDuplicateItem={onDuplicateItem}
          selectedItemId={selectedItemId}
        />
      ))}
      <div ref={rootDropRef} className={`flex flex-col gap-1 rounded-sm ${isRootOver ? "bg-white/20" : ""}`}>
        {rootItems.map((item) => (
          <ItemNode
            key={item.id}
            item={item}
            depth={0}
            onSelectItem={onSelectItem}
            renderItem={renderItem}
            onMoveItem={onMoveItem}
            allFolders={allFolders}
            onEditItem={onEditItem}
            onDeleteItem={onDeleteItem}
            onDuplicateItem={onDuplicateItem}
            selectedItemId={selectedItemId}
          />
        ))}
      </div>
      {!hasContent && (
        <p className="text-xs text-muted-foreground text-center mt-2">{emptyMessage}</p>
      )}
    </div>
  );
}

// ─── Folder Node ──────────────────────────────────────────────────────────────

interface FolderNodeProps {
  folder: Folder; depth: number;
  items: { id: string; name: string; folderId: string | null }[];
  folders: Folder[];
  allFolders: Folder[];
  expandedFolders: Set<string>;
  renamingId: string | null; renameValue: string;
  onToggleFolder: (id: string) => void;
  onRenameChange: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onStartRename: (id: string, name: string) => void;
  onMoveItem: (itemId: string, toFolderId: string | null) => void;
  onMoveFolder: (folderId: string, newParentId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onSelectItem: (item: { id: string; name: string; folderId: string | null }) => void;
  renderItem: (item: { id: string; name: string; folderId: string | null }) => ReactNode;
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  selectedItemId?: string;
}

function FolderNode({
  folder, depth, items, folders, allFolders, expandedFolders,
  renamingId, renameValue,
  onToggleFolder, onRenameChange, onCommitRename, onCancelRename, onStartRename,
  onMoveItem, onMoveFolder, onDeleteFolder, onSelectItem, renderItem,
  onEditItem, onDeleteItem, onDuplicateItem, selectedItemId,
}: FolderNodeProps) {
  const isExpanded = expandedFolders.has(folder.id);
  const childFolders = folders.filter((f) => f.parentId === folder.id);
  const childItems = items.filter((i) => i.folderId === folder.id);

  const [movePopoverOpen, setMovePopoverOpen] = useState(false);

  const descendantIds = useMemo(() => {
    const ids = new Set<string>();
    function collect(fid: string) {
      allFolders.filter((f) => f.parentId === fid).forEach((f) => { ids.add(f.id); collect(f.id); });
    }
    collect(folder.id);
    return ids;
  }, [allFolders, folder.id]);

  const availableDestinations = useMemo(() => {
    return allFolders.filter((f) => f.id !== folder.id && !descendantIds.has(f.id));
  }, [allFolders, folder.id, descendantIds]);

  function getDepth(fid: string): number {
    let d = 0;
    let cur = allFolders.find((f) => f.id === fid);
    while (cur && cur.parentId !== null) { d++; cur = allFolders.find((f) => f.id === cur!.parentId); }
    return d;
  }

  const [{ isOver }, dropRef] = useDrop(() => ({
    accept: DND_ITEM,
    drop: (dragItem: { id: string }) => { onMoveItem(dragItem.id, folder.id); },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [folder.id, items, folders]);

  return (
    <div ref={dropRef} className={`transition-colors rounded-sm ${isOver ? "bg-white/20" : ""}`}>
      <div
        className="flex items-center gap-1 py-2 rounded-md hover:bg-secondary cursor-pointer group"
      style={{ paddingLeft: `${depth * 16}px` }}
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
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-medium text-muted-foreground truncate">{folder.name}</span>
            <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>FOLDER</span>
          </div>
        )}
        <Popover open={movePopoverOpen} onOpenChange={setMovePopoverOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
              title="Options"
            >
              <EllipsisVertical size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1.5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1">Move to...</p>
            <button
              onClick={() => { onMoveFolder(folder.id, null); setMovePopoverOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-secondary transition-colors"
            >
              <Move size={12} className="text-muted-foreground flex-shrink-0" />
              <span>Root (unfiled)</span>
            </button>
            {availableDestinations.length > 0 && <div className="h-px bg-border my-1" />}
            {availableDestinations.map((dest) => (
              <button
                key={dest.id}
                onClick={() => { onMoveFolder(folder.id, dest.id); setMovePopoverOpen(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-secondary transition-colors"
                style={{ paddingLeft: `${8 + getDepth(dest.id) * 12}px` }}
              >
                <ChevronRight size={10} className="text-muted-foreground flex-shrink-0" />
                <span className="truncate">{dest.name}</span>
              </button>
            ))}
            <div className="h-px bg-border my-1" />
            <button
              onClick={(e) => { e.stopPropagation(); onStartRename(folder.id, folder.name); setMovePopoverOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-secondary transition-colors"
            >
              <Pencil size={12} className="text-muted-foreground flex-shrink-0" />
              <span>Rename</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); setMovePopoverOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-secondary transition-colors"
            >
              <Trash2 size={12} className="text-muted-foreground flex-shrink-0" />
              <span>Delete</span>
            </button>
          </PopoverContent>
        </Popover>
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
              allFolders={allFolders}
              expandedFolders={expandedFolders}
              renamingId={renamingId}
              renameValue={renameValue}
              onToggleFolder={onToggleFolder}
              onRenameChange={onRenameChange}
              onCommitRename={onCommitRename}
              onCancelRename={onCancelRename}
              onStartRename={onStartRename}
              onMoveItem={onMoveItem}
              onMoveFolder={onMoveFolder}
              onDeleteFolder={onDeleteFolder}
              onSelectItem={onSelectItem}
              renderItem={renderItem}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
              onDuplicateItem={onDuplicateItem}
              selectedItemId={selectedItemId}
            />
          ))}
          {childItems.map((item) => (
            <ItemNode
              key={item.id}
              item={item}
              depth={depth + 1}
              onSelectItem={onSelectItem}
              renderItem={renderItem}
              onMoveItem={onMoveItem}
              allFolders={allFolders}
              onEditItem={onEditItem}
              onDeleteItem={onDeleteItem}
              onDuplicateItem={onDuplicateItem}
              selectedItemId={selectedItemId}
            />
          ))}
          {childFolders.length === 0 && childItems.length === 0 && (
            <div style={{ paddingLeft: `${(depth + 1) * 16}px` }} className="text-[10px] text-muted-foreground py-1">Empty folder</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Item Node ────────────────────────────────────────────────────────────────

interface ItemNodeProps {
  item: { id: string; name: string; folderId: string | null };
  depth: number;
  onSelectItem: (item: { id: string; name: string; folderId: string | null }) => void;
  renderItem: (item: { id: string; name: string; folderId: string | null }) => ReactNode;
  onMoveItem: (itemId: string, toFolderId: string | null) => void;
  allFolders: Folder[];
  onEditItem?: (itemId: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  selectedItemId?: string;
}

function ItemNode({
  item, depth, onSelectItem, renderItem, onMoveItem, allFolders,
  onEditItem, onDeleteItem, onDuplicateItem, selectedItemId,
}: ItemNodeProps) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: DND_ITEM,
    item: { id: item.id },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [item.id]);

  const [movePopoverOpen, setMovePopoverOpen] = useState(false);
  const isSelected = selectedItemId === item.id;

  function getDepth(fid: string): number {
    let d = 0;
    let cur = allFolders.find((f) => f.id === fid);
    while (cur && cur.parentId !== null) { d++; cur = allFolders.find((f) => f.id === cur!.parentId); }
    return d;
  }

  return (
    <div
      ref={dragRef}
      className={`flex items-center py-2 rounded-md cursor-pointer transition-colors group ${isSelected ? "bg-secondary text-foreground pr-3" : "hover:bg-secondary"} ${isDragging ? "opacity-40" : ""}`}
      style={{ paddingLeft: `${depth * 16 + (isSelected && depth === 0 ? 12 : 0)}px` }}
      onClick={() => onSelectItem(item)}
    >
      <div className="flex-1 min-w-0">
        {renderItem(item)}
      </div>
      <Popover open={movePopoverOpen} onOpenChange={setMovePopoverOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground transition-all flex-shrink-0"
            title="Options"
          >
            <EllipsisVertical size={14} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-1.5" onClick={(e) => e.stopPropagation()}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1">Move to...</p>
          <button
            onClick={() => { onMoveItem(item.id, null); setMovePopoverOpen(false); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-secondary transition-colors"
          >
            <Move size={12} className="text-muted-foreground flex-shrink-0" />
            <span>Root (unfiled)</span>
          </button>
          {allFolders.length > 0 && <div className="h-px bg-border my-1" />}
          {allFolders.map((dest) => (
            <button
              key={dest.id}
              onClick={() => { onMoveItem(item.id, dest.id); setMovePopoverOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-secondary transition-colors"
              style={{ paddingLeft: `${8 + getDepth(dest.id) * 12}px` }}
            >
              <ChevronRight size={10} className="text-muted-foreground flex-shrink-0" />
              <span className="truncate">{dest.name}</span>
            </button>
          ))}
          {(onDuplicateItem || onEditItem || onDeleteItem) && <div className="h-px bg-border my-1" />}
          {onDuplicateItem && (
            <button
              onClick={() => { onDuplicateItem(item.id); setMovePopoverOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-secondary transition-colors"
            >
              <Copy size={12} className="text-muted-foreground flex-shrink-0" />
              <span>Duplicate</span>
            </button>
          )}
          {onEditItem && (
            <button
              onClick={() => { onEditItem(item.id); setMovePopoverOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-secondary transition-colors"
            >
              <Pencil size={12} className="text-muted-foreground flex-shrink-0" />
              <span>Edit</span>
            </button>
          )}
          {onDeleteItem && (
            <button
              onClick={() => { onDeleteItem(item.id); setMovePopoverOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded hover:bg-secondary transition-colors"
            >
              <Trash2 size={12} className="text-muted-foreground flex-shrink-0" />
              <span>Delete</span>
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
