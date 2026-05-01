# iPhone Node - MLX Chat + Model Catalog Test Results

**Date:** 2026-05-01
**Tester:** DeepSeek
**Target device:** iPhone 12 Pro Max (`iP12PM`)

## 1. Branch/Commit Tested
- **Branch:** `feature/mlx-llm-engine`
- **Commit:** `ccfc1715f4a8db0464ad436d111d14fcb061de5f` (feat(ios): add MLX model catalog and chat bridge)

## 2. Environment Status
- **iPhone LAN IP:** Unknown (Pending user input)
- **App state:** Unreachable by AI session environment without LAN IP

*Note: Live tests against the iPhone node (`/v1/chat` and `/capabilities`) were skipped because the iPhone LAN IP is not yet available to this session.*

## 3. New Tests Added

I have successfully added the requested tests to the repository:

### 3.1. `/v1/chat` and Contract Tests
- **File added:** `backend/tests/test_chat_contract.py`
- Includes the flat `chat` and `_detail.chat` capability shape verifications.
- Includes endpoint-shape tests for `/v1/chat` (missing prompt 400, malformed JSON handling, missing model 502, and successful response shapes).
- These live endpoint tests are properly gated behind the `IHN_RUN_LIVE_CHAT=1` environment variable.

*To run manually:*
```bash
IHN_BASE_URL=https://IPHONE_LAN_IP:17777 IHN_RUN_LIVE_CHAT=1 python3 -m pytest backend/tests/test_chat_contract.py -v
```

### 3.2. Model-Catalog Static Regression
- **File added:** `mobile/testing/test_mlx_ios_static.py`
- Contains `test_models_screen_has_correct_catalog` to verify the Qwen and Gemma registries and UI facts.
- Contains `test_ram_guard_logic` to ensure `MLXEngine.swift` is not blindly blocking 4-bit models as 4B.

## 4. Static Test Results

The static regression tests successfully passed:

```
============================= test session starts ==============================
mobile/testing/test_mlx_ios_static.py::test_models_screen_has_correct_catalog PASSED
mobile/testing/test_mlx_ios_static.py::test_ram_guard_logic PASSED
============================== 2 passed in 0.01s ===============================
```

## 5. Next Steps for Live Testing
Since I cannot currently reach the iPhone on the local network, please either:
1. Provide me with the iPhone's LAN IP address so I can attempt to run the `IHN_RUN_LIVE_CHAT` test suite and collect the manual smoke test metrics.
2. Run the tests locally yourself using the bash command above and append the results here!
