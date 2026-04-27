"""Causal DAG schema for the LLM pipeline."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

import networkx as nx


class NodeKind(StrEnum):
    EXOGENOUS = "exogenous"   # set externally (model choice, temperature)
    PIPELINE = "pipeline"     # part of the pipeline flow
    OUTCOME = "outcome"       # the violation we're explaining


@dataclass
class CausalNode:
    name: str
    kind: NodeKind
    intervenable: bool = False
    description: str = ""


@dataclass
class LLMPipelineDAG:
    nodes_: dict[str, CausalNode] = field(default_factory=dict)
    edges_: list[tuple[str, str]] = field(default_factory=list)

    def add_node(self, node: CausalNode) -> None:
        self.nodes_[node.name] = node

    def add_edge(self, src: str, dst: str) -> None:
        if src not in self.nodes_ or dst not in self.nodes_:
            raise KeyError(f"Edge {src}→{dst} references unknown node")
        self.edges_.append((src, dst))

    def nodes(self) -> list[str]:
        return list(self.nodes_.keys())

    def intervenable_nodes(self) -> list[str]:
        return [n.name for n in self.nodes_.values() if n.intervenable]

    def to_networkx(self) -> nx.DiGraph:
        g = nx.DiGraph()
        for node in self.nodes_.values():
            g.add_node(node.name, kind=node.kind.value, intervenable=node.intervenable)
        for s, d in self.edges_:
            g.add_edge(s, d)
        return g

    def is_acyclic(self) -> bool:
        return nx.is_directed_acyclic_graph(self.to_networkx())

    @classmethod
    def standard(cls) -> LLMPipelineDAG:
        dag = cls()
        # Pipeline nodes
        dag.add_node(CausalNode("user_input", NodeKind.PIPELINE, intervenable=False,
                                description="Raw user query"))
        dag.add_node(CausalNode("query_embedding", NodeKind.PIPELINE, intervenable=True,
                                description="Embedding of user query"))
        dag.add_node(CausalNode("retrieved_docs", NodeKind.PIPELINE, intervenable=True,
                                description="Top-k retrieved documents"))
        dag.add_node(CausalNode("prompt_template", NodeKind.EXOGENOUS, intervenable=True,
                                description="Prompt template ID"))
        dag.add_node(CausalNode("model_choice", NodeKind.EXOGENOUS, intervenable=True,
                                description="Which generator model"))
        dag.add_node(CausalNode("temperature", NodeKind.EXOGENOUS, intervenable=True,
                                description="Sampling temperature"))
        dag.add_node(CausalNode("top_p", NodeKind.EXOGENOUS, intervenable=True,
                                description="Nucleus sampling threshold"))
        dag.add_node(CausalNode("retrieval_k", NodeKind.EXOGENOUS, intervenable=True,
                                description="Number of docs retrieved"))
        dag.add_node(CausalNode("model_generation", NodeKind.PIPELINE, intervenable=False,
                                description="Internal LLM generation process"))
        dag.add_node(CausalNode("output", NodeKind.PIPELINE, intervenable=False,
                                description="Generated response text"))
        dag.add_node(CausalNode("violation", NodeKind.OUTCOME, intervenable=False,
                                description="The specific violation being explained"))
        # Edges (pipeline structure)
        edges = [
            ("user_input", "query_embedding"),
            ("query_embedding", "retrieved_docs"),
            ("retrieval_k", "retrieved_docs"),
            ("user_input", "prompt_template"),
            ("retrieved_docs", "model_generation"),
            ("prompt_template", "model_generation"),
            ("model_choice", "model_generation"),
            ("temperature", "model_generation"),
            ("top_p", "model_generation"),
            ("model_generation", "output"),
            ("output", "violation"),
            ("retrieved_docs", "violation"),
        ]
        for s, d in edges:
            dag.add_edge(s, d)
        return dag
