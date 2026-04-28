# iHN Home — iOS Controller UI kit

Controller-class iPhone app. Compact and native. Scope is strictly:

1. **Pair** with a Home (trust a new Home CA)
2. **Trust** visibility (CA fingerprint, verify chain)
3. **Alerts** from the gateway
4. **Node control** — restart, drain, SSH doctor shortcut
5. **Model packs** — browse + apply
6. **Travel** — session status, take-home handoff

Not in scope: chat, docs, lessons. This is a pocket control surface, not a
product hub.

Design width: 402 (iPhone 16 Pro). Dark theme primary.

## Files

- `index.html` — click-thru demo: pair flow → home → node detail → alerts →
  travel session. All mocked interactions.
- `components.jsx` — sheet, section list, status chip, node row, alert row,
  trust fingerprint card, pair progress.
- `app.jsx` — screen composition and navigation state.
- `ios-frame.jsx` — starter iOS bezel with status bar + home indicator.
