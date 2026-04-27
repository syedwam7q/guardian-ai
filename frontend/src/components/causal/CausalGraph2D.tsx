import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { DAG_EDGES, DAG_NODES, NODE_POSITIONS, RANKED_CAUSES } from "@/lib/mockDag";
import { cn } from "@/lib/utils";

interface CausalGraph2DProps {
  onSelectNode?: (id: string) => void;
}

const X_GAP = 160;
const Y_GAP = 78;
const X_OFFSET = 60;
const Y_OFFSET = 220;

function nodeColor(id: string, kind: string): { ring: string; bg: string } {
  if (kind === "outcome")
    return {
      ring: "ring-signal-block/50",
      bg: "bg-signal-block/10 border-signal-block/40",
    };
  const top = RANKED_CAUSES.find((c) => c.node === id);
  if (top && top.rank === 1)
    return {
      ring: "ring-signal-causal/60 animate-pulse",
      bg: "bg-signal-causal/15 border-signal-causal/60",
    };
  if (top && top.rank <= 3)
    return {
      ring: "ring-signal-causal/30",
      bg: "bg-signal-causal/10 border-signal-causal/40",
    };
  if (kind === "exogenous")
    return {
      ring: "ring-signal-info/30",
      bg: "bg-signal-info/10 border-signal-info/30",
    };
  return {
    ring: "ring-border-strong",
    bg: "bg-bg-elevated border-border-strong",
  };
}

function edgeColor(source: string, target: string): string {
  const ranks = [source, target].map((n) =>
    RANKED_CAUSES.find((c) => c.node === n),
  );
  const top = Math.min(...ranks.map((r) => r?.rank ?? 99));
  if (top === 1) return "var(--signal-block)";
  if (top === 2) return "var(--signal-causal)";
  if (top <= 3) return "var(--signal-info)";
  return "var(--border-strong)";
}

export function CausalGraph2D({ onSelectNode }: CausalGraph2DProps) {
  const nodes: Node[] = useMemo(
    () =>
      DAG_NODES.map((n) => {
        const pos = NODE_POSITIONS[n.id];
        const colors = nodeColor(n.id, n.kind);
        return {
          id: n.id,
          position: { x: pos.x * X_GAP + X_OFFSET, y: pos.y * Y_GAP + Y_OFFSET },
          data: { label: n.id, description: n.description, colors },
          type: "guardianNode",
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        };
      }),
    [],
  );

  const edges: Edge[] = useMemo(
    () =>
      DAG_EDGES.map((e, i) => ({
        id: `e_${i}`,
        source: e.source,
        target: e.target,
        animated:
          RANKED_CAUSES.some((c) => c.node === e.source && c.rank <= 2) ||
          e.target === "violation",
        style: {
          stroke: edgeColor(e.source, e.target),
          strokeWidth: 1.6,
        },
      })),
    [],
  );

  const nodeTypes = useMemo(
    () => ({
      guardianNode: ({ data }: { data: { label: string; description: string; colors: { ring: string; bg: string } } }) => (
        <div
          className={cn(
            "min-w-[120px] rounded-md border px-3 py-2 text-center font-mono text-xs ring-1 transition-shadow",
            data.colors.bg,
            data.colors.ring,
          )}
          title={data.description}
        >
          {data.label}
        </div>
      ),
    }),
    [],
  );

  return (
    <div className="h-full w-full overflow-hidden rounded-md border border-border-subtle bg-bg-deep">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, n) => onSelectNode?.(n.id)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.4}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="var(--border-subtle)"
          gap={24}
          size={1}
        />
        <Controls className="!border-border-subtle !bg-bg-surface" />
      </ReactFlow>
    </div>
  );
}
