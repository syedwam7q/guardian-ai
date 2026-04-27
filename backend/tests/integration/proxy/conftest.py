"""Test fixtures for proxy integration tests.

Sets HF/transformers to offline mode and pre-warms the governance pipeline
singleton so that respx-mocked tests don't see any unrelated outbound HTTP
traffic from model loaders.
"""
from __future__ import annotations

import os

# Force offline mode for HuggingFace before any agent module imports it.
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

import pytest

from src.proxy import routes as proxy_routes


@pytest.fixture(autouse=True, scope="package")
def _prewarm_governance_singleton() -> None:
    """Instantiate the proxy governance + upstream router once, eagerly,
    so model warmup happens outside any respx-mocked context.
    """
    proxy_routes.get_upstream_router()
    proxy_routes.get_governance()
