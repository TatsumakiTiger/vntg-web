import { useEffect, useState, useMemo, useRef } from "react";
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
  Veto: "Sentinel",
  Gekko: "Initiator", Fade: "Initiator", Sova: "Initiator",
  Breach: "Initiator", KAYO: "Initiator", Tejo: "Initiator", Skye: "Initiator",
  Omen: "Controller", Brimstone: "Controller", Viper: "Controller",
  Astra: "Controller", Harbor: "Controller", Clove: "Controller",
  Miks: "Controller",
};

const ROLES = ["Duelist", "Initiator", "Controller", "Sentinel"];

const PAGE_SIZE = 20;

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(null);
  const [filterAgent, setFilterAgent] = useState("");
  const [filterMap, setFilterMap] = useState("");
  const [filterPlayer, setFilterPlayer] = useState("");
  const [filterRole, setFilterRole] = useState("");
  /* base options for instant initial render (from /api/videos/filters) */
  const [filterOptions, setFilterOptions] = useState({ agents: [], maps: [], players: [] });
  /* full video meta for local cross-filtering */
  const [allVideoMeta, setAllVideoMeta] = useState([]);
  const [activeTab, setActiveTab] = useState("proview");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fetchSeq = useRef(0);
  const loadMoreRef = useRef(() => {});
  const observerRef = useRef(null);

  /* ── Auth ── */
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      try { localStorage.setItem("vntg_session", tokenFromUrl); } catch {}
      window.history.replaceState({}, "", "/dashboard");
    }

    let token = tokenFromUrl;
    try { token = token || localStorage.getItem("vntg_session"); } catch {}
    if (!token) { navigate("/"); return; }

    fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setUser(data); setLoading(false); })
      .catch(() => {
        try { localStorage.removeItem("vntg_session"); } catch {}
        navigate("/");
      });
  }, []);

  /* ── Base filter options (fast, populates dropdowns instantly) ── */
  useEffect(() => {
    fetch(`${API_URL}/api/videos/filters`)
      .then((r) => r.json())
      .then((data) => setFilterOptions(data))
      .catch(() => {});
  }, []);

  /* ── Fetch ALL video metadata for local cross-filter index (paginated) ── */
  useEffect(() => {
    async function fetchAllMeta() {
      try {
        const { total } = await fetch(`${API_URL}/api/videos/count`).then((r) => r.json());
        const pages = Math.ceil(total / 100);
        const results = await Promise.all(
          Array.from({ length: pages }, (_, i) =>
            fetch(`${API_URL}/api/videos?limit=100&offset=${i * 100}`).then((r) => r.json())
          )
        );
        setAllVideoMeta(results.flat());
      } catch {}
    }
    fetchAllMeta();
  }, []);

  /* ── Fetch first page + total count when filters change ── */
  useEffect(() => {
    const seq = ++fetchSeq.current;
    setVideosLoading(true);
    setVideos([]);
    setHasMore(true);
    setTotal(null);

    const filterParams = new URLSearchParams();
    if (filterAgent) filterParams.set("agent", filterAgent);
    if (filterMap) filterParams.set("map", filterMap);
    if (filterPlayer) filterParams.set("player", filterPlayer);

    const pageParams = new URLSearchParams(filterParams);
    pageParams.set("limit", PAGE_SIZE);
    pageParams.set("offset", 0);

    fetch(`${API_URL}/api/videos?${pageParams}`)
      .then((r) => r.json())
      .then((data) => {
        if (seq !== fetchSeq.current) return;
        setVideos(data);
        setHasMore(data.length === PAGE_SIZE);
        setVideosLoading(false);
      })
      .catch(() => {
        if (seq !== fetchSeq.current) return;
        setVideosLoading(false);
        setHasMore(false);
      });

    fetch(`${API_URL}/api/videos/count?${filterParams}`)
      .then((r) => r.json())
      .then((data) => {
        if (seq !== fetchSeq.current) return;
        setTotal(data.total);
      })
      .catch(() => {});
  }, [filterAgent, filterMap, filterPlayer]);

  /* ── Load more (always latest closure via ref) ── */
  loadMoreRef.current = function loadMore() {
    if (loadingMore || videosLoading || !hasMore) return;
    setLoadingMore(true);
    const seq = fetchSeq.current;

    const params = new URLSearchParams({ limit: PAGE_SIZE, offset: videos.length });
    if (filterAgent) params.set("agent", filterAgent);
    if (filterMap) params.set("map", filterMap);
    if (filterPlayer) params.set("player", filterPlayer);

    fetch(`${API_URL}/api/videos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (seq !== fetchSeq.current) return;
        setVideos((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
        setLoadingMore(false);
      })
      .catch(() => {
        if (seq !== fetchSeq.current) return;
        setLoadingMore(false);
        setHasMore(false);
      });
  };

  /* ── Stable callback ref: attaches observer once when sentinel mounts ── */
  const sentinelRef = (node) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "600px" }
    );
    observerRef.current.observe(node);
  };

  /*
   * ── Dynamic cross-filter options ──
   * Built from the local video meta index so only valid combos are shown.
   * Each dimension is computed WITHOUT filtering on itself
   * (so you can still change agent while agent is selected, etc).
   * Falls back to base filterOptions while allVideoMeta is loading.
   */
  const dynamicOptions = useMemo(() => {
    if (!allVideoMeta.length) return filterOptions;

    const match = (v, excludeKey) => {
      if (excludeKey !== "agent" && filterAgent && v.agent !== filterAgent) return false;
      if (excludeKey !== "map"   && filterMap   && v.map   !== filterMap)   return false;
      if (excludeKey !== "player"&& filterPlayer && v.player !== filterPlayer) return false;
      return true;
    };

    let agents = [...new Set(allVideoMeta.filter((v) => match(v, "agent")).map((v) => v.agent))].sort();
    const maps    = [...new Set(allVideoMeta.filter((v) => match(v, "map")).map((v) => v.map))].sort();
    const players = [...new Set(allVideoMeta.filter((v) => match(v, "player")).map((v) => v.player))].sort();

    /* apply role filter on agents */
    if (filterRole) agents = agents.filter((a) => AGENT_ROLES[a] === filterRole);

    return { agents, maps, players };
  }, [allVideoMeta, filterAgent, filterMap, filterPlayer, filterRole, filterOptions]);

  function handleLogout() {
    try { localStorage.removeItem("vntg_session"); } catch {}
    navigate("/");
  }

  function clearFilters() {
    setFilterAgent("");
    setFilterMap("");
    setFilterPlayer("");
    setFilterRole("");
  }

  /* clear agent when role changes and current agent doesn't match */
  function handleRoleChange(role) {
    setFilterRole(role);
    if (role && filterAgent && AGENT_ROLES[filterAgent] !== role) {
      setFilterAgent("");
    }
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
            <button onClick={handleLogout} style={styles.logoutBtn}>Wyloguj</button>
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
              style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}
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
                    options={dynamicOptions.agents}
                  />
                  <Select
                    value={filterMap}
                    onChange={setFilterMap}
                    placeholder="Mapa"
                    options={dynamicOptions.maps}
                  />
                  <Select
                    value={filterPlayer}
                    onChange={setFilterPlayer}
                    placeholder="Gracz"
                    options={dynamicOptions.players}
                  />
                  <Select
                    value={filterRole}
                    onChange={handleRoleChange}
                    placeholder="Rola"
                    options={ROLES}
                  />
                  {(filterRole || filterAgent || filterMap || filterPlayer) && (
                    <button onClick={clearFilters} style={styles.clearBtn}>✕ Wyczyść</button>
                  )}
                  <InfoTooltip text="Some options are hidden because there are no videos with that combination." />
                </div>
                <span style={styles.resultCount}>
                  {total ?? videos.length} {(total ?? videos.length) === 1 ? "VOD" : "VODów"}
                </span>
              </div>

              {/* Grid */}
              {videosLoading ? (
                <div style={styles.gridSkeleton}>
                  {[...Array(6)].map((_, i) => <div key={i} style={styles.skeletonCard} />)}
                </div>
              ) : videos.length === 0 ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>🎬</span>
                  <p style={styles.emptyTitle}>Brak VODów</p>
                  <p style={styles.emptyDesc}>
                    {(filterAgent || filterMap || filterPlayer || filterRole)
                      ? "Zmień filtry żeby zobaczyć więcej wyników."
                      : "VODy pojawią się tu automatycznie gdy VMonitor je wykryje."}
                  </p>
                </div>
              ) : (
                <>
                  <div style={styles.grid}>
                    {videos.map((v, i) => <VodCard key={v.video_id} video={v} index={i} />)}
                  </div>
                  <div ref={sentinelRef} style={{ height: 1 }} />
                  {loadingMore && (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                      Ładuję kolejne VOD-y…
                    </div>
                  )}
                  {!hasMore && videos.length > 0 && (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
                      To już wszystko.
                    </div>
                  )}
                </>
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
        <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#fff", lineHeight: 1 }}>
          {video.map}
        </span>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: agentColor, lineHeight: 1 }}>
          {video.agent}
        </span>
      </div>
      <div style={styles.cardBody}>
        <div style={styles.cardTop}>
          <span style={styles.playerName}>{video.player}</span>
          <span style={{ ...styles.rolePill, background: `${roleColor}18`, color: roleColor }}>{role}</span>
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
        <ProfileField label="Dołączył" value={user.created_at ? new Date(user.created_at).toLocaleDateString("pl-PL") : "—"} />
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

/* ── Info tooltip ── */
function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        style={styles.infoIcon}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        ⓘ
      </span>
      {visible && <div style={styles.infoTooltip}>{text}</div>}
    </div>
  );
}

/* ── Select component ── */
function Select({ value, onChange, placeholder, options }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => { setHighlight(0); }, [query, open]);

  function choose(opt) {
    onChange(opt);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[highlight]) choose(filtered[highlight]); }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); inputRef.current?.blur(); }
  }

  return (
    <div ref={wrapRef} style={styles.selectWrap}>
      <input
        ref={inputRef}
        type="text"
        value={open ? query : value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        style={{
          ...styles.select,
          color: value || query ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
          paddingRight: value ? 32 : 14,
        }}
      />
      {value && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(""); setQuery(""); setOpen(false); }}
          style={styles.selectClearBtn}
          aria-label={`Wyczyść filtr ${placeholder}`}
        >
          ✕
        </button>
      )}
      {open && (
        <div style={styles.selectDropdown}>
          {filtered.length === 0 ? (
            <div style={{ ...styles.selectOption, color: "rgba(255,255,255,0.3)", cursor: "default" }}>Brak wyników</div>
          ) : (
            filtered.map((opt, i) => (
              <div
                key={opt}
                onMouseDown={(e) => { e.preventDefault(); choose(opt); }}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  ...styles.selectOption,
                  ...(i === highlight ? styles.selectOptionActive : {}),
                  ...(opt === value ? { color: "#60a5fa" } : {}),
                }}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Styles
   ══════════════════════════════════════════ */
const styles = {
  root: { minHeight: "100vh", background: "#050507", fontFamily: "'Outfit', sans-serif", color: "#fff", position: "relative", overflow: "hidden" },
  ambientGlow: { position: "fixed", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", pointerEvents: "none", animation: "glow 8s ease-in-out infinite" },

  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50, background: "rgba(5,5,7,0.85)" },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  logo: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 4, color: "#fff" },
  logoBeta: { fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "rgba(59,130,246,0.9)", background: "rgba(59,130,246,0.12)", padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  headerAvatar: { width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", objectFit: "cover", display: "block" },
  headerName: { fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)" },
  logoutBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Outfit', sans-serif" },

  tabBar: { display: "flex", gap: 4, padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(5,5,7,0.6)" },
  tab: { position: "relative", background: "none", border: "none", color: "rgba(255,255,255,0.35)", padding: "14px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "color 0.2s", letterSpacing: 0.5 },
  tabActive: { color: "#fff" },
  tabIndicator: { position: "absolute", bottom: 0, left: 20, right: 20, height: 2, background: "linear-gradient(90deg, #3B82F6, #06B6D4)", borderRadius: "2px 2px 0 0" },

  main: { padding: "28px 32px", maxWidth: 1280, margin: "0 auto" },

  filtersRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  filterGroup: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },

  infoIcon: { fontSize: 13, color: "rgba(255,255,255,0.18)", cursor: "default", userSelect: "none", lineHeight: 1, display: "inline-flex", alignItems: "center", padding: "0 2px" },
  infoTooltip: { position: "absolute", left: "50%", bottom: "calc(100% + 8px)", transform: "translateX(-50%)", background: "#18181f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 30, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", lineHeight: 1.5 },

  selectWrap: { position: "relative", display: "inline-flex", alignItems: "center" },
  select: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: "pointer", outline: "none", minWidth: 90, appearance: "none", WebkitAppearance: "none" },
  selectClearBtn: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", fontSize: 10, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontFamily: "inherit", transition: "all 0.15s", zIndex: 2 },
  selectDropdown: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, minWidth: 160, maxHeight: 240, overflowY: "auto", background: "#111117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 4, zIndex: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" },
  selectOption: { padding: "7px 10px", fontSize: 13, color: "rgba(255,255,255,0.85)", borderRadius: 5, cursor: "pointer", fontFamily: "'Outfit', sans-serif", userSelect: "none" },
  selectOptionActive: { background: "rgba(59,130,246,0.15)", color: "#fff" },
  clearBtn: { background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", padding: "8px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.2s" },
  resultCount: { fontSize: 13, color: "rgba(255,255,255,0.25)", fontWeight: 400 },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 },

  card: { display: "block", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden", textDecoration: "none", color: "inherit", transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)", animation: "fadeUp 0.5s ease-out both" },
  thumbWrap: { position: "relative", aspectRatio: "16/9", overflow: "hidden", background: "#0a0a0f" },
  cardBody: { padding: "12px 14px" },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  playerName: { fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)" },
  rolePill: { fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 1 },
  cardMeta: { display: "flex", gap: 12, fontSize: 12, color: "rgba(255,255,255,0.3)" },
  metaItem: {},

  emptyState: { textAlign: "center", padding: "80px 20px" },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginTop: 16 },
  emptyDesc: { fontSize: 14, color: "rgba(255,255,255,0.25)", marginTop: 8, maxWidth: 320, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 },

  gridSkeleton: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 },
  skeletonCard: { height: 240, borderRadius: 12, background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" },

  profileCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 32, maxWidth: 520 },
  profileHeader: { display: "flex", alignItems: "center", gap: 20 },
  profileAvatarWrap: { position: "relative", flexShrink: 0, width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center" },
  profileAvatar: { width: 72, height: 72, borderRadius: "50%", border: "3px solid rgba(59,130,246,0.3)", objectFit: "cover", display: "block" },
  profileAvatarRing: { position: "absolute", top: "50%", left: "50%", width: 80, height: 80, transform: "translate(-50%, -50%)", borderRadius: "50%", border: "2px solid rgba(59,130,246,0.15)", pointerEvents: "none" },
  profileName: { fontSize: 22, fontWeight: 700, letterSpacing: -0.3 },
  profileUsername: { fontSize: 14, color: "rgba(255,255,255,0.35)", marginTop: 2 },
  profileDivider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "24px 0" },
  profileFields: { display: "flex", flexDirection: "column", gap: 16 },
  profileField: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  profileLabel: { fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 400 },
  profileValue: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 },

  loadingScreen: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#050507", gap: 16 },
  loadingPulse: { width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(59,130,246,0.2)", borderTopColor: "#3B82F6", animation: "spin 0.8s linear infinite" },
  loadingText: { fontFamily: "'Outfit', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)" },
};
