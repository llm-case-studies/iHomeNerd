# Command Center — UI kit

Dense web dashboard served by iHomeNerd on `https://<gateway>:17777`.
Design width: 1440. Always dark theme. Built from the real `frontend/` source
(CommandCenter.tsx, SystemPanel.tsx, InvestigatePanel.tsx).

## Files

- `index.html` — interactive click-thru of the seven primary tabs, wrapped in
  a browser chrome that shows the `https://msi-raider-linux:17777` URL.
- `components.jsx` — header, tab nav, status chip, node card, alert row, and
  the panel shells (Home overview, Nodes, Trust, Models, Investigate, Travel).
- `browser-window.jsx` — starter desktop chrome.

## Coverage

The Command Center brief calls for six dense areas:

1. Home overview — gateway card + node list + alerts
2. Nodes / control plane — node roles, health, preflight, promote, drain
3. Trust / CA health — Home CA fingerprint, per-node cert state, recovery
4. Models / packs — installed, updates, recommended packs, storage
5. Investigate — Local Radar, target device, safe/explicit scan
6. Travel / session — portable node, hotspot clients, handoff

All six are represented. Node / session / trust vocabulary matches the fixed
vocabulary documented in the root README.
