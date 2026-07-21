import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, FolderPlus, Trash2, Pencil, Dices, GitBranch, Layout, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useTrainerContext } from "../TrainerContext";
import { FolderTree } from "../components/FolderTree";
import { RootNode, ActionNode, StreetNode } from "../components/FlowNode";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from "../components/ui/drawer";
import type { LineNodeData, LineTree } from "../types";

const nodeTypes = {
  root: RootNode,
  action: ActionNode,
  "street-group": StreetNode,
  street: StreetNode,
};

const DEFAULT_EDGE_OPTIONS = { type: "smoothstep" as const, animated: true };

let nodeIdCounter = 0;
function freshNodeId() {
  nodeIdCounter += 1;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

const STREETS = ["preflop", "flop", "turn", "river"] as const;
const ACTORS = ["hero", "villain", "none"] as const;
const ACTION_TYPES = ["check", "bet", "raise", "fold", "call", "allin"] as const;

function makeRootNode(viewportCenter: { x: number; y: number }): Node<LineNodeData> {
  return {
    id: freshNodeId(),
    type: "root",
    position: { x: viewportCenter.x - 60, y: viewportCenter.y - 30 },
    data: { label: "New Scenario", street: "preflop", actor: "none", nodeType: "root" },
  };
}

function makeActionNode(parentPos: { x: number; y: number }, offsetIndex: number, defaults?: Partial<LineNodeData>): Node<LineNodeData> {
  return {
    id: freshNodeId(),
    type: "action",
    position: { x: parentPos.x + offsetIndex * 140 - 50, y: parentPos.y + 120 },
    data: {
      label: defaults?.actionType ?? "Action",
      street: defaults?.street ?? "flop",
      actor: defaults?.actor ?? "hero",
      nodeType: "action",
      actionType: defaults?.actionType ?? "check",
      betSize: defaults?.betSize ?? "",
      correct: defaults?.correct ?? false,
    },
  };
}

function makeStreetNode(street: (typeof STREETS)[number], viewportCenter: { x: number; y: number }): Node<LineNodeData> {
  return {
    id: freshNodeId(),
    type: "street",
    position: { x: viewportCenter.x - 100, y: viewportCenter.y - 30 },
    data: { label: street.charAt(0).toUpperCase() + street.slice(1), street, actor: "none", nodeType: "street" },
  };
}

export default function Lines() {
  const { resolvedTheme } = useTheme();
  const {
    lineTrees, lineFolders,
    saveLineTree, deleteLineTree, renameLineTree, moveLineTree,
    newLineFolder, renameLineFolder, deleteLineFolder, moveLineFolder,
  } = useTrainerContext();

  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<LineNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowRef = useRef<HTMLDivElement>(null);

  const selectedTree = lineTrees.find((t) => t.id === selectedTreeId) ?? null;

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [nodes, selectedNodeId]);

  const viewportCenter = useMemo(() => {
    if (reactFlowRef.current) {
      const rect = reactFlowRef.current.getBoundingClientRect();
      return { x: rect.width / 2, y: rect.height / 2 };
    }
    return { x: 300, y: 300 };
  }, []);

  function selectTree(tree: LineTree) {
    setSelectedTreeId(tree.id);
    setSelectedNodeId(null);
    try {
      const parsedNodes = JSON.parse(tree.nodes || "[]") as Node<LineNodeData>[];
      const parsedEdges = JSON.parse(tree.edges || "[]") as Edge[];
      setNodes(parsedNodes);
      setEdges(parsedEdges);
    } catch {
      setNodes([]);
      setEdges([]);
    }
    setIsDirty(false);
  }

  function handleSave() {
    const treeId = selectedTreeId;
    if (!treeId) return;
    const tree = lineTrees.find((t) => t.id === treeId);
    if (!tree) return;

    // Build adjacency: parentId -> child ids
    const childMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();
    for (const edge of edges) {
      const children = childMap.get(edge.source) ?? [];
      children.push(edge.target);
      childMap.set(edge.source, children);
      parentMap.set(edge.target, edge.source);
    }

    // Check for root node
    const rootNode = nodes.find((n) => n.data.nodeType === "root");
    if (!rootNode) {
      toast("The tree must have a root node before saving.", { icon: <X size={18} className="text-red-500" />, duration: 5000 });
      return;
    }

    // Check for orphaned nodes — every non-root node must have exactly 1 parent
    const orphaned = nodes.filter((n) => {
      if (n.id === rootNode.id) return false;
      return !parentMap.has(n.id);
    });
    if (orphaned.length > 0) {
      const details = orphaned.map((n) => {
        const label = n.data.actionType
          ? n.data.actionType.charAt(0).toUpperCase() + n.data.actionType.slice(1)
          : n.data.label || n.data.nodeType;
        return `"${label}" (${n.data.nodeType})`;
      });
      toast(
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-red-500">
            {orphaned.length === 1 ? "1 orphaned node has no parent" : `${orphaned.length} orphaned nodes have no parent`}
          </span>
          {details.map((d, i) => (
            <span key={i} className="text-xs text-muted-foreground">• {d}</span>
          ))}
          <span className="text-xs text-muted-foreground mt-1">Connect every node to the tree before saving.</span>
        </div>,
        { icon: <X size={18} className="text-red-500" />, duration: 5000 }
      );
      return;
    }

    // Find any node (root or action) with outgoing edges that has no correct action reachable
    const violations: string[] = [];
    function findReachableActions(nodeId: string, visited: Set<string>): string[] {
      if (visited.has(nodeId)) return [];
      visited.add(nodeId);
      const result: string[] = [];
      for (const childId of childMap.get(nodeId) ?? []) {
        const child = nodes.find((n) => n.id === childId);
        if (!child) continue;
        if (child.data.nodeType === "action" && child.data.actor !== "villain") {
          result.push(childId);
        } else if (child.data.nodeType === "street" || child.data.nodeType === "street-group") {
          result.push(...findReachableActions(childId, visited));
        }
      }
      return result;
    }
    for (const node of nodes) {
      if (node.data.nodeType !== "root" && node.data.nodeType !== "action") continue;
      if (node.data.actor === "villain") continue;
      const children = childMap.get(node.id);
      if (!children || children.length === 0) continue;
      const reachableActions = findReachableActions(node.id, new Set());
      if (reachableActions.length === 0) continue;
      const hasCorrect = reachableActions.some((cid) => {
        const n = nodes.find((nd) => nd.id === cid);
        return n?.data.correct === true;
      });
      if (!hasCorrect) violations.push(node.id);
    }

    if (violations.length > 0) {
      // Trace path from root to each violation
      const rootId = rootNode.id;
      const details = violations.map((vid) => {
        const vNode = nodes.find((n) => n.id === vid);
        const label = vNode?.data.actionType
          ? vNode.data.actionType.charAt(0).toUpperCase() + vNode.data.actionType.slice(1)
          : vNode?.data.label ?? "?";
        // Walk from root to the violation to build the action sequence
        const path: string[] = [];
        let cur = vid;
        while (cur && cur !== rootId) {
          const n = nodes.find((nd) => nd.id === cur);
          if (n?.data.actionType) {
            path.unshift(n.data.actionType.charAt(0).toUpperCase() + n.data.actionType.slice(1));
          } else if (n?.data.label) {
            path.unshift(n.data.label);
          }
          cur = parentMap.get(cur) ?? "";
        }
        return `"${label}" (${path.join(" → ") || "Root"})`;
      });

      toast(
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-red-500">
            {violations.length === 1 ? "1 branch missing a correct action" : `${violations.length} branches missing a correct action`}
          </span>
          {details.map((d, i) => (
            <span key={i} className="text-xs text-muted-foreground">• {d}</span>
          ))}
        </div>,
        { icon: <X size={18} className="text-red-500" />, duration: 5000 }
      );
      return;
    }

    // Validate bet sizes — must be in % format
    const badBetSizes = nodes.filter((n) => {
      if (n.data.nodeType !== "action") return false;
      if (!n.data.betSize) return false;
      return !/^\d+(\.\d+)?%$/.test(n.data.betSize);
    });
    if (badBetSizes.length > 0) {
      const details = badBetSizes.map((n) => {
        const label = n.data.actionType
          ? n.data.actionType.charAt(0).toUpperCase() + n.data.actionType.slice(1)
          : "?";
        return `"${label}" — "${n.data.betSize}" (must be like 33%)`;
      });
      toast(
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-red-500">
            {badBetSizes.length === 1 ? "1 invalid bet size" : `${badBetSizes.length} invalid bet sizes`}
          </span>
          {details.map((d, i) => (
            <span key={i} className="text-xs text-muted-foreground">• {d}</span>
          ))}
        </div>,
        { icon: <X size={18} className="text-red-500" />, duration: 5000 }
      );
      return;
    }

    saveLineTree({
      ...tree,
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
    });
    setIsDirty(false);
    toast("Tree saved successfully", { icon: <Check size={18} className="text-green-500" />, duration: 3000 });
  }

  const handleNodesChange: OnNodesChange<LineNodeData> = useCallback((changes) => {
    onNodesChange(changes);
    setIsDirty(true);
    if (changes.some((c) => c.type === "remove")) {
      setSelectedNodeId(null);
    }
  }, [onNodesChange]);

  const handleEdgesChange: OnEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
    setIsDirty(true);
  }, [onEdgesChange]);

  const onConnect: OnConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
    setIsDirty(true);
  }, [setEdges]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    const storedId = localStorage.getItem("poker-trainer-selected-line-tree");
    if (storedId) {
      localStorage.removeItem("poker-trainer-selected-line-tree");
      const tree = lineTrees.find((t) => t.id === storedId);
      if (tree) selectTree(tree);
    }
  }, []);

  function newNodeTree() {
    const id = `line-${Date.now()}`;
    saveLineTree({ id, name: "New Line Tree", folderId: null, nodes: "[]", edges: "[]" });
    setSelectedTreeId(id);
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setIsDirty(false);
  }

  function addRootNode() {
    const center = viewportCenter;
    const newNode = makeRootNode(center);
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
  }

  function addActionNode() {
    const center = viewportCenter;
    const offset = nodes.filter((n) => n.type === "action").length;
    const actionDefaults: Partial<LineNodeData> = selectedNode?.type === "action" ? selectedNode.data : {};
    const newNode = makeActionNode(center, offset, actionDefaults);
    if (selectedNode?.type === "street-group") {
      newNode.parentId = selectedNode.id;
      newNode.position = { x: 30 + offset * 140, y: 50 };
    }
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
  }

  function addStreetNode() {
    const center = viewportCenter;
    const existingStreets = new Set(nodes.filter((n) => n.type === "street" || n.type === "street-group").map((n) => n.data.street));
    const nextStreet = STREETS.find((s) => !existingStreets.has(s)) ?? "flop";
    const newNode = makeStreetNode(nextStreet, center);
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
  }

  function deleteSelected() {
    if (!selectedNodeId) return;
    const idsToDelete = new Set<string>();
    function collectDescendants(id: string) {
      idsToDelete.add(id);
      nodes.filter((n) => n.parentId === id).forEach((n) => collectDescendants(n.id));
    }
    collectDescendants(selectedNodeId);
    setNodes((nds) => nds.filter((n) => !idsToDelete.has(n.id)));
    setEdges((eds) => eds.filter((e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)));
    setSelectedNodeId(null);
    setIsDirty(true);
  }

  function updateSelectedNodeData(partial: Partial<LineNodeData>) {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...partial } } : n))
    );
    setIsDirty(true);
  }

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedNodeId(node.id);
  }

  function handlePaneClick() {
    setSelectedNodeId(null);
  }

  function handleDeleteTree(id: string) {
    deleteLineTree(id);
    if (selectedTreeId === id) {
      setSelectedTreeId(null);
      setNodes([]);
      setEdges([]);
      setSelectedNodeId(null);
      setIsDirty(false);
    }
  }

  const isActionNode = selectedNode?.type === "action";
  const isRootNode = selectedNode?.type === "root";
  const isStreetGroup = selectedNode?.type === "street-group";
  const isStreet = selectedNode?.type === "street";

  return (
    <>
      <Helmet>
        <title>Lines</title>
        <meta name="description" content="Build and visualize poker line trees with an interactive flowchart." />
        <meta property="og:title" content="Lines" />
        <meta property="og:description" content="Build and visualize poker line trees." />
        <meta property="og:url" content="https://trainer.grindsafe.app/lines" />
      </Helmet>

      {/* Mobile drawer trigger */}
      <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <DrawerTrigger asChild>
          <button className="lg:hidden fixed bottom-4 left-4 z-10 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground transition-colors shadow-md">
            <GitBranch size={14} /> Lines
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Lines</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <SidebarContent
              lineTrees={lineTrees}
              lineFolders={lineFolders}
              selectedTreeId={selectedTreeId}
              selectedNode={selectedNode}
              isActionNode={isActionNode}
              isRootNode={isRootNode}
              isStreetGroup={isStreetGroup}
              isStreet={isStreet}
              isDirty={isDirty}
              onSelectTree={selectTree}
              onNewTree={newNodeTree}
              onSave={handleSave}
              onDeleteTree={handleDeleteTree}
              onRenameTree={renameLineTree}
              onMoveTree={moveLineTree}
              onNewFolder={newLineFolder}
              onRenameFolder={renameLineFolder}
              onDeleteFolder={deleteLineFolder}
              onMoveFolder={moveLineFolder}
              onAddRoot={addRootNode}
              onAddAction={addActionNode}
              onAddStreetNode={addStreetNode}
               onDeleteSelected={deleteSelected}
               onUpdateNodeData={updateSelectedNodeData}
               onClose={() => setSidebarOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <div className="flex h-full">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-80 flex-shrink-0 border-r border-border bg-background overflow-y-auto">
          <SidebarContent
            lineTrees={lineTrees}
            lineFolders={lineFolders}
            selectedTreeId={selectedTreeId}
            selectedNode={selectedNode}
            isActionNode={isActionNode}
            isRootNode={isRootNode}
            isStreetGroup={isStreetGroup}
            isStreet={isStreet}
            isDirty={isDirty}
            onSelectTree={selectTree}
            onNewTree={newNodeTree}
            onSave={handleSave}
            onDeleteTree={handleDeleteTree}
            onRenameTree={renameLineTree}
            onMoveTree={moveLineTree}
            onNewFolder={newLineFolder}
            onRenameFolder={renameLineFolder}
            onDeleteFolder={deleteLineFolder}
            onMoveFolder={moveLineFolder}
            onAddRoot={addRootNode}
            onAddAction={addActionNode}
            onAddStreetNode={addStreetNode}
            onDeleteSelected={deleteSelected}
            onUpdateNodeData={updateSelectedNodeData}
          />
        </aside>

        {/* React Flow canvas */}
        <main className="flex-1 h-full" ref={reactFlowRef}>
          {selectedTree ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              deleteKeyCode="Backspace"
              fitView
              colorMode={resolvedTheme ?? "light"}
            >
              <Controls className="!bg-background !border-border !shadow-sm [&_button]:!text-muted-foreground [&_button]:!border-border [&_button:hover]:!bg-secondary" />
              <MiniMap
                className="!bg-background !border-border !shadow-sm"
                nodeColor={resolvedTheme === "dark" ? "#555" : "#888"}
                maskColor={resolvedTheme === "dark" ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.08)"}
              />
              <Background variant={BackgroundVariant.Dots} className="!bg-background" />
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <GitBranch size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Select a line tree or create a new one</p>
                <button
                  onClick={newNodeTree}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
                >
                  <Plus size={13} /> New Line Tree
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ─── Sidebar Content ──────────────────────────────────────────────────────────

interface SidebarContentProps {
  lineTrees: LineTree[];
  lineFolders: { id: string; name: string; parentId: string | null }[];
  selectedTreeId: string | null;
  selectedNode: Node<LineNodeData> | null;
  isActionNode: boolean;
  isRootNode: boolean;
  isStreetGroup: boolean;
  isStreet: boolean;
  isDirty: boolean;
  onSelectTree: (tree: LineTree) => void;
  onNewTree: () => void;
  onSave: () => void;
  onDeleteTree: (id: string) => void;
  onRenameTree: (id: string, name: string) => void;
  onMoveTree: (id: string, folderId: string | null) => void;
  onNewFolder: (parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveFolder: (folderId: string, newParentId: string | null) => void;
  onAddRoot: () => void;
  onAddAction: () => void;
  onAddStreetNode: () => void;
  onDeleteSelected: () => void;
  onUpdateNodeData: (partial: Partial<LineNodeData>) => void;
  onClose?: () => void;
}

function SidebarContent({
  lineTrees, lineFolders, selectedTreeId, selectedNode,
  isActionNode, isRootNode, isStreetGroup, isStreet,
  isDirty,
  onSelectTree, onNewTree, onSave, onDeleteTree, onRenameTree, onMoveTree,
  onNewFolder, onRenameFolder, onDeleteFolder, onMoveFolder,
  onAddRoot, onAddAction, onAddStreetNode, onDeleteSelected, onUpdateNodeData, onClose,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Lines</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={!isDirty}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-black text-white border border-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800"
          >
            {isDirty ? "Save" : "Saved"}
          </button>
          <button
            onClick={() => { onNewTree(); onClose?.(); }}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
          >
            <Plus size={13} /> New
          </button>
        </div>
      </div>

      {/* Folder tree */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Line Trees</span>
            <button
              onClick={() => onNewFolder(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="New folder"
            >
              <FolderPlus size={13} />
            </button>
          </div>
          <FolderTree
            items={lineTrees}
            folders={lineFolders}
            allFolders={lineFolders}
            onMoveItem={onMoveTree}
            onMoveFolder={onMoveFolder}
            onDeleteFolder={onDeleteFolder}
            onRenameFolder={onRenameFolder}
            onSelectItem={(item) => {
              const tree = lineTrees.find((t) => t.id === item.id);
              if (tree) { onSelectTree(tree); onClose?.(); }
            }}
            onRenameItem={(id, name) => onRenameTree(id, name)}
            onDeleteItem={onDeleteTree}
            renderItem={(item) => (
              <div className="flex items-center justify-between w-full gap-1 group">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <GitBranch size={12} className="text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium truncate">{item.name}</span>
                    <span className="text-[9px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LINE</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const name = window.prompt("Rename line tree", item.name);
                      if (name && name.trim()) onRenameTree(item.id, name.trim());
                    }}
                    className="text-muted-foreground hover:text-foreground p-0.5"
                    title="Rename"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTree(item.id); if (selectedTreeId === item.id) { setSelectedTreeId(null); setSelectedNodeId(null); setNodes([]); setEdges([]); setIsDirty(false); } }}
                    className="text-muted-foreground hover:text-red-500 p-0.5"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )}
            selectedItemId={selectedTreeId ?? undefined}
            emptyMessage="No line trees yet"
          />
        </div>

        {/* Node palette — only when a tree is selected */}
        {selectedTreeId && (
          <>
            <div className="h-px bg-border my-3" />
            <div className="mb-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-2">Node Palette</span>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={onAddRoot}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary transition-colors text-left"
                >
                  <Dices size={13} className="text-muted-foreground" />
                  <span>Root Node</span>
                </button>
                <button
                  onClick={onAddAction}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary transition-colors text-left"
                >
                  <GitBranch size={13} className="text-muted-foreground" />
                  <span>Action Node</span>
                </button>
                <button
                  onClick={onAddStreetNode}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary transition-colors text-left"
                >
                  <Layout size={13} className="text-muted-foreground" />
                  <span>Street Node</span>
                </button>
                {selectedNode && (
                  <button
                    onClick={onDeleteSelected}
                    className="flex items-center gap-2 text-xs px-3 py-2 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left mt-1"
                  >
                    <Trash2 size={13} />
                    <span>Delete Selected</span>
                  </button>
                )}
              </div>
            </div>

            {/* Node inspector */}
            {selectedNode && (
              <>
                <div className="h-px bg-border my-3" />
                <div className="mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-2">
                    Inspector — {selectedNode.type}
                  </span>
                  <div className="flex flex-col gap-2">
                    {isRootNode && (
                      <>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Label</label>
                          <input
                            type="text"
                            value={selectedNode.data.label || ""}
                            onChange={(e) => onUpdateNodeData({ label: e.target.value })}
                            className="w-full bg-secondary text-foreground text-xs px-2 py-1.5 rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Street</label>
                          <select
                            value={selectedNode.data.street}
                            onChange={(e) => onUpdateNodeData({ street: e.target.value as LineNodeData["street"] })}
                            className="w-full bg-secondary text-foreground text-xs px-2 py-1.5 rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {STREETS.map((s) => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                    {(isStreetGroup || isStreet) && (
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Street</label>
                        <select
                          value={selectedNode.data.street}
                          onChange={(e) => {
                            const s = e.target.value as LineNodeData["street"];
                            onUpdateNodeData({ street: s, label: s.charAt(0).toUpperCase() + s.slice(1) });
                          }}
                          className="w-full bg-secondary text-foreground text-xs px-2 py-1.5 rounded border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {(["preflop", "flop", "turn", "river"] as const).map((s) => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {isStreet && (
                      <CardSelector
                        street={selectedNode.data.street}
                        boardCards={selectedNode.data.boardCards ?? ""}
                        onChange={(cards) => onUpdateNodeData({ boardCards: cards })}
                      />
                    )}
                    {isActionNode && (
                      <p className="text-[10px] text-muted-foreground italic">
                        Edit action parameters directly on the node
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const ALL_RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const ALL_SUITS = ["s", "h", "d", "c"] as const;
const SUIT_SYMBOLS: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_COLORS: Record<string, string> = { s: "#000", h: "#ef4444", d: "#3b82f6", c: "#22c55e" };

const MAX_CARDS: Record<string, number> = { preflop: 0, flop: 3, turn: 1, river: 1 };

function CardSelector({ street, boardCards, onChange }: { street: string; boardCards: string; onChange: (cards: string) => void }) {
  const maxCards = MAX_CARDS[street] ?? 0;
  const selected = boardCards ? boardCards.split(",").map(c => c.trim()).filter(Boolean) : [];

  // Preflop has no board cards
  if (maxCards === 0) {
    return (
      <div>
        <label className="text-[10px] text-muted-foreground block mb-1.5">Board Cards</label>
        <p className="text-[10px] text-muted-foreground italic">No board cards for preflop.</p>
      </div>
    );
  }

  function toggleCard(card: string) {
    const idx = selected.indexOf(card);
    let next: string[];
    if (idx >= 0) {
      next = selected.filter((_, i) => i !== idx);
    } else {
      if (selected.length >= maxCards) return;
      next = [...selected, card];
    }
    onChange(next.join(","));
  }

  return (
    <div>
      <label className="text-[10px] text-muted-foreground block mb-1.5">Board Cards ({selected.length}/{maxCards})</label>
      {selected.length > 0 && (
        <div className="flex items-center gap-1 mb-2 justify-center">
          {selected.map((card, i) => {
            const rank = card[0].toUpperCase();
            const suit = card[1]?.toLowerCase();
            const color = SUIT_COLORS[suit] ?? "var(--card-foreground)";
            return (
              <div
                key={i}
                className="rounded border border-border flex flex-col items-center justify-center cursor-pointer hover:opacity-70"
                style={{ width: 52, height: 70, backgroundColor: "var(--card)" }}
                onClick={() => toggleCard(card)}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{rank}</span>
                <span style={{ fontSize: 13, color, lineHeight: 1 }}>{SUIT_SYMBOLS[suit] ?? "?"}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-4 gap-[6px] p-3">
        {ALL_SUITS.map((suit) => {
          return (
            <div key={suit} className="flex flex-col gap-[3px]">
              <span className="text-[10px] font-bold text-center text-muted-foreground">{SUIT_SYMBOLS[suit]}</span>
              {ALL_RANKS.map((rank) => {
                const card = `${rank}${suit}`;
                const isSelected = selected.includes(card);
                const color = SUIT_COLORS[suit];
                return (
                  <button
                    key={card}
                    onClick={() => toggleCard(card)}
                    className={`text-[14px] py-[6px] px-1 text-center font-bold font-mono transition-colors rounded ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"
                    }`}
                    style={isSelected ? {} : { color }}
                    title={card}
                  >
                    {rank}{SUIT_SYMBOLS[suit]}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-muted-foreground mt-1">Select up to {maxCards} card{maxCards > 1 ? "s" : ""}; click again to remove</p>
    </div>
  );
}
