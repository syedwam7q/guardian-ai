from src.guardian.causal.dag_schema import LLMPipelineDAG


def test_dag_has_required_pipeline_nodes():
    dag = LLMPipelineDAG.standard()
    expected = {"user_input", "query_embedding", "retrieved_docs",
                "prompt_template", "model_choice", "temperature",
                "model_generation", "output", "violation"}
    assert set(dag.nodes()).issuperset(expected)


def test_dag_is_acyclic():
    dag = LLMPipelineDAG.standard()
    assert dag.is_acyclic()


def test_intervenable_nodes_listed():
    dag = LLMPipelineDAG.standard()
    intervenable = dag.intervenable_nodes()
    assert "retrieved_docs" in intervenable
    assert "model_choice" in intervenable
    assert "temperature" in intervenable
    assert "user_input" not in intervenable  # cannot rewrite user input


def test_can_serialize_to_networkx():
    dag = LLMPipelineDAG.standard()
    nx_graph = dag.to_networkx()
    assert nx_graph.number_of_nodes() >= 9
    assert nx_graph.number_of_edges() >= 8
