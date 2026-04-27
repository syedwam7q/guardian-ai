from src.guardian.observers import PromptObserver, RetrievalObserver


def test_retrieval_observer_captures_doc_ids_and_scores():
    obs = RetrievalObserver()
    obs.record(query_embedding=[0.1, 0.2], retrieved=[
        {"doc_id": "d1", "score": 0.9, "text": "..."},
        {"doc_id": "d2", "score": 0.8, "text": "..."},
    ], retrieval_time_ms=15.2)
    snap = obs.snapshot()
    assert snap["retrieval_time_ms"] == 15.2
    assert snap["doc_ids"] == ["d1", "d2"]
    assert snap["scores"] == [0.9, 0.8]


def test_prompt_observer_hashes_system_prompt():
    obs = PromptObserver()
    obs.record(template_id="medrag-v1", template_vars={"q": "x"},
               system_prompt="You are a medical assistant.",
               final_prompt="Q: x\nA:", model_params={"temperature": 0.7})
    snap = obs.snapshot()
    assert snap["template_id"] == "medrag-v1"
    assert snap["model_params"]["temperature"] == 0.7
    assert isinstance(snap["system_prompt_hash"], str)
    assert len(snap["system_prompt_hash"]) == 16
    assert "system_prompt" not in snap  # never store raw system prompt
