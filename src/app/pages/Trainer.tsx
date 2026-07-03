import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Check, X, Square, Plus, FolderPlus, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { useTrainerContext } from "../TrainerContext";
import { loadSessions, saveSessions, expandHand, parseCombo, getPositions, getActionStyle } from "../utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PokerTable } from "../components/PokerTable";
import { RangeGrid } from "../components/RangeGrid";
import { SessionGrid } from "../components/SessionGrid";
import { FolderTree } from "../components/FolderTree";
import { DrillEditor } from "../components/DrillEditor";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from "../components/ui/drawer";
import type { Drill, Range, SessionData } from "../types";

type TrainerPhase = "idle" | "question" | "result";
type TrainerView = "drills" | "edit-drill" | "preview" | "training";

export default function Trainer() {
  const { ranges, drills, drillFolders, saveDrill: onSaveDrill, deleteDrill: onDeleteDrill, moveDrill: onMoveDrill, newDrillFolder, renameDrillFolder, deleteDrillFolder, moveDrillFolder } = useTrainerContext();

  const [view, setView] = useState<TrainerView>("drills");
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const [editingDrill, setEditingDrill] = useState<Drill | undefined>(undefined);

  const [phase, setPhase] = useState<TrainerPhase>("idle");
  const [currentHand, setCurrentHand] = useState<string | null>(null);
  const [currentCombo, setCurrentCombo] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [revealGrid, setRevealGrid] = useState(false);
  const recentHandsRef = useRef<string[]>([]);

  const [sessions, setSessions] = useState<SessionData[]>(() => loadSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedDrill = drills.find((d) => d.id === selectedDrillId) ?? null;
  const selectedRange = selectedDrill ? ranges.find((r) => r.id === selectedDrill.rangeId) ?? null : null;
  const rangeActionsList = selectedRange?.actions ?? [];
  const actionMap = Object.fromEntries(rangeActionsList.map((a) => [a.id, a]));
  const rangeActions = selectedRange ? rangeActionsList.filter((a) => Object.values(selectedRange.grid).includes(a.id)) : rangeActionsList;
  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null;
  const viewingSession = sessions.find((s) => s.id === viewingSessionId) ?? null;
  const activeSession = sessions.find((s) => s.drillId === selectedDrillId && s.endedAt === null) ?? null;
  const stats = { correct: currentSession?.correct ?? 0, total: currentSession?.total ?? 0 };
  const accuracy = stats.total > 0 ? ((stats.correct / stats.total) * 100).toFixed(1) : null;
  const correctActionId = currentHand && selectedRange ? selectedRange.grid[currentHand] : null;
  const correctAction = correctActionId ? actionMap[correctActionId] : null;

  function selectDrill(drill: Drill) {
    setSelectedDrillId(drill.id);
    setViewingSessionId(null);
    const loaded = loadSessions();
    setSessions(loaded);
    const active = loaded.find((s) => s.drillId === drill.id && s.endedAt === null);
    setCurrentSessionId(active?.id ?? null);
    setCurrentHand(null);
    setUserAnswer(null);
    setRevealGrid(false);
    recentHandsRef.current = [];

    const range = ranges.find((r) => r.id === drill.rangeId) ?? null;
    if (active && range) {
      setView("training");
      setPhase("question");
      nextHand(range);
    } else {
      setView("preview");
      setPhase("idle");
    }
  }

  function goToTraining() {
    setView("training");
    if (activeSession) {
      resumeTraining();
    } else {
      startTraining();
    }
  }

  function startNewDrill() {
    setEditingDrill(undefined);
    setView("edit-drill");
  }

  function editDrill(drill: Drill) {
    setEditingDrill(drill);
    setView("edit-drill");
  }

  function saveDrill(drill: Drill) {
    onSaveDrill(drill);
    setSelectedDrillId(drill.id);
    setView("training");
  }

  function startTraining() {
    if (!selectedDrill || !selectedRange) return;
    const updated = sessions.map((s) =>
      s.drillId === selectedDrill.id && s.endedAt === null
        ? { ...s, endedAt: Date.now() }
        : s
    );
    const newSession: SessionData = {
      id: `session-${Date.now()}`,
      drillId: selectedDrill.id,
      startedAt: Date.now(),
      endedAt: null,
      total: 0,
      correct: 0,
      history: [],
      comboStats: {},
    };
    const allSessions = [...updated, newSession];
    setSessions(allSessions);
    setCurrentSessionId(newSession.id);
    saveSessions(allSessions);
    recentHandsRef.current = [];
    nextHand(selectedRange);
  }

  function resumeTraining() {
    if (!selectedRange || !activeSession) return;
    setPhase("question");
    nextHand(selectedRange);
  }

  function stopTraining() {
    if (!currentSession) return;
    const updatedSessions = sessions.map((s) =>
      s.id === currentSession.id ? { ...s, endedAt: Date.now() } : s
    );
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
    setView("preview");
    setViewingSessionId(currentSession.id);
    setCurrentSessionId(null);
    setPhase("idle");
    setCurrentHand(null);
    setCurrentCombo(null);
    setUserAnswer(null);
    setRevealGrid(false);
  }

  function nextHand(range: Range) {
    const validActionIds = new Set(range.actions.map(a => a.id));
    const hands = Object.keys(range.grid).filter(h => validActionIds.has(range.grid[h]));
    if (hands.length === 0) {
      setCurrentHand(null);
      setPhase("idle");
      return;
    }
    const recent = recentHandsRef.current;
    let eligible = hands.filter((h) => !recent.includes(h));
    if (eligible.length === 0 && hands.length > 1) {
      eligible = hands.filter((h) => h !== recent[recent.length - 1]);
    }
    if (eligible.length === 0) eligible = hands;
    const hand = eligible[Math.floor(Math.random() * eligible.length)];
    setCurrentHand(hand);
    setCurrentCombo(expandHand(hand));
    setUserAnswer(null);
    setRevealGrid(false);
    setPhase("question");
    recentHandsRef.current = [...recent, hand].slice(-20);
  }

  function answer(actionId: string) {
    if (phase !== "question" || !currentHand || !selectedRange || !currentSession) return;
    const correct = selectedRange.grid[currentHand];
    const isCorrect = actionId === correct;
    setUserAnswer(actionId);
    setRevealGrid(true);
    if (isCorrect) {
      toast("Correct", { icon: <Check size={18} className="text-green-500" /> });
    } else {
      toast(`Incorrect — ${correctAction?.label ?? correctActionId}`, { icon: <X size={18} className="text-red-500" /> });
    }
    const updatedSessions = sessions.map((s) => {
      if (s.id !== currentSession.id) return s;
      const prevCombo = s.comboStats[currentHand] ?? { correct: 0, total: 0 };
      return {
        ...s,
        total: s.total + 1,
        correct: s.correct + (isCorrect ? 1 : 0),
        history: [{ hand: currentHand, combo: currentCombo!, correct: isCorrect }, ...s.history],
        comboStats: {
          ...s.comboStats,
          [currentHand]: {
            correct: prevCombo.correct + (isCorrect ? 1 : 0),
            total: prevCombo.total + 1,
          },
        },
      };
    });
    setSessions(updatedSessions);
    saveSessions(updatedSessions);
    setTimeout(() => nextHand(selectedRange), 1500);
  }

  function viewSession(sessionId: string) {
    setViewingSessionId(sessionId);
  }

  function backToTraining() {
    setViewingSessionId(null);
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function renderHandCards(combo: string) {
    const { ranks, suits, colors } = parseCombo(combo);
    return (
      <div className="flex gap-3 justify-center">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-border flex flex-col items-center justify-center" style={{ width: 72, height: 96, backgroundColor: "var(--card)", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 700, color: "var(--card-foreground)", lineHeight: 1 }}>{ranks[i]}</span>
            <span style={{ fontSize: 22, color: colors[i], lineHeight: 1, marginTop: 4 }}>{suits[i]}</span>
          </div>
        ))}
      </div>
    );
  }

  function renderMiniHandCards(combo: string) {
    const { ranks, suits, colors } = parseCombo(combo);
    return (
      <div className="flex gap-0.5">
        {[0, 1].map((i) => (
          <div key={i} className="rounded border border-border flex flex-col items-center justify-center" style={{ width: 36, height: 48, backgroundColor: "var(--card)" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: "var(--card-foreground)", lineHeight: 1 }}>{ranks[i]}</span>
            <span style={{ fontSize: 11, color: colors[i], lineHeight: 1 }}>{suits[i]}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
    <Helmet>
      <title>Trainer</title>
      <meta name="description" content="Practice your preflop ranges with interactive drills. Track accuracy, review session history, and build muscle memory." />
      <meta property="og:title" content="Trainer" />
      <meta property="og:description" content="Practice your preflop ranges with interactive drills." />
      <meta property="og:url" content="https://trainer.grindsafe.app/trainer" />
    </Helmet>
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-5 h-full px-3 md:px-6 py-3 md:py-5">
      <aside className="hidden lg:flex w-80 flex-shrink-0 flex-col gap-4 overflow-y-auto border-r border-border pr-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drills</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => newDrillFolder(null)}
                className="text-muted-foreground hover:text-primary transition-colors"
                title="New folder"
              >
                <FolderPlus size={12} />
              </button>
              <button
                onClick={startNewDrill}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus size={11} /> New
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <FolderTree
              items={drills}
              folders={drillFolders}
              onMoveItem={onMoveDrill}
              onMoveFolder={moveDrillFolder}
              allFolders={drillFolders}
              onDeleteFolder={deleteDrillFolder}
              onRenameFolder={renameDrillFolder}
              selectedItemId={selectedDrillId}
              onSelectItem={(item) => { const d = drills.find((x) => x.id === item.id); if (d) { selectDrill(d); setSidebarOpen(false); } }}
              onEditItem={(id) => { const d = drills.find((x) => x.id === id); if (d) editDrill(d); setSidebarOpen(false); }}
              onDeleteItem={(id) => { onDeleteDrill(id); if (selectedDrillId === id) { setSelectedDrillId(null); setView("drills"); } }}
              renderItem={(item) => {
                const d = drills.find((x) => x.id === item.id);
                const active = item.id === selectedDrillId;
                const drillSessions = sessions.filter((s) => s.drillId === item.id && s.endedAt !== null);
                const totalCorrect = drillSessions.reduce((sum, s) => sum + s.correct, 0);
                const totalHands = drillSessions.reduce((sum, s) => sum + s.total, 0);
                const avg = totalHands > 0 ? ((totalCorrect / totalHands) * 100).toFixed(1) : null;
                return (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-medium truncate ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{item.name}</span>
                      {d && (
                        <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {d.numPlayers}p · {d.heroPosition}
                        </span>
                      )}
                      {avg && (
                        <span className="text-[9px]" style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: parseFloat(avg) >= 80 ? "#22c55e" : parseFloat(avg) >= 60 ? "#fbbf24" : "#ef4444",
                        }}>
                          Avg. {avg}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              }}
              emptyMessage="No drills yet — create one to get started."
            />
          </div>
        </div>

        {selectedDrill && (view === "preview" || view === "training") && (
          <>
            {activeSession && phase === "idle" && (
              <div className="bg-card rounded-md border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Active Session</p>
                <p className="text-2xl font-bold text-center" style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: parseFloat(accuracy!) >= 80 ? "#22c55e" : parseFloat(accuracy!) >= 60 ? "#fbbf24" : "#ef4444",
                }}>
                  {accuracy}%
                </p>
                <p className="text-xs text-muted-foreground text-center">{stats.correct}/{stats.total} correct</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={resumeTraining} className="flex-1 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
                    Resume
                  </button>
                  <button onClick={stopTraining} className="flex-1 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">
                    End
                  </button>
                </div>
              </div>
            )}

          </>
        )}
      </aside>

      {/* Mobile drills toggle */}
      <div className="flex lg:hidden items-center gap-2">
        <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <DrawerTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
              <FolderOpen size={14} /> Drills
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Drills</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => newDrillFolder(null)} className="text-muted-foreground hover:text-primary transition-colors" title="New folder"><FolderPlus size={14} /></button>
                <button onClick={() => { startNewDrill(); setSidebarOpen(false); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"><Plus size={11} /> New</button>
              </div>
              <FolderTree
                items={drills}
                folders={drillFolders}
                onMoveItem={onMoveDrill}
                onMoveFolder={moveDrillFolder}
                allFolders={drillFolders}
                onDeleteFolder={deleteDrillFolder}
                onRenameFolder={renameDrillFolder}
                selectedItemId={selectedDrillId}
                onSelectItem={(item) => { const d = drills.find((x) => x.id === item.id); if (d) { selectDrill(d); setSidebarOpen(false); } }}
                onEditItem={(id) => { const d = drills.find((x) => x.id === id); if (d) editDrill(d); setSidebarOpen(false); }}
                onDeleteItem={(id) => { onDeleteDrill(id); if (selectedDrillId === id) { setSelectedDrillId(null); setView("drills"); } }}
                renderItem={(item) => {
                  const d = drills.find((x) => x.id === item.id);
                  const active = item.id === selectedDrillId;
                  const drillSessions = sessions.filter((s) => s.drillId === item.id && s.endedAt !== null);
                  const totalCorrect = drillSessions.reduce((sum, s) => sum + s.correct, 0);
                  const totalHands = drillSessions.reduce((sum, s) => sum + s.total, 0);
                  const avg = totalHands > 0 ? ((totalCorrect / totalHands) * 100).toFixed(1) : null;
                  return (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0">
                        <span className={`text-xs font-medium truncate ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{item.name}</span>
                        {d && (
                          <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {d.numPlayers}p · {d.heroPosition}
                          </span>
                        )}
                        {avg && (
                          <span className="text-[9px]" style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            color: parseFloat(avg) >= 80 ? "#22c55e" : parseFloat(avg) >= 60 ? "#fbbf24" : "#ef4444",
                          }}>
                            Avg. {avg}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }}
                emptyMessage="No drills yet — create one to get started."
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="flex-1 overflow-y-auto min-w-0">

        {view === "drills" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-primary/30 flex items-center justify-center" style={{ backgroundColor: "var(--accent)" }}>
              <span style={{ fontSize: 28 }}>🃏</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Drill Trainer</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {drills.length === 0 ? "Create a drill to define your table setup and start training." : "Select a drill from the sidebar or create a new one."}
              </p>
            </div>
            <button onClick={startNewDrill} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
              <Plus size={15} /> Create Drill
            </button>
          </div>
        )}

        {view === "edit-drill" && (
          <div className="p-2">
            <h2 className="text-base font-semibold text-foreground mb-5">
              {editingDrill ? "Edit Drill" : "New Drill"}
            </h2>
            <DrillEditor
              initial={editingDrill}
              ranges={ranges}
              onSave={saveDrill}
              onCancel={() => setView(selectedDrill ? "training" : "drills")}
            />
          </div>
        )}

        {(view === "preview" || view === "training") && selectedDrill && viewingSession && (
          <div className="flex flex-col gap-4 lg:gap-6 h-full overflow-y-auto">
            <button onClick={backToTraining} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start">
              ← Back
            </button>
            <div className="bg-card rounded-xl border border-border p-4 lg:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base lg:text-lg font-semibold text-foreground">Session Details</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(viewingSession.startedAt)} — {viewingSession.endedAt ? formatDate(viewingSession.endedAt) : "In progress"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl lg:text-3xl font-bold" style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: viewingSession.total > 0 && (viewingSession.correct / viewingSession.total) >= 0.8 ? "#22c55e" : viewingSession.total > 0 && (viewingSession.correct / viewingSession.total) >= 0.6 ? "#fbbf24" : "#ef4444",
                  }}>
                    {viewingSession.total > 0 ? ((viewingSession.correct / viewingSession.total) * 100).toFixed(1) : "0.0"}%
                  </p>
                  <p className="text-xs text-muted-foreground">{viewingSession.correct}/{viewingSession.total} correct</p>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                <div className="flex-1 min-w-0 overflow-x-auto">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Per-Combo Accuracy</h4>
                  <div className="min-w-[300px]">
                    <SessionGrid comboStats={viewingSession.comboStats} />
                  </div>
                </div>
                <div className="w-full lg:w-48 flex-shrink-0">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Combo Breakdown</h4>
                  <div className="flex flex-col gap-1 max-h-48 lg:max-h-96 overflow-y-auto">
                    {Object.entries(viewingSession.comboStats)
                      .sort(([, a], [, b]) => (b.correct / b.total) - (a.correct / a.total))
                      .map(([hand, cs]) => {
                        const pct = (cs.correct / cs.total) * 100;
                        return (
                          <div key={hand} className="flex items-center justify-between text-xs py-0.5 px-1 rounded hover:bg-secondary">
                            <span className="font-mono font-medium">{hand}</span>
                            <span style={{ color: pct >= 80 ? "#22c55e" : pct >= 60 ? "#ca8a04" : "#dc2626" }}>
                              {cs.correct}/{cs.total}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "preview" && selectedDrill && !viewingSession && (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
            <div className="flex-1 lg:flex-[7] flex flex-col gap-3 lg:gap-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base lg:text-lg font-semibold text-foreground">{selectedDrill.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedRange ? `${selectedRange.name} · ` : ""}{selectedDrill.numPlayers}p · {selectedDrill.heroPosition}
                  </p>
                </div>
                <button onClick={goToTraining} className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors self-start sm:self-auto">
                  Start Training
                </button>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 lg:p-6 flex items-center justify-center flex-1 min-h-[200px]">
                <PokerTable
                  positions={getPositions(selectedDrill.numPlayers)}
                  heroPosition={selectedDrill.heroPosition}
                  foldedPositions={selectedDrill.foldedPositions}
                  betSizes={selectedDrill.betSizes}
                />
              </div>
            </div>

            <div className="flex-1 lg:flex-[3] flex flex-col gap-3 lg:gap-4 min-w-0">
              {(() => {
                const drillSessions = sessions
                  .filter((s) => s.drillId === selectedDrill.id && s.endedAt !== null)
                  .sort((a, b) => a.startedAt - b.startedAt);
                return (
                  <>
                    <div className="bg-card rounded-xl border border-border p-3">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Progress</h3>
                      {drillSessions.length > 1 ? (
                        <ResponsiveContainer width="100%" height={180}>
                          <AreaChart data={drillSessions.map(s => ({
                            date: formatDate(s.startedAt),
                            accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
                          }))}>
                            <defs>
                              <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                            />
                            <Area type="monotone" dataKey="accuracy" stroke="#22c55e" fill="url(#accGrad)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-8">Complete multiple sessions to see your progress.</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Past Sessions</span>
                      {drillSessions.length === 0 && (
                        <p className="text-xs text-muted-foreground">No completed sessions yet.</p>
                      )}
                      <div className="flex flex-col gap-1">
                        {[...drillSessions].reverse().map((s) => {
                          const pct = s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : "0.0";
                          return (
                            <div
                              key={s.id}
                              onClick={() => viewSession(s.id)}
                              className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-xs hover:bg-secondary text-muted-foreground hover:text-foreground"
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate">{formatDate(s.startedAt)}</span>
                                <span className="text-[10px] opacity-70">{s.total} hands</span>
                              </div>
                              <span className="font-bold flex-shrink-0 ml-2" style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                color: parseFloat(pct) >= 80 ? "#22c55e" : parseFloat(pct) >= 60 ? "#fbbf24" : "#ef4444",
                              }}>
                                {pct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {view === "training" && selectedDrill && !viewingSession && (
          phase === "idle" ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 lg:gap-8 px-2">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  {!selectedRange
                    ? "No range configured for this drill. Edit the drill to select a range."
                    : `"${selectedRange.name}" · ${Object.keys(selectedRange.grid).length} hands`}
                </p>
                {activeSession ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-card rounded-xl border border-border p-5 text-center min-w-60 w-full max-w-xs">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Active Session</p>
                      <p className="text-3xl lg:text-4xl font-bold" style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        color: parseFloat(accuracy!) >= 80 ? "#22c55e" : parseFloat(accuracy!) >= 60 ? "#fbbf24" : "#ef4444",
                      }}>
                        {accuracy}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{stats.correct}/{stats.total} correct</p>
                    </div>
                    <button onClick={resumeTraining} disabled={!selectedRange} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      Resume Current Session
                    </button>
                    <button onClick={startTraining} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                      Start New Session
                    </button>
                  </div>
                ) : (
                  <button onClick={startTraining} disabled={!selectedRange} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    Start Training
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
              <div className="flex-1 lg:flex-[7] flex flex-col items-center justify-center gap-4 lg:gap-6 min-w-0 relative">
                {selectedRange && (
                  <div className="absolute -top-1 -left-1 z-10 flex flex-col items-start gap-1">
                    <button onClick={() => setRevealGrid((v) => !v)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors bg-card/80 px-1.5 py-0.5 rounded">
                      {revealGrid ? "▼ Range map" : "▶ Range map"}
                    </button>
                    {revealGrid && (
                      <div className="bg-card/95 backdrop-blur-sm rounded-lg border border-border p-1.5 shadow-lg w-48">
                        <RangeGrid compact grid={selectedRange.grid} actions={selectedRange.actions} selectedAction="" onPaint={() => {}} readOnly highlightHand={currentHand} />
                      </div>
                    )}
                  </div>
                )}
                {currentHand && currentCombo && (
                  <>
                    <div className="w-full max-w-4xl">
                      <PokerTable
                        positions={getPositions(selectedDrill.numPlayers)}
                        heroPosition={selectedDrill.heroPosition}
                        heroHand={currentCombo}
                        foldedPositions={selectedDrill.foldedPositions}
                        betSizes={selectedDrill.betSizes}
                      />
                    </div>
                    <div className="flex justify-center w-full px-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 max-w-lg w-full">
                        {rangeActions.map((a) => (
                          <button key={a.id} onClick={() => answer(a.id)} disabled={userAnswer !== null}
                            style={getActionStyle(a)}
                            className="py-2.5 sm:py-3 rounded-full border font-semibold text-xs sm:text-sm hover:brightness-125 transition-all active:scale-95 truncate px-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:brightness-75">
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1 lg:flex-[3] flex flex-col gap-3 lg:gap-4 min-w-0">
                <div className="bg-card rounded-xl border border-border p-4 text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Session Accuracy</p>
                  <p className="text-2xl lg:text-3xl font-bold" style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: accuracy ? (parseFloat(accuracy) >= 80 ? "#22c55e" : parseFloat(accuracy) >= 60 ? "#fbbf24" : "#ef4444") : "var(--muted-foreground)",
                  }}>
                    {accuracy ?? "0.0"}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.correct}/{stats.total} correct</p>
                </div>

                {currentSession && (
                  <div className="bg-card rounded-xl border border-border p-3 flex-1 overflow-y-auto min-h-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Per-Combo Accuracy</p>
                    <SessionGrid comboStats={currentSession.comboStats} />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {currentSession && currentSession.history.length > 0 && (
                    <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</span>
                      <div className="flex flex-col gap-1">
                        {currentSession.history.slice(0, 10).map((entry, i) => (
                          <div key={i} className="flex items-center justify-between">
                            {renderMiniHandCards(entry.combo ?? entry.hand)}
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${entry.correct ? "bg-green-500" : "bg-red-500"}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={stopTraining} className="flex items-center justify-center gap-2 w-full py-2 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">
                    <Square size={10} /> End Session
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
    </>
  );
}
