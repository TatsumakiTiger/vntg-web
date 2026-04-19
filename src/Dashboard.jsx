import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://vntg-api-production.up.railway.app";

/* ── Agent icon colors for visual flair ── */
const AGENT_COLORS = {
  Jett: "#89CFF0", Reyna: "#C084FC", Raze: "#FB923C", Phoenix: "#F97316",
  Neon: "#22D3EE", Yoru: "#6366F1", Iso: "#A78BFA", Sage: "#34D399",
  Skye: "#4ADE80", Killjoy: "#FACC15", Cypher: "#94A3B8", Chamber: "#F59E0B",
  Deadlock: "#78716C", Gekko: "#A3E635", Fade: "#64748B", Sova: "#3B82F6",
  Breach: "#EF4444", KAYO: "#6B7280", Tejo: "#D97706", Omen: "#7C3AED",
  Brimstone: "#DC2626", Viper: "#16A34A", Astra: "#A855F7", Harbor: "#0EA5E9",
  Clove: "#EC4899", Miks: "#F472B6", Vyse: "#8B5CF6", Waylay: "#10B981",
  Veto: "#E11D48",
};

const ROLE_COLORS = {
  Duelist: "#EF4444", Controller: "#A855F7", Sentinel: "#22D3EE",
  Initiator: "#4ADE80",
};

const AGENT_ROLES = {
  Jett: "Duelist", Reyna: "Duelist", Raze: "Duelist", Phoenix: "Duelist",
  Neon: "Duelist", Yoru: "Duelist", Iso: "Duelist", Waylay: "Duelist",
  Sage: "Sentinel", Killjoy: "Sentinel", Cypher: "Sentinel",
  Chamber: "Sentinel", Deadlock: "Sentinel", Vyse: "Sentinel",
  Gekko: "Initiator", Fade: "Initiator", Sova: "Initiator",
  Breach: "Initiator", KAYO: "Initiator", Tejo: "Initiator",
  Omen: "Controller", Brimstone: "Controller", Viper: "Controller",
  Astra: "Controller", Harbor: "Controller", Clove: "Controller",
  Miks: "Controller", Veto: "Controller", Skye: "Initiator",
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState("");
  const [filterMap, setFilterMap] = useState("");
  const [filterPlayer, setFilterPlayer] = useState("");
  const [activeTab, setActiveTab] = useState("proview");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /* ── Auth ── */
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      localStorage.setItem("vntg_session", tokenFromUrl);
      window.history.replaceState({}, "", "/dashboard");
    }

    const token = tokenFromUrl || localStorage.getItem("vntg_session");
    if (!token) { navigate("/"); return; }

    fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setUser(data); setLoading(false); })
      .catch(() => { localStorage.removeItem("vntg_session"); navigate("/"); });
  }, []);

  /* ── Fetch videos ── */
  useEffect(() => {
    fetch(`${API_URL}/api/videos`)
      .then((r) => r.json())
      .then((data) => { setVideos(data); setVideosLoading(false); })
      .catch(() => setVideosLoading(false));
  }, []);

  /* ── Derived filter options ── */
  const agents = useMemo(() => [...new Set(videos.map((v) => v.agent))].sort(), [videos]);
  const maps = useMemo(() => [...new Set(videos.map((v) => v.map))].sort(), [videos]);
  const players = useMemo(() => [...new Set(videos.map((v) => v.player))].sort(), [videos]);

  const filtered = useMemo(() => {
    return videos.filter((v) => {
      if (filterAgent && v.agent !== filterAgent) return false;
      if (filterMap && v.map !== filterMap) return false;
      if (filterPlayer && v.player !== filterPlayer) return false;
      return true;
    });
  }, [videos, filterAgent, filterMap, filterPlayer]);

  function handleLogout() {
    localStorage.removeItem("vntg_session");
    navigate("/");
  }

  function clearFilters() {
    setFilterAgent("");
    setFilterMap("");
    setFilterPlayer("");
  }

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingPulse} />
        <span style={styles.loadingText}>Ładowanie...</span>
      </div>
    );
  }

  const displayName = user.global_name || user.username;
  const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1a1a2e&color=fff&size=128&bold=true&format=svg`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #050507; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
      `}</style>

      <div style={styles.root}>
        {/* ── Ambient glow ── */}
        <div style={styles.ambientGlow} />

        {/* ── Top bar ── */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.logo}>VANTAGE</span>
            <span style={styles.logoBeta}>BETA</span>
          </div>
          <div style={styles.headerRight}>
            <img src={avatarUrl} alt="" style={styles.headerAvatar} />
            <span style={styles.headerName}>{displayName}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Wyloguj
            </button>
          </div>
        </header>

        {/* ── Tab bar ── */}
        <nav style={styles.tabBar}>
          {[
            { id: "proview", label: "ProView" },
            { id: "profile", label: "Profil" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
            >
              {tab.label}
              {activeTab === tab.id && <div style={styles.tabIndicator} />}
            </button>
          ))}
        </nav>

        {/* ── Content ── */}
        <main style={styles.main}>
          {activeTab === "proview" && (
            <div style={{ animation: "fadeUp 0.4s ease-out" }}>
              {/* Filters */}
              <div style={styles.filtersRow}>
                <div style={styles.filterGroup}>
                  <Select
                    value={filterAgent}
                    onChange={setFilterAgent}
                    placeholder="Agent"
                    options={agents}
                  />
                  <Select
                    value={filterMap}
                    onChange={setFilterMap}
                    placeholder="Mapa"
                    options={maps}
                  />
                  <Select
                    value={filterPlayer}
                    onChange={setFilterPlayer}
                    placeholder="Gracz"
                    options={players}
                  />
                  {(filterAgent || filterMap || filterPlayer) && (
                    <button onClick={clearFilters} style={styles.clearBtn}>
                      ✕ Wyczyść
                    </button>
                  )}
                </div>
                <span style={styles.resultCount}>
                  {filtered.length} {filtered.length === 1 ? "VOD" : "VODów"}
                </span>
              </div>

              {/* Grid */}
              {videosLoading ? (
                <div style={styles.gridSkeleton}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} style={styles.skeletonCard} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>🎬</span>
                  <p style={styles.emptyTitle}>Brak VODów</p>
                  <p style={styles.emptyDesc}>
                    {videos.length === 0
                      ? "VODy pojawią się tu automatycznie gdy VMonitor je wykryje."
                      : "Zmień filtry żeby zobaczyć więcej wyników."}
                  </p>
                </div>
              ) : (
                <div style={styles.grid}>
                  {filtered.map((v, i) => (
                    <VodCard key={v.video_id} video={v} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div style={{ animation: "fadeUp 0.4s ease-out" }}>
              <ProfileCard user={user} />
            </div>
          )}
        </main>
      </div>
    </>
  );
}

/* ── VOD Card ── */
function VodCard({ video, index }) {
  const [hovered, setHovered] = useState(false);
  const role = AGENT_ROLES[video.agent] || "Duelist";
  const roleColor = ROLE_COLORS[role] || "#fff";
  const agentColor = AGENT_COLORS[video.agent] || "#888";

  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.video_id}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...styles.card,
        animationDelay: `${Math.min(index * 0.05, 0.3)}s`,
        transform: hovered ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
        borderColor: hovered ? `${agentColor}33` : "rgba(255,255,255,0.06)",
        boxShadow: hovered ? `0 8px 32px ${agentColor}15, 0 0 0 1px ${agentColor}22` : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Map + Agent display (replaces YouTube thumbnail) */}
      <div
        style={{
          ...styles.thumbWrap,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          background: `linear-gradient(135deg, ${agentColor}14 0%, rgba(10,10,15,0.95) 100%)`,
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#fff",
            lineHeight: 1,
          }}
        >
          {video.map}
        </span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: agentColor,
            lineHeight: 1,
          }}
        >
          {video.agent}
        </span>
      </div>

      {/* Info */}
      <div style={styles.cardBody}>
        <div style={styles.cardTop}>
          <span style={styles.playerName}>{video.player}</span>
          <span style={{ ...styles.rolePill, background: `${roleColor}18`, color: roleColor }}>
            {role}
          </span>
        </div>
        {video.channel && (
          <div style={styles.cardMeta}>
            <span style={styles.metaItem}>📺 {video.channel}</span>
          </div>
        )}
      </div>
    </a>
  );
}

/* ── Profile Card ── */
function ProfileCard({ user }) {
  const displayName = user.global_name || user.username;
  const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1a1a2e&color=fff&size=128&bold=true&format=svg`;

  return (
    <div style={styles.profileCard}>
      <div style={styles.profileHeader}>
        <div style={styles.profileAvatarWrap}>
          <img src={avatarUrl} alt="" style={styles.profileAvatar} />
          <div style={styles.profileAvatarRing} />
        </div>
        <div>
          <h2 style={styles.profileName}>{displayName}</h2>
          <p style={styles.profileUsername}>@{user.username}</p>
        </div>
      </div>
      <div style={styles.profileDivider} />
      <div style={styles.profileFields}>
        <ProfileField label="Email" value={user.email || "—"} />
        <ProfileField label="Discord ID" value={user.id} />
        <ProfileField label="Dołączył" value={user.created_at ? new Date(user.created_at).toLocaleDateString("pl-PL") : "—"} />
        <ProfileField label="Ostatnie logowanie" value={user.last_login ? new Date(user.last_login).toLocaleDateString("pl-PL") : "—"} />
      </div>
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div style={styles.profileField}>
      <span style={styles.profileLabel}>{label}</span>
      <span style={styles.profileValue}>{value}</span>
    </div>
  );
}

/* ── Select component ── */
function Select({ value, onChange, placeholder, options }) {
  const optionStyle = { background: "#111117", color: "#fff" };
  return (
    <div style={styles.selectWrap}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...styles.select,
          color: value ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
          paddingRight: value ? 32 : 14,
        }}
      >
        <option value="" style={optionStyle}>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt} style={optionStyle}>{opt}</option>
        ))}
      </select>
      {value && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
          style={styles.selectClearBtn}
          aria-label={`Wyczyść filtr ${placeholder}`}
          title="Wyczyść"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Styles
   ══════════════════════════════════════════ */
const styles = {
  root: {
    minHeight: "100vh",
    background: "#050507",
    fontFamily: "'Outfit', sans-serif",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
  },
  ambientGlow: {
    position: "fixed",
    top: -200,
    right: -200,
    width: 600,
    height: 600,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
    animation: "glow 8s ease-in-out infinite",
  },

  /* Header */
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 32px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(20px)",
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(5,5,7,0.85)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  logo: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 28,
    letterSpacing: 4,
    color: "#fff",
  },
  logoBeta: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 2,
    color: "rgba(139,92,246,0.9)",
    background: "rgba(139,92,246,0.12)",
    padding: "2px 8px",
    borderRadius: 4,
    textTransform: "uppercase",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.1)",
  },
  headerName: {
    fontSize: 14,
    fontWeight: 500,
    color: "rgba(255,255,255,0.7)",
  },
  logoutBtn: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.4)",
    padding: "6px 14px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "'Outfit', sans-serif",
  },

  /* Tabs */
  tabBar: {
    display: "flex",
    gap: 4,
    padding: "0 32px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(5,5,7,0.6)",
  },
  tab: {
    position: "relative",
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.35)",
    padding: "14px 20px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
    transition: "color 0.2s",
    letterSpacing: 0.5,
  },
  tabActive: {
    color: "#fff",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 2,
    background: "linear-gradient(90deg, #8B5CF6, #6366F1)",
    borderRadius: "2px 2px 0 0",
  },

  /* Main */
  main: {
    padding: "28px 32px",
    maxWidth: 1280,
    margin: "0 auto",
  },

  /* Filters */
  filtersRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  filterGroup: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  selectWrap: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
  },
  select: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontFamily: "'Outfit', sans-serif",
    cursor: "pointer",
    outline: "none",
    minWidth: 120,
    appearance: "none",
    WebkitAppearance: "none",
  },
  selectClearBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    fontFamily: "inherit",
    transition: "all 0.15s",
  },
  clearBtn: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.4)",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
    transition: "all 0.2s",
  },
  resultCount: {
    fontSize: 13,
    color: "rgba(255,255,255,0.25)",
    fontWeight: 400,
  },

  /* Grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
  },

  /* Card */
  card: {
    display: "block",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    overflow: "hidden",
    textDecoration: "none",
    color: "inherit",
    transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    animation: "fadeUp 0.5s ease-out both",
  },
  thumbWrap: {
    position: "relative",
    aspectRatio: "16/9",
    overflow: "hidden",
    background: "#0a0a0f",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.4s ease",
  },
  thumbOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.3)",
    opacity: 0,
    transition: "opacity 0.3s",
  },
  playIcon: {
    fontSize: 28,
    color: "#fff",
    background: "rgba(139,92,246,0.8)",
    width: 48,
    height: 48,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
  },
  agentBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    padding: "3px 10px",
    borderRadius: 6,
    border: "1px solid",
    backdropFilter: "blur(8px)",
  },
  cardBody: {
    padding: "12px 14px",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  playerName: {
    fontSize: 15,
    fontWeight: 600,
    color: "rgba(255,255,255,0.9)",
  },
  rolePill: {
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardMeta: {
    display: "flex",
    gap: 12,
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
  },
  metaItem: {},

  /* Empty state */
  emptyState: {
    textAlign: "center",
    padding: "80px 20px",
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "rgba(255,255,255,0.6)",
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.25)",
    marginTop: 8,
    maxWidth: 320,
    marginLeft: "auto",
    marginRight: "auto",
    lineHeight: 1.6,
  },

  /* Skeleton */
  gridSkeleton: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
  },
  skeletonCard: {
    height: 240,
    borderRadius: 12,
    background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  },

  /* Profile */
  profileCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 32,
    maxWidth: 520,
  },
  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  profileAvatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    border: "3px solid rgba(139,92,246,0.3)",
  },
  profileAvatarRing: {
    position: "absolute",
    inset: -4,
    borderRadius: "50%",
    border: "2px solid rgba(139,92,246,0.15)",
  },
  profileName: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: -0.3,
  },
  profileUsername: {
    fontSize: 14,
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
  },
  profileDivider: {
    height: 1,
    background: "rgba(255,255,255,0.06)",
    margin: "24px 0",
  },
  profileFields: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  profileField: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
    fontWeight: 400,
  },
  profileValue: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontWeight: 500,
  },

  /* Loading */
  loadingScreen: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#050507",
    gap: 16,
  },
  loadingPulse: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "3px solid rgba(139,92,246,0.2)",
    borderTopColor: "#8B5CF6",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 14,
    color: "rgba(255,255,255,0.3)",
  },
};