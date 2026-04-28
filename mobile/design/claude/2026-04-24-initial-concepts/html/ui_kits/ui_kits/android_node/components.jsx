/* global React */
// ─────────────────────────────────────────────────────────────
// iHN Node (Android) — Material 3 adapted to iHN tokens
// ─────────────────────────────────────────────────────────────

const AIc = {
  Cpu:     (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/></svg>,
  Battery: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2M6 11h4"/></svg>,
  Disk:    (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>,
  Wifi:    (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>,
  Shield:  (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-4"/></svg>,
  Home:    (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 9-8 9 8v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>,
  Plane:   (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>,
  Power:   (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>,
  QR:      (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20v.01M17 20h4M20 17v4"/></svg>,
  Refresh: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>,
  Pkg:     (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>,
};

// Chip (same semantics as Command Center)
const AChip = ({ tone = "neutral", children, dot = true }) => {
  const t = {
    ok:      { bg: "rgba(52,211,153,.10)", bd: "rgba(52,211,153,.20)", fg: "#34d399" },
    warn:    { bg: "rgba(251,191,36,.10)", bd: "rgba(251,191,36,.20)", fg: "#fbbf24" },
    err:     { bg: "rgba(248,113,113,.10)", bd: "rgba(248,113,113,.20)", fg: "#f87171" },
    accent:  { bg: "rgba(79,140,255,.10)", bd: "rgba(79,140,255,.20)", fg: "#4f8cff" },
    neutral: { bg: "#252830", bd: "#2e3140", fg: "#8b8fa3" },
  }[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500,
      border: `1px solid ${t.bd}`, background: t.bg, color: t.fg,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: 999, background: t.fg }} />}
      {children}
    </span>
  );
};

// Top app bar — Material 3 medium, with centered title + trailing chip
const ATopBar = ({ title, subtitle, trailing }) => (
  <div style={{
    padding: "12px 20px 16px",
    borderBottom: "1px solid #2e3140",
    background: "#1a1d27",
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 22 }}>🏠</div>
      </div>
      {trailing}
    </div>
    <h1 style={{
      margin: "10px 0 0",
      fontFamily: "Space Grotesk, system-ui, sans-serif",
      fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em",
      color: "#e4e6eb",
    }}>{title}</h1>
    {subtitle && <div style={{ color: "#8b8fa3", fontSize: 13, marginTop: 4 }}>{subtitle}</div>}
  </div>
);

// Section header
const ASection = ({ children, action }) => (
  <div style={{
    padding: "22px 20px 8px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: 11, fontWeight: 500, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "#8b8fa3",
  }}>
    <span>{children}</span>
    {action}
  </div>
);

// Card (M3-ish rounded surface; honors iHN radius scale)
const ACard = ({ children, style }) => (
  <div style={{
    margin: "0 16px",
    background: "#1a1d27", border: "1px solid #2e3140",
    borderRadius: 12, padding: 16, ...style,
  }}>{children}</div>
);

// Stat tile — used for CPU / battery / storage / temp grid
const AStat = ({ Icon, label, value, sub, tone = "neutral" }) => {
  const fg = { ok: "#34d399", warn: "#fbbf24", err: "#f87171", accent: "#4f8cff", neutral: "#8b8fa3" }[tone];
  return (
    <div style={{
      background: "#1a1d27", border: "1px solid #2e3140", borderRadius: 12,
      padding: 14, display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "#8b8fa3",
      }}><Icon width={13} height={13} /> {label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: "#e4e6eb", fontFamily: "Space Grotesk, system-ui, sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: fg }}>{sub}</div>}
    </div>
  );
};

// Progress bar (thin, Material 3)
const AProgress = ({ value, tone = "accent" }) => {
  const fg = { ok: "#34d399", warn: "#fbbf24", err: "#f87171", accent: "#4f8cff" }[tone];
  return (
    <div style={{ height: 6, background: "#252830", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: fg, borderRadius: 999 }} />
    </div>
  );
};

// Filled button (M3 filled tonal / filled)
const ABtn = ({ variant = "filled", children, ...rest }) => {
  const st = {
    filled:  { background: "#4f8cff", color: "#fff",       border: "none" },
    tonal:   { background: "rgba(79,140,255,.12)", color: "#4f8cff", border: "1px solid rgba(79,140,255,.20)" },
    outline: { background: "transparent", color: "#e4e6eb", border: "1px solid #2e3140" },
    text:    { background: "transparent", color: "#4f8cff", border: "none" },
    danger:  { background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,.20)" },
  }[variant];
  return (
    <button {...rest} style={{
      width: "100%", padding: "12px 16px", borderRadius: 12,
      fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      ...st,
    }}>{children}</button>
  );
};

// List row, denser than iOS (M3 two-line item)
const ARow = ({ icon, title, supporting, trailing, onClick, isLast }) => (
  <div onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 0",
    borderBottom: isLast ? "none" : "1px solid #2e3140",
    cursor: onClick ? "pointer" : "default",
  }}>
    {icon && <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
      background: "#252830", color: "#4f8cff",
      display: "grid", placeItems: "center",
    }}>{icon}</div>}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: "#e4e6eb", fontSize: 14, fontWeight: 500 }}>{title}</div>
      {supporting && <div style={{ color: "#8b8fa3", fontSize: 12, marginTop: 2 }}>{supporting}</div>}
    </div>
    {trailing}
  </div>
);

// Bottom nav (M3 navigation bar)
const ABottomNav = ({ active, onChange }) => {
  const tabs = [
    { id: "node",    label: "This node", Icon: AIc.Cpu },
    { id: "trust",   label: "Trust",     Icon: AIc.Shield },
    { id: "hotspot", label: "Hotspot",   Icon: AIc.Wifi },
    { id: "travel",  label: "Travel",    Icon: AIc.Plane },
  ];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4,1fr)",
      borderTop: "1px solid #2e3140", background: "rgba(26,29,39,.96)",
      padding: "8px 0 14px",
    }}>
      {tabs.map(({ id, label, Icon }) => {
        const isA = active === id;
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            background: "transparent", border: 0, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            color: isA ? "#e4e6eb" : "#8b8fa3", fontFamily: "inherit", padding: "4px 0",
          }}>
            <div style={{
              padding: "4px 14px", borderRadius: 999,
              background: isA ? "rgba(79,140,255,.14)" : "transparent",
              color: isA ? "#4f8cff" : "#8b8fa3",
              display: "grid", placeItems: "center",
            }}><Icon width={22} height={22} /></div>
            <span style={{ fontSize: 11, fontWeight: isA ? 600 : 500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
};

Object.assign(window, {
  AIc, AChip, ATopBar, ASection, ACard, AStat, AProgress, ABtn, ARow, ABottomNav,
});
