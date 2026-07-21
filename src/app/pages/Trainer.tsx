import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Check, X, Square, Plus, FolderPlus, FolderOpen, GitBranch, Layout, Pencil, Edit, Trash2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { useTrainerContext } from "../TrainerContext";
import { loadSessions, saveSessions, loadLineSessions, saveLineSessions, expandHand, parseCombo, getPositions, getActionStyle, loadFromStorage } from "../utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PokerTable } from "../components/PokerTable";
import { RangeGrid } from "../components/RangeGrid";
import { SessionGrid } from "../components/SessionGrid";
import { FolderTree } from "../components/FolderTree";
import { DrillEditor } from "../components/DrillEditor";
import { LineDrillEditor } from "../components/LineDrillEditor";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from "../components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import type { Node, Edge } from "@xyflow/react";
import type { Drill, Range, SessionData, LineTree, LineNodeData, LineSessionData, LineDrill } from "../types";

type TrainerPhase = "idle" | "question" | "result";
type TrainerView = "drills" | "edit-drill" | "preview" | "training" | "edit-line-drill" | "line-drill-preview" | "line-drill-training";
type TrainerMode = "range" | "line";

export default function Trainer() {
  const { ranges, drills, drillFolders, lineTrees, lineFolders, lineDrills, lineDrillFolders, saveLineTree, renameLineTree, deleteLineTree, newLineFolder, saveDrill: onSaveDrill, deleteDrill: onDeleteDrill, moveDrill: onMoveDrill, newDrillFolder, renameDrillFolder, deleteDrillFolder, moveDrillFolder, saveLineDrill: onSaveLineDrill, deleteLineDrill: onDeleteLineDrill, moveLineDrill: onMoveLineDrill, newLineDrillFolder, renameLineDrillFolder, deleteLineDrillFolder, moveLineDrillFolder } = useTrainerContext();

  const [view, setView] = useState<TrainerView>("drills");
  const [mode, setMode] = useState<TrainerMode>("range");
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const [selectedLineDrillId, setSelectedLineDrillId] = useState<string | null>(null);
  const [lineHeroPosition, setLineHeroPosition] = useState<string>("BU");
  const [editingDrill, setEditingDrill] = useState<Drill | undefined>(undefined);
  const [editingLineDrill, setEditingLineDrill] = useState<LineDrill | undefined>(undefined);

  const [phase, setPhase] = useState<TrainerPhase>("idle");
  const [currentHand, setCurrentHand] = useState<string | null>(null);
  const [currentCombo, setCurrentCombo] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [revealGrid, setRevealGrid] = useState(false);
  const recentHandsRef = useRef<string[]>([]);

  const [lineTreeNodes, setLineTreeNodes] = useState<Node<LineNodeData>[]>([]);
  const [lineTreeEdges, setLineTreeEdges] = useState<Edge[]>([]);
  const [lineAnswer, setLineAnswer] = useState<string | null>(null);
  const [paths, setPaths] = useState<string[][]>([]);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [villainAction, setVillainAction] = useState<{ label: string; betSize?: string } | null>(null);
  const villainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineAnswerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAnswerRef = useRef<{ pathIdx: number; stepIdx: number } | null>(null);
  const [answerObservations, setAnswerObservations] = useState<{ label: string; html: string }[] | null>(null);

  const [sessions, setSessions] = useState<SessionData[]>(() => loadSessions());
  const [lineSessions, setLineSessions] = useState<LineSessionData[]>(() => loadLineSessions());
  const lineSessionsRef = useRef(lineSessions);
  lineSessionsRef.current = lineSessions;
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentLineSessionId, setCurrentLineSessionId] = useState<string | null>(null);
  const currentLineSessionRef = useRef<LineSessionData | null>(null);
  const [currentFlopNodeId, setCurrentFlopNodeId] = useState<string | null>(null);
  const [heroHand, setHeroHand] = useState<string | null>(null);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flippingOut, setFlippingOut] = useState(false);

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

  const currentLineSession = useMemo(
    () => lineSessions.find((s) => s.id === currentLineSessionId) ?? null,
    [lineSessions, currentLineSessionId]
  );
  currentLineSessionRef.current = currentLineSession;
  const lineStats = { correct: currentLineSession?.correct ?? 0, total: currentLineSession?.total ?? 0 };
  const lineAccuracy = lineStats.total > 0 ? ((lineStats.correct / lineStats.total) * 100).toFixed(1) : null;

  const currentPathNodeId = paths[currentPathIndex]?.[currentStepIndex] ?? null;
  const currentNode = lineTreeNodes.find((n) => n.id === currentPathNodeId) ?? null;
  const currentCorrectChild = currentNode ? findCorrectChild(currentNode.id) : null;
  const childrenOfCurrent = useMemo(() =>
    currentPathNodeId ? getOrderedChildren(currentPathNodeId) : [],
    [currentPathNodeId, lineTreeNodes, lineTreeEdges]
  );
  const heroActions = useMemo(() =>
    childrenOfCurrent.filter(c => c.data.nodeType !== "street" && c.data.nodeType !== "street-group"),
    [childrenOfCurrent]
  );
  const isVillainTurn = heroActions.length > 0 && heroActions.every(c => c.data.actor === 'villain');

  const flopNodeIds = useMemo(() =>
    lineTreeNodes.filter(n => n.data.street === "flop" && n.data.boardCards).map(n => n.id),
    [lineTreeNodes]
  );

  function shouldSkipPath(path: string[], flopId: string | null): boolean {
    if (!flopId) return false;
    const pathFlopId = path.find(id => flopNodeIds.includes(id));
    return pathFlopId !== undefined && pathFlopId !== flopId;
  }

  const boardCards = useMemo(() => {
    const cards: string[] = [];
    if (currentFlopNodeId) {
      const flopNode = lineTreeNodes.find(n => n.id === currentFlopNodeId);
      if (flopNode?.data.boardCards) {
        for (const c of flopNode.data.boardCards.split(",").map(s => s.trim()).filter(Boolean)) {
          if (!cards.includes(c)) cards.push(c);
        }
      }
    }
    const path = paths[currentPathIndex];
    if (path) {
      for (let i = 0; i <= currentStepIndex && i < path.length; i++) {
        const node = lineTreeNodes.find(n => n.id === path[i]);
        if (node?.data.boardCards && !flopNodeIds.includes(node.id)) {
          for (const c of node.data.boardCards.split(",").map(s => s.trim()).filter(Boolean)) {
            if (!cards.includes(c)) cards.push(c);
          }
        }
      }
    }
    return cards.length > 0 ? cards.join(",") : undefined;
  }, [currentPathIndex, currentStepIndex, paths, lineTreeNodes, currentFlopNodeId, flopNodeIds]);

  const betSizes = useMemo(() => {
    const path = paths[currentPathIndex];
    if (!path) return undefined;
    const drill = lineDrills.find((d) => d.id === selectedLineDrillId);
    if (!drill) return undefined;
    const opp = drill.heroPosition === "BU" ? "BB" : "BU";

    let streetStart = 0;
    for (let i = currentStepIndex; i >= 0; i--) {
      const node = lineTreeNodes.find(n => n.id === path[i]);
      if (node && (node.data.nodeType === 'street' || node.data.nodeType === 'street-group' || node.data.nodeType === 'street-header')) {
        streetStart = i + 1;
        break;
      }
    }

    const sizes: Record<string, string> = {};
    for (let i = streetStart; i <= currentStepIndex; i++) {
      const node = lineTreeNodes.find(n => n.id === path[i]);
      if (node?.data.betSize && node.data.actionType !== "check" && node.data.actionType !== "call" && node.data.actionType !== "allin" && node.data.actionType !== "fold") {
        const pos = node.data.actor === "hero" ? drill.heroPosition : opp;
        const label = node.data.actionType.charAt(0).toUpperCase() + node.data.actionType.slice(1);
        sizes[pos] = `${label} ${node.data.betSize}`;
      }
    }

    if (lineAnswer) {
      const pendingNode = lineTreeNodes.find(n => n.id === lineAnswer);
      if (pendingNode?.data.betSize && pendingNode.data.actionType !== "check" && pendingNode.data.actionType !== "call" && pendingNode.data.actionType !== "allin" && pendingNode.data.actionType !== "fold") {
        const pos = pendingNode.data.actor === "hero" ? drill.heroPosition : opp;
        const label = pendingNode.data.actionType.charAt(0).toUpperCase() + pendingNode.data.actionType.slice(1);
        sizes[pos] = `${label} ${pendingNode.data.betSize}`;
      }
    }

    if (villainAction?.betSize) {
      sizes[opp] = `${villainAction.label} ${villainAction.betSize}`;
    }

    return Object.keys(sizes).length > 0 ? sizes : undefined;
  }, [currentPathIndex, currentStepIndex, paths, lineTreeNodes, selectedLineDrillId, lineDrills, lineAnswer, villainAction]);

  useEffect(() => {
    if (!currentPathNodeId) {
      if (villainTimerRef.current) { clearTimeout(villainTimerRef.current); villainTimerRef.current = null; }
      setVillainAction(null);
      return;
    }

    const children = getOrderedChildren(currentPathNodeId);

    if (children.length === 0) {
      advanceLinePath();
      return;
    }

    const streetChildren = children.filter(c => c.data.nodeType === "street" || c.data.nodeType === "street-group");
    const nonStreetChildren = children.filter(c => c.data.nodeType !== "street" && c.data.nodeType !== "street-group");

    // Check if this is a street node with branching runout alternatives
    const isCurrentStreet = currentNode?.data.nodeType === "street" || currentNode?.data.nodeType === "street-group";

    if (isCurrentStreet && streetChildren.length > 1) {
      // Runout branching — weighted random selection among alternative board cards
      const hasWeights = streetChildren.some(c => c.data.weight !== undefined && c.data.weight > 0);
      const selectedChild: Node<LineNodeData> | undefined = hasWeights
        ? weightedRandomSelect(streetChildren)
        : streetChildren[Math.floor(Math.random() * streetChildren.length)];
      if (!selectedChild) return;

      let advancePathIdx = currentPathIndex;
      let advanceStepIdx = currentStepIndex;
      const currentPath = paths[currentPathIndex];
      if (currentPath) {
        const parentPos = currentPath.indexOf(currentPathNodeId);
        if (parentPos >= 0) {
          const expectedChild = currentPath[parentPos + 1];
          if (expectedChild !== selectedChild.id) {
            const newPathIdx = findPathContainingEdge(currentPathNodeId, selectedChild.id);
            if (newPathIdx >= 0) {
              advancePathIdx = newPathIdx;
              const childPos = paths[newPathIdx].indexOf(selectedChild.id);
              if (childPos >= 0) {
                advanceStepIdx = childPos;
              }
            }
          }
        }
      }

      if (advancePathIdx !== currentPathIndex) {
        setCurrentPathIndex(advancePathIdx);
      }
      if (advanceStepIdx !== currentStepIndex) {
        setCurrentStepIndex(advanceStepIdx);
      }

      const nextStep = advanceStepIdx + 1;
      const isLastStep = nextStep >= (paths[advancePathIdx]?.length ?? 0);

      if (villainTimerRef.current) { clearTimeout(villainTimerRef.current); villainTimerRef.current = null; }

      villainTimerRef.current = setTimeout(() => {
        villainTimerRef.current = null;
        if (isLastStep) {
          advanceLinePath();
        } else {
          setCurrentStepIndex(nextStep);
        }
      }, 600);

      return () => {
        if (villainTimerRef.current) { clearTimeout(villainTimerRef.current); villainTimerRef.current = null; }
      };
    }

    // Auto-skip street nodes with no actionable children
    if (isCurrentStreet && nonStreetChildren.length === 0) {
      const nextStep = currentStepIndex + 1;
      const isLastStep = nextStep >= (paths[currentPathIndex]?.length ?? 0);
      if (isLastStep) {
        advanceLinePath();
      } else {
        setCurrentStepIndex(nextStep);
      }
      return;
    }

    // Non-street node with multiple street children — runout branching point
    // Root is excluded — it auto-skips like a street node
    if (nonStreetChildren.length === 0 && streetChildren.length > 1) {
      if (currentNode?.data.nodeType === "root") {
        const nextStep = currentStepIndex + 1;
        const isLastStep = nextStep >= (paths[currentPathIndex]?.length ?? 0);
        if (isLastStep) {
          advanceLinePath();
        } else {
          setCurrentStepIndex(nextStep);
        }
        return;
      }
      const hasWeights = streetChildren.some(c => c.data.weight !== undefined && c.data.weight > 0);
      const selectedChild: Node<LineNodeData> | undefined = hasWeights
        ? weightedRandomSelect(streetChildren)
        : streetChildren[Math.floor(Math.random() * streetChildren.length)];
      if (!selectedChild) return;

      let advancePathIdx = currentPathIndex;
      let advanceStepIdx = currentStepIndex;
      const currentPath = paths[currentPathIndex];
      if (currentPath) {
        const parentPos = currentPath.indexOf(currentPathNodeId);
        if (parentPos >= 0) {
          const expectedChild = currentPath[parentPos + 1];
          if (expectedChild !== selectedChild.id) {
            const newPathIdx = findPathContainingEdge(currentPathNodeId, selectedChild.id);
            if (newPathIdx >= 0) {
              advancePathIdx = newPathIdx;
              const childPos = paths[newPathIdx].indexOf(selectedChild.id);
              if (childPos >= 0) {
                advanceStepIdx = childPos;
              }
            }
          }
        }
      }

      if (advancePathIdx !== currentPathIndex) {
        setCurrentPathIndex(advancePathIdx);
      }
      if (advanceStepIdx !== currentStepIndex) {
        setCurrentStepIndex(advanceStepIdx);
      }

      const nextStep = advanceStepIdx + 1;
      const isLastStep = nextStep >= (paths[advancePathIdx]?.length ?? 0);

      if (villainTimerRef.current) { clearTimeout(villainTimerRef.current); villainTimerRef.current = null; }

      villainTimerRef.current = setTimeout(() => {
        villainTimerRef.current = null;
        if (isLastStep) {
          advanceLinePath();
        } else {
          setCurrentStepIndex(nextStep);
        }
      }, 600);

      return () => {
        if (villainTimerRef.current) { clearTimeout(villainTimerRef.current); villainTimerRef.current = null; }
      };
    }

    // Non-street node with a single street child — linear flow, just advance
    if (nonStreetChildren.length === 0 && streetChildren.length === 1) {
      const nextStep = currentStepIndex + 1;
      const isLastStep = nextStep >= (paths[currentPathIndex]?.length ?? 0);
      if (isLastStep) {
        advanceLinePath();
      } else {
        setCurrentStepIndex(nextStep);
      }
      return;
    }

    const isVillain = nonStreetChildren.length > 0 && nonStreetChildren.every(c => c.data.actor === 'villain');

    if (isVillain) {
      const hasWeights = nonStreetChildren.some(c => c.data.weight !== undefined && c.data.weight > 0);

      let selectedChild: Node<LineNodeData>;
      if (hasWeights) {
        selectedChild = weightedRandomSelect(nonStreetChildren);
      } else {
        selectedChild = nonStreetChildren.find(n => n.data.correct) ?? nonStreetChildren[0];
      }
      if (!selectedChild) return;

      let advancePathIdx = currentPathIndex;
      let advanceStepIdx = currentStepIndex;
      const currentPath = paths[currentPathIndex];
      if (currentPath) {
        const parentPos = currentPath.indexOf(currentPathNodeId);
        if (parentPos >= 0) {
          const expectedChild = currentPath[parentPos + 1];
          if (expectedChild !== selectedChild.id) {
            const newPathIdx = findPathContainingEdge(currentPathNodeId, selectedChild.id);
            if (newPathIdx >= 0) {
              advancePathIdx = newPathIdx;
              const childPos = paths[newPathIdx].indexOf(selectedChild.id);
              if (childPos >= 0) {
                advanceStepIdx = childPos;
              }
            }
          }
        }
      }

      const label = selectedChild.data.actionType
        ? selectedChild.data.actionType.charAt(0).toUpperCase() + selectedChild.data.actionType.slice(1)
        : selectedChild.data.label;
      setVillainAction({ label, betSize: selectedChild.data.betSize });

      if (advancePathIdx !== currentPathIndex) {
        setCurrentPathIndex(advancePathIdx);
      }
      if (advanceStepIdx !== currentStepIndex) {
        setCurrentStepIndex(advanceStepIdx);
      }

      const nextStep = advanceStepIdx + 1;
      const isLastStep = nextStep >= (paths[advancePathIdx]?.length ?? 0);

      villainTimerRef.current = setTimeout(() => {
        setVillainAction(null);
        villainTimerRef.current = null;
        if (isLastStep) {
          advanceLinePath();
        } else {
          setCurrentStepIndex(nextStep);
        }
      }, 800);

      return () => {
        if (villainTimerRef.current) { clearTimeout(villainTimerRef.current); villainTimerRef.current = null; }
      };
    } else {
      if (villainTimerRef.current) { clearTimeout(villainTimerRef.current); villainTimerRef.current = null; }
      setVillainAction(null);
    }
  }, [currentPathNodeId]);

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
    setFlippingOut(true);
    setTimeout(() => {
      nextHand(selectedRange);
      setFlippingOut(false);
    }, 1500);
  }

  function viewSession(sessionId: string) {
    setViewingSessionId(sessionId);
  }

  function backToTraining() {
    setViewingSessionId(null);
  }

  // ─── Line Tree Helpers ─────────────────────────────────────────────────────

  const selectedLineDrill = useMemo(() => lineDrills.find((d) => d.id === selectedLineDrillId) ?? null, [lineDrills, selectedLineDrillId]);
  const selectedLineDrillTree = useMemo(() => {
    if (!selectedLineDrill) return null;
    return lineTrees.find((t) => t.id === selectedLineDrill.lineTreeId) ?? null;
  }, [selectedLineDrill, lineTrees]);

  const lineRootNode = useMemo(() => lineTreeNodes.find((n) => n.type === "root") ?? null, [lineTreeNodes]);

  function parseLineTree(tree: LineTree) {
    try {
      const nodes = JSON.parse(tree.nodes || "[]") as Node<LineNodeData>[];
      const edges = JSON.parse(tree.edges || "[]") as Edge[];
      setLineTreeNodes(nodes);
      setLineTreeEdges(edges);
      return { nodes, edges };
    } catch {
      setLineTreeNodes([]);
      setLineTreeEdges([]);
      return { nodes: [], edges: [] };
    }
  }

  function getOrderedChildren(parentId: string): Node<LineNodeData>[] {
    return lineTreeEdges
      .filter((e) => e.source === parentId)
      .map((e) => lineTreeNodes.find((n) => n.id === e.target))
      .filter((n): n is Node<LineNodeData> => n !== undefined)
      .sort((a, b) => a.position.x - b.position.x);
  }

  function findCorrectChild(parentId: string): Node<LineNodeData> | null {
    return getOrderedChildren(parentId).find((n) => n.data.correct) ?? null;
  }

  function findPathContainingEdge(parentId: string, childId: string): number {
    return paths.findIndex(p => {
      for (let j = 0; j < p.length - 1; j++) {
        if (p[j] === parentId && p[j + 1] === childId) return true;
      }
      return false;
    });
  }

  function findDivergenceIndex(pathA: string[], pathB: string[]): number {
    let i = 0;
    while (i < pathA.length && i < pathB.length && pathA[i] === pathB[i]) i++;
    return i;
  }

  function weightedRandomSelect(children: Node<LineNodeData>[]): Node<LineNodeData> {
    const weights = children.map(c => c.data.weight ?? 1);
    const totalWeight = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
    if (totalWeight <= 0) {
      return children[Math.floor(Math.random() * children.length)];
    }
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < children.length; i++) {
      rand -= Math.max(0, weights[i]);
      if (rand <= 0) return children[i];
    }
    return children[children.length - 1];
  }

  function getPathLabels(path: string[]): string[] {
    return path.map(nodeId => {
      const n = lineTreeNodes.find(nd => nd.id === nodeId);
      if (!n) return "?";
      if (n.data.actionType) {
        let label = n.data.actionType.charAt(0).toUpperCase() + n.data.actionType.slice(1);
        if (n.data.betSize) label += ` ${n.data.betSize}`;
        return label;
      }
      return n.data.label || n.data.nodeType || "?";
    });
  }

  function getPathActionsByStreet(path: string[]): { flop: string[]; turn: string[]; river: string[] } {
    const result: { flop: string[]; turn: string[]; river: string[] } = { flop: [], turn: [], river: [] };
    let currentStreet: 'preflop' | 'flop' | 'turn' | 'river' = 'preflop';
    for (const nodeId of path) {
      const n = lineTreeNodes.find(nd => nd.id === nodeId);
      if (!n) continue;
      if (n.data.nodeType === 'street' || n.data.nodeType === 'street-group' || n.data.nodeType === 'street-header') {
        if (n.data.street === 'flop' || n.data.street === 'turn' || n.data.street === 'river') {
          currentStreet = n.data.street;
        }
        continue;
      }
      if (!n.data.actionType) continue;
      if (currentStreet === 'preflop') continue;

      if (n.data.actor === 'hero') {
        const parentEdge = lineTreeEdges.find(e => e.target === nodeId);
        if (parentEdge) {
          const correctChild = lineTreeEdges
            .filter(e => e.source === parentEdge.source)
            .map(e => lineTreeNodes.find(nd => nd.id === e.target))
            .find((nd): nd is Node<LineNodeData> => nd?.data.actor === 'hero' && !!nd.data.correct);
          if (correctChild) {
            let label = correctChild.data.actionType!.charAt(0).toUpperCase() + correctChild.data.actionType!.slice(1);
            if (correctChild.data.betSize) label += ` ${correctChild.data.betSize}`;
            result[currentStreet].push(label);
            continue;
          }
        }
      }

      let label = n.data.actionType.charAt(0).toUpperCase() + n.data.actionType.slice(1);
      if (n.data.betSize) label += ` ${n.data.betSize}`;
      result[currentStreet].push(label);
    }
    return result;
  }

  function getPathKey(path: string[]): string {
    return path.join("|");
  }

  function generatePaths(nodes: Node<LineNodeData>[], edges: Edge[]): string[][] {
    const root = nodes.find((n) => n.type === "root");
    if (!root) return [];
    const result: string[][] = [];

    function dfs(nodeId: string, currentPath: string[]) {
      const children = edges
        .filter((e) => e.source === nodeId)
        .map((e) => nodes.find((n) => n.id === e.target))
        .filter((n): n is Node<LineNodeData> => n !== undefined)
        .sort((a, b) => a.position.x - b.position.x);

      if (children.length === 0) {
        if (currentPath.length > 1) result.push([...currentPath]);
        return;
      }

      for (const child of children) {
        currentPath.push(child.id);
        dfs(child.id, currentPath);
        currentPath.pop();
      }
    }

    const rootChildren = edges
      .filter((e) => e.source === root.id)
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n): n is Node<LineNodeData> => n !== undefined)
      .sort((a, b) => a.position.x - b.position.x);

    for (const child of rootChildren) {
      dfs(child.id, [root.id, child.id]);
    }

    return result;
  }

  // ─── Line Drill Lifecycle ─────────────────────────────────────────────────

  function startNewLineDrill() {
    setEditingLineDrill(undefined);
    setView("edit-line-drill");
  }

  function editLineDrill(drill: LineDrill) {
    setEditingLineDrill(drill);
    setView("edit-line-drill");
  }

  function saveLineDrill(drill: LineDrill) {
    onSaveLineDrill(drill);
    setSelectedLineDrillId(drill.id);
    setView("line-drill-training");
  }

  function selectLineDrill(drill: LineDrill) {
    setSelectedLineDrillId(drill.id);
    const loaded = loadLineSessions();
    setLineSessions(loaded);
    const active = loaded.find((s) => s.lineDrillId === drill.id && s.endedAt === null);
    setCurrentLineSessionId(active?.id ?? null);
    setLineAnswer(null);
    setCurrentPathIndex(0);
    setCurrentStepIndex(0);
    setCurrentFlopNodeId(null);

    const raw = loadFromStorage();
    const storedTree = raw.lineTrees?.find(t => t.id === drill.lineTreeId);
    if (!storedTree) { setView("line-drill-preview"); return; }
    const parsed = parseLineTree(storedTree);
    if (parsed.nodes.length > 0) {
      const generated = generatePaths(parsed.nodes, parsed.edges);
      setPaths(generated);
    }

    if (active) {
      setView("line-drill-training");
      setPhase("question");
    } else {
      setView("line-drill-preview");
      setPhase("idle");
    }
  }

  function startLineDrillTraining() {
    if (!selectedLineDrill || !selectedLineDrillTree) {
      toast("No line tree linked to this drill.", { icon: <X size={18} className="text-red-500" /> });
      return;
    }

    if (lineAnswerTimerRef.current) { clearTimeout(lineAnswerTimerRef.current); lineAnswerTimerRef.current = null; }
    if (villainTimerRef.current) { clearTimeout(villainTimerRef.current); villainTimerRef.current = null; }

    let freshNodes: Node<LineNodeData>[], freshEdges: Edge[];
    try {
      const raw = loadFromStorage();
      const storedTree = raw.lineTrees?.find(t => t.id === selectedLineDrill.lineTreeId);
      if (!storedTree) {
        toast("Line tree data not found.", { icon: <X size={18} className="text-red-500" /> });
        return;
      }
      freshNodes = JSON.parse(storedTree.nodes || "[]");
      freshEdges = JSON.parse(storedTree.edges || "[]");
    } catch {
      toast("Failed to parse line tree data.", { icon: <X size={18} className="text-red-500" /> });
      return;
    }
    if (freshNodes.length === 0) {
      toast("The selected tree has no scenarios available for testing.", { icon: <X size={18} className="text-red-500" /> });
      return;
    }

    setLineTreeNodes(freshNodes);
    setLineTreeEdges(freshEdges);

    const freshFlopIds = freshNodes
      .filter(n => n.data.street === "flop" && n.data.boardCards)
      .map(n => n.id);
    const initialFlopId = freshFlopIds.length > 0
      ? freshFlopIds[Math.floor(Math.random() * freshFlopIds.length)]
      : null;

    const generated = generatePaths(freshNodes, freshEdges);
    setPaths(generated);

    const updated = lineSessions.map((s) =>
      s.lineDrillId === selectedLineDrill.id && s.endedAt === null
        ? { ...s, endedAt: Date.now() }
        : s
    );
    const newSession: LineSessionData = {
      id: `line-session-${Date.now()}`,
      lineTreeId: selectedLineDrill.lineTreeId,
      lineDrillId: selectedLineDrill.id,
      heroPosition: selectedLineDrill.heroPosition,
      startedAt: Date.now(),
      endedAt: null,
      total: 0,
      correct: 0,
      history: [],
      usedFlopNodeIds: initialFlopId ? [initialFlopId] : [],
    };
    const all = [...updated, newSession];
    setLineSessions(all);
    saveLineSessions(all);
    setCurrentLineSessionId(newSession.id);
    setCurrentFlopNodeId(initialFlopId);
    const flopNode = freshNodes.find(n => n.id === initialFlopId);
    setHeroHand(flopNode?.data.heroCards ? flopNode.data.heroCards.replace(/,/g, "") : null);
    setView("line-drill-training");
    const initialPathIdx = initialFlopId
      ? generated.findIndex(p => !shouldSkipPath(p, initialFlopId))
      : 0;
    setCurrentPathIndex(initialPathIdx >= 0 ? initialPathIdx : 0);
    setCurrentStepIndex(0);
  }

  function stopLineDrillTraining() {
    if (lineAnswerTimerRef.current) { clearTimeout(lineAnswerTimerRef.current); lineAnswerTimerRef.current = null; }
    if (villainTimerRef.current) { clearTimeout(villainTimerRef.current); villainTimerRef.current = null; }
    if (!currentLineSession) return;
    const updated = lineSessions.map((s) =>
      s.id === currentLineSession.id ? { ...s, endedAt: Date.now() } : s
    );
    setLineSessions(updated);
    saveLineSessions(updated);
    setView("line-drill-preview");
    setCurrentLineSessionId(null);
    setLineAnswer(null);
    setCurrentPathIndex(0);
    setCurrentStepIndex(0);
    setCurrentFlopNodeId(null);
    setHeroHand(null);
  }

  function advanceLinePath() {
    if (paths.length === 0) return;
    if (currentPathIndex < 0) return;

    const latestSession = currentLineSessionRef.current;
    const latestSessions = lineSessionsRef.current;

    if (flopNodeIds.length === 0) {
      const next = currentPathIndex + 1;
      if (next < paths.length) {
        setCurrentPathIndex(next);
        setCurrentStepIndex(0);
        setLineAnswer(null);
      } else {
        setCurrentPathIndex(-1);
        setCurrentStepIndex(0);
        setLineAnswer(null);
      }
      return;
    }

    // Try the next path that shares the same flop before cycling to a new flop
    if (currentFlopNodeId) {
      const nextPathIdx = currentPathIndex + 1;
      if (nextPathIdx < paths.length && paths[nextPathIdx].includes(currentFlopNodeId)) {
        const divergenceIdx = findDivergenceIndex(paths[currentPathIndex], paths[nextPathIdx]);
        setCurrentPathIndex(nextPathIdx);
        setCurrentStepIndex(divergenceIdx);
        setLineAnswer(null);
        return;
      }
    }

    const usedIds = latestSession?.usedFlopNodeIds ?? [];
    const unusedIds = flopNodeIds.filter(id => !usedIds.includes(id));

    if (unusedIds.length > 0) {
      for (const candidate of unusedIds) {
        const candidatePathIdx = paths.findIndex(p => !shouldSkipPath(p, candidate));
        if (candidatePathIdx < 0) continue;

        const updatedUsedIds = currentFlopNodeId
          ? [...new Set([...usedIds, currentFlopNodeId, candidate])]
          : [...usedIds, candidate];
        setCurrentFlopNodeId(candidate);
        const flopNode = lineTreeNodes.find(n => n.id === candidate);
        setHeroHand(flopNode?.data.heroCards ? flopNode.data.heroCards.replace(/,/g, "") : null);
        if (latestSession) {
          const updated = latestSessions.map(s =>
            s.id === latestSession.id
              ? { ...s, usedFlopNodeIds: updatedUsedIds }
              : s
          );
          setLineSessions(updated);
          saveLineSessions(updated);
        }
        setCurrentPathIndex(candidatePathIdx);
        setCurrentStepIndex(0);
        setLineAnswer(null);
        return;
      }
    }

    setCurrentPathIndex(-1);
    setCurrentStepIndex(0);
    setLineAnswer(null);
  }

  function lineAnswerAction(nodeId: string) {
    if (!currentLineSession || !currentPathNodeId) return;
    const clicked = lineTreeNodes.find((n) => n.id === nodeId);
    if (!clicked) return;
    const correctNode = findCorrectChild(currentPathNodeId);
    const isCorrect = correctNode?.id === nodeId;

    if (isCorrect) {
      toast("Correct", { icon: <Check size={18} className="text-green-500" /> });
    } else {
      toast(`Incorrect — expected "${correctNode?.data.actionType ?? "?"}"`, { icon: <X size={18} className="text-red-500" /> });
    }

    const updatedNodes = lineTreeNodes.map((n) => {
      if (n.id === nodeId) {
        const prev = n.data.stats ?? { total: 0, correct: 0 };
        return { ...n, data: { ...n.data, stats: { total: prev.total + 1, correct: prev.correct + (isCorrect ? 1 : 0) } } };
      }
      if (correctNode && n.id === correctNode.id && nodeId !== correctNode.id) {
        const prev = n.data.stats ?? { total: 0, correct: 0 };
        return { ...n, data: { ...n.data, stats: { total: prev.total + 1, correct: prev.correct } } };
      }
      return n;
    });
    setLineTreeNodes(updatedNodes);

    const currentPath = paths[currentPathIndex]?.slice(0, currentStepIndex + 3) ?? [];
    const pathKey = currentPath.length >= 2 ? getPathKey(currentPath) : "";
    const pathLabels = currentPath.length >= 2 ? getPathLabels(currentPath) : [];

    const updatedSessions = lineSessions.map((s) => {
      if (s.id !== currentLineSession.id) return s;
      const prevPathStats = s.pathStats ?? {};
      const prevPath = pathKey ? (prevPathStats[pathKey] ?? { total: 0, correct: 0, pathLabels }) : null;
      const newPathStats = pathKey ? {
        ...prevPathStats,
        [pathKey]: {
          total: (prevPath?.total ?? 0) + 1,
          correct: (prevPath?.correct ?? 0) + (isCorrect ? 1 : 0),
          pathLabels,
        },
      } : prevPathStats;
      return {
        ...s,
        total: s.total + 1,
        correct: s.correct + (isCorrect ? 1 : 0),
        history: [{ nodeId, nodeLabel: clicked.data.actionType ?? "", correct: isCorrect, boardCards: boardCards }, ...s.history],
        pathStats: newPathStats,
      };
    });
    setLineSessions(updatedSessions);
    saveLineSessions(updatedSessions);

    const obsNodes: { label: string; html: string }[] = [];
    if (currentNode?.data.observation) {
      obsNodes.push({ label: "Situation", html: currentNode.data.observation });
    }
    if (correctNode?.data.observation) {
      obsNodes.push({ label: "Correct — " + (correctNode.data.actionType ?? ""), html: correctNode.data.observation });
    }
    if (clicked && clicked.id !== correctNode?.id && clicked.data.observation) {
      obsNodes.push({ label: "Your answer — " + (clicked.data.actionType ?? ""), html: clicked.data.observation });
    }

    const targetPathIdx = findPathContainingEdge(currentPathNodeId, nodeId);
    const effectivePathIdx = targetPathIdx >= 0 ? targetPathIdx : currentPathIndex;
    const effectiveStepIdx = targetPathIdx >= 0
      ? paths[targetPathIdx].indexOf(nodeId)
      : currentStepIndex;
    pendingAnswerRef.current = { pathIdx: effectivePathIdx, stepIdx: effectiveStepIdx };

    setLineAnswer(nodeId);

    const advanceAfterAnswer = () => {
      const target = pendingAnswerRef.current!;
      pendingAnswerRef.current = null;
      const nextStep = target.stepIdx + 1;
      if (target.pathIdx !== currentPathIndex) {
        setCurrentPathIndex(target.pathIdx);
      }
      if (nextStep < paths[target.pathIdx].length) {
        setCurrentStepIndex(nextStep);
      } else {
        advanceLinePath();
      }
      setLineAnswer(null);
    };

    if (obsNodes.length > 0) {
      setAnswerObservations(obsNodes);
    } else if (isCorrect) {
      if (lineAnswerTimerRef.current) clearTimeout(lineAnswerTimerRef.current);
      lineAnswerTimerRef.current = setTimeout(() => {
        lineAnswerTimerRef.current = null;
        advanceAfterAnswer();
      }, 1000);
    } else {
      if (lineAnswerTimerRef.current) clearTimeout(lineAnswerTimerRef.current);
      lineAnswerTimerRef.current = setTimeout(() => {
        lineAnswerTimerRef.current = null;
        advanceAfterAnswer();
      }, 1500);
    }

    if (selectedLineDrillTree) {
      saveLineTree({
        ...selectedLineDrillTree,
        nodes: JSON.stringify(updatedNodes),
        edges: JSON.stringify(lineTreeEdges),
      });
    }
  }

  function continueAfterObservation() {
    setAnswerObservations(null);
    const target = pendingAnswerRef.current;
    pendingAnswerRef.current = null;
    if (target) {
      const nextStep = target.stepIdx + 1;
      if (target.pathIdx !== currentPathIndex) {
        setCurrentPathIndex(target.pathIdx);
      }
      if (nextStep < paths[target.pathIdx].length) {
        setCurrentStepIndex(nextStep);
      } else {
        advanceLinePath();
      }
    } else {
      const nextStep = currentStepIndex + 1;
      if (nextStep < paths[currentPathIndex].length) {
        setCurrentStepIndex(nextStep);
      } else {
        advanceLinePath();
      }
    }
    setLineAnswer(null);
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

  const SUIT_SYMBOLS: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
  const SUIT_COLORS: Record<string, string> = { s: "#000", h: "#ef4444", d: "#3b82f6", c: "#22c55e" };

  function renderMiniBoardCards(cards: string) {
    const list = cards.split(",").map(c => c.trim()).filter(Boolean);
    return (
      <div className="flex gap-0.5">
        {list.map((card, i) => {
          const rank = card[0].toUpperCase();
          const suit = card[1]?.toLowerCase();
          const color = SUIT_COLORS[suit] ?? "var(--card-foreground)";
          return (
            <div key={i} className="rounded border border-border flex flex-col items-center justify-center" style={{ width: 22, height: 30, backgroundColor: "var(--card)" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color, lineHeight: 1 }}>{rank}</span>
              <span style={{ fontSize: 7, color, lineHeight: 1 }}>{SUIT_SYMBOLS[suit] ?? "?"}</span>
            </div>
          );
        })}
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
        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-secondary rounded-full p-0.5">
          <button
            onClick={() => setMode("range")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-full transition-colors ${
              mode === "range" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layout size={12} /> Ranges
          </button>
          <button
            onClick={() => setMode("line")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-full transition-colors ${
              mode === "line" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitBranch size={12} /> Lines
          </button>
        </div>

        {mode === "range" && (
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
        )}

        {mode === "line" && (
          <div className="flex flex-col gap-4">
            {/* Line Drills section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Line Drills</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => newLineDrillFolder(null)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="New folder"
                  >
                    <FolderPlus size={12} />
                  </button>
                  <button
                    onClick={startNewLineDrill}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Plus size={11} /> New
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <FolderTree
                  items={lineDrills}
                  folders={lineDrillFolders}
                  onMoveItem={onMoveLineDrill}
                  onMoveFolder={moveLineDrillFolder}
                  allFolders={lineDrillFolders}
                  onDeleteFolder={deleteLineDrillFolder}
                  onRenameFolder={renameLineDrillFolder}
                  selectedItemId={selectedLineDrillId}
                  onSelectItem={(item) => { const d = lineDrills.find((x) => x.id === item.id); if (d) { selectLineDrill(d); setSidebarOpen(false); } }}
                  onEditItem={(id) => { const d = lineDrills.find((x) => x.id === id); if (d) editLineDrill(d); setSidebarOpen(false); }}
                  onDeleteItem={(id) => { onDeleteLineDrill(id); if (selectedLineDrillId === id) { setSelectedLineDrillId(null); setView("drills"); } }}
                  renderItem={(item) => {
                    const d = lineDrills.find((x) => x.id === item.id);
                    const active = item.id === selectedLineDrillId;
                    const drillSessions = lineSessions.filter((s) => s.lineDrillId === item.id && s.endedAt !== null);
                    const totalCorrect = drillSessions.reduce((sum, s) => sum + s.correct, 0);
                    const totalHands = drillSessions.reduce((sum, s) => sum + s.total, 0);
                    const avg = totalHands > 0 ? ((totalCorrect / totalHands) * 100).toFixed(1) : null;
                    const treeName = d ? lineTrees.find(t => t.id === d.lineTreeId)?.name ?? "?" : "";
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col min-w-0">
                          <span className={`text-xs font-medium truncate ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{item.name}</span>
                          {d && (
                            <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {treeName} · {d.heroPosition}
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
                  emptyMessage="No line drills yet — create one to get started."
                />
              </div>
            </div>

          </div>
        )}

        {mode === "range" && selectedDrill && (view === "preview" || view === "training") && (
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

        {mode === "line" && selectedLineDrill && view && (
          <>
            {currentLineSession && (phase === "idle" || view === "line-drill-training") && (
              <div className="bg-card rounded-md border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Active Session</p>
                <p className="text-2xl font-bold text-center" style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: lineAccuracy && parseFloat(lineAccuracy) >= 80 ? "#22c55e" : lineAccuracy && parseFloat(lineAccuracy) >= 60 ? "#fbbf24" : "#ef4444",
                }}>
                  {lineAccuracy ?? "0.0"}%
                </p>
                <p className="text-xs text-muted-foreground text-center">{lineStats.correct}/{lineStats.total} correct</p>
              </div>
            )}
          </>
        )}
      </aside>

      {/* Mobile mode toggle & drawer */}
      <div className="flex lg:hidden items-center gap-2">
        <div className="flex items-center gap-1 bg-secondary rounded-full p-0.5">
          <button
            onClick={() => setMode("range")}
            className={`flex items-center gap-1 text-[10px] py-1 px-2.5 rounded-full transition-colors ${
              mode === "range" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Layout size={11} /> Ranges
          </button>
          <button
            onClick={() => setMode("line")}
            className={`flex items-center gap-1 text-[10px] py-1 px-2.5 rounded-full transition-colors ${
              mode === "line" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <GitBranch size={11} /> Lines
          </button>
        </div>
        <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <DrawerTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
              <FolderOpen size={14} /> {mode === "range" ? "Drills" : "Lines"}
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{mode === "range" ? "Drills" : "Line Drills"}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 flex flex-col gap-3">
              {mode === "range" && (
                <>
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
                </>
              )}
              {mode === "line" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => newLineDrillFolder(null)} className="text-muted-foreground hover:text-primary transition-colors" title="New folder"><FolderPlus size={14} /></button>
                    <button onClick={() => { startNewLineDrill(); setSidebarOpen(false); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"><Plus size={11} /> New Line Drill</button>
                  </div>
                  <FolderTree
                    items={lineDrills}
                    folders={lineDrillFolders}
                    onMoveItem={onMoveLineDrill}
                    onMoveFolder={moveLineDrillFolder}
                    allFolders={lineDrillFolders}
                    onDeleteFolder={deleteLineDrillFolder}
                    onRenameFolder={renameLineDrillFolder}
                    selectedItemId={selectedLineDrillId}
                    onSelectItem={(item) => { const d = lineDrills.find((x) => x.id === item.id); if (d) { selectLineDrill(d); setSidebarOpen(false); } }}
                    onEditItem={(id) => { const d = lineDrills.find((x) => x.id === id); if (d) editLineDrill(d); setSidebarOpen(false); }}
                    onDeleteItem={(id) => { onDeleteLineDrill(id); if (selectedLineDrillId === id) { setSelectedLineDrillId(null); setView("drills"); } }}
                    renderItem={(item) => {
                      const d = lineDrills.find((x) => x.id === item.id);
                      const active = item.id === selectedLineDrillId;
                      const drillSessions = lineSessions.filter((s) => s.lineDrillId === item.id && s.endedAt !== null);
                      const totalCorrect = drillSessions.reduce((sum, s) => sum + s.correct, 0);
                      const totalHands = drillSessions.reduce((sum, s) => sum + s.total, 0);
                      const avg = totalHands > 0 ? ((totalCorrect / totalHands) * 100).toFixed(1) : null;
                      const treeName = d ? lineTrees.find(t => t.id === d.lineTreeId)?.name ?? "?" : "";
                      return (
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col min-w-0">
                            <span className={`text-xs font-medium truncate ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{item.name}</span>
                            {d && (
                              <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {treeName} · {d.heroPosition}
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
                    emptyMessage="No line drills yet — create one to get started."
                  />
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="flex-1 overflow-y-auto min-w-0">

        {view === "drills" && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-primary/30 flex items-center justify-center" style={{ backgroundColor: "var(--accent)" }}>
              <span style={{ fontSize: 28 }}>{mode === "line" ? "🌳" : "🃏"}</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{mode === "line" ? "Line Drill Trainer" : "Drill Trainer"}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "line"
                  ? (lineDrills.length === 0 ? "Create a line drill to define your tree setup and start training." : "Select a line drill from the sidebar or create a new one.")
                  : (drills.length === 0 ? "Create a drill to define your table setup and start training." : "Select a drill from the sidebar or create a new one.")
                }
              </p>
            </div>
            {mode === "range" ? (
              <button onClick={startNewDrill} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                <Plus size={15} /> Create Drill
              </button>
            ) : (
              <button onClick={startNewLineDrill} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                <Plus size={15} /> Create Line Drill
              </button>
            )}
          </div>
        )}

        {view === "line-drill-preview" && selectedLineDrill && (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
            <div className="flex-1 lg:flex-[7] flex flex-col gap-3 lg:gap-4 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base lg:text-lg font-semibold text-foreground">{selectedLineDrill.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedLineDrillTree ? `${selectedLineDrillTree.name} · ` : ""}{lineTreeNodes.length} nodes · {lineTreeEdges.length} connections · {selectedLineDrill.heroPosition}
                  </p>
                  {selectedLineDrill.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedLineDrill.description}</p>
                  )}
                </div>
                <button onClick={startLineDrillTraining} className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors self-start sm:self-auto">
                  Start Training
                </button>
              </div>

              <div className="bg-card rounded-xl border border-border p-4 flex-1 flex flex-col min-h-0">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex-shrink-0">Path Accuracy</h3>
                {(() => {
                  const selectedDrillSessions = lineSessions
                    .filter((s) => s.lineDrillId === selectedLineDrill.id && s.endedAt !== null);
                  const aggregatedPathStats: Record<string, { total: number; correct: number; pathLabels: string[] }> = {};
                  for (const session of selectedDrillSessions) {
                    if (!session.pathStats) continue;
                    for (const [key, ps] of Object.entries(session.pathStats)) {
                      const existing = aggregatedPathStats[key];
                      if (existing) {
                        existing.total += ps.total;
                        existing.correct += ps.correct;
                      } else {
                        aggregatedPathStats[key] = { ...ps };
                      }
                    }
                  }
                  const entries = Object.entries(aggregatedPathStats)
                    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total));
                  if (entries.length === 0) {
                    return <p className="text-xs text-muted-foreground">No training data yet.</p>;
                  }
                  return (
                    <div className="overflow-y-auto flex-1 min-h-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px] text-center">Flop</TableHead>
                              <TableHead className="text-[10px] text-center">Turn</TableHead>
                              <TableHead className="text-[10px] text-center">River</TableHead>
                              <TableHead className="text-[10px] text-right">%</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entries.map(([key, ps]) => {
                              const pathNodeIds = key.split("|");
                              const streetActions = getPathActionsByStreet(pathNodeIds);
                              const pct = (ps.correct / ps.total) * 100;
                              return (
                                <TableRow key={key}>
                                  {(['flop', 'turn', 'river'] as const).map(street => (
                                    <TableCell key={street} className="text-center text-[10px] truncate max-w-[120px] font-medium">
                                      {streetActions[street].length > 0 ? streetActions[street].join(" → ") : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                  ))}
                                  <TableCell className="text-right font-mono font-medium" style={{
                                    color: pct >= 80 ? "#22c55e" : pct >= 60 ? "#fbbf24" : "#ef4444",
                                  }}>
                                    {pct.toFixed(0)}%
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex-1 lg:flex-[3] flex flex-col gap-3 lg:gap-4 min-w-0">
              {(() => {
                const drillSessions = lineSessions
                  .filter((s) => s.lineDrillId === selectedLineDrill.id && s.endedAt !== null)
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
                              <linearGradient id="lineAccGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                            />
                            <Area type="monotone" dataKey="accuracy" stroke="#22c55e" fill="url(#lineAccGrad)" strokeWidth={2} />
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
                        {[...drillSessions].reverse().slice(0, 20).map((s) => {
                          const pct = s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : "0.0";
                          return (
                            <div key={s.id} className="flex items-center justify-between px-2 py-1.5 rounded-md text-xs">
                              <span className="text-muted-foreground truncate">{formatDate(s.startedAt)}</span>
                              <span className="font-bold" style={{
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

        {view === "line-drill-training" && selectedLineDrill && currentLineSession && (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
            <div className="flex-1 lg:flex-[7] flex flex-col items-center gap-4 lg:gap-6 min-w-0 h-full">
              {currentNode ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 lg:gap-3 min-h-0 w-full max-w-4xl">
                    <div className="w-full max-w-4xl">
                      <PokerTable
                        positions={["BU", "BB"]}
                        heroPosition={selectedLineDrill.heroPosition}
                        heroHand={heroHand}
                        boardCards={boardCards}
                        betSizes={betSizes}
                      />
                    </div>

                    {isVillainTurn ? (
                      <div className="w-full max-w-lg text-center py-4">
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/50 animate-pulse" />
                          Villain {villainAction?.label ?? "acting"}{villainAction?.betSize ? ` ${villainAction.betSize}` : ""}...
                        </div>
                      </div>
                    ) : heroActions.length > 0 ? (
                      <div className="w-full max-w-lg">
                        <p className="text-xs text-muted-foreground mb-2 text-center">Your action:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {heroActions.map((child) => {
                            const isCorrect = currentCorrectChild?.id === child.id;
                            const wasWrong = lineAnswer === child.id && !isCorrect;
                            const wasRight = lineAnswer === child.id && isCorrect;
                            let btnClass = "py-3 rounded-lg border-2 font-semibold text-xs sm:text-sm transition-all truncate px-3 ";
                            if (wasRight) btnClass += "border-green-500 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
                            else if (wasWrong) btnClass += "border-red-500 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
                            else if (lineAnswer && isCorrect) btnClass += "border-green-500 bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-300 opacity-60";
                            else btnClass += "border-border bg-card text-foreground hover:bg-secondary";
                            return (
                              <button
                                key={child.id}
                                onClick={() => lineAnswerAction(child.id)}
                                disabled={lineAnswer !== null}
                                className={btnClass}
                              >
                                {child.data.actionType ? (
                                  <span className="flex flex-col items-center gap-0.5">
                                    <span>{child.data.actionType.charAt(0).toUpperCase() + child.data.actionType.slice(1)}</span>
                                    {child.data.betSize && (
                                      <span className="text-[10px] opacity-70 font-mono">{child.data.betSize}</span>
                                    )}
                                  </span>
                                ) : child.data.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <p className="text-base font-semibold text-foreground">
                    All paths complete!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You've completed all available decision paths.
                  </p>
                  <button onClick={stopLineDrillTraining} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                    Finish Session
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 lg:flex-[3] flex flex-col gap-2 min-w-0">
              {currentLineSession?.pathStats && Object.keys(currentLineSession.pathStats).length > 0 && (
                <div className="bg-card rounded-xl border border-border p-4 flex-1 flex flex-col min-h-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex-shrink-0">Path Accuracy</p>
                  <div className="overflow-y-auto flex-1 min-h-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] text-center">Flop</TableHead>
                          <TableHead className="text-[10px] text-center">Turn</TableHead>
                          <TableHead className="text-[10px] text-center">River</TableHead>
                          <TableHead className="text-[10px] text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const entries = Object.entries(currentLineSession.pathStats!)
                            .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total));
                          return entries.map(([key, ps]) => {
                            const pathNodeIds = key.split("|");
                            const streetActions = getPathActionsByStreet(pathNodeIds);
                            const pct = (ps.correct / ps.total) * 100;
                            const isCurrentPath = key === getPathKey(paths[currentPathIndex] ?? []);
                            return (
                              <TableRow key={key} data-state={isCurrentPath ? "selected" : undefined}>
                                {(['flop', 'turn', 'river'] as const).map(street => (
                                  <TableCell key={street} className="text-center text-[10px] truncate max-w-[120px] font-medium">
                                    {streetActions[street].length > 0 ? streetActions[street].join(" → ") : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                ))}
                                <TableCell className="text-right font-mono font-medium" style={{
                                  color: pct >= 80 ? "#22c55e" : pct >= 60 ? "#fbbf24" : "#ef4444",
                                }}>
                                  {pct.toFixed(0)}%
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                  </div>
                )}

              <div className="flex flex-col gap-2 flex-shrink-0">
                {currentLineSession && currentLineSession.history.length > 0 && (
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</span>
                    <div className="flex flex-col gap-1">
                      {currentLineSession.history.slice(0, 15).map((entry, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs py-0.5 px-1 rounded hover:bg-secondary">
                          {entry.boardCards && renderMiniBoardCards(entry.boardCards)}
                          <span className="font-mono text-muted-foreground flex-1 truncate">{entry.nodeLabel}</span>
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${entry.correct ? "bg-green-500" : "bg-red-500"}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={stopLineDrillTraining} className="flex items-center justify-center gap-2 w-full py-2 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors">
                  <Square size={10} /> End Session
                </button>
              </div>
            </div>
          </div>
        )}

        {view === "edit-drill" || view === "edit-line-drill" ? (
          <div className="p-2">
            {view === "edit-line-drill" ? (
              <>
                <h2 className="text-base font-semibold text-foreground mb-5">
                  {editingLineDrill ? "Edit Line Drill" : "New Line Drill"}
                </h2>
                <LineDrillEditor
                  initial={editingLineDrill}
                  lineTrees={lineTrees}
                  onSave={saveLineDrill}
                  onCancel={() => setView(selectedLineDrill ? "line-drill-training" : "drills")}
                />
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-foreground mb-5">
                  {editingDrill ? "Edit Drill" : "New Drill"}
                </h2>
                <DrillEditor
                  initial={editingDrill}
                  ranges={ranges}
                  onSave={saveDrill}
                  onCancel={() => setView(selectedDrill ? "training" : "drills")}
                />
              </>
            )}
          </div>
        ) : null}

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
                        flippingOut={flippingOut}
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

    <Dialog open={answerObservations !== null} onOpenChange={(open) => { if (!open) continueAfterObservation(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote size={16} className="text-yellow-600 dark:text-yellow-400" />
            Observation
          </DialogTitle>
          <DialogDescription>
            Review the notes for this decision before continuing.
          </DialogDescription>
        </DialogHeader>
        {answerObservations && (
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto py-2">
            {answerObservations.map((obs, i) => (
              <div key={i}>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 block">{obs.label}</span>
                <div
                  className="prose prose-sm max-w-none dark:prose-invert text-sm text-foreground/80 [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 bg-muted/30 rounded-md p-3"
                  dangerouslySetInnerHTML={{ __html: obs.html }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <button
            onClick={continueAfterObservation}
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Continue
          </button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
