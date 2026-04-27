"""Smoke tests — verify the test infrastructure works."""

import pytest


def test_python_arithmetic():
    assert 2 + 2 == 4


@pytest.mark.asyncio
async def test_asyncio_works():
    async def echo(x):
        return x
    assert await echo("hello") == "hello"


def test_backend_package_layout_exists():
    """Verify the project's intended package directories exist."""
    import importlib
    import importlib.util

    for module_path in (
        "src.guardian",
        "src.guardian.agents",
        "src.guardian.causal",
        "src.medrag",
        "src.sdk",
        "src.proxy",
        "src.eval",
    ):
        spec = importlib.util.find_spec(module_path)
        assert spec is not None, f"Missing package: {module_path}"
