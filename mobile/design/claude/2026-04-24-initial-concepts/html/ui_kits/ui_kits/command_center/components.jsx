/* global React */
const { useState } = React;

// ───────────────────────────────────────────────────────────────
// Lucide-style inline icons (stroke 1.75, rounded joins)
// Only the ones used here — kept compact.
// ───────────────────────────────────────────────────────────────
const I = {
  Home: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 9-8 9 8v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>,
  Server: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/></svg>,
  Shield: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-4"/></svg>,
  Package: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>,
  Search: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Plane: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>,
  Activity: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12H18l-3 9L9 3l-3 9H2"/></svg>,
  RefreshCcw: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>,
  Power: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>,
  Terminal: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
  Wifi: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>,
  Alert: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>,
  Info: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>,
  Check: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  Cpu: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>,
  Arrow: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  Settings: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.36.14.68.38.92.68"/></svg>,
};

// ───────────────────────────────────────────────────────────────
// Primitives
// ───────────────────────────────────────────────────────────────
const Chip = ({ tone = "neutral", children, dot = true }) => {
  const t = {
    ok:      { bg: "rgba(52,211,153,.10)", bd: "rgba(52,211,153,.20)", fg: "#34d399" },
    warn:    { bg: "rgba(251,191,36,.10)", bd: "rgba(251,191,36,.20)", fg: "#fbbf24" },
    err:     { bg: "rgba(248,113,113,.10)", bd: "rgba(248,113,113,.20)", fg: "#f87171" },
    accent:  { bg: "rgba(79,140,255,.10)", bd: "rgba(79,140,255,.20)", fg: "#4f8cff" },
    neutral: { bg: "#252830", bd: "#2e3140", fg: "#8b8fa3" },
  }[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px",
      borderRadius: 999, fontSize: 11, fontWeight: 500, border: `1px solid ${t.bd}`,
      background: t.bg, color: t.fg,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: t.fg }} />}
      {children}
    </span>
  );
};

const Card = ({ children, style, ...rest }) => (
  <div {...rest} style={{
    background: "#1a1d27", border: "1px solid #2e3140",
    borderRadius: 12, padding: 20, ...style,
  }}>{children}</div>
);

const Btn = ({ variant = "secondary", size = "md", children, ...rest }) => {
  const base = {
    fontFamily: "inherit", fontWeight: 500, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 8,
    borderRadius: size === "sm" ? 6 : 8, transition: "all .15s",
    padding: size === "sm" ? "5px 10px" : "8px 14px",
    fontSize: size === "sm" ? 12 : 13,
  };
  const tones = {
    primary:   { background: "#4f8cff", color: "#fff", border: "1px solid #4f8cff" },
    secondary: { background: "#252830", color: "#e4e6eb", border: "1px solid #2e3140" },
    ghost:     { background: "transparent", color: "#8b8fa3", border: "1px solid transparent" },
    danger:    { background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,.20)" },
  };
  return <button {...rest} style={{ ...base, ...tones[variant] }}>{children}</button>;
};

// ───────────────────────────────────────────────────────────────
// Header + tabs
// ───────────────────────────────────────────────────────────────
const Header = () => (
  <header style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 24px", borderBottom: "1px solid #2e3140", background: "#1a1d27",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 22 }}>🏠</span>
      <h1 style={{
        fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em",
        margin: 0, color: "#e4e6eb",
      }}>iHomeNerd</h1>
      <div style={{ marginLeft: 14 }}>
        <Chip tone="ok">online</Chip>
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#8b8fa3" }}>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}>
        msi-raider-linux · v0.4.2
      </span>
      <I.Settings width={18} height={18} />
    </div>
  </header>
);

const TABS = [
  { id: "home",        label: "Home",        Icon: I.Home },
  { id: "nodes",       label: "Nodes",       Icon: I.Server },
  { id: "trust",       label: "Trust",       Icon: I.Shield },
  { id: "models",      label: "Models",      Icon: I.Package },
  { id: "investigate", label: "Investigate", Icon: I.Search },
  { id: "travel",      label: "Travel",      Icon: I.Plane },
];

const Tabs = ({ active, onChange }) => (
  <nav style={{
    display: "flex", padding: "0 16px", background: "#1a1d27",
    borderBottom: "1px solid #2e3140",
  }}>
    {TABS.map(({ id, label, Icon }) => {
      const isActive = active === id;
      return (
        <button key={id} onClick={() => onChange(id)} style={{
          background: "transparent", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          padding: "16px 20px", fontSize: 13, fontWeight: 500,
          color: isActive ? "#4f8cff" : "#8b8fa3",
          position: "relative", fontFamily: "inherit",
        }}>
          <Icon width={16} height={16} />
          {label}
          {isActive && <div style={{
            position: "absolute", left: 0, right: 0, bottom: -1, height: 2,
            background: "#4f8cff", borderRadius: "2px 2px 0 0",
          }} />}
        </button>
      );
    })}
  </nav>
);

// ───────────────────────────────────────────────────────────────
// Domain cards
// ───────────────────────────────────────────────────────────────
const Label = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase",
    color: "#8b8fa3", marginBottom: 10,
  }}>{children}</div>
);

const Meta = ({ k, v, mono }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
    <span style={{ color: "#8b8fa3" }}>{k}</span>
    <span style={{ color: "#e4e6eb", fontFamily: mono ? "JetBrains Mono, monospace" : "inherit" }}>{v}</span>
  </div>
);

const NodeCard = ({ node }) => (
  <Card style={{ padding: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#e4e6eb" }}>{node.host}</div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#8b8fa3", marginTop: 2 }}>
          {node.ip} · {node.os}
        </div>
      </div>
      <Chip tone={node.stateTone}>{node.state}</Chip>
    </div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      {node.roles.map(r => (
        <span key={r} style={{
          fontSize: 11, padding: "2px 8px", borderRadius: 6,
          background: "rgba(79,140,255,.10)", color: "#4f8cff",
          border: "1px solid rgba(79,140,255,.20)", fontWeight: 500,
        }}>{r}</span>
      ))}
    </div>
    <Meta k="Hardware"  v={node.hw} />
    <Meta k="Models"    v={node.models} mono />
    <Meta k="Uptime"    v={node.uptime} mono />
    <div style={{ display: "flex", gap: 6, marginTop: 10, borderTop: "1px solid #2e3140", paddingTop: 10 }}>
      <Btn size="sm"><I.RefreshCcw width={12} height={12} />Restart</Btn>
      <Btn size="sm"><I.Terminal width={12} height={12} />SSH Doctor</Btn>
      <Btn size="sm" variant="danger">Drain</Btn>
    </div>
  </Card>
);

const AlertRow = ({ tone, title, desc, ts }) => {
  const colors = {
    err:  { bg: "rgba(248,113,113,.06)",  bd: "rgba(248,113,113,.20)",  fg: "#f87171", Ico: I.Alert },
    warn: { bg: "rgba(251,191,36,.06)",   bd: "rgba(251,191,36,.20)",   fg: "#fbbf24", Ico: I.Info },
    ok:   { bg: "rgba(52,211,153,.06)",   bd: "rgba(52,211,153,.20)",   fg: "#34d399", Ico: I.Check },
  }[tone];
  const { Ico } = colors;
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      border: `1px solid ${colors.bd}`, background: colors.bg,
      borderRadius: 10, padding: 12,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        display: "grid", placeItems: "center",
        background: `${colors.fg}22`, color: colors.fg,
      }}><Ico width={14} height={14} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#e4e6eb" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#8b8fa3", marginTop: 2 }}>{desc}</div>
      </div>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#8b8fa3" }}>{ts}</span>
    </div>
  );
};

Object.assign(window, { I, Chip, Card, Btn, Header, Tabs, NodeCard, AlertRow, Label, Meta });
