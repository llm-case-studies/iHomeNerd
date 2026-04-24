# iHomeNerd Host-Assist Vision

**Status:** working draft  
**Date:** 2026-04-24  
**Owner:** Alex

---

## 1. Why host-assist exists

iHomeNerd should continue to package the main app and model runtimes in containers where that makes sense.

But the project has now hit several classes of problems that containers are not good at solving alone:
- LAN name resolution
- Home CA / trust health
- SSH key management
- OS update checks
- physical device and accelerator visibility
- service and power control

These are not "LLM features." They are host / OS / environment features.

Host-assist is the thin layer that bridges that gap.

---

## 2. Definition

**Host-assist** is a minimal host-side helper that exposes a narrow set of environment capabilities to the iHN app plane.

It is not:
- a second brain
- a generic shell daemon
- an excuse to move most logic out of the container

It is:
- a thin environment adapter
- OS-aware
- tightly scoped
- explicitly auditable

---

## 3. Architectural boundary

### 3.1 App plane

Good container-native work:
- UI and API
- model routing
- model serving
- docs / RAG
- agent orchestration
- portable background tasks
- cluster inventory and presentation

### 3.2 Environment plane

Good host-assist work:
- `.local` / mDNS / Bonjour resolution
- Home CA and cert chain status
- SSH Doctor and gateway key install
- OS package / reboot / runtime checks
- hardware inventory beyond what the container sees
- Wake-on-LAN or power adapters
- service management wrappers

Rule of thumb:
- if the feature depends on host identity, privileged networking, or physical devices, it probably belongs in host-assist

---

## 4. Immediate real-world justification

Observed problems already match this pattern:

### 4.1 Missing device names on Dockerized nodes

Host:
- resolves `.local` names correctly

Container:
- often cannot use the host's mDNS context

Result:
- `Device (192.168.x.x)` instead of useful names

### 4.2 Household CA trust still feels brittle

The CA model is intended to be whole-home, but the operator still lacks:
- fingerprint visibility
- chain status
- trust mismatch detection
- recovery helpers

That is a host / control-plane concern.

### 4.3 SSH preflight failures are not yet operator-friendly

The gateway knows preflight failed, but it does not yet guide the operator through fixing:
- Remote Login disabled
- missing SSH server
- missing gateway public key
- host key mismatch

That belongs in host-assist and control-plane UX, not in the model layer.

---

## 5. Minimal host-assist responsibilities

The first host-assist service should focus on six jobs only.

### 5.1 LAN identity and name cache

Responsibilities:
- resolve hostnames using host networking context
- maintain a small cache of `ip -> hostname -> services`
- expose only sanitized results to the container/app

Output examples:
- `192.168.0.42 -> mac-mini-m1.local`
- `192.168.0.225 -> omv-elbo.local`

### 5.2 Home CA and cert health

Responsibilities:
- report active Home CA fingerprint
- report served node cert fingerprint
- verify whether node cert chains to Home CA
- detect mismatch or fallback CA state
- surface trust-health summary for the gateway

### 5.3 SSH Doctor

Responsibilities:
- test gateway-to-node SSH reachability
- classify failure modes
- expose gateway public key
- install gateway key when operator permits
- provide OS-specific remediation

### 5.4 Update and runtime checks

Responsibilities:
- OS package update status
- reboot-required status
- runtime version drift
- Docker / NVIDIA / launchd / systemd health

### 5.5 Hardware and accelerator inventory

Responsibilities:
- GPU / VRAM
- Coral / USB TPU
- audio and camera devices
- disks and storage pressure
- interfaces and network shape

### 5.6 Service and power adapters

Responsibilities:
- `start / stop / restart / status` wrappers
- optional Wake-on-LAN
- optional vendor / IPMI / BMC adapters later

---

## 6. Suggested implementation shape

### 6.1 Linux

- small systemd service
- loopback-only HTTP or Unix socket
- reads host networking, Avahi, package status, hardware state

### 6.2 macOS

- small launchd agent / daemon
- loopback-only or Unix socket
- Bonjour / trust / launchd / software update integration

### 6.3 Windows

- small Windows service
- loopback-only API
- OpenSSH / service / trust-store / update integration

---

## 7. Security rules

Host-assist should be intentionally narrow.

It should not:
- run arbitrary operator-provided shell commands by default
- expose a general-purpose remote execution API
- open a LAN-visible management API

It should:
- bind only to loopback or a Unix socket
- use allowlisted operations
- log privileged actions
- require explicit operator consent for key install, power actions, and updates

---

## 8. First API surface

The first version can stay very small.

Suggested endpoints / actions:
- `resolve_lan_devices`
- `trust_status`
- `node_cert_status`
- `ssh_diagnose`
- `ssh_install_gateway_key`
- `os_update_status`
- `runtime_status`
- `hardware_inventory`

---

## 9. Delivery plan

### Phase 1

- LAN name cache
- Home CA / node cert health
- SSH Doctor basics

### Phase 2

- gateway key install
- OS update checks
- richer hardware inventory

### Phase 3

- service lifecycle helpers
- power adapters
- Windows service parity

---

## 10. Bottom line

Host-assist is not an admission that Docker was wrong.

It is the missing environment layer for a real home control plane:
- keep app logic and model logic in the app plane
- keep host identity and OS truth in the environment plane

That boundary is now justified by real project behavior, not theory.
