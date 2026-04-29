# iPhone 12 Pro Max Node Contract Test Request

**Date:** 2026-04-29
**Time issued:** 07:18 EDT
**Requester:** Claude (Mac mini M1)
**Target device:** iPhone 12 Pro Max (LAN IP `192.168.0.220`, advertised hostname `iphone`)
**Target role:** iOS node-class host
**Expected branch context:** current `main` (latest commit `1822413` or newer)

---

## 1. Goal

Run the existing pytest contract packs against the **live iPhone node**
to validate that the iOS NodeRuntime emits the same shapes the Python
backend does, with documented iOS-specific deltas.

Specifically:

- `backend/tests/test_contract_api.py` — `/health`, `/discover`,
  `/capabilities`, `/system/stats`, root, 404
- `backend/tests/test_bootstrap_routes.py` — `/setup/ca.crt`,
  `/setup/trust-status`

These are the same tests already validated against ME-21 and the local
Python backend. The iPhone is the third node-class implementation;
running the same contract suite against it closes the cross-platform
loop.

---

## 2. Background — what shipped on the iPhone in the last 24 hours

Three commits land the bits this test exercises (all on `main`):

- `6b2b3e0` — Home CA + leaf chain (stable trust anchor in keychain,
  per-session leaf signed by it)
- `538e033` — `:17778` bootstrap HTTP listener (`/setup/ca.crt`,
  `/setup/trust-status`)
- `1822413` — `/capabilities` route on `:17777` mirroring the Python
  backend's flat-booleans + `_detail` shape

Verified by hand from the Mac mini: openssl shows the leaf issuer =
the Home CA's subject; `/setup/trust-status` returns
`status: "trusted"` with both `homeCa.present` and `serverCert.present`
true; `/capabilities` returns `{"_detail": {hostname, product, version,
os, arch, capabilities, node_profile}}`.

What this request adds: automated regression coverage so the next
iOS change doesn't silently break the contract.

---

## 3. How to point the tests at the iPhone

Both test files honor env vars. From the repo root, with the iPhone
on the same Wi-Fi as the Mac mini and the Node toggle ON:

```bash
# Contract pack (TLS on :17777)
IHN_BASE_URL=https://192.168.0.220:17777 \
    pytest backend/tests/test_contract_api.py -v

# Bootstrap pack (plain HTTP on :17778)
IHN_BOOTSTRAP_URL=http://192.168.0.220:17778 \
    pytest backend/tests/test_bootstrap_routes.py -v
```

The TLS pack uses `httpx.AsyncClient(verify=False)`, so the leaf cert
not chaining to a system trust store is fine.

Pre-flight sanity (run first to confirm reachability):

```bash
curl -sk https://192.168.0.220:17777/health  | head -5
curl -s  http://192.168.0.220:17778/setup/trust-status
```

If either of those fails, **stop and flag**. Don't run the suite
against an offline node.

---

## 4. Expected iOS-specific deltas

These are not bugs — flag them in the report but don't try to "fix"
them on the runtime side:

1. **`/capabilities` flat map is empty.** iOS hosts no capabilities
   yet. The flat `{capabilityName: bool}` portion is `{}`. The
   `_detail` sub-object carries identity metadata. Tests that only
   assert `_detail` exists should pass; tests that assert specific
   capability keys (e.g. `extract_lesson_items`) will fail and that
   failure is **expected** for now.

2. **No `/system/stats` endpoint.** iOS has not implemented this yet.
   Expect a 404. If `test_contract_api.py` asserts 200 on
   `/system/stats`, mark it as a known gap and document in the report.

3. **`serverCert.fingerprintSha256` is unstable.** The leaf
   regenerates each time the Node toggle goes off→on (LAN IPs may
   change). The CA fingerprint *is* stable — that's the trust anchor.
   Tests should not assert a specific leaf fingerprint value.

4. **`hostname` is `"iphone"`** (lowercased, sanitized device name).
   The Python backend uses the host machine name. Either is valid;
   tests that assert a specific value should be parametrized.

5. **`ollama: false`, `providers: ["ios_local"]`.** iOS is not an
   inference host. Tests that assume `ollama: true` or a non-empty
   `models` map will fail and that failure is **expected**.

6. **`available_capabilities` is empty list.** Same root cause as #1.

7. **`/discover` includes `os: "ios"`, `arch: "arm64"`, suggested
   roles `["controller", "travel-node-candidate"]`, role `"brain"`.**
   This is the documented contract the iPhone advertises.

---

## 5. What we expect the report to contain

Drop a new file under `mobile/testing/results/` named like:

`IPHONE_12PM_CONTRACT_TEST_RESULTS_2026-04-29.md`

Following the section-9 template from
`docs/TESTING_ROADMAP_AND_GUIDANCE_2026-04-28.md`. Specifically:

1. Environment captured (Mac mini IP, iPhone IP, exact iPhone build
   commit, Node toggle state at test time, Wi-Fi SSID).
2. Pre-flight curl output for `/health` and `/setup/trust-status`
   (paste the raw JSON so we can diff against future runs).
3. Per-test pass/fail tally for both packs.
4. For each failing test: name, full assertion message, our
   judgement on whether it's an iOS gap (deltas in §4), a contract
   bug to file, or a test issue.
5. The CA fingerprint observed in `/setup/trust-status` (so we can
   verify it stays stable across toggle cycles in future runs).
6. Whether anything required a runtime-side change (should be no —
   if yes, stop and flag, don't push runtime edits without sign-off).

---

## 6. Hands-off zones

- **Do not** edit `mobile/ios/ihn-home/IhnHome/Runtime/*` — Claude's
  active workstream.
- **Do not** edit `backend/app/main.py`, `backend/app/certs.py` — tests
  yes, runtime edits no.
- New test files / fixtures under `backend/tests/` are fine if you
  need to extend coverage. Flag those in the report.

---

## 7. One-line kickoff to paste

> DeepSeek: run `test_contract_api.py` and `test_bootstrap_routes.py`
> against the iPhone at `192.168.0.220` (TLS :17777, plain :17778).
> Read this file first for the iOS-specific deltas. Drop results as
> `mobile/testing/results/IPHONE_12PM_CONTRACT_TEST_RESULTS_2026-04-29.md`.
> Don't touch runtime code.
