import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://vntg-api-production.up.railway.app";

const KEY = "vntg_session";

function readToken() {
  try { const t = localStorage.getItem(KEY); if (t) return t; } catch {}
  const m = document.cookie.match(new RegExp(`(?:^|; )${KEY}=([^;]*)`));
  return m ? m[1] : null;
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "proview");
  const [contactOpen, setContactOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [streakHistoryOpen, setStreakHistoryOpen] = useState(false);
  const [subscribedAgent, setSubscribedAgent] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("");
  const navigate = useNavigate();
  const fetchSeq = useRef(0);
  const loadMoreRef = useRef(() => {});
  const observerRef = useRef(null);
  const roleAutoSet = useRef(false);

  /* ── Auth ── */
  useEffect(() => {
    const KEY = "vntg_session";

    function saveToken(t) {
      try { localStorage.setItem(KEY, t); } catch {}
      const exp = new Date(Date.now() + 30 * 864e5).toUTCString();
      document.cookie = `${KEY}=${t};expires=${exp};path=/;SameSite=Lax`;
    }

    function readToken() {
      try { const t = localStorage.getItem(KEY); if (t) return t; } catch {}
      const m = document.cookie.match(new RegExp(`(?:^|; )${KEY}=([^;]*)`));
      return m ? m[1] : null;
    }

    function clearToken() {
      try { localStorage.removeItem(KEY); } catch {}
      document.cookie = `${KEY}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }

    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      saveToken(tokenFromUrl);
      window.history.replaceState({}, "", "/dashboard");
    }

    const token = tokenFromUrl || readToken();
    if (!token) { navigate("/"); return; }

    fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => {
        if (!data.onboarding_complete) { navigate("/onboarding"); return; }
        setUser(data);
        setSubscribedAgent(data.subscribed_agent || null);
        setLoading(false);
      })
      .catch(() => {
        clearToken();
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
      if (excludeKey !== "agent"  && filterAgent  && v.agent  !== filterAgent)  return false;
      if (excludeKey !== "map"    && filterMap    && v.map    !== filterMap)    return false;
      if (excludeKey !== "player" && filterPlayer && v.player !== filterPlayer) return false;
      return true;
    };

    const alphaNumLast = (a, b) => {
      const aDigit = /^\d/.test(a), bDigit = /^\d/.test(b);
      if (aDigit !== bDigit) return aDigit ? 1 : -1;
      return a.localeCompare(b);
    };

    let agents  = [...new Set(allVideoMeta.filter((v) => match(v, "agent")).map((v) => v.agent))].sort();
    const maps  = [...new Set(allVideoMeta.filter((v) => match(v, "map")).map((v) => v.map))].sort();
    let players = [...new Set(allVideoMeta.filter((v) => match(v, "player")).map((v) => v.player))].sort(alphaNumLast);

    /* role filter: narrow agents and players to only those that match the role */
    if (filterRole) {
      agents  = agents.filter((a) => AGENT_ROLES[a] === filterRole);
      players = players.filter((p) =>
        allVideoMeta.some((v) => v.player === p && AGENT_ROLES[v.agent] === filterRole)
      );
    }

    return { agents, maps, players };
  }, [allVideoMeta, filterAgent, filterMap, filterPlayer, filterRole, filterOptions]);

  function handleLogout() {
    try { localStorage.removeItem("vntg_session"); } catch {}
    document.cookie = "vntg_session=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    navigate("/");
  }

  function clearFilters() {
    setFilterAgent("");
    setFilterMap("");
    setFilterPlayer("");
    setFilterRole("");
    roleAutoSet.current = false;
  }

  /* manual role pick — not auto-set, so it persists independently */
  function handleRoleChange(role) {
    setFilterRole(role);
    roleAutoSet.current = false;
    if (role && filterAgent && AGENT_ROLES[filterAgent] !== role) {
      setFilterAgent("");
    }
  }

  /* auto-set role when agent is picked, clear it when agent is cleared */
  function handleAgentChange(agent) {
    setFilterAgent(agent);
    if (agent) {
      setFilterRole(AGENT_ROLES[agent] || "");
      roleAutoSet.current = true;
    } else if (roleAutoSet.current) {
      setFilterRole("");
      roleAutoSet.current = false;
    }
  }

  /*
   * When only role is active (no agent), display is driven locally from
   * allVideoMeta so the API doesn't need a role param it doesn't support.
   */
  const localVideos = useMemo(() => {
    if (!(filterRole && !filterAgent)) return null;
    return allVideoMeta.filter((v) => {
      if (filterRole   && AGENT_ROLES[v.agent] !== filterRole) return false;
      if (filterMap    && v.map    !== filterMap)    return false;
      if (filterPlayer && v.player !== filterPlayer) return false;
      return true;
    });
  }, [filterRole, filterAgent, filterMap, filterPlayer, allVideoMeta]);

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingPulse} />
        <span style={styles.loadingText}>Loading...</span>
      </div>
    );
  }

  const displayName = user.vantage_nick || user.global_name || user.username;
  const avatarUrl = user.custom_avatar || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1a1a2e&color=fff&size=128&bold=true&format=svg`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        @keyframes starBounce { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-5px); } 60% { transform: translateY(-3px); } }
        @keyframes flicker { 0%, 100% { transform: translateX(-50%) scaleY(1) rotate(-1deg); } 25% { transform: translateX(-50%) scaleY(1.06) rotate(1.5deg); } 50% { transform: translateX(-50%) scaleY(0.94) rotate(-1.5deg); } 75% { transform: translateX(-50%) scaleY(1.03) rotate(1deg); } }
        @keyframes innerFlicker { 0%, 100% { transform: translateX(-50%) scaleY(1); opacity: 0.9; } 50% { transform: translateX(-50%) scaleY(0.82) rotate(2deg); opacity: 0.7; } }
        @keyframes flameGlow { 0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); } 50% { opacity: 0.85; transform: translateX(-50%) scale(1.15); } }
      `}</style>

      <div style={styles.root}>
        {/* ── Top bar ── */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.logo}>VANTAGE</span>
            <span style={styles.logoBeta}>BETA</span>
          </div>
          <div style={styles.headerRight}>
            <img src={avatarUrl} alt="" style={styles.headerAvatar} />
            <span style={styles.headerName}>{displayName}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>Log out</button>
          </div>
        </header>

        {/* ── Tab bar ── */}
        <nav style={styles.tabBar}>
          {[
            { id: "proview", label: "ProView" },
            { id: "consistency", label: "Vlingo" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchParams({ tab: tab.id }, { replace: true }); }}
              style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}
            >
              {tab.label}
              {activeTab === tab.id && <div style={styles.tabIndicator} />}
            </button>
          ))}
          <button
            onClick={() => { setActiveTab("profile"); setSearchParams({ tab: "profile" }, { replace: true }); }}
            style={{ ...styles.tab, ...(activeTab === "profile" ? styles.tabActive : {}), marginLeft: "auto" }}
          >
            Profile
            {activeTab === "profile" && <div style={styles.tabIndicator} />}
          </button>
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
                    onChange={handleAgentChange}
                    placeholder="Agent"
                    options={dynamicOptions.agents}
                  />
                  <Select
                    value={filterMap}
                    onChange={setFilterMap}
                    placeholder="Map"
                    options={dynamicOptions.maps}
                  />
                  <Select
                    value={filterPlayer}
                    onChange={setFilterPlayer}
                    placeholder="Player"
                    options={dynamicOptions.players}
                  />
                  <Select
                    value={filterRole}
                    onChange={handleRoleChange}
                    placeholder="Role"
                    options={ROLES}
                    locked={!!filterAgent}
                  />
                  {(filterRole || filterAgent || filterMap || filterPlayer) && (
                    <button onClick={clearFilters} style={styles.clearBtn}>✕ Clear</button>
                  )}
                </div>
                <span style={styles.resultCount}>
                  {localVideos ? localVideos.length : (total ?? videos.length)}{" "}
                  {(localVideos ? localVideos.length : (total ?? videos.length)) === 1 ? "VOD" : "VODs"}
                </span>
              </div>

              {/* Grid */}
              {localVideos ? (
                /* ── Local mode: role filter without agent ── */
                localVideos.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p style={styles.emptyDesc}>No results for this combination.</p>
                    <button onClick={clearFilters} style={{ ...styles.clearBtn, marginTop: 12 }}>✕ Clear filters</button>
                  </div>
                ) : (
                  <div style={styles.grid}>
                    {localVideos.map((v, i) => <VodCard key={v.video_id} video={v} index={i} />)}
                  </div>
                )
              ) : videosLoading ? (
                <div style={styles.gridSkeleton}>
                  {[...Array(6)].map((_, i) => <div key={i} style={styles.skeletonCard} />)}
                </div>
              ) : videos.length === 0 ? (
                <div style={styles.emptyState}>
                  {(filterAgent || filterMap || filterPlayer || filterRole) ? (
                    <>
                      <p style={styles.emptyDesc}>No results for this combination.</p>
                      <button onClick={clearFilters} style={{ ...styles.clearBtn, marginTop: 12 }}>✕ Clear filters</button>
                    </>
                  ) : (
                    <p style={styles.emptyDesc}>VODs will appear here automatically when VMonitor detects them.</p>
                  )}
                </div>
              ) : (
                <>
                  <div style={styles.grid}>
                    {videos.map((v, i) => <VodCard key={v.video_id} video={v} index={i} />)}
                  </div>
                  <div ref={sentinelRef} style={{ height: 1 }} />
                  {loadingMore && (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                      Loading more VODs…
                    </div>
                  )}
                  {!hasMore && videos.length > 0 && (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
                      That's all.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "consistency" && (
            <div style={{ padding: "48px 32px", color: "rgba(255,255,255,0.25)", fontSize: 14, textAlign: "center" }}>
              Coming soon.
            </div>
          )}

          {activeTab === "analyzer" && (
            <div style={{ padding: "48px 32px", color: "rgba(255,255,255,0.25)", fontSize: 14, textAlign: "center" }}>
              Coming soon.
            </div>
          )}

          {activeTab === "profile" && (
            <div style={{ animation: "fadeUp 0.4s ease-out", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
              <ProfileCard
                user={user}
                subscribedAgent={subscribedAgent}
                onFixSubscription={() => {
                  setActiveTab("proview");
                  setSearchParams({ tab: "proview" }, { replace: true });
                  setTimeout(() => setSubscribeOpen(true), 100);
                }}
              />
              <StreakCard user={user} />
            </div>
          )}
        </main>

        {/* ── Bottom-left buttons ── */}
        <div style={styles.contactWrap}>
          <div
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: activeTab === "proview" ? 1 : 0, pointerEvents: activeTab === "proview" ? "all" : "none", transition: "opacity .2s" }}
            onMouseEnter={e => {
              if (activeTab !== "proview") return;
              const lbl = e.currentTarget.querySelector("span");
              const btn = e.currentTarget.querySelector("button");
              lbl.style.opacity = "1"; lbl.style.transform = "translateY(0)";
              btn.style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={e => {
              const lbl = e.currentTarget.querySelector("span");
              const btn = e.currentTarget.querySelector("button");
              lbl.style.opacity = "0"; lbl.style.transform = "translateY(4px)";
              btn.style.background = "rgba(255,255,255,0.03)";
            }}
          >
            <span style={styles.contactLabel}>{subscribedAgent ? "Subscribed" : "Subscribe"}</span>
            <button
              style={{ ...styles.contactBtn, animation: subscribedAgent ? "none" : "starBounce 2s ease-in-out infinite" }}
              onClick={() => setSubscribeOpen(true)}
            >⭐</button>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: activeTab === "profile" ? 1 : 0, pointerEvents: activeTab === "profile" ? "all" : "none", transition: "opacity .2s" }}
            onMouseEnter={e => {
              if (activeTab !== "profile") return;
              const lbl = e.currentTarget.querySelector("span");
              const btn = e.currentTarget.querySelector("button");
              lbl.style.opacity = "1"; lbl.style.transform = "translateY(0)";
              btn.style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={e => {
              const lbl = e.currentTarget.querySelector("span");
              const btn = e.currentTarget.querySelector("button");
              lbl.style.opacity = "0"; lbl.style.transform = "translateY(4px)";
              btn.style.background = "rgba(255,255,255,0.03)";
            }}
          >
            <span style={styles.contactLabel}>Streak</span>
            <button onClick={() => setStreakHistoryOpen(true)} style={styles.contactBtn}>🔥</button>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
            onMouseEnter={e => {
              const lbl = e.currentTarget.querySelector("span");
              const btn = e.currentTarget.querySelector("button");
              lbl.style.opacity = "1"; lbl.style.transform = "translateY(0)";
              btn.style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={e => {
              const lbl = e.currentTarget.querySelector("span");
              const btn = e.currentTarget.querySelector("button");
              lbl.style.opacity = "0"; lbl.style.transform = "translateY(4px)";
              btn.style.background = "rgba(255,255,255,0.03)";
            }}
          >
            <span style={styles.contactLabel}>Contact</span>
            <button onClick={() => setContactOpen(true)} style={styles.contactBtn}>📱</button>
          </div>
        </div>

        {/* ── Contact modal ── */}
        {contactOpen && (
          <div style={styles.modalOverlay} onClick={() => setContactOpen(false)}>
            <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
              <p style={styles.modalTitle}>Contact / Report Bug</p>
              <p style={styles.modalSub}>Reach us at</p>
              <a href="mailto:vantage@vntg.com.pl" style={styles.modalEmail}>vantage@vntg.com.pl</a>
              <button onClick={() => setContactOpen(false)} style={styles.modalClose}>Close</button>
            </div>
          </div>
        )}

        {/* ── Streak history modal ── */}
        {streakHistoryOpen && user && (
          <div style={styles.modalOverlay} onClick={() => setStreakHistoryOpen(false)}>
            <div
              style={{ ...styles.modalBox, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto", alignItems: "flex-start", gap: 16 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
                <p style={styles.modalTitle}>Streak History</p>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{user.streak || 0}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>day streak</span>
                </div>
              </div>
              <FullHistoryCalendar dailyLog={user.daily_log || []} createdAt={user.created_at} />
              <button onClick={() => setStreakHistoryOpen(false)} style={{ ...styles.modalClose, alignSelf: "center" }}>Close</button>
            </div>
          </div>
        )}

        {/* ── Subscribe modal ── */}
        {subscribeOpen && (
          <div style={styles.modalOverlay} onClick={() => setSubscribeOpen(false)}>
            <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
              <p style={styles.modalTitle}>Agent Subscribe</p>
              <p style={styles.modalSub}>
                Select your main. Whenever a new VOD with that agent drops, you'll get a Discord DM with a link.
              </p>
              <select
                value={selectedAgent || subscribedAgent || ""}
                onChange={e => setSelectedAgent(e.target.value)}
                style={styles.subSelect}
              >
                <option value="">Select your main</option>
                {Object.keys(AGENT_COLORS).sort().map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              {subscribedAgent && (
                <p style={styles.subCurrent}>
                  Currently subscribed to: <span style={{ color: AGENT_COLORS[subscribedAgent] || "#C9A84C" }}>{subscribedAgent}</span>
                </p>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  style={{ ...styles.modalClose, ...styles.subConfirm, opacity: (selectedAgent || subscribedAgent) ? 1 : 0.4 }}
                  onClick={() => {
                    const agent = selectedAgent || subscribedAgent;
                    if (!agent) return;
                    const token = readToken();
                    fetch(`${API_URL}/api/me/subscription`, {
                      method: "POST",
                      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                      body: JSON.stringify({ agent }),
                    }).then(r => r.json()).then(() => {
                      setSubscribedAgent(agent);
                      setSelectedAgent("");
                      setSubscribeOpen(false);
                    }).catch(err => console.error("Sub save error:", err));
                  }}
                >
                  Save
                </button>
                {subscribedAgent && (
                  <button
                    style={{ ...styles.modalClose, color: "rgba(239,68,68,0.7)", borderColor: "rgba(239,68,68,0.2)" }}
                    onClick={() => {
                      const token = readToken();
                      fetch(`${API_URL}/api/me/subscription`, {
                        method: "DELETE",
                        headers: { "Authorization": `Bearer ${token}` },
                      }).then(() => {
                        setSubscribedAgent(null);
                        setSelectedAgent("");
                        setSubscribeOpen(false);
                      }).catch(err => console.error("Sub delete error:", err));
                    }}
                  >
                    Remove
                  </button>
                )}
                <button onClick={() => setSubscribeOpen(false)} style={styles.modalClose}>Cancel</button>
              </div>
            </div>
          </div>
        )}
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
        transform: hovered ? "translateY(-2px)" : "none",
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
function ProfileCard({ user, subscribedAgent, onFixSubscription }) {
  const displayName = user.vantage_nick || user.global_name || user.username;
  const avatarUrl = user.custom_avatar || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1a1a2e&color=fff&size=128&bold=true&format=svg`;

  const [isEditing, setIsEditing] = useState(false);
  const [editingNick, setEditingNick] = useState(user.vantage_nick || "");
  const [editingAvatar, setEditingAvatar] = useState(null);
  const [editingAvatarPreview, setEditingAvatarPreview] = useState(null);
  const [nickStatus, setNickStatus] = useState(null);
  const [nickError, setNickError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const debounceRef = useRef(null);

  const handleNickChange = (newNick) => {
    setEditingNick(newNick);
    setNickError("");
    setNickStatus(null);

    if (!newNick || newNick.length < 3) {
      setNickStatus(null);
      return;
    }
    if (!/^[A-Za-z0-9_]{3,20}$/.test(newNick)) {
      setNickStatus("invalid");
      setNickError("3-20 characters, letters/numbers/underscore only.");
      return;
    }

    setNickStatus("checking");
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`${API_URL}/api/check-nick/${encodeURIComponent(newNick)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.available) {
            setNickStatus("available");
            setNickError("");
          } else {
            setNickStatus("taken");
            setNickError(data.reason || "Not available.");
          }
        })
        .catch(() => {
          setNickStatus(null);
          setNickError("Could not check availability.");
        });
    }, 400);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 350000) {
      setError("Image too large. Max 350KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditingAvatarPreview(reader.result);
      setEditingAvatar(reader.result);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      if (editingAvatar) {
        await fetch(`${API_URL}/api/onboarding/avatar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${readToken()}`, "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: editingAvatar }),
        });
      }

      if (editingNick !== user.vantage_nick) {
        const res = await fetch(`${API_URL}/api/onboarding/nick`, {
          method: "POST",
          headers: { Authorization: `Bearer ${readToken()}`, "Content-Type": "application/json" },
          body: JSON.stringify({ nick: editingNick }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update nick");
        }
      }

      setIsEditing(false);
      window.location.reload();
    } catch (err) {
      setError(err.message || "Error saving profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingNick(user.vantage_nick || "");
    setEditingAvatar(null);
    setEditingAvatarPreview(null);
    setNickStatus(null);
    setNickError("");
    setError("");
  };

  if (isEditing) {
    return (
      <div style={styles.profileCard}>
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Edit Profile</h3>
        </div>

        {/* Avatar Section */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.3)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Avatar</label>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={styles.profileAvatarWrap}>
              <img src={editingAvatarPreview || avatarUrl} alt="" style={styles.profileAvatar} />
              <div style={styles.profileAvatarRing} />
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              title="PNG, JPG, or WebP — max 350KB"
              style={{
                ...styles.logoutBtn,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: "nowrap",
                background: "rgba(201,168,76,0.15)",
                borderColor: "rgba(201,168,76,0.25)",
                color: "rgba(255,255,255,0.85)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "rgba(201,168,76,0.25)";
                e.target.style.borderColor = "rgba(201,168,76,0.4)";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "rgba(201,168,76,0.15)";
                e.target.style.borderColor = "rgba(201,168,76,0.25)";
              }}
            >
              Upload Image
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} style={{ display: "none" }} />
          </div>
        </div>

        {/* Nick Section */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Vantage Nick</label>
          <div style={styles.selectWrap}>
            <input
              type="text"
              value={editingNick}
              onChange={(e) => handleNickChange(e.target.value.replace(/\s/g, ""))}
              placeholder={user.vantage_nick || "e.g. ProPlayer99"}
              maxLength={20}
              style={{
                ...styles.select,
                color: editingNick ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
                borderColor:
                  nickStatus === "available" ? "rgba(34,197,94,0.4)" :
                  nickStatus === "taken" || nickStatus === "invalid" ? "rgba(239,68,68,0.4)" :
                  "rgba(255,255,255,0.08)",
                paddingRight: 32,
              }}
            />
            <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, lineHeight: 1 }}>
              {nickStatus === "checking" && <span style={{ display: "inline-block", animation: "spin 0.8s linear infinite", color: "rgba(255,255,255,0.5)" }}>⟳</span>}
              {nickStatus === "available" && <span style={{ color: "#22C55E", fontWeight: 600 }}>✓</span>}
              {(nickStatus === "taken" || nickStatus === "invalid") && <span style={{ color: "#EF4444", fontWeight: 600 }}>✗</span>}
            </div>
          </div>
          {nickError && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 8 }}>{nickError}</p>}
          {nickStatus === "available" && editingNick !== user.vantage_nick && <p style={{ fontSize: 12, color: "#22C55E", marginTop: 8 }}>✓ This nick is available.</p>}
        </div>

        {/* Error Message */}
        {error && <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 20, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.15)" }}>{error}</p>}

        {/* Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saving || (!editingAvatar && (editingNick === user.vantage_nick || nickStatus !== "available"))}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: saving || (!editingAvatar && (editingNick === user.vantage_nick || nickStatus !== "available")) ? "rgba(201,168,76,0.1)" : "rgba(201,168,76,0.2)",
              border: "1px solid rgba(201,168,76,0.25)",
              color: saving || (!editingAvatar && (editingNick === user.vantage_nick || nickStatus !== "available")) ? "rgba(255,255,255,0.4)" : "#fff",
              borderRadius: 8,
              cursor: saving || (!editingAvatar && (editingNick === user.vantage_nick || nickStatus !== "available")) ? "not-allowed" : "pointer",
              fontFamily: "'Outfit', sans-serif",
              transition: "all 0.2s",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 500,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: saving ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.6)",
              borderRadius: 8,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'Outfit', sans-serif",
              transition: "all 0.2s",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.profileCard}>
      <div style={styles.profileHeader}>
        <div style={styles.profileAvatarWrap}>
          <img src={avatarUrl} alt="" style={styles.profileAvatar} />
          <div style={styles.profileAvatarRing} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={styles.profileName}>{displayName}</h2>
          <p style={styles.profileUsername}>@{user.username}</p>
        </div>
        <button onClick={() => setIsEditing(true)} style={{ ...styles.logoutBtn, fontSize: 12 }}>
          Edit
        </button>
      </div>
      <div style={styles.profileDivider} />
      <div style={styles.profileFields}>
        <ProfileField label="Email" value={user.email || "—"} />
        <ProfileField label="Joined" value={user.created_at ? new Date(user.created_at).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"} />
        <div style={styles.profileField}>
          <span style={styles.profileLabel}>Subscribed Agent</span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={styles.profileValue}>{subscribedAgent || "None"}</span>
            {!subscribedAgent && (
              <button onClick={onFixSubscription} style={styles.fixBtn}>Fix that</button>
            )}
          </span>
        </div>
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

function VntgFlame() {
  return (
    <div style={{ position: "relative", width: 32, height: 48, flexShrink: 0 }}>
      <div style={{
        position: "absolute", bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: 48, height: 48, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,168,76,0.28) 0%, transparent 70%)",
        animation: "flameGlow 1.4s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: 22, height: 42,
        background: "linear-gradient(to top, #c85a00 0%, #E8850A 25%, #C9A84C 55%, #fff8c0 85%, transparent 100%)",
        borderRadius: "50% 50% 28% 28% / 58% 58% 28% 28%",
        animation: "flicker 0.85s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: 12, height: 26,
        background: "linear-gradient(to top, #fff 0%, #fffbe6 35%, #C9A84C 75%, transparent 100%)",
        borderRadius: "50% 50% 28% 28% / 58% 58% 28% 28%",
        animation: "innerFlicker 0.65s ease-in-out infinite",
      }} />
    </div>
  );
}

function StreakCard({ user }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, flexShrink: 0 }}>
      {/* Streak counter block */}
      <div style={{
        background: "rgba(201,168,76,0.06)",
        border: "1px solid rgba(201,168,76,0.18)",
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        minWidth: 220,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, color: "rgba(201,168,76,0.6)", textTransform: "uppercase", marginBottom: 6 }}>
            VNTG STREAK
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 40, fontWeight: 700, color: "#fff", letterSpacing: -1, lineHeight: 1 }}>
              {user.streak || 0}
            </span>
            <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>
              {(user.streak || 0) === 1 ? "day" : "days"}
            </span>
          </div>
        </div>
        <VntgFlame />
      </div>

      {/* Current month calendar block */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "20px 24px",
      }}>
        <MonthCalendar dailyLog={user.daily_log || []} />
      </div>
    </div>
  );
}

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function CalendarLegend() {
  return (
    <div style={{ display: "flex", gap: 14, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
      {[
        { bg: "#C9A84C", label: "Online" },
        { bg: "rgba(239,68,68,0.35)", label: "Missed" },
        { bg: "rgba(255,255,255,0.06)", label: "No data" },
        { outline: "2px solid rgba(255,255,255,0.85)", label: "Today" },
      ].map(({ bg, outline, label }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: bg || "transparent", outline: outline || "none", outlineOffset: outline ? "1px" : 0 }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function MonthCalendar({ dailyLog }) {
  const onlineDates = new Set(dailyLog);
  const sortedLog = [...dailyLog].sort();
  const firstLogDate = sortedLog.length > 0 ? sortedLog[0] : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = localDateStr(today);
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const CELL = 26;
  const GAP = 4;

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 14, letterSpacing: 0.5 }}>
        {MONTH_NAMES[month]} {year}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${CELL}px)`, gap: GAP, marginBottom: GAP }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ width: CELL, textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: `repeat(7, ${CELL}px)`, gap: GAP, marginBottom: GAP }}>
          {week.map((day, di) => {
            if (!day) return <div key={di} style={{ width: CELL, height: CELL }} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isFuture = dateStr > todayStr;
            const isBeforeFirstLog = !firstLogDate || dateStr < firstLogDate;
            const isOnline = onlineDates.has(dateStr);
            const isToday = dateStr === todayStr;
            let bg, shadow;
            if (isFuture || isBeforeFirstLog) { bg = "rgba(255,255,255,0.04)"; shadow = "none"; }
            else if (isOnline) { bg = "#C9A84C"; shadow = "0 0 5px rgba(201,168,76,0.5)"; }
            else { bg = "rgba(239,68,68,0.28)"; shadow = "none"; }
            return (
              <div
                key={di}
                title={`${dateStr}${isToday ? " · TODAY" : ""}${!isFuture && !isBeforeFirstLog ? (isOnline ? " · online" : " · missed") : ""}`}
                style={{
                  width: CELL, height: CELL, borderRadius: 5,
                  background: bg, boxShadow: shadow,
                  outline: isToday ? "2px solid rgba(255,255,255,0.85)" : "none",
                  outlineOffset: "1px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: isOnline ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.3)",
                  fontWeight: 500,
                }}
              >
                {day}
              </div>
            );
          })}
        </div>
      ))}
      <CalendarLegend />
    </div>
  );
}

function FullHistoryCalendar({ dailyLog }) {
  const onlineDates = new Set(dailyLog);
  const sortedLog = [...dailyLog].sort();
  const firstLogDate = sortedLog.length > 0 ? sortedLog[0] : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = localDateStr(today);

  const anchorDate = firstLogDate ? new Date(firstLogDate) : new Date(today);
  anchorDate.setHours(0, 0, 0, 0);
  const anchorDay = anchorDate.getDay();
  const daysToMonday = anchorDay === 0 ? 6 : anchorDay - 1;
  const startMonday = new Date(anchorDate);
  startMonday.setDate(anchorDate.getDate() - daysToMonday);

  const weeks = [];
  const cur = new Date(startMonday);
  while (cur <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(cur);
      day.setDate(cur.getDate() + d);
      week.push(new Date(day));
    }
    weeks.push(week);
    cur.setDate(cur.getDate() + 7);
  }

  const CELL = 13;
  const GAP = 3;

  return (
    <div>
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "flex", gap: GAP, minWidth: "max-content" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: GAP, paddingTop: 20 }}>
            {DAY_LABELS.map((d, i) => (
              <div key={i} style={{ width: 28, height: CELL, fontSize: 10, color: "rgba(255,255,255,0.25)", lineHeight: `${CELL}px`, textAlign: "right", paddingRight: 4 }}>
                {i % 2 === 0 ? d : ""}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => {
            const firstDay = week[0];
            const showMonth = firstDay.getDate() <= 7;
            return (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                <div style={{ height: 16, fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: "16px", whiteSpace: "nowrap", fontWeight: 500 }}>
                  {showMonth ? MONTH_SHORT[firstDay.getMonth()] : ""}
                </div>
                {week.map((day, di) => {
                  const dateStr = localDateStr(day);
                  const isFuture = dateStr > todayStr;
                  const isBeforeFirstLog = !firstLogDate || dateStr < firstLogDate;
                  const isOnline = onlineDates.has(dateStr);
                  const isToday = dateStr === todayStr;
                  let bg, shadow;
                  if (isFuture || isBeforeFirstLog) { bg = "rgba(255,255,255,0.04)"; shadow = "none"; }
                  else if (isOnline) { bg = "#C9A84C"; shadow = "0 0 5px rgba(201,168,76,0.5)"; }
                  else { bg = "rgba(239,68,68,0.28)"; shadow = "none"; }
                  return (
                    <div
                      key={di}
                      title={`${dateStr}${isToday ? " · TODAY" : ""}${!isFuture && !isBeforeFirstLog ? (isOnline ? " · online" : " · missed") : ""}`}
                      style={{
                        width: CELL, height: CELL, borderRadius: 3,
                        background: bg, boxShadow: shadow,
                        outline: isToday ? "2px solid rgba(255,255,255,0.85)" : "none",
                        outlineOffset: "1px",
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <CalendarLegend />
    </div>
  );
}

/* ── Info tooltip ── */
function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 600;
  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span
        style={styles.infoIcon}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible((v) => !v)}
      >
        ⓘ
      </span>
      {visible && (
        <div style={{
          ...styles.infoTooltip,
          ...(isMobile ? {
            position: "fixed",
            left: 16,
            right: 16,
            top: "auto",
            bottom: 24,
            transform: "none",
            whiteSpace: "normal",
            textAlign: "center",
            maxWidth: "none",
          } : {}),
        }}>{text}</div>
      )}
    </div>
  );
}

/* ── Select component ── */
function Select({ value, onChange, placeholder, options, locked = false }) {
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
        onFocus={() => { if (!locked) setOpen(true); }}
        onChange={(e) => { if (!locked) { setQuery(e.target.value); setOpen(true); } }}
        onKeyDown={locked ? undefined : onKeyDown}
        readOnly={locked}
        autoComplete="off"
        style={{
          ...styles.select,
          color: value || query ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
          paddingRight: value ? 32 : 14,
          cursor: locked ? "default" : "pointer",
        }}
      />
      {value && !locked && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(""); setQuery(""); setOpen(false); }}
          style={styles.selectClearBtn}
          aria-label={`Clear ${placeholder} filter`}
        >
          ✕
        </button>
      )}
      {locked && <span style={styles.lockIcon}>🔒</span>}
      {open && (
        <div style={styles.selectDropdown}>
          {filtered.length === 0 ? (
            <div style={{ ...styles.selectOption, color: "rgba(255,255,255,0.3)", cursor: "default" }}>No results</div>
          ) : (
            filtered.map((opt, i) => (
              <div
                key={opt}
                onMouseDown={(e) => { e.preventDefault(); choose(opt); }}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  ...styles.selectOption,
                  ...(i === highlight ? styles.selectOptionActive : {}),
                  ...(opt === value ? { color: "#C9A84C" } : {}),
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
  root: { minHeight: "100vh", background: "#000", fontFamily: "'Outfit', sans-serif", color: "#fff", position: "relative", overflow: "hidden" },
  ambientGlow: { position: "fixed", top: -200, right: -200, width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none", animation: "glow 8s ease-in-out infinite" },

  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50, background: "rgba(0,0,0,0.85)" },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  logo: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, letterSpacing: 6, fontWeight: 700, color: "#fff" },
  logoBeta: { fontSize: 9, fontWeight: 600, letterSpacing: 2, color: "rgba(201,168,76,0.9)", background: "rgba(201,168,76,0.12)", padding: "2px 8px", borderRadius: 4, textTransform: "uppercase" },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  headerAvatar: { width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", objectFit: "cover", display: "block" },
  headerName: { fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.7)" },
  logoutBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Outfit', sans-serif" },

  tabBar: { display: "flex", gap: 4, padding: "0 32px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.6)" },
  tab: { position: "relative", background: "none", border: "none", color: "rgba(255,255,255,0.35)", padding: "14px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "color 0.2s", letterSpacing: 0.5 },
  tabActive: { color: "#fff" },
  tabIndicator: { position: "absolute", bottom: 0, left: 20, right: 20, height: 2, background: "linear-gradient(90deg, #C9A84C, #E8D5A0)", borderRadius: "2px 2px 0 0" },

  main: { padding: "28px 32px", maxWidth: 1280, margin: "0 auto" },

  filtersRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  filterGroup: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },

  infoIcon: { fontSize: 13, color: "rgba(255,255,255,0.18)", cursor: "default", userSelect: "none", lineHeight: 1, display: "inline-flex", alignItems: "center", padding: "0 2px" },
  infoTooltip: { position: "absolute", left: "50%", top: "calc(100% + 10px)", transform: "translateX(-50%)", background: "#18181f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.6)", whiteSpace: "normal", maxWidth: 260, pointerEvents: "none", zIndex: 100, boxShadow: "0 12px 32px rgba(0,0,0,0.6)", lineHeight: 1.6 },

  selectWrap: { position: "relative", display: "inline-flex", alignItems: "center" },
  select: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: "pointer", outline: "none", minWidth: 90, appearance: "none", WebkitAppearance: "none" },
  selectClearBtn: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", fontSize: 10, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontFamily: "inherit", transition: "all 0.15s", zIndex: 2 },
  lockIcon: { position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, opacity: 0.2, pointerEvents: "none", userSelect: "none" },
  selectDropdown: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, minWidth: 160, maxHeight: 240, overflowY: "auto", background: "#111117", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 4, zIndex: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" },
  selectOption: { padding: "7px 10px", fontSize: 13, color: "rgba(255,255,255,0.85)", borderRadius: 5, cursor: "pointer", fontFamily: "'Outfit', sans-serif", userSelect: "none" },
  selectOptionActive: { background: "rgba(201,168,76,0.15)", color: "#fff" },
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
  profileAvatar: { width: 72, height: 72, borderRadius: "50%", border: "3px solid rgba(201,168,76,0.3)", objectFit: "cover", display: "block" },
  profileAvatarRing: { position: "absolute", top: "50%", left: "50%", width: 80, height: 80, transform: "translate(-50%, -50%)", borderRadius: "50%", border: "2px solid rgba(201,168,76,0.15)", pointerEvents: "none" },
  profileName: { fontSize: 22, fontWeight: 700, letterSpacing: -0.3 },
  profileUsername: { fontSize: 14, color: "rgba(255,255,255,0.35)", marginTop: 2 },
  profileDivider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "24px 0" },
  profileFields: { display: "flex", flexDirection: "column", gap: 16 },
  profileField: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  profileLabel: { fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 400 },
  profileValue: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 },

  loadingScreen: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#000", gap: 16 },
  loadingPulse: { width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(201,168,76,0.2)", borderTopColor: "#C9A84C", animation: "spin 0.8s linear infinite" },
  loadingText: { fontFamily: "'Outfit', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)" },

  contactWrap: { position: "fixed", bottom: 24, left: 16, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  contactBtn: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, transition: "background 0.2s" },
  contactLabel: { fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500, letterSpacing: 0.3, whiteSpace: "nowrap", opacity: 0, transform: "translateY(4px)", transition: "opacity 0.2s, transform 0.2s", pointerEvents: "none" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  modalBox: { background: "#0e0e12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "36px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, minWidth: 320 },
  modalTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: 1 },
  modalSub: { fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit', sans-serif" },
  modalEmail: { fontSize: 15, color: "#C9A84C", fontFamily: "'Outfit', sans-serif", fontWeight: 600, textDecoration: "none", letterSpacing: 0.3 },
  modalClose: { marginTop: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "8px 24px", color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: "pointer" },
  subSelect: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "'Outfit', sans-serif", outline: "none", width: "100%", cursor: "pointer" },
  subCurrent: { fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Outfit', sans-serif" },
  subConfirm: { background: "rgba(201,168,76,0.12)", borderColor: "rgba(201,168,76,0.25)", color: "#C9A84C" },
  fixBtn: { background: "none", border: "none", color: "#C9A84C", fontSize: 12, fontFamily: "'Outfit', sans-serif", cursor: "pointer", padding: 0, fontWeight: 500, letterSpacing: 0.3, textDecoration: "underline", textUnderlineOffset: 3 },
};
