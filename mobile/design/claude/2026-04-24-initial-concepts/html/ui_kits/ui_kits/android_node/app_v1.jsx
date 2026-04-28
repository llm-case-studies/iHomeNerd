/* global React, ReactDOM, AndroidDevice, AIc, AChip, ATopBar, ASection, ACard, AStat, AProgress, ABtn, ARow, ABottomNav */
const { useState } = React;

// ─────────────────────────────────────────────────────────────
// Screen: This node
// ─────────────────────────────────────────────────────────────
const NodeScreen = () => (
  <>
    <ATopBar
      title="pixel-travel-node"
      subtitle="node-class · runtime online · v0.4.2"
      trailing={<AChip tone="ok">online</AChip>}
    />
    <ASection>Hardware</ASection>
    <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <AStat Icon={AIc.Cpu}     label="SoC"     value="Tensor G4"    sub="42°C · nominal" tone="ok" />
      <AStat Icon={AIc.Battery} label="Battery" value="78%"          sub="charging · 2h 14m to full" tone="ok" />
      <AStat Icon={AIc.Disk}    label="Storage" value="9.2 / 128 GB" sub="118.8 GB free" />
      <AStat Icon={AIc.Wifi}    label="Network" value="nerd-ap"      sub="WPA3 · 2 clients" tone="accent" />
    </div>

    <ASection>Runtime</ASection>
    <ACard>
      <ARow
        icon={<AIc.Refresh width={18} height={18} />}
        title="iHomeNerd 0.4.2"
        supporting="Started 42m ago · 2 model packs loaded"
        trailing={<AChip tone="ok" dot={false}>running</AChip>}
      />
      <ARow
        icon={<AIc.Pkg width={18} height={18} />}
        title="gemma3:1b"
        supporting="815 MB · routing · docs"
        trailing={<AChip tone="ok" dot={false}>loaded</AChip>}
      />
      <ARow
        icon={<AIc.Pkg width={18} height={18} />}
        title="whisper-small-int8"
        supporting="465 MB · transcription"
        trailing={<AChip tone="accent" dot={false}>idle</AChip>}
        isLast
      />
    </ACard>

    <ASection>Actions</ASection>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <ABtn variant="outline"><AIc.Refresh width={16} height={16} />Restart runtime</ABtn>
      <ABtn variant="danger"><AIc.Power width={16} height={16} />Stop runtime</ABtn>
    </div>
    <div style={{ height: 32 }} />
  </>
);

// ─────────────────────────────────────────────────────────────
// Screen: Trust (adopted view)
// ─────────────────────────────────────────────────────────────
const TrustScreen = () => (
  <>
    <ATopBar
      title="Trust"
      subtitle="Adopted by Alex's Home."
      trailing={<AChip tone="ok">trusted</AChip>}
    />
    <div style={{ padding: "14px 16px" }}>
      <div style={{
        background: "#1a1d27", border: "1px solid #2e3140", borderRadius: 12,
        padding: 16, display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: "rgba(52,211,153,.10)", border: "1px solid rgba(52,211,153,.20)",
            display: "grid", placeItems: "center", color: "#34d399",
          }}><AIc.Shield width={22} height={22} /></div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Home CA installed</div>
            <div style={{ color: "#8b8fa3", fontSize: 12 }}>Issued 2026-03-18 · chained to this node's cert</div>
          </div>
        </div>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8b8fa3" }}>Home CA fingerprint</div>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 12, letterSpacing: "0.04em",
          background: "#252830", border: "1px solid #2e3140", borderRadius: 6,
          padding: "10px 12px", color: "#e4e6eb",
        }}>SHA256 4C:7E:3B:A9:18:DA:82:B4:9F:12:…:A1:FF</div>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8b8fa3" }}>This node's cert</div>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 12, letterSpacing: "0.04em",
          background: "#252830", border: "1px solid #2e3140", borderRadius: 6,
          padding: "10px 12px", color: "#e4e6eb",
        }}>CN=pixel-travel-node · expires 2027-03-18</div>
      </div>
    </div>

    <ASection>Adoption</ASection>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <ABtn variant="outline"><AIc.QR width={16} height={16} />Show adoption QR</ABtn>
      <ABtn variant="danger">Leave this Home</ABtn>
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────
// Screen: Hotspot
// ─────────────────────────────────────────────────────────────
const HotspotScreen = () => (
  <>
    <ATopBar
      title="Hotspot"
      subtitle="nerd-ap · WPA3 · broadcasting"
      trailing={<AChip tone="ok">up</AChip>}
    />
    <div style={{ padding: "14px 16px" }}>
      <div style={{
        background: "#1a1d27", border: "1px solid #2e3140", borderRadius: 12,
        padding: 18, textAlign: "center",
      }}>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8b8fa3" }}>SSID</div>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 28, fontWeight: 600,
          color: "#e4e6eb", marginTop: 4,
        }}>nerd-ap</div>
        <div style={{ color: "#8b8fa3", fontSize: 12, marginTop: 4 }}>
          192.168.49.1 · DHCP up · 2 of 8 clients
        </div>
      </div>
    </div>

    <ASection>Connected clients · 2</ASection>
    <ACard>
      <ARow
        icon={<AIc.Wifi width={18} height={18} />}
        title="alex-iphone"
        supporting="192.168.49.18 · −48 dBm · 14m"
        trailing={<AChip tone="ok" dot={false}>trusted</AChip>}
      />
      <ARow
        icon={<AIc.Wifi width={18} height={18} />}
        title="alex-macbook"
        supporting="192.168.49.22 · −51 dBm · 3m"
        trailing={<AChip tone="ok" dot={false}>trusted</AChip>}
        isLast
      />
    </ACard>

    <ASection>Upstream</ASection>
    <ACard>
      <ARow title="Tethered via" supporting="cellular · T-Mobile · LTE" trailing={<span style={{ color: "#8b8fa3", fontSize: 13 }}>−94 dBm</span>} />
      <ARow title="Traffic"      supporting="↑ 124 MB  ↓ 312 MB · session" isLast />
    </ACard>

    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <ABtn variant="danger"><AIc.Power width={16} height={16} />Stop hotspot</ABtn>
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────
// Screen: Travel (handoff)
// ─────────────────────────────────────────────────────────────
const TravelScreen = () => (
  <>
    <ATopBar
      title="Travel"
      subtitle="Session running · Alex's Home · guest"
      trailing={<AChip tone="accent">42m</AChip>}
    />
    <div style={{ padding: "14px 16px" }}>
      <div style={{
        background: "#1a1d27", border: "1px solid #2e3140", borderRadius: 12, padding: 18,
      }}>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8b8fa3", marginBottom: 10 }}>Session load</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8b8fa3", marginBottom: 4 }}>
              <span>Compute</span><span style={{ color: "#e4e6eb" }}>38%</span>
            </div>
            <AProgress value={38} tone="ok" />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8b8fa3", marginBottom: 4 }}>
              <span>RAM</span><span style={{ color: "#e4e6eb" }}>5.1 / 12 GB</span>
            </div>
            <AProgress value={42} tone="accent" />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8b8fa3", marginBottom: 4 }}>
              <span>Thermal</span><span style={{ color: "#e4e6eb" }}>42°C</span>
            </div>
            <AProgress value={52} tone="warn" />
          </div>
        </div>
      </div>
    </div>

    <ASection>Handoff</ASection>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <ABtn variant="filled"><AIc.Home width={16} height={16} />Take this Home</ABtn>
      <ABtn variant="tonal">Create my own Home</ABtn>
      <ABtn variant="outline">Stay as guest</ABtn>
      <ABtn variant="danger"><AIc.Power width={16} height={16} />End session</ABtn>
    </div>

    <div style={{ padding: "18px 16px", color: "#8b8fa3", fontSize: 12, lineHeight: 1.55 }}>
      Take this Home installs Alex's Home CA permanently on this node. Create my own Home starts a new trust domain and discards the guest session.
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────
// App shell
// ─────────────────────────────────────────────────────────────
const SCREENS = { node: NodeScreen, trust: TrustScreen, hotspot: HotspotScreen, travel: TravelScreen };

function App() {
  const [tab, setTab] = useState("node");
  const Screen = SCREENS[tab];
  return (
    <div style={{ padding: 40, display: "grid", placeItems: "center", minHeight: "100vh", background: "#0a0b10" }} data-screen-label="iHN Node · Android">
      <AndroidDevice dark width={412} height={892}>
        <div style={{
          display: "flex", flexDirection: "column", height: "100%",
          background: "#0f1117", color: "#e4e6eb",
          fontFamily: "Inter, system-ui, sans-serif",
        }}>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <Screen />
          </div>
          <ABottomNav active={tab} onChange={setTab} />
        </div>
      </AndroidDevice>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
