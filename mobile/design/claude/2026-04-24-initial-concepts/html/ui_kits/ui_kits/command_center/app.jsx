/* global React, Header, Tabs, Card, Chip, Btn, NodeCard, AlertRow, Label, Meta, I */
const { useState } = React;

const NODES = [
  { host: "HP-Envy-Ubuntu",    ip: "192.168.0.229", os: "ubuntu 22.04",
    state: "managed",   stateTone: "ok",   roles: ["gateway", "docs", "automation"],
    hw: "16 GB RAM · no GPU", models: "gemma3:1b · llama3.2:1b", uptime: "12d 4h" },
  { host: "msi-raider-linux",  ip: "192.168.0.147", os: "ubuntu 22.04",
    state: "managed",   stateTone: "ok",   roles: ["llm-worker", "vision-worker"],
    hw: "RTX 4070 · 32 GB",  models: "gemma4:e4b · llama3:8b · codellama:13b", uptime: "3d 14h" },
  { host: "Acer-HL",           ip: "192.168.0.88",  os: "ubuntu 20.04",
    state: "degraded",  stateTone: "warn", roles: ["voice-worker"],
    hw: "8 GB · 2 GB GPU", models: "whisper-small-int8", uptime: "1d 2h" },
  { host: "pi-garage",         ip: "192.168.0.44",  os: "raspbian",
    state: "discovered", stateTone: "neutral", roles: ["candidate"],
    hw: "4 GB RAM · ARM", models: "—", uptime: "—" },
];

// ───────────────────────────────────────────────────────────────
// Panels
// ───────────────────────────────────────────────────────────────

// Trust-health hero card — dominates the home view.
const TrustHealthHero = ({ tone, title, sub, fp, cta }) => {
  const c = { ok: "#34d399", warn: "#fbbf24", err: "#f87171" }[tone];
  return (
    <div style={{
      position: "relative", borderRadius: 16, overflow: "hidden",
      background: `linear-gradient(135deg, ${c}12, transparent 60%), #1a1d27`,
      border: `1px solid ${c}35`,
      padding: 24,
      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 22, alignItems: "center",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 18,
        background: `${c}18`, border: `1px solid ${c}40`, color: c,
        display: "grid", placeItems: "center",
      }}>
        <I.Shield width={36} height={36} />
      </div>
      <div>
        <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: c, fontWeight: 600 }}>
          Trust health
        </div>
        <div style={{
          fontFamily: "Space Grotesk, sans-serif", fontSize: 26, fontWeight: 700,
          color: "#e4e6eb", marginTop: 4, letterSpacing: "-0.01em",
        }}>{title}</div>
        <div style={{ color: "#8b8fa3", fontSize: 13, marginTop: 4, maxWidth: 520 }}>{sub}</div>
        <div style={{
          marginTop: 12, fontFamily: "JetBrains Mono, monospace", fontSize: 11,
          letterSpacing: "0.05em", color: "#8b8fa3",
        }}>{fp}</div>
      </div>
      {cta && <div>{cta}</div>}
    </div>
  );
};

// Small KPI tile
const KPI = ({ label, value, sub, tone = "neutral" }) => {
  const c = { ok: "#34d399", warn: "#fbbf24", err: "#f87171", accent: "#4f8cff", neutral: "#e4e6eb" }[tone];
  return (
    <Card style={{ padding: 16 }}>
      <Label>{label}</Label>
      <div style={{
        fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 28,
        color: c, letterSpacing: "-0.01em", margin: "2px 0",
      }}>{value}</div>
      <div style={{ color: "#8b8fa3", fontSize: 12 }}>{sub}</div>
    </Card>
  );
};

const HomePanel = () => (
  <div style={{ padding: 24, maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
    <div>
      <Label>Home overview</Label>
      <h2 style={{
        fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 32,
        letterSpacing: "-0.01em", margin: "0 0 6px", color: "#e4e6eb",
      }}>Alex's Home</h2>
      <div style={{ color: "#8b8fa3", fontSize: 13 }}>
        4 nodes · 3 online · last trust check 4 h ago
      </div>
    </div>

    <TrustHealthHero
      tone="err"
      title="1 node doesn't match the Home CA"
      sub="Acer-HL is presenting a cert that no longer chains to this Home. Re-pair to regenerate and re-trust — other nodes remain verified."
      fp="Home CA · SHA256 4C:7E:3B:A9:18:DA:82:B4:9F:12:…:A1:FF"
      cta={<Btn variant="primary"><I.Shield width={14} height={14} />Re-pair Acer-HL</Btn>}
    />

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      <KPI label="Trusted nodes"  value="3 / 4"    sub="1 mismatch · Acer-HL"           tone="err" />
      <KPI label="Runtime"        value="online"   sub="gateway · 192.168.0.229:17777"  tone="ok" />
      <KPI label="Packs"          value="5"        sub="1 update pending"                tone="accent" />
      <KPI label="Open alerts"    value="2"        sub="1 blocker · 1 warning"           tone="warn" />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Label>Nodes</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {NODES.map(n => <NodeCard key={n.host} node={n} />)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card style={{ padding: 16 }}>
          <Label>Active alerts · 2</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <AlertRow tone="err"  title="Trust mismatch on Acer-HL" desc="Cert chain no longer matches Home CA" ts="2m" />
            <AlertRow tone="warn" title="Update available"          desc="iHN 0.4.2 → 0.4.3 · preview"          ts="14m" />
          </div>
        </Card>
        <Card style={{ padding: 16 }}>
          <Label>Model-fit</Label>
          <div style={{ fontSize: 12, color: "#8b8fa3", lineHeight: 1.6 }}>
            Routing chat to <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#e4e6eb" }}>msi-raider-linux</span>.
            Docs and automation stay on the gateway. Voice offline until Acer-HL is re-paired.
          </div>
        </Card>
        <Card style={{ padding: 16 }}>
          <Label>Travel</Label>
          <div style={{ fontSize: 13, color: "#e4e6eb", fontWeight: 600 }}>pixel-travel-node</div>
          <div style={{ fontSize: 12, color: "#8b8fa3", marginTop: 2 }}>Guest session · 42m · 2 clients</div>
          <div style={{ marginTop: 10 }}><Chip tone="accent" dot={false}>borrowed trust</Chip></div>
        </Card>
      </div>
    </div>
  </div>
);

const NodesPanel = () => (
  <div style={{ padding: 24, maxWidth: 1320, margin: "0 auto" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
      <div>
        <Label>Home nodes</Label>
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 28, margin: 0 }}>Control plane</h2>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn><I.Search width={14} height={14} />Discover</Btn>
        <Btn variant="primary"><I.Arrow width={14} height={14} />Promote to node</Btn>
      </div>
    </div>
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#8b8fa3", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {["Hostname", "IP", "Role", "Hardware", "State", "Uptime", ""].map(h => (
              <th key={h} style={{ padding: "14px 16px", borderBottom: "1px solid #2e3140", fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NODES.map(n => (
            <tr key={n.host}>
              <td style={td}><span style={{ fontWeight: 600 }}>{n.host}</span></td>
              <td style={{ ...td, fontFamily: "JetBrains Mono, monospace", color: "#8b8fa3" }}>{n.ip}</td>
              <td style={td}>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {n.roles.map(r => (
                    <span key={r} style={{ fontSize: 11, padding: "1px 7px", borderRadius: 5, background: "rgba(79,140,255,.10)", color: "#4f8cff", border: "1px solid rgba(79,140,255,.20)" }}>{r}</span>
                  ))}
                </div>
              </td>
              <td style={{ ...td, color: "#8b8fa3" }}>{n.hw}</td>
              <td style={td}><Chip tone={n.stateTone}>{n.state}</Chip></td>
              <td style={{ ...td, fontFamily: "JetBrains Mono, monospace", color: "#8b8fa3" }}>{n.uptime}</td>
              <td style={td}>
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  <Btn size="sm">Preflight</Btn>
                  <Btn size="sm">Restart</Btn>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </div>
);

const td = { padding: "14px 16px", borderBottom: "1px solid #2e3140", verticalAlign: "middle" };

const TrustPanel = () => {
  const rows = [
    { host: "HP-Envy-Ubuntu",   role: "gateway",      fp: "SHA256 4C:7E:3B:…:A1:FF", expires: "2027-03-18", last: "4 h", tone: "ok",      state: "trusted" },
    { host: "msi-raider-linux", role: "llm-worker",   fp: "SHA256 4C:7E:3B:…:A1:FF", expires: "2027-03-18", last: "4 h", tone: "ok",      state: "trusted" },
    { host: "Acer-HL",          role: "voice-worker", fp: "SHA256 9A:BB:11:…:3C:02", expires: "—",          last: "2 m", tone: "err",     state: "mismatch" },
    { host: "pi-garage",        role: "candidate",    fp: "no cert installed",        expires: "—",          last: "—",   tone: "neutral", state: "needs install" },
  ];
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <Label>Trust · Home CA</Label>
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 28, margin: 0 }}>Trust once per household.</h2>
        <div style={{ color: "#8b8fa3", fontSize: 14, marginTop: 6, maxWidth: 640 }}>
          Every node presents a cert signed by this Home's CA. Browser warnings disappear for good once the CA is installed on your devices.
        </div>
      </div>

      <TrustHealthHero
        tone="err"
        title="1 of 4 nodes needs attention"
        sub="Acer-HL no longer chains to the Home CA. Re-pairing regenerates its key on-device and re-signs the cert."
        fp="Home CA · issued 2026-03-18 · SHA256 4C:7E:3B:A9:18:DA:82:B4:9F:12:…:A1:FF"
        cta={<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn variant="primary"><I.Shield width={14} height={14} />Re-pair Acer-HL</Btn>
          <Btn size="sm">Copy CA fingerprint</Btn>
        </div>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <KPI label="Trusted" value="2"   sub="chain valid · verified 4 h" tone="ok" />
        <KPI label="Stale"   value="0"   sub="no re-verify needed"         tone="neutral" />
        <KPI label="Mismatch" value="1"  sub="Acer-HL · action needed"     tone="err" />
        <KPI label="Needs install" value="1" sub="pi-garage · candidate"   tone="warn" />
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid #2e3140" }}>
          <Label style={{ margin: 0 }}>Per-node cert state</Label>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#8b8fa3", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {["Host", "Role", "Fingerprint", "Expires", "Last check", "State", ""].map(h => (
                <th key={h} style={{ padding: "12px 20px", borderBottom: "1px solid #2e3140", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.host}>
                <td style={td}><span style={{ fontWeight: 600 }}>{r.host}</span></td>
                <td style={{ ...td, color: "#8b8fa3" }}>{r.role}</td>
                <td style={{ ...td, fontFamily: "JetBrains Mono, monospace", color: r.tone === "err" ? "#f87171" : "#8b8fa3", fontSize: 12 }}>{r.fp}</td>
                <td style={{ ...td, fontFamily: "JetBrains Mono, monospace", color: "#8b8fa3" }}>{r.expires}</td>
                <td style={{ ...td, color: "#8b8fa3" }}>{r.last}</td>
                <td style={td}><Chip tone={r.tone}>{r.state}</Chip></td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {r.tone === "err"    && <Btn size="sm" variant="primary">Re-pair</Btn>}
                    {r.tone === "neutral"&& <Btn size="sm" variant="primary"><I.Shield width={12} height={12} />Install CA</Btn>}
                    {r.tone === "ok"     && <Btn size="sm">Re-verify</Btn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <Label>Install CA on a new device</Label>
          <div style={{ color: "#8b8fa3", fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>
            Scan from the iHN Home app, or import the CA into your OS keychain. After install, every node opens without browser warnings.
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Btn variant="primary"><I.Shield width={14} height={14} />Show QR</Btn>
            <Btn>Download .pem</Btn>
          </div>
        </Card>
        <Card>
          <Label>Cert lifecycle</Label>
          <Meta k="Policy"       v="rotate every 12 months" />
          <Meta k="Next rotation" v="2027-03-18 · auto" mono />
          <Meta k="Grace window" v="14 days · warn on stale" />
          <Meta k="On mismatch"  v="block + require re-pair" />
        </Card>
      </div>
    </div>
  );
};

const ModelsPanel = () => {
  const packs = [
    { name: "gemma4:e4b",      node: "msi-raider-linux", size: "3.2 GB", fit: "chat · code", update: null },
    { name: "llama3:8b",       node: "msi-raider-linux", size: "4.7 GB", fit: "chat · multimodal", update: "→ 3.1" },
    { name: "gemma3:1b",       node: "HP-Envy-Ubuntu",   size: "815 MB", fit: "routing · docs",    update: null },
    { name: "whisper-small",   node: "Acer-HL",          size: "465 MB", fit: "transcription",     update: null },
    { name: "kokoro-82m-onnx", node: "HP-Envy-Ubuntu",   size: "320 MB", fit: "tts",               update: null },
  ];
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Label>Models · packs</Label>
        <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 28, margin: 0 }}>Installed on this home</h2>
        <div style={{ color: "#8b8fa3", fontSize: 13, marginTop: 4 }}>
          Placement follows the model-fit table. Small specialized is often the right default.
        </div>
      </div>
      <Card style={{ padding: 0 }}>
        {packs.map((p, i) => (
          <div key={p.name} style={{
            display: "grid", gridTemplateColumns: "2fr 2fr 1fr 2fr auto",
            alignItems: "center", gap: 16, padding: "14px 20px",
            borderTop: i === 0 ? "none" : "1px solid #2e3140",
          }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13 }}>{p.name}</div>
            <div style={{ color: "#8b8fa3", fontSize: 12 }}>on {p.node}</div>
            <div style={{ color: "#8b8fa3", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>{p.size}</div>
            <div style={{ fontSize: 12 }}>{p.fit}</div>
            <div>{p.update
              ? <Chip tone="warn">update {p.update}</Chip>
              : <Chip tone="ok">current</Chip>}</div>
          </div>
        ))}
      </Card>
    </div>
  );
};

const InvestigatePanel = () => {
  const devices = [
    { name: "msi-raider-linux.local", ip: "192.168.0.147", type: "server", ok: true },
    { name: "router.local",           ip: "192.168.0.1",   type: "router", warn: "Firmware update available" },
    { name: "alex-iphone",            ip: "192.168.0.203", type: "phone",  ok: true },
    { name: "unknown-tplink",         ip: "192.168.0.62",  type: "iot",    warn: "Default credentials detected" },
    { name: "pi-garage",              ip: "192.168.0.44",  type: "server", ok: true },
  ];
  return (
    <div style={{ padding: 24, display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, maxWidth: 1320, margin: "0 auto" }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <I.Wifi width={18} height={18} color="#4f8cff" />
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Local Radar</div>
            <div style={{ fontSize: 11, color: "#8b8fa3" }}>5 devices on 192.168.0.0/24</div>
          </div>
          <span style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: 999, background: "#4f8cff" }} />
        </div>
        {devices.map(d => (
          <div key={d.ip} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderTop: "1px solid #2e3140",
          }}>
            <div>
              <div style={{ fontSize: 13 }}>{d.name}</div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#8b8fa3" }}>{d.ip}</div>
            </div>
            {d.ok ? <Chip tone="ok" dot={false}>safe</Chip> : <Chip tone="warn" dot={false}>check</Chip>}
          </div>
        ))}
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <Label>Scan · unknown-tplink · 192.168.0.62</Label>
          <div style={{
            background: "#0f1117", border: "1px solid #2e3140", borderRadius: 8,
            fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#8b8fa3",
            padding: 14, lineHeight: 1.6,
          }}>
            <div>&gt; Running device_health on 192.168.0.62…</div>
            <div>&gt; arp probe ok · mdns advertises _http._tcp</div>
            <div>&gt; services: http:80 http:8080</div>
            <div style={{ color: "#fbbf24" }}>&gt; warning: admin/admin accepted on /login</div>
            <div style={{ color: "#fbbf24" }}>&gt; warning: firmware v1.2 · latest v2.2.0</div>
            <div>&gt; scan complete in 4.1s</div>
          </div>
        </Card>
        <Card>
          <Label>Findings · 2</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <AlertRow tone="err"  title="Default credentials detected" desc="admin/admin accepted on /login. Change immediately." ts="high" />
            <AlertRow tone="warn" title="Firmware out of date"         desc="v1.2 → v2.2.0 · 4 CVEs addressed."                    ts="med" />
          </div>
        </Card>
      </div>
    </div>
  );
};

const TravelPanel = () => (
  <div style={{ padding: 24, maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
    <div>
      <Label>Travel · portable node</Label>
      <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 28, margin: 0 }}>pixel-travel-node</h2>
      <div style={{ color: "#8b8fa3", fontSize: 13, marginTop: 4 }}>Android-hosted · tethered to alex-iphone on hotspot <span style={{ fontFamily: "JetBrains Mono, monospace" }}>nerd-ap</span></div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card>
        <Label>This node</Label>
        <Meta k="Runtime"  v="online · v0.4.2" />
        <Meta k="Hotspot"  v="nerd-ap · WPA3" />
        <Meta k="Clients"  v="2 connected" />
        <Meta k="Battery"  v="78% · charging" />
        <Meta k="Thermal"  v="42°C · nominal" />
        <Meta k="Storage"  v="9.2 / 128 GB" />
      </Card>
      <Card>
        <Label>Active session</Label>
        <Meta k="Type"     v="travel brain" />
        <Meta k="Home"     v="Alex's Home · guest" />
        <Meta k="Started"  v="42m ago" mono />
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn><I.Arrow width={14} height={14} />Take this Home</Btn>
          <Btn><I.Arrow width={14} height={14} />Create my own Home</Btn>
          <Btn variant="danger"><I.Power width={14} height={14} />End session</Btn>
        </div>
      </Card>
    </div>
  </div>
);

// ───────────────────────────────────────────────────────────────
// App
// ───────────────────────────────────────────────────────────────
const PANEL = {
  home: HomePanel, nodes: NodesPanel, trust: TrustPanel,
  models: ModelsPanel, investigate: InvestigatePanel, travel: TravelPanel,
};

function App() {
  const [tab, setTab] = useState("home");
  const Panel = PANEL[tab];
  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      background: "#0f1117", color: "#e4e6eb",
      fontFamily: "Inter, system-ui, sans-serif",
    }} data-screen-label={`Command Center · ${tab}`}>
      <Header />
      <Tabs active={tab} onChange={setTab} />
      <main><Panel /></main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
