# iHN Node (Android) — node-class UI kit

**Node-class** Android app. Unlike the iOS controller, this phone *hosts* a
local iHomeNerd runtime. It can act as a portable node, serve a hotspot,
and participate in the trust domain as a first-class node.

Scope:

1. **This node** — runtime status, hardware summary, thermal/battery
2. **Pair & trust** — install Home CA, show this node's cert
3. **Hotspot / travel mode** — broadcast `nerd-ap`, show clients
4. **Model packs** on this device — what's running locally
5. **Handoff** — "take this home", "create my own home"
6. **Adopt by** — QR to be adopted by a gateway

Design width: 412 (Material 3 default). Dark theme primary.

## Files

- `index.html` — click-thru: this node → pair → hotspot → handoff
- `components.jsx` — Material 3 surfaces adapted to the iHN palette
- `app.jsx` — screens + bottom-nav state
- `android-frame.jsx` — starter Android bezel
