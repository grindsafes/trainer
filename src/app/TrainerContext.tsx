import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { Range, Drill, Folder, AppData } from "./types";
import { loadFromStorage, saveToStorage } from "./utils";
import { LEGACY_ACTIONS } from "./constants";

interface TrainerContextType {
  ranges: Range[];
  drills: Drill[];
  rangeFolders: Folder[];
  drillFolders: Folder[];

  saveRange: (range: Range) => void;
  deleteRange: (id: string) => void;
  duplicateRange: (id: string) => void;
  moveRange: (id: string, folderId: string | null) => void;

  saveDrill: (drill: Drill) => void;
  deleteDrill: (id: string) => void;
  moveDrill: (id: string, folderId: string | null) => void;

  newRangeFolder: (parentId: string | null) => void;
  renameRangeFolder: (id: string, name: string) => void;
  deleteRangeFolder: (id: string) => void;
  moveRangeFolder: (folderId: string, newParentId: string | null) => void;

  newDrillFolder: (parentId: string | null) => void;
  renameDrillFolder: (id: string, name: string) => void;
  deleteDrillFolder: (id: string) => void;
  moveDrillFolder: (folderId: string, newParentId: string | null) => void;

  importRef: React.RefObject<HTMLInputElement | null>;
  exportData: () => void;
  importData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TrainerContext = createContext<TrainerContextType | null>(null);

export function useTrainerContext() {
  const ctx = useContext(TrainerContext);
  if (!ctx) throw new Error("useTrainerContext must be used within TrainerProvider");
  return ctx;
}

export function TrainerProvider({ children }: { children: ReactNode }) {
  const saved = useRef(loadFromStorage()).current;
  const [ranges, setRanges] = useState<Range[]>(
    () => (saved.ranges ?? []).map((r) => ({ ...r, folderId: r.folderId ?? null, actions: r.actions ?? LEGACY_ACTIONS }))
  );
  const [drills, setDrills] = useState<Drill[]>(
    () => (saved.drills ?? []).map((d) => ({ ...d, folderId: d.folderId ?? null, betSizes: d.betSizes ?? {} }))
  );
  const [rangeFolders, setRangeFolders] = useState<Folder[]>(saved.rangeFolders ?? []);
  const [drillFolders, setDrillFolders] = useState<Folder[]>(saved.drillFolders ?? []);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => { saveToStorage({ ranges, drills, rangeFolders, drillFolders }); }, [ranges, drills, rangeFolders, drillFolders]);

  const saveRange = useCallback((range: Range) => {
    setRanges((prev) => {
      const idx = prev.findIndex((r) => r.id === range.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = range; return next; }
      return [...prev, range];
    });
  }, []);

  const deleteRange = useCallback((id: string) => {
    setRanges((p) => p.filter((r) => r.id !== id));
  }, []);

  const duplicateRange = useCallback((id: string) => {
    setRanges((prev) => {
      const source = prev.find((r) => r.id === id);
      if (!source) return prev;
      return [...prev, { ...source, id: `range-${Date.now()}`, name: `${source.name} (copy)` }];
    });
  }, []);

  const moveRange = useCallback((id: string, folderId: string | null) => {
    setRanges((prev) => prev.map((r) => r.id === id ? { ...r, folderId } : r));
  }, []);

  const saveDrill = useCallback((drill: Drill) => {
    setDrills((prev) => {
      const idx = prev.findIndex((d) => d.id === drill.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = drill; return next; }
      return [...prev, drill];
    });
  }, []);

  const deleteDrill = useCallback((id: string) => {
    setDrills((p) => p.filter((d) => d.id !== id));
  }, []);

  const moveDrill = useCallback((id: string, folderId: string | null) => {
    setDrills((prev) => prev.map((d) => d.id === id ? { ...d, folderId } : d));
  }, []);

  const moveRangeFolder = useCallback((id: string, newParentId: string | null) => {
    setRangeFolders((prev) => prev.map((f) => f.id === id ? { ...f, parentId: newParentId } : f));
  }, []);

  const moveDrillFolder = useCallback((id: string, newParentId: string | null) => {
    setDrillFolders((prev) => prev.map((f) => f.id === id ? { ...f, parentId: newParentId } : f));
  }, []);

  const newRangeFolder = useCallback((parentId: string | null) => {
    const id = `rfolder-${Date.now()}`;
    setRangeFolders((prev) => [...prev, { id, name: "New Folder", parentId }]);
  }, []);

  const renameRangeFolder = useCallback((id: string, name: string) => {
    setRangeFolders((prev) => prev.map((f) => f.id === id ? { ...f, name } : f));
  }, []);

  const deleteRangeFolder = useCallback((id: string) => {
    setRangeFolders((prev) => {
      const idsToDelete = new Set<string>();
      function collectIds(fid: string) {
        idsToDelete.add(fid);
        prev.filter((f) => f.parentId === fid).forEach((f) => collectIds(f.id));
      }
      collectIds(id);
      return prev.filter((f) => !idsToDelete.has(f.id));
    });
    setRanges((prev) => prev.map((r) => {
      const folderIds = new Set<string>();
      (function collectIds(fid: string) {
        folderIds.add(fid);
        rangeFolders.filter((f) => f.parentId === fid).forEach((f) => collectIds(f.id));
      })(id);
      return folderIds.has(r.folderId ?? "") ? { ...r, folderId: null } : r;
    }));
  }, [rangeFolders]);

  const newDrillFolder = useCallback((parentId: string | null) => {
    const id = `dfolder-${Date.now()}`;
    setDrillFolders((prev) => [...prev, { id, name: "New Folder", parentId }]);
  }, []);

  const renameDrillFolder = useCallback((id: string, name: string) => {
    setDrillFolders((prev) => prev.map((f) => f.id === id ? { ...f, name } : f));
  }, []);

  const deleteDrillFolder = useCallback((id: string) => {
    setDrillFolders((prev) => {
      const idsToDelete = new Set<string>();
      function collectIds(fid: string) {
        idsToDelete.add(fid);
        prev.filter((f) => f.parentId === fid).forEach((f) => collectIds(f.id));
      }
      collectIds(id);
      return prev.filter((f) => !idsToDelete.has(f.id));
    });
    setDrills((prev) => prev.map((d) => {
      const folderIds = new Set<string>();
      (function collectIds(fid: string) {
        folderIds.add(fid);
        drillFolders.filter((f) => f.parentId === fid).forEach((f) => collectIds(f.id));
      })(id);
      return folderIds.has(d.folderId ?? "") ? { ...d, folderId: null } : d;
    }));
  }, [drillFolders]);

  function exportData() {
    const data: AppData = { ranges, drills, rangeFolders, drillFolders };
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
        if (data.ranges && Array.isArray(data.ranges)) setRanges(data.ranges.map((r) => ({ ...r, folderId: r.folderId ?? null, actions: r.actions ?? LEGACY_ACTIONS })));
        if (data.drills && Array.isArray(data.drills)) setDrills(data.drills.map((d) => ({ ...d, folderId: d.folderId ?? null })));
        if (data.rangeFolders && Array.isArray(data.rangeFolders)) setRangeFolders(data.rangeFolders);
        if (data.drillFolders && Array.isArray(data.drillFolders)) setDrillFolders(data.drillFolders);
      } catch { alert("Invalid file format."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <TrainerContext.Provider
      value={{
        ranges, drills, rangeFolders, drillFolders,
        saveRange, deleteRange, duplicateRange, moveRange,
        saveDrill, deleteDrill, moveDrill,
        newRangeFolder, renameRangeFolder, deleteRangeFolder, moveRangeFolder,
        newDrillFolder, renameDrillFolder, deleteDrillFolder, moveDrillFolder,
        importRef, exportData, importData,
      }}
    >
      {children}
    </TrainerContext.Provider>
  );
}
