# iPhone 12 Pro Max First LAN Serving Probe

**Date:** 2026-04-28  
**Tester:** Codex  
**Device:** iPhone 12 Pro Max  
**Role under test:** possible iOS serving node on LAN

---

## 1. Why this probe was run

The iPhone 12 Pro Max appeared to be advertising `_ihomenerd._tcp` on the LAN.

Before treating that as meaningful progress, the question was:

> is the phone actually serving a real iHN runtime, or only advertising one?

---

## 2. Discovery result

Avahi did see the iPhone advertising `iHomeNerd`:

- service: `iHomeNerd on iphone`
- hostname: `Alexs-iPhone-2.local`
- IPv4: `192.168.0.220`
- port: `17777`
- TXT:
  - `hostname=iphone.local`
  - `IPv4=192.168.0.220`
  - `version=0.1.0-dev-ios`
  - `role=brain`

This confirms:

- Bonjour advertisement exists
- the phone is on the LAN
- the advertised runtime port is `17777`

It does **not** prove a healthy serving runtime.

---

## 3. Direct LAN probe result

Two direct probes were attempted from the Dell.

### HTTPS probe

Command:

```bash
curl -svk https://192.168.0.220:17777/health
```

Observed result:

- TCP connect succeeded
- TLS client hello was sent
- OpenSSL failed with:
  - `SSL_ERROR_SYSCALL`

Interpretation:

- socket accepted connection
- TLS handshake did not complete
- no usable HTTPS runtime response

### Plain HTTP probe

Command:

```bash
curl -sv http://192.168.0.220:17777/health
```

Observed result:

- TCP connect succeeded
- HTTP request was sent
- server returned:
  - `Empty reply from server`

Interpretation:

- port is reachable
- but no valid HTTP response body/headers were served

---

## 4. Code/document context

Current iOS docs still describe the iOS app as controller-first, not a proven
node-class host:

- `mobile/ios/README.md`
- `mobile/ios/ihn-home/README.md`

Current iOS networking code also still contains a dev-only permissive TLS
client path for outbound calls:

- `mobile/ios/ihn-home/IhnHome/Networking/IhnAPI.swift`

And the current iOS source tree does **not** obviously show a real local server
implementation comparable to Android's local runtime.

So the most likely interpretation is:

- the iPhone is advertising `_ihomenerd._tcp`
- but the actual serving runtime is incomplete, not ready, or not bound
  correctly

---

## 5. Verdict

Current verdict:

- `Bonjour advertisement: yes`
- `real serving runtime: no evidence yet`
- `trust-compliant serving node: not yet`

This should be classified as:

- `advertising-only / scaffold`

not:

- `healthy iOS brain`

---

## 6. What must be true before re-testing as a real node

Before an iPhone build should be treated as a real serving node, it should:

1. answer `GET /health` on the advertised runtime
2. answer `GET /capabilities`
3. serve valid HTTP(S), not just accept TCP
4. align with `docs/TRUST_AND_TLS_POLICY_2026-04-28.md`
5. avoid relying on the current dev-only trust bypass as the product path

---

## 7. Short takeaway

The iPhone 12 Pro Max is visible on LAN and advertising `_ihomenerd._tcp`, but
the first direct runtime probe failed. The current state is meaningful as a
scaffold milestone, but it is not yet a successful iOS serving-node milestone.
