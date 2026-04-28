/* global React */
// ─────────────────────────────────────────────────────────────
// iHN Home (iOS) — shared primitives
// Tokens follow colors_and_type.css; everything dark by default.
// ─────────────────────────────────────────────────────────────

// Lucide-style icons (stroke 1.75, rounded)
const Ic = {
  Home:     (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 9-8 9 8v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>,
  Shield:   (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-4"/></svg>,
  Bell:     (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>,
  Plane:    (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>,
  Server:   (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/></svg>,
  Chev:     (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>,
  Back:     (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg>,
  Check:    (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
  Refresh:  (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>,
  Power:    (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>,
  Wifi:     (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>,
  Alert:    (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>,
  Info:     (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>,
  Pkg:      (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>,
  QR:       (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20v.01M17 20h4M20 17v4"/></svg>,
};

// ─────────────────────────────────────────────────────────────
// Chip
// ─────────────────────────────────────────────────────────────
const IhnChip = ({ tone = "neutral", children, dot = true }) => {
  const t = {
    ok:      { bg: "rgba(52,211,153,.10)",   bd: "rgba(52,211,153,.20)",   fg: "#34d399" },
    warn:    { bg: "rgba(251,191,36,.10)",   bd: "rgba(251,191,36,.20)",   fg: "#fbbf24" },
    err:     { bg: "rgba(248,113,113,.10)",  bd: "rgba(248,113,113,.20)",  fg: "#f87171" },
    accent:  { bg: "rgba(79,140,255,.10)",   bd: "rgba(79,140,255,.20)",   fg: "#4f8cff" },
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

// ─────────────────────────────────────────────────────────────
// Header bar (iOS large title, left back, right action)
// ─────────────────────────────────────────────────────────────
const IhnHeader = ({ title, subtitle, onBack, trailing }) => (
  <div style={{
    padding: "8px 16px 14px",
    borderBottom: "1px solid #2e3140",
    background: "#0f1117",
  }}>
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      minHeight: 28, color: "#4f8cff", fontSize: 14, fontWeight: 500,
    }}>
      {onBack ? (
        <button onClick={onBack} style={{
          background: "transparent", border: 0, color: "#4f8cff",
          display: "inline-flex", alignItems: "center", gap: 2,
          fontFamily: "inherit", fontSize: 15, cursor: "pointer", padding: 0,
        }}><Ic.Back width={18} height={18} /> Home</button>
      ) : <span style={{ fontSize: 22 }}>🏠</span>}
      <span>{trailing}</span>
    </div>
    <h1 style={{
      margin: "8px 0 0", color: "#e4e6eb",
      fontFamily: "Space Grotesk, system-ui, sans-serif",
      fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em",
    }}>{title}</h1>
    {subtitle && <div style={{ color: "#8b8fa3", fontSize: 13, marginTop: 2 }}>{subtitle}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Sections & rows (grouped list, iOS-inset style in dark)
// ─────────────────────────────────────────────────────────────
const IhnSectionHeader = ({ children }) => (
  <div style={{
    padding: "20px 20px 8px",
    fontSize: 11, fontWeight: 500, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "#8b8fa3",
  }}>{children}</div>
);

const IhnGroup = ({ children }) => (
  <div style={{
    margin: "0 16px", background: "#1a1d27", border: "1px solid #2e3140",
    borderRadius: 12, overflow: "hidden",
  }}>{children}</div>
);

const IhnRow = ({ icon, title, detail, trailing, chevron, onClick, isLast }) => (
  <div onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 14px 14px 14px",
    borderBottom: isLast ? "none" : "1px solid #2e3140",
    cursor: onClick ? "pointer" : "default",
  }}>
    {icon && <div style={{
      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
      background: "#252830", color: "#4f8cff",
      display: "grid", placeItems: "center",
    }}>{icon}</div>}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: "#e4e6eb", fontSize: 15, fontWeight: 500 }}>{title}</div>
      {detail && (
        <div style={{ color: "#8b8fa3", fontSize: 12, marginTop: 2,
          fontFamily: typeof detail === "string" && /[:.]/.test(detail) ? undefined : undefined,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{detail}</div>
      )}
    </div>
    {trailing}
    {chevron && <Ic.Chev width={18} height={18} color="#5a5f72" />}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Big action button
// ─────────────────────────────────────────────────────────────
const IhnBtn = ({ variant = "primary", children, ...rest }) => {
  const styles = {
    primary:   { background: "#4f8cff", color: "#fff",       border: "none" },
    secondary: { background: "#1a1d27", color: "#e4e6eb",    border: "1px solid #2e3140" },
    danger:    { background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,.20)" },
  }[variant];
  return (
    <button {...rest} style={{
      width: "100%", padding: "14px 16px", borderRadius: 12,
      fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      ...styles,
    }}>{children}</button>
  );
};

// ─────────────────────────────────────────────────────────────
// Alert banner row (same vibe as Command Center)
// ─────────────────────────────────────────────────────────────
const IhnAlert = ({ tone = "warn", title, body, ts }) => {
  const t = {
    err:  { bd: "rgba(248,113,113,.20)", bg: "rgba(248,113,113,.06)", fg: "#f87171", Ico: Ic.Alert },
    warn: { bd: "rgba(251,191,36,.20)",  bg: "rgba(251,191,36,.06)",  fg: "#fbbf24", Ico: Ic.Info },
    ok:   { bd: "rgba(52,211,153,.20)",  bg: "rgba(52,211,153,.06)",  fg: "#34d399", Ico: Ic.Check },
  }[tone];
  const { Ico } = t;
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      border: `1px solid ${t.bd}`, background: t.bg,
      borderRadius: 12, padding: 12,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
        display: "grid", placeItems: "center",
        background: `${t.fg}22`, color: t.fg,
      }}><Ico width={14} height={14} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: "#e4e6eb" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#8b8fa3", marginTop: 2, lineHeight: 1.45 }}>{body}</div>
      </div>
      {ts && <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#8b8fa3" }}>{ts}</span>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Tab bar (bottom) — matches Lucide icons + sentence case
// ─────────────────────────────────────────────────────────────
const IhnTabs = ({ active, onChange }) => {
  const tabs = [
    { id: "home",   label: "Home",   Icon: Ic.Home },
    { id: "alerts", label: "Alerts", Icon: Ic.Bell },
    { id: "trust",  label: "Trust",  Icon: Ic.Shield },
    { id: "travel", label: "Travel", Icon: Ic.Plane },
  ];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4,1fr)",
      borderTop: "1px solid #2e3140", background: "rgba(26,29,39,.92)",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      padding: "8px 0 26px",
    }}>
      {tabs.map(({ id, label, Icon }) => {
        const isA = active === id;
        return (
          <button key={id} onClick={() => onChange(id)} style={{
            background: "transparent", border: 0, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: isA ? "#4f8cff" : "#8b8fa3", fontFamily: "inherit",
          }}>
            <Icon width={22} height={22} />
            <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
};

Object.assign(window, {
  Ic, IhnChip, IhnHeader, IhnSectionHeader, IhnGroup, IhnRow,
  IhnBtn, IhnAlert, IhnTabs,
});
