"""Static tests for iOS MLX Chat configuration.

These tests ensure the hard-coded strings, UI details, and internal logic
for MLX model loading on iOS don't silently drift or get removed.
"""

import os
import re

# Resolve the path relative to the test location
IOS_SRC_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../ios/ihn-home")
)

def test_models_screen_has_correct_catalog():
    """Ensure ModelsScreen.swift has the right names and references."""
    screen_path = os.path.join(IOS_SRC_DIR, "IhnHome/Screens/ModelsScreen.swift")
    
    with open(screen_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Assert Qwen row usage
    assert "LLMRegistry.qwen2_5_1_5b" in content, "Missing reference to LLMRegistry.qwen2_5_1_5b"
    
    # 2. Assert Gemma row usage
    assert "LLMRegistry.gemma4_e2b_it_4bit" in content, "Missing reference to LLMRegistry.gemma4_e2b_it_4bit"
    
    # 3. Assert UI facts (size, bits) are in the file
    assert "1.5B parameters" in content, "Missing '1.5B parameters' display text"
    assert "2B parameters" in content, "Missing '2B parameters' display text"
    assert "4-bit" in content, "Missing '4-bit' display text"


def test_ram_guard_logic():
    """Ensure the RAM guard doesn't accidentally block 4-bit models as 4B."""
    engine_path = os.path.join(IOS_SRC_DIR, "IhnHome/Runtime/MLXEngine.swift")
    
    with open(engine_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Check that we are NOT blindly using "contains('4b')" in a way that catches 4bit
    # (The old buggy logic was `configuration.name.lowercased().contains("4b")`)
    buggy_pattern = r'configuration\.name\.lowercased\(\)\.contains\("4b"\)'
    assert not re.search(buggy_pattern, content), (
        "RAM guard seems to still contain the buggy '4b' check that rejects 4-bit models."
    )
