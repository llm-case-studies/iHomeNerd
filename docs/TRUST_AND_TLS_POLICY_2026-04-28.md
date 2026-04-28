# iHomeNerd Trust & TLS Policy

**Status:** working policy  
**Date:** 2026-04-28  
**Owner:** Alex

---

## 1. Why this exists

The trust model is already visible in backend and Android code, but it is too
easy to misread the current state as:

- "every node can just use any self-signed cert"
- "mobile apps can ship with trust bypasses"
- "iOS and Android have different trust models"

That is not the intended product contract.

This document defines the trust and TLS policy that iHomeNerd follows and
expects from nodes.

---

## 2. Core policy

### 2.1 One Home CA per trust domain

Each Home / household / classroom trust domain should have:

- one active **Home CA**
- reused across nodes in that trust domain
- stable enough that user devices trust it once, not node by node forever

The Home CA itself is self-signed. That is acceptable because it is the
household trust anchor.

What is **not** acceptable as the steady-state node policy:

- each node presenting its own unrelated self-signed server cert
- shipping clients that click through or silently bypass cert trust forever

### 2.2 Per-node server certificates

Each serving node should present:

- a **server certificate**
- signed by the active Home CA
- containing the node's current LAN identity in SANs

At minimum, SAN coverage should include:

- `localhost`
- node hostname(s)
- current LAN IP(s)

If a node's IP or LAN naming changes, the **server cert** may be regenerated.
The **Home CA should stay stable**.

### 2.3 HTTP bootstrap + HTTPS runtime split

Trusted runtime traffic belongs on:

- `https://<node>:17777`

Bootstrap and trust installation belong on:

- `http://<node>:17778`

The setup/bootstrap port exists specifically to solve the chicken-and-egg
problem of first trust install.

Expected setup routes:

- `GET /setup`
- `GET /setup/ca.crt`
- `GET /setup/trust-status`

Expected runtime routes:

- `GET /health`
- `GET /capabilities`
- `GET /cluster/nodes`
- `GET /system/stats`
- `GET /v1/*`

### 2.4 Trust once, then validate normally

The intended UX is:

1. User discovers a node.
2. User installs the Home CA once.
3. Runtime requests validate against the system trust store normally.

The intended UX is **not**:

1. user sees browser warnings on every node
2. extension/app silently ignores TLS problems forever

---

## 3. Current implementation reality

### 3.1 Backend / larger nodes

The backend already implements the intended policy shape:

- local Home CA generation
- server cert generation signed by that Home CA
- trust-status reporting
- setup/bootstrap over `:17778`
- HTTPS runtime over `:17777`

See:

- `backend/app/certs.py`
- `backend/app/main.py`

### 3.2 Android node-class app

Android also implements the intended policy shape:

- generated Android Home CA
- generated server cert signed by that Home CA
- setup/bootstrap on `http://:17778`
- trusted runtime on `https://:17777`
- trust health surface in native UI
- CA download via setup endpoint

This is the current best reference implementation of mobile node trust.

See:

- `mobile/android/ihn-home/README.md`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/AndroidTlsManager.kt`
- `mobile/android/ihn-home/app/src/main/java/com/ihomenerd/home/runtime/LocalNodeRuntime.kt`

### 3.3 iOS current state

The current iOS scaffold does **not** yet meet the full trust policy.

Today it still contains a dev-only client-side trust bypass for outbound calls:

- `IhnAPI.swift` accepts whatever server cert the endpoint presents
- comments already mark this as development-only
- the intended replacement is Home CA install via `.mobileconfig`

So current iOS state is:

- acceptable for development scaffolding
- not acceptable as the final shipped trust path
- not evidence that "iOS nodes use arbitrary self-signed certs"

If an iOS device advertises `_ihomenerd._tcp` before it serves a compliant
runtime with a valid Home-CA-signed server certificate, treat that as
**scaffold / experimental behavior**, not product truth.

See:

- `mobile/ios/ihn-home/IhnHome/Networking/IhnAPI.swift`
- `mobile/ios/ihn-home/HANDOFF_2026-04-26.md`

---

## 4. Node expectations

Any node that claims to be a serving iHN node should satisfy these:

### 4.1 Minimum serving-node trust contract

- advertises a reachable runtime endpoint
- responds on the advertised port
- serves real HTTP(S), not just an open TCP socket
- exposes `/health`
- exposes `/capabilities`
- exposes `/setup/trust-status`
- reports trust state honestly
- presents a server cert that chains to the active Home CA

### 4.2 What should fail the contract

These should be considered degraded or non-compliant:

- runtime port accepts TCP but drops TLS/HTTP immediately
- cert does not chain to active Home CA
- client must rely on an "accept any cert" code path
- node advertises as a brain/runtime host before real runtime endpoints work

---

## 5. Capability-driven role policy

Node role should be determined by **hardware and runtime capabilities**, not by
OS class.

That means:

- Android can be a real node-class host now
- iPhone can remain controller-first today
- later iPhones with enough hardware may host more
- the trust policy does not change by OS

The same TLS rules apply:

- if a device serves iHN as a node, it should do so through the Home CA model
- if a device is only a controller, it should validate Home-CA-signed nodes

---

## 6. Expected client behavior

Clients should:

- prefer trusted runtime URLs on `https://...:17777`
- use `:17778` only for bootstrap and trust install
- show trust health clearly
- distinguish:
  - `trusted`
  - `bootstrap only`
  - `degraded`
  - `non-compliant`

Clients should not:

- normalize permanent insecure trust bypasses
- hide chain mismatch
- pretend a node is healthy when only Bonjour advertisement works

---

## 7. Immediate cleanup this policy implies

### 7.1 iOS docs

iOS docs should describe the app as:

- controller-first today
- capability-driven longer-term
- not yet a fully compliant serving node until Home CA install flow and real
  runtime hosting are in place

### 7.2 iOS implementation

Before an iOS device is treated as a real serving node, it should:

- replace the dev-only `URLSessionDelegate` trust bypass
- install/use Home CA trust
- serve real `/health` and `/capabilities`
- stop advertising node runtime service before the runtime is actually ready

### 7.3 Control plane / System UI

System and Trust surfaces should make this visible:

- active Home CA fingerprint
- whether each node chains to it
- whether each node is bootstrap-only or runtime-ready
- whether any client is still using a dev-only trust path

---

## 8. Short version

The policy is:

- **Home CA may be self-signed**
- **node server certs should not be unrelated self-signed certs**
- **setup/bootstrap lives on HTTP `:17778`**
- **real runtime lives on HTTPS `:17777`**
- **clients should trust via Home CA, not bypass TLS forever**
- **role is capability-driven, but trust policy stays the same across platforms**

---

## 9. Source anchors

- `backend/app/certs.py`
- `backend/app/main.py`
- `docs/NODES_CONTROL_PLANE_SPEC_2026-04-23.md`
- `docs/CURRENT_STATE_AND_NEXT_MOVES_2026-04-24.md`
- `mobile/android/ihn-home/README.md`
- `mobile/ios/README.md`
- `mobile/ios/ihn-home/README.md`
- `mobile/ios/ihn-home/IhnHome/Networking/IhnAPI.swift`
