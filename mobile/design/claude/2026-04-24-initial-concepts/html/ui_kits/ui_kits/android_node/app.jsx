/* global React, ReactDOM, AndroidDevice, AIc, AChip, ASection, ACard, AStat, AProgress, ABtn, ARow, ABottomNav */
const { useState } = React;

// ─────────────────────────────────────────────────────────────
// Android v2 — portable host. This phone HOSTS a runtime.
// Hero is the :17777 host card + hotspot + mode toggle.
// ─────────────────────────────────────────────────────────────

const ModeToggle = ({ mode, onChange }) => (
  <div style={{
    display: "inline-flex", padding: 4, gap: 4,
    background: "#1a1d27", border: "1px solid #2e3140", borderRadius: 999,
  }}>
    {[
      { id: "travel",   label: "Travel" },
      { id: "personal", label: "Personal" },
    ].map(m => {
      const on = mode === m.id;
      return (
        <button key={m.id} onClick={() => onChange(m.id)} style={{
          background: on ? "#4f8cff" : "transparent",
          color: on ? "#fff" : "#8b8fa3",
          border: 0, borderRadius: 999, padding: "6px 14px",
          fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>{m.label}</button>
      );
    })}
  </div>
);

// The hero: host card shows :17777 URL, clients, copy / open buttons
const HostHero = ({ mode }) => (
  <div style={{
    margin: "14px 16px", padding: 20, borderRadius: 20,
    background: "linear-gradient(180deg, rgba(79,140,255,.10), rgba(79,140,255,.02))",
    border: "1px solid rgba(79,140,255,.25)",
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4f8cff", fontWeight: 600 }}>
          Hosting Command Center
        </div>
        <div style={{
          fontFamily: "Space Grotesk, system-ui, sans-serif", fontSize: 22, fontWeight: 700,
          color: "#e4e6eb", marginTop: 4, letterSpacing: "-0.01em",
        }}>pixel-travel-node</div>
      </div>
      <AChip tone="ok">online</AChip>
    </div>

    <div style={{
      marginTop: 14, padding: "12px 14px",
      background: "rgba(15,17,23,.6)", border: "1px solid #2e3140", borderRadius: 10,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <AIc.Wifi width={16} height={16} color="#4f8cff" />
      <div style={{ flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#e4e6eb" }}>
        https://192.168.49.1:17777
      </div>
      <button style={{
        background: "#4f8cff", border: 0, borderRadius: 8, color: "#fff",
        padding: "6px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
      }}>Open</button>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 12 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#e4e6eb", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>2</div>
        <div style={{ fontSize: 11, color: "#8b8fa3", marginTop: 2 }}>clients</div>
      </div>
      <div style={{ textAlign: "center", borderLeft: "1px solid #2e3140", borderRight: "1px solid #2e3140" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#e4e6eb", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>
          {mode === "travel" ? "42m" : "12d"}
        </div>
        <div style={{ fontSize: 11, color: "#8b8fa3", marginTop: 2 }}>uptime</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#34d399", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>3</div>
        <div style={{ fontSize: 11, color: "#8b8fa3", marginTop: 2 }}>models</div>
      </div>
    </div>
  </div>
);

// Hotspot card — prominent in travel mode
const HotspotCard = () => (
  <div style={{
    margin: "0 16px", padding: 16, borderRadius: 16,
    background: "#1a1d27", border: "1px solid #2e3140",
    display: "flex", flexDirection: "column", gap: 12,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.25)",
          color: "#34d399", display: "grid", placeItems: "center",
        }}><AIc.Wifi width={18} height={18} /></div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#e4e6eb" }}>Hotspot up</div>
          <div style={{ fontSize: 12, color: "#8b8fa3" }}>WPA3 · 2.4 + 5 GHz</div>
        </div>
      </div>
      <AChip tone="ok" dot={false}>broadcasting</AChip>
    </div>
    <div style={{
      fontFamily: "JetBrains Mono, monospace", fontSize: 22, fontWeight: 600,
      color: "#e4e6eb", letterSpacing: "0.02em",
    }}>nerd-ap</div>
    <div style={{ fontSize: 12, color: "#8b8fa3" }}>
      Anyone on this network can reach the Command Center if they trust your Home CA.
    </div>
  </div>
);

// Trust strip — small but persistent
const TrustStrip = ({ state, onTap }) => {
  const cfg = {
    trusted:  { fg: "#34d399", label: "Trusted",  sub: "Adopted by Alex's Home" },
    stale:    { fg: "#fbbf24", label: "Stale",    sub: "Re-verify with the Home" },
    mismatch: { fg: "#f87171", label: "Mismatch", sub: "Re-pair required" },
    unadopted:{ fg: "#8b8fa3", label: "Unadopted", sub: "Not part of any Home yet" },
  }[state];
  return (
    <button onClick={onTap} style={{
      margin: "0 16px", padding: "12px 14px",
      background: "transparent", border: `1px solid ${cfg.fg}40`,
      borderRadius: 12, display: "flex", alignItems: "center", gap: 12,
      cursor: "pointer", fontFamily: "inherit", color: "inherit", textAlign: "left",
      width: "calc(100% - 32px)",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${cfg.fg}18`, color: cfg.fg, border: `1px solid ${cfg.fg}30`,
        display: "grid", placeItems: "center",
      }}><AIc.Shield width={16} height={16} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e6eb" }}>{cfg.label}</div>
        <div style={{ fontSize: 11, color: "#8b8fa3", marginTop: 1 }}>{cfg.sub}</div>
      </div>
      <span style={{ fontSize: 11, color: cfg.fg, fontWeight: 600 }}>OPEN →</span>
    </button>
  );
};

// Eyebrow
const Eyebrow = ({ children }) => (
  <div style={{
    padding: "20px 20px 10px", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.1em", textTransform: "uppercase", color: "#8b8fa3",
  }}>{children}</div>
);

// ─────────────────────────────────────────────────────────────
// Screens
// ─────────────────────────────────────────────────────────────

const NodeScreen = ({ mode, setMode, setTab }) => (
  <>
    <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>🏠</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#e4e6eb" }}>iHN Node</span>
      </div>
      <ModeToggle mode={mode} onChange={setMode} />
    </div>

    <HostHero mode={mode} />

    {mode === "travel" && <HotspotCard />}

    <Eyebrow>This device</Eyebrow>
    <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <AStat Icon={AIc.Cpu}     label="SoC"      value="Tensor G4"    sub="42°C · nominal" tone="ok" />
      <AStat Icon={AIc.Battery} label="Battery"  value="78%"          sub="charging" tone="ok" />
      <AStat Icon={AIc.Disk}    label="Storage"  value="9.2 / 128 GB" sub="118.8 GB free" />
      <AStat Icon={AIc.Pkg}     label="Packs"    value="3"            sub="2 loaded · 1 idle" tone="accent" />
    </div>

    <Eyebrow>Quick actions</Eyebrow>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <ABtn variant="filled"><AIc.QR width={16} height={16} />Show QR to pair</ABtn>
      <ABtn variant="tonal"><AIc.Wifi width={16} height={16} />Open Command Center</ABtn>
      <ABtn variant="outline"><AIc.Refresh width={16} height={16} />Restart runtime</ABtn>
    </div>

    <Eyebrow>Trust</Eyebrow>
    <TrustStrip state="trusted" onTap={() => setTab("trust")} />

    <div style={{ height: 28 }} />
  </>
);

const TrustScreen = () => (
  <>
    <div style={{ padding: "14px 20px 0" }}>
      <h1 style={{
        fontFamily: "Space Grotesk, system-ui, sans-serif", fontSize: 26, fontWeight: 700,
        letterSpacing: "-0.01em", margin: 0, color: "#e4e6eb",
      }}>Trust</h1>
      <div style={{ color: "#8b8fa3", fontSize: 13, marginTop: 4 }}>
        Adopted by Alex's Home. This node chains to their Home CA.
      </div>
    </div>

    <div style={{
      margin: "16px", padding: 18, borderRadius: 16,
      background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.20)",
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "rgba(52,211,153,.14)", border: "1px solid rgba(52,211,153,.30)",
          color: "#34d399", display: "grid", placeItems: "center",
        }}><AIc.Shield width={24} height={24} /></div>
        <div>
          <div style={{
            fontFamily: "Space Grotesk, system-ui, sans-serif", fontSize: 18, fontWeight: 700,
            color: "#e4e6eb",
          }}>Trust chain valid</div>
          <div style={{ color: "#8b8fa3", fontSize: 12, marginTop: 2 }}>Verified 4h ago</div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8b8fa3", marginBottom: 6 }}>Home CA fingerprint</div>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 12, letterSpacing: "0.04em",
          background: "rgba(15,17,23,.5)", border: "1px solid #2e3140", borderRadius: 6,
          padding: "10px 12px", color: "#e4e6eb",
        }}>SHA256 4C:7E:3B:A9:18:DA:82:B4:9F:12:…:A1:FF</div>
      </div>
      <div>
        <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8b8fa3", marginBottom: 6 }}>This node's cert</div>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 12, letterSpacing: "0.04em",
          background: "rgba(15,17,23,.5)", border: "1px solid #2e3140", borderRadius: 6,
          padding: "10px 12px", color: "#e4e6eb",
        }}>CN=pixel-travel-node · expires 2027-03-18</div>
      </div>
    </div>

    <Eyebrow>Cert states in use</Eyebrow>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        { label: "trusted",       tone: "ok",      desc: "Cert matches the Home CA on file." },
        { label: "stale",         tone: "warn",    desc: "Chain valid, but not re-verified recently." },
        { label: "mismatch",      tone: "err",     desc: "Cert no longer chains to Home CA. Re-pair." },
        { label: "needs install", tone: "neutral", desc: "Node has no Home CA yet." },
      ].map(s => (
        <div key={s.label} style={{
          padding: "10px 12px", borderRadius: 10,
          background: "#1a1d27", border: "1px solid #2e3140",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <AChip tone={s.tone} dot={false}>{s.label}</AChip>
          <span style={{ color: "#8b8fa3", fontSize: 12 }}>{s.desc}</span>
        </div>
      ))}
    </div>

    <Eyebrow>Actions</Eyebrow>
    <div style={{ padding: "0 16px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
      <ABtn variant="tonal"><AIc.QR width={16} height={16} />Show adoption QR</ABtn>
      <ABtn variant="outline"><AIc.Refresh width={16} height={16} />Re-verify now</ABtn>
      <ABtn variant="danger">Leave this Home</ABtn>
    </div>
  </>
);

const HotspotScreen = () => (
  <>
    <div style={{ padding: "14px 20px 0" }}>
      <h1 style={{
        fontFamily: "Space Grotesk, system-ui, sans-serif", fontSize: 26, fontWeight: 700,
        letterSpacing: "-0.01em", margin: 0, color: "#e4e6eb",
      }}>Hotspot</h1>
      <div style={{ color: "#8b8fa3", fontSize: 13, marginTop: 4 }}>
        Clients see iHomeNerd at https://192.168.49.1:17777
      </div>
    </div>

    <div style={{
      margin: 16, padding: 22, borderRadius: 20,
      background: "#1a1d27", border: "1px solid #2e3140",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8b8fa3" }}>SSID · WPA3</div>
      <div style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: 30, fontWeight: 600,
        color: "#e4e6eb", marginTop: 8,
      }}>nerd-ap</div>
      <div style={{ color: "#34d399", fontSize: 12, marginTop: 6, fontWeight: 500 }}>
        ● broadcasting · 2 of 8 clients
      </div>
    </div>

    <Eyebrow>Connected clients</Eyebrow>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      {[
        { host: "alex-iphone",  ip: "192.168.49.18", rssi: "−48 dBm", dur: "14m", trust: "trusted" },
        { host: "alex-macbook", ip: "192.168.49.22", rssi: "−51 dBm", dur: "3m",  trust: "trusted" },
      ].map(c => (
        <div key={c.host} style={{
          padding: 12, borderRadius: 12,
          background: "#1a1d27", border: "1px solid #2e3140",
          display: "flex", gap: 12, alignItems: "center",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "#252830", color: "#4f8cff",
            display: "grid", placeItems: "center",
          }}><AIc.Wifi width={16} height={16} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e4e6eb" }}>{c.host}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#8b8fa3", marginTop: 1 }}>
              {c.ip} · {c.rssi} · {c.dur}
            </div>
          </div>
          <AChip tone="ok" dot={false}>{c.trust}</AChip>
        </div>
      ))}
    </div>

    <Eyebrow>Upstream</Eyebrow>
    <ACard>
      <ARow title="Tethered via" supporting="cellular · T-Mobile LTE" trailing={<span style={{ color: "#8b8fa3", fontSize: 13 }}>−94 dBm</span>} />
      <ARow title="Traffic"      supporting="↑ 124 MB  ↓ 312 MB · session" isLast />
    </ACard>

    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <ABtn variant="danger"><AIc.Power width={16} height={16} />Stop hotspot</ABtn>
    </div>
  </>
);

const HandoffScreen = () => (
  <>
    <div style={{ padding: "14px 20px 0" }}>
      <h1 style={{
        fontFamily: "Space Grotesk, system-ui, sans-serif", fontSize: 26, fontWeight: 700,
        letterSpacing: "-0.01em", margin: 0, color: "#e4e6eb",
      }}>Handoff</h1>
      <div style={{ color: "#8b8fa3", fontSize: 13, marginTop: 4 }}>
        You're running a guest session borrowing Alex's Home trust.
      </div>
    </div>

    <div style={{
      margin: 16, padding: 20, borderRadius: 18,
      background: "rgba(79,140,255,.08)", border: "1px solid rgba(79,140,255,.25)",
    }}>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4f8cff", fontWeight: 600 }}>Current session</div>
      <div style={{
        fontFamily: "Space Grotesk, system-ui, sans-serif", fontSize: 20, fontWeight: 700,
        color: "#e4e6eb", marginTop: 4, letterSpacing: "-0.01em",
      }}>Guest at Alex's Home · 42m</div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "#8b8fa3" }}>Compute</div>
          <AProgress value={38} tone="ok" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#8b8fa3" }}>RAM</div>
          <AProgress value={42} tone="accent" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#8b8fa3" }}>Thermal</div>
          <AProgress value={52} tone="warn" />
        </div>
      </div>
    </div>

    <Eyebrow>What happens next</Eyebrow>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        padding: 14, borderRadius: 14,
        background: "#1a1d27", border: "1px solid #2e3140",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e4e6eb" }}>Take this Home</div>
        <div style={{ fontSize: 12, color: "#8b8fa3", marginTop: 4, lineHeight: 1.5 }}>
          Installs Alex's Home CA permanently. This node becomes a managed member of Alex's Home.
        </div>
        <div style={{ marginTop: 10 }}><ABtn variant="filled"><AIc.Home width={16} height={16} />Take this Home</ABtn></div>
      </div>
      <div style={{
        padding: 14, borderRadius: 14,
        background: "#1a1d27", border: "1px solid #2e3140",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e4e6eb" }}>Create my own Home</div>
        <div style={{ fontSize: 12, color: "#8b8fa3", marginTop: 4, lineHeight: 1.5 }}>
          Starts a fresh trust domain owned by this node. Discards the guest session.
        </div>
        <div style={{ marginTop: 10 }}><ABtn variant="tonal">Create my own Home</ABtn></div>
      </div>
      <div style={{
        padding: 14, borderRadius: 14,
        background: "#1a1d27", border: "1px solid rgba(248,113,113,.20)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e4e6eb" }}>End session</div>
        <div style={{ fontSize: 12, color: "#8b8fa3", marginTop: 4, lineHeight: 1.5 }}>
          Drops borrowed trust. This node reverts to unadopted.
        </div>
        <div style={{ marginTop: 10 }}><ABtn variant="danger"><AIc.Power width={16} height={16} />End session</ABtn></div>
      </div>
    </div>
    <div style={{ height: 28 }} />
  </>
);

// ─────────────────────────────────────────────────────────────
// App shell
// ─────────────────────────────────────────────────────────────
const SCREENS = {
  node:    (p) => <NodeScreen    {...p} />,
  trust:   (p) => <TrustScreen   {...p} />,
  hotspot: (p) => <HotspotScreen {...p} />,
  travel:  (p) => <HandoffScreen {...p} />,
};

function App() {
  const [tab, setTab] = useState("node");
  const [mode, setMode] = useState("travel");
  const Screen = SCREENS[tab];
  return (
    <div style={{ padding: 40, display: "grid", placeItems: "center", minHeight: "100vh", background: "#0a0b10" }} data-screen-label={`iHN Node · Android · ${tab}`}>
      <AndroidDevice dark width={412} height={892}>
        <div style={{
          display: "flex", flexDirection: "column", height: "100%",
          background: "#0f1117", color: "#e4e6eb",
          fontFamily: "Inter, system-ui, sans-serif",
        }}>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <Screen mode={mode} setMode={setMode} setTab={setTab} />
          </div>
          <ABottomNav active={tab} onChange={setTab} />
        </div>
      </AndroidDevice>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
