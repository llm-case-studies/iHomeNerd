# Motorola Edge 2021 LAN Serving Probe (from Mac mini)

**Date:** 2026-04-28  
**Tester:** Claude (Mac mini M1)  
**Device under test:** Motorola Edge 2021 (`M-E-21`, serial `ZY22GQPKG6`)  
**Role under test:** Android node-class serving host on LAN

---

## 1. Why this probe was run

Symmetric counterpart to the iPhone 12 PM probe in
`mobile/testing/results/IPHONE_12PM_FIRST_LAN_SERVING_PROBE_2026-04-28.md`.

The iPhone result classified the iOS scaffold as `advertising-only`. Before
treating that as a bar to clear, we needed the matching baseline from the
Android side: a clean LAN serving probe of `M-E-21` from a peer on the same
network (Mac mini), to establish what a healthy serving node looks like under
the trust policy in `docs/TRUST_AND_TLS_POLICY_2026-04-28.md`.

The probe is a counterpart to Codex's iPhone test, not the ASR routing test in
`mobile/testing/requests/ME21_CROSS_TEST_REQUEST_2026-04-28.md` — that one
needs a browser session and audio.

---

## 2. Repo / build context

- Mac mini repo: `/Users/alex/Projects/iHomeNerd`, branch `main`,
  `HEAD = 11251d6` at probe time
- Target build: whatever `M-E-21` was running at probe time
  (advertised version `0.1.0-dev-android`)
- Network: same `192.168.0.0/24` LAN, Wi-Fi, no VPN on the Mac mini

---

## 3. Discovery result (mDNS / Bonjour)

`dns-sd -B _ihomenerd._tcp local.` from the Mac mini saw three peers:

- `iHomeNerd on motorola-edge-2021` ← target
- `iHomeNerd on msi-raider-linux`
- `iHomeNerd on iphone` (the still-running iPhone 12 PM scaffold)

This confirms `M-E-21` is advertising `_ihomenerd._tcp` and is reachable from
this LAN segment. Resolved address used for direct probes: `192.168.0.246`.

---

## 4. Direct LAN probes

### 4.1 `GET https://192.168.0.246:17777/health`

Command:

```bash
curl -sk https://192.168.0.246:17777/health
```

Result: HTTP 200 with valid JSON body.

Notable fields:

- `ok: true`, `status: "ok"`
- `product: "iHomeNerd"`, `version: "0.1.0-dev-android"`
- `hostname: "motorola-edge-(2021)"`
- `providers: ["android_local"]`
- `available_capabilities: ["chat", "compare_pinyin", "normalize_pinyin",
  "synthesize_speech", "transcribe_audio"]`
- `binding: "0.0.0.0"`, `port: 17777`, `network_transport: "wifi"`,
  `network_ips: ["192.168.0.246"]`
- `models`: `chat=android-gemma-chat-local`, `transcribe_audio=android-asr-local`,
  `synthesize_speech=android-tts-local`, pinyin tools = `pronunco-pinyin-tools`

Interpretation:

- TLS handshake completes
- HTTPS runtime is live
- response shape matches the documented contract

### 4.2 `GET https://192.168.0.246:17777/discover`

Command:

```bash
curl -sk https://192.168.0.246:17777/discover
```

Result: HTTP 200 with full JSON body.

Notable fields:

- `role: "brain"`
- `os: "android"`, `arch: "arm64-v8a"`
- `ram_bytes: 7714095104` (~7.7 GB)
- `protocol: "https"`, `port: 17777`
- `suggested_roles: ["travel-node", "light-specialist", "pronunco-helper"]`
- `strengths: ["portable control plane", "PronunCo helper tools",
  "offline local runtime"]`
- `quality_profiles: ["fast", "balanced"]`
- `capabilities`: same five as `/health`
- `network_hint`: explicit guidance that peers reach this node over
  `:17778` (bootstrap) and `:17777` (HTTPS runtime)

### 4.3 `GET https://192.168.0.246:17777/capabilities`

Returned the full capability manifest including a `_detail.capabilities`
subobject. `translate_text = false` with `load_state=available_to_load`;
the other five are live. ASR backend choices listed:
`moonshine-base-en`, `moonshine-base-es`.

### 4.4 `GET http://192.168.0.246:17778/setup/ca.crt`

Command:

```bash
curl -s http://192.168.0.246:17778/setup/ca.crt -o /tmp/me21-ca.crt \
  -w 'HTTP %{http_code} bytes=%{size_download}\n'
```

Result: `HTTP 200 bytes=1168` — repeatable across two pulls.

`openssl x509 -in /tmp/me21-ca.crt -noout -subject -issuer -fingerprint -sha256`:

- subject: `/CN=iHomeNerd Home CA/O=iHomeNerd`
- issuer: `/CN=iHomeNerd Home CA/O=iHomeNerd` (self-signed, as expected for a
  Home CA root)
- SHA-256 fingerprint:
  `24:D1:E0:23:B5:0E:5E:4A:E1:82:06:DB:87:EF:10:25:85:CE:8F:B3:12:54:69:95:60:81:37:B0:B3:59:C2:C0`

Interpretation: the bootstrap port serves a real Home CA cert. This is the
trust anchor the policy in `docs/TRUST_AND_TLS_POLICY_2026-04-28.md` calls
for, exposed exactly where the policy says it should be.

### 4.5 `GET http://192.168.0.246:17778/setup/trust-status` — partial fail

Command:

```bash
curl -sv http://192.168.0.246:17778/setup/trust-status --max-time 5
```

Result:

- TCP connect succeeded
- `GET` was sent
- server returned no response within 5 s (`Operation timed out ... 0 bytes received`)

Interpretation: bootstrap port accepts the TCP and the request, but the
`/setup/trust-status` route either is not implemented yet, hangs, or is
gated. `/setup/ca.crt` on the same port works fine, so the listener itself
is fine; this is a route-level gap, not a transport-level one.

---

## 5. Verdict

- mDNS advertisement: **yes**
- HTTPS serving runtime on `:17777`: **yes** (handshake + valid responses)
- `/health`, `/discover`, `/capabilities` routes: **all present and well-formed**
- HTTP bootstrap on `:17778` serving Home CA: **yes**
- `/setup/trust-status` on `:17778`: **incomplete** (TCP yes, response no)
- Trust shape matches `docs/TRUST_AND_TLS_POLICY_2026-04-28.md`: **mostly yes**,
  pending `trust-status` route

Classification:

- **healthy serving Android brain** — meets the bar that the iPhone scaffold
  has not yet cleared
- one remaining policy gap (`/setup/trust-status`) to close on the Android side

This is the inverse verdict of the iPhone probe: where iOS dropped TLS and
returned empty replies, Android answered cleanly across the documented
contract.

---

## 6. Implications for the iOS catch-up

The iPhone build needs to match this baseline before being treated as a real
serving node:

1. complete TLS handshake (currently fails with `SSL_ERROR_SYSCALL`)
2. answer `GET /health` and `GET /capabilities` with real bodies
3. expose a Home-CA-backed leaf cert, not a per-node self-signed cert
4. host an HTTP bootstrap on `:17778` with at least `/setup/ca.crt`

The current iOS NodeRuntime stub
(`mobile/ios/ihn-home/IhnHome/Runtime/NodeRuntime.swift`) only covers the
`:17777` listener with a self-signed leaf and a partial route set. It does
not yet have a Home CA, a `:17778` bootstrap, or `/capabilities`.

---

## 7. Artifacts

- `/tmp/me21-ca.crt` (Home CA root, 1168 bytes, fingerprint above) — saved
  on Mac mini, not committed
- live JSON bodies from `/health`, `/discover`, `/capabilities` (captured in
  this run, not saved as files)

---

## 8. Next action

- (iOS) close the TLS handshake gap on the iPhone; treat ME-21 as the
  reference contract
- (Android) implement `/setup/trust-status` so ME-21 fully matches
  `docs/TRUST_AND_TLS_POLICY_2026-04-28.md`
- (cross-test) run the ASR routing test from
  `mobile/testing/requests/ME21_CROSS_TEST_REQUEST_2026-04-28.md` separately
  — that one needs a browser session and audio, not just LAN probes
