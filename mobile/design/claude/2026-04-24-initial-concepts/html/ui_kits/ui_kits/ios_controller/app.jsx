/* global React, ReactDOM, IOSDevice, Ic, IhnChip, IhnBtn, IhnAlert */
const { useState } = React;

// ─────────────────────────────────────────────────────────────
// iOS v2 — trust-first controller
// A single Home dashboard with trust as the hero surface.
// No generic grouped-list dashboard; every surface has a clear job.
// ─────────────────────────────────────────────────────────────

// Trust hero — the thing the app opens to
const TrustHero = ({ state }) => {
  // state: 'verified' | 'stale' | 'mismatch'
  const cfg = {
    verified: { fg: "#34d399", bd: "rgba(52,211,153,.30)", bg: "rgba(52,211,153,.08)", label: "Home CA verified", sub: "4 h ago · all nodes match" },
    stale:    { fg: "#fbbf24", bd: "rgba(251,191,36,.30)", bg: "rgba(251,191,36,.08)", label: "Verification stale",  sub: "Last check 3 days ago" },
    mismatch: { fg: "#f87171", bd: "rgba(248,113,113,.30)", bg: "rgba(248,113,113,.08)", label: "Trust mismatch",     sub: "1 node doesn't match Home CA" },
  }[state];
  return (
    <div style={{
      margin: "16px", padding: 20, borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.bd}`,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, flexShrink: 0,
          background: `${cfg.fg}18`, border: `1px solid ${cfg.fg}40`,
          display: "grid", placeItems: "center", color: cfg.fg,
          boxShadow: state === "verified" ? `0 0 0 0 ${cfg.fg}40` : "none",
          animation: state === "verified" ? "ihnPulse 2.6s ease-in-out infinite" : "none",
        }}>
          <Ic.Shield width={28} height={28} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "Space Grotesk, system-ui, sans-serif",
            fontSize: 22, fontWeight: 700, color: "#e4e6eb", lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}>{cfg.label}</div>
          <div style={{ color: "#8b8fa3", fontSize: 13, marginTop: 4 }}>{cfg.sub}</div>
        </div>
      </div>
      <div style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.04em",
        background: "rgba(15,17,23,.5)", border: "1px solid #2e3140", borderRadius: 8,
        padding: "10px 12px", color: "#e4e6eb",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>SHA256 4C:7E:3B:…:A1:FF</span>
        <span style={{ color: cfg.fg, fontWeight: 500, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          home CA
        </span>
      </div>
    </div>
  );
};

// Small node cert-state chip row — one line per node
const CertRow = ({ host, state, fp, isLast }) => {
  const cfg = {
    trusted:  { fg: "#34d399", label: "trusted",  tone: "ok" },
    mismatch: { fg: "#f87171", label: "mismatch", tone: "err" },
    stale:    { fg: "#fbbf24", label: "stale",    tone: "warn" },
    needs:    { fg: "#8b8fa3", label: "needs install", tone: "neutral" },
  }[state];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px",
      borderBottom: isLast ? "none" : "1px solid #2e3140",
    }}>
      <div style={{ width: 8, height: 8, borderRadius: 999, background: cfg.fg, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#e4e6eb", fontSize: 14, fontWeight: 500 }}>{host}</div>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#8b8fa3", marginTop: 1,
        }}>{fp}</div>
      </div>
      <IhnChip tone={cfg.tone} dot={false}>{cfg.label}</IhnChip>
    </div>
  );
};

// Quick action tile (grid 2x2)
const QuickTile = ({ Icon, label, sublabel, tone = "neutral", badge, onClick }) => {
  const fg = { ok: "#34d399", warn: "#fbbf24", err: "#f87171", accent: "#4f8cff", neutral: "#8b8fa3" }[tone];
  return (
    <button onClick={onClick} style={{
      background: "#1a1d27", border: "1px solid #2e3140", borderRadius: 16,
      padding: 14, display: "flex", flexDirection: "column", gap: 10,
      cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "inherit",
      position: "relative",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: `${fg}18`, color: fg, border: `1px solid ${fg}30`,
        display: "grid", placeItems: "center",
      }}><Icon width={16} height={16} /></div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e4e6eb" }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: "#8b8fa3", marginTop: 2 }}>{sublabel}</div>}
      </div>
      {badge != null && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          minWidth: 18, height: 18, borderRadius: 999,
          background: "#f87171", color: "#fff",
          fontSize: 10, fontWeight: 600,
          display: "grid", placeItems: "center",
          padding: "0 5px",
        }}>{badge}</div>
      )}
    </button>
  );
};

// Node pill row — a lighter alternative to the grouped-list
const NodePill = ({ host, role, tone, state, cert }) => {
  const c = { ok: "#34d399", warn: "#fbbf24", err: "#f87171", neutral: "#8b8fa3" }[tone];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      background: "#1a1d27", border: "1px solid #2e3140", borderRadius: 14,
    }}>
      <div style={{ width: 10, height: 10, borderRadius: 999, background: c }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ color: "#e4e6eb", fontSize: 14, fontWeight: 600 }}>{host}</span>
          <span style={{ color: "#8b8fa3", fontSize: 11 }}>· {role}</span>
        </div>
        <div style={{ color: "#8b8fa3", fontSize: 11, marginTop: 2 }}>{state}</div>
      </div>
      {cert === "mismatch"
        ? <IhnChip tone="err">cert</IhnChip>
        : <Ic.Chev width={16} height={16} color="#5a5f72" />}
    </div>
  );
};

// Sticky status bar at very top of scroll area
const StickyHeaderBar = ({ home, trustState }) => {
  const toneFg = { verified: "#34d399", stale: "#fbbf24", mismatch: "#f87171" }[trustState];
  const toneLabel = { verified: "trusted", stale: "stale", mismatch: "mismatch" }[trustState];
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 5,
      padding: "56px 16px 10px",
      background: "rgba(15,17,23,0.88)",
      backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: "1px solid rgba(46,49,64,0.6)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>🏠</span>
        <div>
          <div style={{ fontSize: 11, color: "#8b8fa3", letterSpacing: "0.06em", textTransform: "uppercase" }}>Your Home</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#e4e6eb", marginTop: -1 }}>{home}</div>
        </div>
      </div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 10px", borderRadius: 999,
        border: `1px solid ${toneFg}40`, background: `${toneFg}14`, color: toneFg,
        fontSize: 11, fontWeight: 600,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: toneFg }} />
        {toneLabel}
      </div>
    </div>
  );
};

// Large display H (Space Grotesk)
const Eyebrow = ({ children, style }) => (
  <div style={{
    padding: "6px 20px 8px", fontSize: 11, fontWeight: 500,
    letterSpacing: "0.1em", textTransform: "uppercase", color: "#8b8fa3",
    ...style,
  }}>{children}</div>
);

// ─────────────────────────────────────────────────────────────
// Screens
// ─────────────────────────────────────────────────────────────

// Home — the trust dashboard
const HomeScreen = ({ trustState, setScreen }) => (
  <>
    <StickyHeaderBar home="Alex's Home" trustState={trustState} />
    <TrustHero state={trustState} />

    {trustState !== "verified" && (
      <div style={{ padding: "0 16px 12px" }}>
        <IhnBtn variant="primary" onClick={() => setScreen("repair")}>
          {trustState === "mismatch" ? "Re-pair Acer-HL" : "Verify trust now"}
        </IhnBtn>
      </div>
    )}

    <Eyebrow>Quick actions</Eyebrow>
    <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <QuickTile Icon={Ic.QR}      label="Pair new node"    sublabel="Scan install code" tone="accent" onClick={() => setScreen("pair")} />
      <QuickTile Icon={Ic.Bell}    label="Alerts"           sublabel="2 active"           tone="warn"   badge={2} onClick={() => setScreen("alerts")} />
      <QuickTile Icon={Ic.Refresh} label="Verify trust"     sublabel="Re-check all"       tone="ok"     onClick={() => setScreen("trust")} />
      <QuickTile Icon={Ic.Plane}   label="Travel session"   sublabel="Running · 42m"      tone="accent" onClick={() => setScreen("travel")} />
    </div>

    <Eyebrow style={{ marginTop: 4 }}>Nodes · 4 · 3 online</Eyebrow>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <NodePill host="HP-Envy-Ubuntu"   role="gateway"    tone="ok"   state="managed · 12d uptime"      cert="trusted"  />
      <NodePill host="msi-raider-linux" role="llm-worker" tone="ok"   state="managed · RTX 4070"         cert="trusted"  />
      <NodePill host="Acer-HL"          role="voice-worker" tone="err" state="degraded · cert mismatch" cert="mismatch" />
      <NodePill host="pi-garage"        role="candidate"  tone="neutral" state="discovered · awaiting trust" cert="needs" />
    </div>
    <div style={{ height: 20 }} />
  </>
);

// Trust — per-node certs
const TrustScreen = ({ setScreen }) => (
  <>
    <div style={{ padding: "16px 16px 0" }}>
      <button onClick={() => setScreen("home")} style={{
        background: "transparent", border: 0, color: "#4f8cff",
        fontFamily: "inherit", fontSize: 15, cursor: "pointer", padding: 0,
        display: "inline-flex", alignItems: "center", gap: 2,
      }}><Ic.Back width={18} height={18} />Home</button>
    </div>
    <div style={{ padding: "10px 20px 0" }}>
      <h1 style={{
        fontFamily: "Space Grotesk, system-ui, sans-serif", fontSize: 30, fontWeight: 700,
        letterSpacing: "-0.02em", margin: "6px 0 4px", color: "#e4e6eb",
      }}>Trust</h1>
      <div style={{ color: "#8b8fa3", fontSize: 13, maxWidth: 320 }}>
        Trust once per household. Every node's cert chains to the same Home CA.
      </div>
    </div>

    <TrustHero state="mismatch" />

    <Eyebrow>Per-node cert state</Eyebrow>
    <div style={{
      margin: "0 16px", background: "#1a1d27", border: "1px solid #2e3140",
      borderRadius: 14, overflow: "hidden",
    }}>
      <CertRow host="HP-Envy-Ubuntu"   state="trusted"  fp="SHA256 4C:7E:3B:…:A1:FF" />
      <CertRow host="msi-raider-linux" state="trusted"  fp="SHA256 4C:7E:3B:…:A1:FF" />
      <CertRow host="Acer-HL"          state="mismatch" fp="SHA256 9A:BB:11:…:3C:02" />
      <CertRow host="pi-garage"        state="needs"    fp="no cert installed" isLast />
    </div>

    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <IhnBtn variant="primary" onClick={() => setScreen("repair")}>Re-pair Acer-HL</IhnBtn>
      <IhnBtn variant="secondary" onClick={() => setScreen("pair")}>
        <Ic.QR width={16} height={16} />Install CA on pi-garage
      </IhnBtn>
    </div>
    <div style={{ padding: "0 20px 28px", color: "#8b8fa3", fontSize: 12, lineHeight: 1.55 }}>
      A mismatch means the node's cert chain no longer matches the Home CA on file. Re-pair to regenerate and re-trust.
    </div>
  </>
);

// Pair — QR / install
const PairScreen = ({ setScreen }) => (
  <>
    <div style={{ padding: "16px 16px 0" }}>
      <button onClick={() => setScreen("home")} style={{
        background: "transparent", border: 0, color: "#4f8cff",
        fontFamily: "inherit", fontSize: 15, cursor: "pointer", padding: 0,
        display: "inline-flex", alignItems: "center", gap: 2,
      }}><Ic.Back width={18} height={18} />Home</button>
    </div>
    <div style={{ padding: "10px 20px 0" }}>
      <h1 style={{
        fontFamily: "Space Grotesk, system-ui, sans-serif", fontSize: 30, fontWeight: 700,
        letterSpacing: "-0.02em", margin: "6px 0 4px", color: "#e4e6eb",
      }}>Pair new node</h1>
      <div style={{ color: "#8b8fa3", fontSize: 13 }}>
        Scan this code on the new device to install your Home CA.
      </div>
    </div>

    <div style={{ padding: 20, display: "grid", placeItems: "center" }}>
      <div style={{
        width: 240, height: 240, borderRadius: 20,
        background: "#1a1d27", border: "1px solid #2e3140",
        display: "grid", placeItems: "center", padding: 14,
      }}>
        {/* Stylized QR */}
        <svg viewBox="0 0 21 21" width="200" height="200" shapeRendering="crispEdges">
          {(() => {
            const cells = [];
            for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
              const corner =
                (x < 7 && y < 7) ||
                (x > 13 && y < 7) ||
                (x < 7 && y > 13);
              if (corner) continue;
              const seed = (x * 31 + y * 17 + 7) % 11;
              if (seed < 5) cells.push(<rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill="#e4e6eb" />);
            }
            return cells;
          })()}
          {/* Finder patterns */}
          {[[0,0],[14,0],[0,14]].map(([ox, oy], i) => (
            <g key={i}>
              <rect x={ox}   y={oy}   width="7" height="7" fill="#e4e6eb" />
              <rect x={ox+1} y={oy+1} width="5" height="5" fill="#1a1d27" />
              <rect x={ox+2} y={oy+2} width="3" height="3" fill="#e4e6eb" />
            </g>
          ))}
        </svg>
      </div>
    </div>

    <div style={{ padding: "0 16px 6px" }}>
      <div style={{
        background: "#1a1d27", border: "1px solid #2e3140", borderRadius: 12,
        padding: 14, display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8b8fa3" }}>or type the install code</div>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 18, letterSpacing: "0.12em",
          color: "#e4e6eb", fontWeight: 500,
        }}>NERD-8F4K-2QX9</div>
      </div>
    </div>
    <div style={{ padding: "16px" }}>
      <IhnBtn variant="secondary" onClick={() => setScreen("home")}>Done</IhnBtn>
    </div>
  </>
);

// Re-pair — one-flow progress
const RepairScreen = ({ setScreen }) => {
  const steps = [
    { label: "Revoking stale cert", state: "done" },
    { label: "Generating new key on Acer-HL", state: "done" },
    { label: "Signing with Home CA", state: "active" },
    { label: "Verifying chain", state: "pending" },
  ];
  return (
    <>
      <div style={{ padding: "16px 16px 0" }}>
        <button onClick={() => setScreen("trust")} style={{
          background: "transparent", border: 0, color: "#4f8cff",
          fontFamily: "inherit", fontSize: 15, cursor: "pointer", padding: 0,
          display: "inline-flex", alignItems: "center", gap: 2,
        }}><Ic.Back width={18} height={18} />Trust</button>
      </div>
      <div style={{ padding: "10px 20px 0" }}>
        <h1 style={{
          fontFamily: "Space Grotesk, system-ui, sans-serif", fontSize: 30, fontWeight: 700,
          letterSpacing: "-0.02em", margin: "6px 0 4px", color: "#e4e6eb",
        }}>Re-pairing Acer-HL</h1>
        <div style={{ color: "#8b8fa3", fontSize: 13 }}>
          This takes a few seconds. Trust will be re-verified automatically.
        </div>
      </div>
      <div style={{
        margin: 16, padding: 16, borderRadius: 14,
        background: "#1a1d27", border: "1px solid #2e3140",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {steps.map((s, i) => {
          const color = s.state === "done" ? "#34d399" : s.state === "active" ? "#4f8cff" : "#5a5f72";
          return (
            <div key={s.label} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{
                width: 26, height: 26, borderRadius: 999,
                background: `${color}18`, border: `1px solid ${color}40`, color,
                display: "grid", placeItems: "center", flexShrink: 0,
              }}>
                {s.state === "done"   ? <Ic.Check width={14} height={14} /> :
                 s.state === "active" ? <span style={{ width: 8, height: 8, borderRadius: 999, background: color, animation: "ihnPulse 1.4s ease-in-out infinite" }} /> :
                 <span style={{ fontSize: 11 }}>{i + 1}</span>}
              </div>
              <div style={{ color: s.state === "pending" ? "#8b8fa3" : "#e4e6eb", fontSize: 14 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "0 16px" }}>
        <IhnBtn variant="secondary" onClick={() => setScreen("trust")}>Run in background</IhnBtn>
      </div>
    </>
  );
};

// Alerts — flat stack, but grouped by severity
const AlertsScreen = ({ setScreen }) => (
  <>
    <div style={{ padding: "16px 16px 0" }}>
      <button onClick={() => setScreen("home")} style={{
        background: "transparent", border: 0, color: "#4f8cff",
        fontFamily: "inherit", fontSize: 15, cursor: "pointer", padding: 0,
        display: "inline-flex", alignItems: "center", gap: 2,
      }}><Ic.Back width={18} height={18} />Home</button>
    </div>
    <div style={{ padding: "10px 20px 0" }}>
      <h1 style={{
        fontFamily: "Space Grotesk, system-ui, sans-serif", fontSize: 30, fontWeight: 700,
        letterSpacing: "-0.02em", margin: "6px 0 4px", color: "#e4e6eb",
      }}>Alerts</h1>
      <div style={{ color: "#8b8fa3", fontSize: 13 }}>From your Home · last 24 h</div>
    </div>

    <Eyebrow>Blocker</Eyebrow>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <IhnAlert tone="err" title="Trust mismatch on Acer-HL" body="Cert chain no longer matches Home CA. Re-pair from Trust." ts="2m" />
    </div>

    <Eyebrow style={{ marginTop: 16 }}>Warnings</Eyebrow>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <IhnAlert tone="warn" title="Update available" body="iHN 0.4.2 → 0.4.3 on msi-raider-linux. Review before applying." ts="14m" />
      <IhnAlert tone="warn" title="Disk pressure"    body="HP-Envy-Ubuntu: 38 GB free of 480 GB."                             ts="1h" />
    </div>

    <Eyebrow style={{ marginTop: 16 }}>Resolved</Eyebrow>
    <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
      <IhnAlert tone="ok" title="Update applied" body="gateway → 0.4.2 · trust re-verified." ts="8h" />
    </div>
  </>
);

// Travel — session handoff mini-view
const TravelScreen = ({ setScreen }) => (
  <>
    <div style={{ padding: "16px 16px 0" }}>
      <button onClick={() => setScreen("home")} style={{
        background: "transparent", border: 0, color: "#4f8cff",
        fontFamily: "inherit", fontSize: 15, cursor: "pointer", padding: 0,
        display: "inline-flex", alignItems: "center", gap: 2,
      }}><Ic.Back width={18} height={18} />Home</button>
    </div>
    <div style={{ padding: "10px 20px 0" }}>
      <h1 style={{
        fontFamily: "Space Grotesk, system-ui, sans-serif", fontSize: 30, fontWeight: 700,
        letterSpacing: "-0.02em", margin: "6px 0 4px", color: "#e4e6eb",
      }}>Travel session</h1>
      <div style={{ color: "#8b8fa3", fontSize: 13 }}>pixel-travel-node · tethered · 42 m</div>
    </div>

    <div style={{
      margin: 16, padding: 18, borderRadius: 16,
      background: "rgba(79,140,255,.08)", border: "1px solid rgba(79,140,255,.20)",
    }}>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4f8cff", fontWeight: 600 }}>Guest session</div>
      <div style={{
        fontFamily: "Space Grotesk, system-ui, sans-serif", fontSize: 20, fontWeight: 600,
        color: "#e4e6eb", marginTop: 6, letterSpacing: "-0.01em",
      }}>Connected to Alex's Home</div>
      <div style={{ color: "#8b8fa3", fontSize: 12, marginTop: 4 }}>
        This node is borrowing your Home's trust. Ending the session clears it.
      </div>
    </div>

    <Eyebrow>Handoff</Eyebrow>
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <IhnBtn variant="primary">Take this Home</IhnBtn>
      <IhnBtn variant="secondary">Create my own Home</IhnBtn>
      <IhnBtn variant="danger"><Ic.Power width={16} height={16} />End session</IhnBtn>
    </div>
    <div style={{ padding: "14px 20px 28px", color: "#8b8fa3", fontSize: 12, lineHeight: 1.55 }}>
      Take this Home installs Alex's Home CA permanently on this node. Create my own Home starts a fresh trust domain.
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────
// App shell
// ─────────────────────────────────────────────────────────────
function App() {
  const [screen, setScreen] = useState("home");
  const [trustState, setTrustState] = useState("mismatch");

  const render = () => {
    switch (screen) {
      case "home":   return <HomeScreen   trustState={trustState} setScreen={setScreen} />;
      case "trust":  return <TrustScreen  setScreen={setScreen} />;
      case "pair":   return <PairScreen   setScreen={setScreen} />;
      case "repair": return <RepairScreen setScreen={(s) => { if (s === "trust") setTrustState("verified"); setScreen(s); }} />;
      case "alerts": return <AlertsScreen setScreen={setScreen} />;
      case "travel": return <TravelScreen setScreen={setScreen} />;
      default:       return <HomeScreen   trustState={trustState} setScreen={setScreen} />;
    }
  };

  return (
    <div style={{ padding: 40, display: "grid", placeItems: "center", minHeight: "100vh", background: "#0a0b10" }} data-screen-label={`iHN Home · iOS · ${screen}`}>
      <style>{`
        @keyframes ihnPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
      `}</style>
      <IOSDevice dark width={402} height={874}>
        <div style={{
          display: "flex", flexDirection: "column", height: "100%",
          background: "#0f1117", color: "#e4e6eb",
          fontFamily: "Inter, system-ui, sans-serif",
          overflowY: "auto",
        }}>
          {render()}
        </div>
      </IOSDevice>

      {/* Trust-state simulator — only on home */}
      {screen === "home" && (
        <div style={{
          position: "fixed", left: 24, bottom: 24, zIndex: 30,
          display: "flex", gap: 6, padding: 6,
          background: "#1a1d27", border: "1px solid #2e3140", borderRadius: 999,
          fontFamily: "Inter, system-ui, sans-serif",
        }}>
          {["verified", "stale", "mismatch"].map(s => (
            <button key={s} onClick={() => setTrustState(s)} style={{
              background: trustState === s ? "#4f8cff" : "transparent",
              color: trustState === s ? "#fff" : "#8b8fa3",
              border: 0, borderRadius: 999, padding: "6px 12px",
              fontSize: 11, fontWeight: 500, cursor: "pointer",
              fontFamily: "inherit", textTransform: "capitalize",
            }}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
