from pathlib import Path

import pytest

from backend.hub.registry import Registry
from tests.hub.fixtures import make_registry


@pytest.fixture
def root(tmp_path: Path) -> Path:
    return make_registry(tmp_path / "registry")


@pytest.fixture
def registry(root: Path) -> Registry:
    return Registry.load(root)
