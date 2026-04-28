/* global React, ReactDOM, IOSDevice, Ic, IhnChip, IhnHeader, IhnSectionHeader, IhnGroup, IhnRow, IhnBtn, IhnAlert, IhnTabs */
const { useState } = React;

// ─────────────────────────────────────────────────────────────
// Screen: Home
// ─────────────────────────────────────────────────────────────
const HomeScreen = ({ onOpenNode, onOpenTrust }) => (
  <>
    <IhnHeader
      title="Alex's Home"
      subtitle="3 of 4 nodes online · trusted 4h ago"
      trailing={<IhnChip tone="ok">online</IhnChip>}
    />
    <IhnSectionHeader>Gateway</IhnSectionHeader>
    <IhnGroup>
      <IhnRow
        icon={<Ic.Server width={18} height={18} />}
        title="HP-Envy-Ubuntu"
        detail="192.168.0.229 · always on"
        trailing={<IhnChip tone="ok" dot={false}>managed</IhnChip>}
        chevron
        onClick={() => onOpenNode("HP-Envy-Ubuntu")}
        isLast
      />
    </IhnGroup>

    <IhnSectionHeader>Worker nodes</IhnSectionHeader>
    <IhnGroup>
      <IhnRow
        icon={<Ic.Server width={18} height={18} />}
        title="msi-raider-linux"
        detail="RTX 4070 · llm-worker"
        trailing={<IhnChip tone="ok" dot={false}>managed</IhnChip>}
        chevron
        onClick={() => onOpenNode("msi-raider-linux")}
      />
      <IhnRow
        icon={<Ic.Server width={18} height={18} />}
        title="Acer-HL"
        detail="8 GB · voice-worker"
        trailing={<IhnChip tone="warn" dot={false}>degraded</IhnChip>}
        chevron
        onClick={() => onOpenNode("Acer-HL")}
        isLast
      />
    </IhnGroup>

    <IhnSectionHeader>Active alerts · 2</IhnSectionHeader>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <IhnAlert tone="err"  title="Trust mismatch on Acer-HL" body="Cert chain no longer matches Home CA. Re-pair from Trust." ts="2m" />
      <IhnAlert tone="warn" title="Update available"          body="iHN 0.4.2 → 0.4.3 on msi-raider-linux. Review before applying." ts="14m" />
    </div>

    <IhnSectionHeader>Trust</IhnSectionHeader>
    <IhnGroup>
      <IhnRow
        icon={<Ic.Shield width={18} height={18} />}
        title="This phone trusts your Home CA"
        detail="SHA256 4C:7E:3B:…:A1:FF"
        chevron
        onClick={onOpenTrust}
        isLast
      />
    </IhnGroup>
    <div style={{ height: 24 }} />
  </>
);

// ─────────────────────────────────────────────────────────────
// Screen: Node detail
// ─────────────────────────────────────────────────────────────
const NodeScreen = ({ host, onBack }) => (
  <>
    <IhnHeader
      title={host}
      subtitle="192.168.0.147 · managed"
      onBack={onBack}
      trailing={<IhnChip tone="ok">online</IhnChip>}
    />
    <IhnSectionHeader>Node</IhnSectionHeader>
    <IhnGroup>
      <IhnRow title="Role"      trailing={<span style={{ color: "#8b8fa3", fontSize: 13 }}>llm-worker</span>} />
      <IhnRow title="Hardware"  trailing={<span style={{ color: "#8b8fa3", fontSize: 13 }}>RTX 4070 · 32 GB</span>} />
      <IhnRow title="Runtime"   trailing={<IhnChip tone="ok" dot={false}>v0.4.2</IhnChip>} />
      <IhnRow title="Uptime"    trailing={<span style={{ color: "#8b8fa3", fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>3d 14h</span>} isLast />
    </IhnGroup>

    <IhnSectionHeader>Installed models</IhnSectionHeader>
    <IhnGroup>
      <IhnRow title="gemma4:e4b"      detail="3.2 GB · chat · code" />
      <IhnRow title="llama3:8b"       detail="4.7 GB · chat · multimodal" trailing={<IhnChip tone="warn" dot={false}>update</IhnChip>} />
      <IhnRow title="codellama:13b"   detail="7.4 GB · code" isLast />
    </IhnGroup>

    <IhnSectionHeader>Actions</IhnSectionHeader>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <IhnBtn variant="secondary"><Ic.Refresh width={16} height={16} />Restart runtime</IhnBtn>
      <IhnBtn variant="secondary"><Ic.Power   width={16} height={16} />Drain worker</IhnBtn>
      <IhnBtn variant="danger"><Ic.Alert     width={16} height={16} />SSH doctor</IhnBtn>
    </div>
    <div style={{ height: 24 }} />
  </>
);

// ─────────────────────────────────────────────────────────────
// Screen: Trust
// ─────────────────────────────────────────────────────────────
const TrustScreen = ({ onBack }) => (
  <>
    <IhnHeader
      title="Trust"
      subtitle="Trust once per household."
      onBack={onBack}
      trailing={<IhnChip tone="ok">verified</IhnChip>}
    />
    <div style={{ padding: "16px" }}>
      <div style={{
        background: "#1a1d27", border: "1px solid #2e3140", borderRadius: 12,
        padding: 16, display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: "rgba(52,211,153,.10)", border: "1px solid rgba(52,211,153,.20)",
            display: "grid", placeItems: "center", color: "#34d399",
          }}><Ic.Shield width={22} height={22} /></div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Home CA active</div>
            <div style={{ color: "#8b8fa3", fontSize: 12 }}>Issued 2026-03-18</div>
          </div>
        </div>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 12, letterSpacing: "0.04em",
          background: "#252830", border: "1px solid #2e3140", borderRadius: 6,
          padding: "10px 12px", color: "#e4e6eb",
        }}>SHA256 4C:7E:3B:A9:18:DA:82:B4:9F:12:…:A1:FF</div>
      </div>
    </div>

    <IhnSectionHeader>Per-node cert state</IhnSectionHeader>
    <IhnGroup>
      <IhnRow title="HP-Envy-Ubuntu"   detail="SHA256 4C:7E:3B:…:A1:FF"  trailing={<IhnChip tone="ok" dot={false}>trusted</IhnChip>} />
      <IhnRow title="msi-raider-linux" detail="SHA256 4C:7E:3B:…:A1:FF"  trailing={<IhnChip tone="ok" dot={false}>trusted</IhnChip>} />
      <IhnRow title="Acer-HL"          detail="SHA256 9A:BB:11:…:3C:02"  trailing={<IhnChip tone="err" dot={false}>mismatch</IhnChip>} isLast />
    </IhnGroup>
    <div style={{ padding: "16px" }}>
      <IhnBtn variant="primary"><Ic.QR width={16} height={16} />Re-pair Acer-HL</IhnBtn>
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────
// Screen: Alerts
// ─────────────────────────────────────────────────────────────
const AlertsScreen = () => (
  <>
    <IhnHeader title="Alerts" subtitle="From your Home · last 24h" />
    <div style={{ padding: "4px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <IhnAlert tone="err"  title="Trust mismatch on Acer-HL"  body="Cert chain no longer matches Home CA. Re-pair from Trust." ts="2m" />
      <IhnAlert tone="warn" title="Update available"           body="iHN 0.4.2 → 0.4.3 on msi-raider-linux. Review before applying." ts="14m" />
      <IhnAlert tone="warn" title="Disk pressure"              body="HP-Envy-Ubuntu: 38 GB free of 480 GB." ts="1h" />
      <IhnAlert tone="ok"   title="Update applied"             body="gateway → 0.4.2 · trust re-verified." ts="8h" />
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────
// Screen: Travel
// ─────────────────────────────────────────────────────────────
const TravelScreen = () => (
  <>
    <IhnHeader
      title="Travel"
      subtitle="pixel-travel-node · tethered"
      trailing={<IhnChip tone="ok">online</IhnChip>}
    />
    <IhnSectionHeader>Session</IhnSectionHeader>
    <IhnGroup>
      <IhnRow title="Type"    trailing={<span style={{ color: "#8b8fa3", fontSize: 13 }}>travel brain</span>} />
      <IhnRow title="Home"    trailing={<span style={{ color: "#8b8fa3", fontSize: 13 }}>Alex's Home · guest</span>} />
      <IhnRow title="Started" trailing={<span style={{ color: "#8b8fa3", fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>42m ago</span>} isLast />
    </IhnGroup>

    <IhnSectionHeader>Network</IhnSectionHeader>
    <IhnGroup>
      <IhnRow icon={<Ic.Wifi width={18} height={18} />} title="Hotspot"  detail="nerd-ap · WPA3" trailing={<IhnChip tone="ok" dot={false}>up</IhnChip>} />
      <IhnRow title="Clients"  trailing={<span style={{ color: "#8b8fa3", fontSize: 13 }}>2 connected</span>} />
      <IhnRow title="Battery"  trailing={<span style={{ color: "#8b8fa3", fontSize: 13 }}>78% · charging</span>} isLast />
    </IhnGroup>

    <IhnSectionHeader>Handoff</IhnSectionHeader>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <IhnBtn variant="primary">Take this Home</IhnBtn>
      <IhnBtn variant="secondary">Create my own Home</IhnBtn>
      <IhnBtn variant="danger"><Ic.Power width={16} height={16} />End session</IhnBtn>
    </div>
    <div style={{ height: 24 }} />
  </>
);

// ─────────────────────────────────────────────────────────────
// App shell
// ─────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useState("home");
  const [nodeOpen, setNodeOpen] = useState(null);
  const [trustOpen, setTrustOpen] = useState(false);

  let screen;
  if (trustOpen)        screen = <TrustScreen onBack={() => setTrustOpen(false)} />;
  else if (nodeOpen)    screen = <NodeScreen host={nodeOpen} onBack={() => setNodeOpen(null)} />;
  else if (tab === "home")   screen = <HomeScreen onOpenNode={setNodeOpen} onOpenTrust={() => setTrustOpen(true)} />;
  else if (tab === "alerts") screen = <AlertsScreen />;
  else if (tab === "trust")  screen = <TrustScreen onBack={() => setTab("home")} />;
  else if (tab === "travel") screen = <TravelScreen />;

  return (
    <div style={{ padding: 40, display: "grid", placeItems: "center", minHeight: "100vh", background: "#0a0b10" }} data-screen-label="iHN Home · iOS">
      <IOSDevice dark title="iHN Home" width={402} height={874}>
        <div style={{
          display: "flex", flexDirection: "column", height: "100%",
          background: "#0f1117", color: "#e4e6eb",
          fontFamily: "Inter, system-ui, sans-serif",
        }}>
          <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
            {screen}
          </div>
          <IhnTabs active={tab} onChange={(t) => { setTab(t); setNodeOpen(null); setTrustOpen(false); }} />
        </div>
      </IOSDevice>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
