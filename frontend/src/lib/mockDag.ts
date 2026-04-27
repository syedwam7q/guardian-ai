// 11-node, 12-edge LLM pipeline DAG mirroring backend's
// `LLMPipelineDAG.standard()` (see backend/src/guardian/causal/dag_schema.py).

export type DagNodeKind = "exogenous" | "pipeline" | "outcome";

export interface DagNode {
  id: string;
  kind: DagNodeKind;
  intervenable: boolean;
  description: string;
}

export interface DagEdge {
  source: string;
  target: string;
}

export const DAG_NODES: DagNode[] = [
  { id: "user_input", kind: "pipeline", intervenable: false, description: "Raw user query" },
  { id: "query_embedding", kind: "pipeline", intervenable: true, description: "Embedding of user query" },
  { id: "retrieved_docs", kind: "pipeline", intervenable: true, description: "Top-k retrieved documents" },
  { id: "prompt_template", kind: "exogenous", intervenable: true, description: "Prompt template ID" },
  { id: "model_choice", kind: "exogenous", intervenable: true, description: "Which generator model" },
  { id: "temperature", kind: "exogenous", intervenable: true, description: "Sampling temperature" },
  { id: "top_p", kind: "exogenous", intervenable: true, description: "Nucleus sampling threshold" },
  { id: "retrieval_k", kind: "exogenous", intervenable: true, description: "Number of docs retrieved" },
  { id: "model_generation", kind: "pipeline", intervenable: false, description: "Internal LLM generation process" },
  { id: "output", kind: "pipeline", intervenable: false, description: "Generated response text" },
  { id: "violation", kind: "outcome", intervenable: false, description: "The specific violation being explained" },
];

export const DAG_EDGES: DagEdge[] = [
  { source: "user_input", target: "query_embedding" },
  { source: "query_embedding", target: "retrieved_docs" },
  { source: "retrieval_k", target: "retrieved_docs" },
  { source: "user_input", target: "prompt_template" },
  { source: "retrieved_docs", target: "model_generation" },
  { source: "prompt_template", target: "model_generation" },
  { source: "model_choice", target: "model_generation" },
  { source: "temperature", target: "model_generation" },
  { source: "top_p", target: "model_generation" },
  { source: "model_generation", target: "output" },
  { source: "output", target: "violation" },
  { source: "retrieved_docs", target: "violation" },
];

// Approximate left-to-right column layout matching the pipeline shape.
export const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  user_input: { x: 0, y: 1 },
  query_embedding: { x: 1, y: 1 },
  retrieved_docs: { x: 2, y: 1 },
  retrieval_k: { x: 1, y: 2.4 },
  prompt_template: { x: 2, y: -0.4 },
  model_choice: { x: 2.6, y: -1.2 },
  temperature: { x: 2.6, y: -0.4 },
  top_p: { x: 2.6, y: 0.4 },
  model_generation: { x: 3.6, y: 1 },
  output: { x: 4.6, y: 1 },
  violation: { x: 5.6, y: 1.7 },
};

export interface RankedCause {
  rank: number;
  node: string;
  effect: number;
  ci_lo: number;
  ci_hi: number;
  n: number;
  // mock bootstrap distribution histogram (10 bars)
  histogram: number[];
}

export const RANKED_CAUSES: RankedCause[] = [
  {
    rank: 1,
    node: "retrieval_k",
    effect: 0.62,
    ci_lo: 0.51,
    ci_hi: 0.73,
    n: 12,
    histogram: [1, 2, 3, 5, 8, 11, 13, 9, 6, 3],
  },
  {
    rank: 2,
    node: "temperature",
    effect: 0.18,
    ci_lo: 0.05,
    ci_hi: 0.31,
    n: 12,
    histogram: [2, 4, 7, 10, 14, 12, 8, 6, 4, 2],
  },
  {
    rank: 3,
    node: "model_choice",
    effect: 0.09,
    ci_lo: -0.02,
    ci_hi: 0.21,
    n: 12,
    histogram: [3, 5, 8, 11, 13, 11, 9, 6, 4, 2],
  },
  {
    rank: 4,
    node: "prompt_template",
    effect: 0.04,
    ci_lo: -0.07,
    ci_hi: 0.14,
    n: 12,
    histogram: [4, 6, 9, 12, 14, 12, 9, 6, 4, 2],
  },
];

// Return a re-shuffled set of ranked causes deterministic in (k, temp, model)
// — used by the counterfactual playground without needing a backend.
export function counterfactualCauses(
  k: number,
  temp: number,
  model: string,
): RankedCause[] {
  const factor = (k * 1.7 + temp * 3.1 + model.length * 0.5) % 1;
  return RANKED_CAUSES.map((c) => {
    const drift = (factor * 0.4 - 0.2) * (1 - c.rank / 8);
    const newEffect = Math.max(-0.1, Math.min(0.95, c.effect + drift));
    const span = c.ci_hi - c.ci_lo;
    return {
      ...c,
      effect: Number(newEffect.toFixed(2)),
      ci_lo: Number((newEffect - span / 2).toFixed(2)),
      ci_hi: Number((newEffect + span / 2).toFixed(2)),
    };
  })
    .sort((a, b) => b.effect - a.effect)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}
