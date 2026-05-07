import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://vntg-api-production.up.railway.app";

const LETTERS = ["V", "A", "N", "T", "A", "G", "E"];
const AGENTS = ["JETT", "REYNA", "RAZE", "PHOENIX", "NEON", "YORU", "ISO", "SAGE", "SKYE", "KILLJOY", "CYPHER", "CHAMBER", "DEADLOCK", "GEKKO", "FADE", "SOVA", "BREACH", "KAYO", "TEJO", "OMEN", "BRIMSTONE", "VIPER", "ASTRA", "HARBOR", "CLOVE", "MIKS", "VYSE", "WAYLAY", "VETO"];

/* Particle system */
function createParticles(canvas) {
  const ctx = canvas.getContext("2d");
  let particles = [];
  let mouse = { x: -1000, y: -1000 };
  let raf;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function init() {
    particles = [];
    const count = Math.floor((canvas.width * canvas.height) / 15000);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.2 + 0.3,
        o: Math.random() * 0.25 + 0.05,
        vario: Math.random() * 0.15,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "rgba(88,101,242,0)");
    gradient.addColorStop(1, "rgba(6,182,212,0)");

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const glow = dist < 250 ? (1 - dist / 250) * 0.7 : 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + glow * 2, 0, Math.PI * 2);
      const hue = 270 + (Math.sin(Date.now() * 0.0003 + p.o) * 30);
      ctx.fillStyle = `hsla(${hue}, 80%, 55%, ${p.o + glow * 0.5})`;
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      const da = Math.sqrt((mouse.x - a.x) ** 2 + (mouse.y - a.y) ** 2);
      if (da > 200) continue;
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const db = Math.sqrt((mouse.x - b.x) ** 2 + (mouse.y - b.y) ** 2);
        if (db > 200) continue;
        const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        if (d < 140) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(88,101,242,${0.1 * (1 - d / 140)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    raf = requestAnimationFrame(draw);
  }

  function onMouse(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  resize();
  init();
  draw();
  window.addEventListener("resize", () => { resize(); init(); });
  window.addEventListener("mousemove", onMouse);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("mousemove", onMouse);
  };
}

function useFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.unobserve(el); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function FadeSection({ children, style, delay = 0 }) {
  const ref = useFadeIn();
  return (
    <div ref={ref} className="fade-section" style={{ ...style, transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function FeatureCard({ icon, title, desc, delay }) {
  const [hovered, setHovered] = useState(false);
  const ref = useFadeIn();
  return (
    <div
      ref={ref}
      className="fade-section"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s.featureCard,
        transitionDelay: `${delay}ms`,
        transform: hovered ? "translateY(-12px) scale(1.03)" : "translateY(0) scale(1)",
        borderColor: hovered ? "rgba(88,101,242,0.5)" : "rgba(255,255,255,0.08)",
        background: hovered ? "rgba(88,101,242,0.08)" : "rgba(88,101,242,0.03)",
        boxShadow: hovered ? "0 20px 60px rgba(88,101,242,0.15), inset 0 1px 1px rgba(255,255,255,0.1)" : "0 8px 32px rgba(0,0,0,0.2)",
        backdropFilter: "blur(20px)",
      }}
    >
      <span style={s.featureIcon}>{icon}</span>
      <h3 style={s.featureTitle}>{title}</h3>
      <p style={s.featureDesc}>{desc}</p>
    </div>
  );
}

function AgentGrid() {
  const ref = useFadeIn();
  return (
    <div ref={ref} className="fade-section" style={s.agentGridWrap}>
      <div style={s.agentBadge}>
        <span style={s.agentBadgeText}>AGENTS COVERED</span>
        <span style={s.agentBadgeValue}>ALL</span>
      </div>
      <div style={s.agentGrid}>
        {AGENTS.map((agent, i) => (
          <div key={i} style={s.agentTag} title={agent}>
            {agent.slice(0, 3)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ScrollScene() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

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

    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      saveToken(tokenFromUrl);
      window.history.replaceState({}, "", "/");
    }

    const token = tokenFromUrl || readToken();
    if (!token) {
      setAuthChecked(true);
      return;
    }

    fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setUser(data); setAuthChecked(true); })
      .catch(() => { setAuthChecked(true); });
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    return createParticles(canvasRef.current);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = useCallback(() => {
    window.location.href = `${API_URL}/api/login`;
  }, []);

  const handleContinue = useCallback(() => {
    if (user && !user.onboarding_complete) {
      navigate("/onboarding");
    } else {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  if (!authChecked) {
    return (
      <div style={s.loadingScreen}>
        <div style={s.loadingPulse} />
      </div>
    );
  }

  const displayNick = user?.vantage_nick || user?.global_name || user?.username;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <canvas ref={canvasRef} style={s.canvas} />
      <div style={s.orbTop} />
      <div style={s.orbBottom} />
      <div style={s.orbMid} />

      <nav style={s.navbar}>
        <span style={s.navLogo}>VANTAGE</span>
        <div style={s.navRight}>
          {user ? (
            <button onClick={handleContinue} style={s.navBtn}>
              Dashboard
            </button>
          ) : (
            <button onClick={handleLogin} style={s.navBtn}>
              <DiscordIcon /> Sign in
            </button>
          )}
        </div>
      </nav>

      <div style={s.scrollWrap}>
        <section style={s.hero}>
          <div style={{
            ...s.heroInner,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(40px)",
          }}>
            {user ? (
              <>
                <div style={s.welcomeLetters}>
                  {LETTERS.map((l, i) => (
                    <span key={i} style={{ ...s.heroLetter, animationDelay: `${i * 0.08}s` }}>{l}</span>
                  ))}
                </div>
                <h1 style={s.welcomeHeading}>
                  WELCOME, <span style={s.nickHighlight}>{displayNick}</span>
                </h1>
                <p style={s.heroSub}>Your competitive edge awaits. Dive back in.</p>
                <button onClick={handleContinue} style={s.ctaBtn}>
                  {user.onboarding_complete ? "Go to Dashboard" : "Complete Setup"}
                  <span style={s.ctaArrow}>→</span>
                </button>
              </>
            ) : (
              <>
                <div style={s.welcomeLetters}>
                  {LETTERS.map((l, i) => (
                    <span key={i} style={{ ...s.heroLetter, animationDelay: `${i * 0.08}s` }}>{l}</span>
                  ))}
                </div>
                <h1 style={s.heroHeading}>
                  Master <span style={s.gradientText}>Valorant</span> Through <span style={s.gradientText2}>Pro Play</span>
                </h1>
                <p style={s.heroSub}>
                  Watch professional players dominate with every agent. Filter by playstyle, map, or player. Learn from the best.
                </p>
                <div style={s.ctaGroup}>
                  <button onClick={handleLogin} style={s.ctaBtn}>
                    <DiscordIcon /> Get Started Free
                    <span style={s.ctaArrow}>→</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {!user && (
            <div style={s.scrollHint}>
              <span>Scroll to explore</span>
              <svg width="10" height="16" viewBox="0 0 14 20" fill="none" style={s.scrollArrow}>
                <path d="M7 3L7 15" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round" />
                <path d="M3 12L7 16.5L11 12" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </section>

        {!user && (
          <>
            <section style={s.section}>
              <FadeSection>
                <h2 style={s.sectionTitle}>Why VANTAGE?</h2>
                <p style={s.sectionSub}>The complete toolkit for competitive Valorant players.</p>
              </FadeSection>
              <div style={s.featuresGrid}>
                <FeatureCard
                  icon="🎯"
                  title="All Agents Covered"
                  desc="Every single agent. Every playstyle. From Duelists to Controllers — master them all with pro-level demonstrations."
                  delay={0}
                />
                <FeatureCard
                  icon="⚡"
                  title="Real-Time Filtering"
                  desc="Find the exact content you need. Filter by agent, map, player, or role. See results instantly."
                  delay={100}
                />
                <FeatureCard
                  icon="🚀"
                  title="Professional Insights"
                  desc="Learn strategies from players at the highest level. Study positioning, utility usage, and game sense."
                  delay={200}
                />
              </div>
            </section>

            <section style={s.agentSection}>
              <FadeSection>
                <h2 style={s.sectionTitle}>Complete Coverage</h2>
              </FadeSection>
              <AgentGrid />
            </section>

            <section style={s.section}>
              <div style={s.statsRow}>
                <FadeSection style={s.statBlock} delay={0}>
                  <span style={s.statNumber}>500+</span>
                  <span style={s.statLabel}>Pro VODs</span>
                </FadeSection>
                <FadeSection style={s.statBlock} delay={100}>
                  <span style={s.statNumber}>29</span>
                  <span style={s.statLabel}>Agents</span>
                </FadeSection>
                <FadeSection style={s.statBlock} delay={200}>
                  <span style={s.statNumber}>Free</span>
                  <span style={s.statLabel}>Forever</span>
                </FadeSection>
              </div>
            </section>

            <section style={{ ...s.section, ...s.ctaSection }}>
              <FadeSection style={{ textAlign: "center" }}>
                <h2 style={s.ctaTitle}>Ready to Rank Up?</h2>
                <p style={s.ctaSub}>Join the community. Learn from the pros. Dominate the competition.</p>
                <button onClick={handleLogin} style={{ ...s.ctaBtn, marginTop: 40 }}>
                  <DiscordIcon /> Sign in with Discord
                  <span style={s.ctaArrow}>→</span>
                </button>
              </FadeSection>
            </section>

            <footer style={s.footer}>
              <span style={s.footerLogo}>VANTAGE</span>
              <span style={s.footerDivider}>•</span>
              <span style={s.footerText}>Built for the competitive Valorant community.</span>
            </footer>
          </>
        )}
      </div>
    </>
  );
}

function DiscordIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 71 55" fill="currentColor" style={{ marginRight: 8, flexShrink: 0 }}>
      <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A39 39 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.7 58.7 0 0017.7 9a.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 010-.4l1.1-.9a.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .3 36.4 36.4 0 01-5.5 2.7.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.3.1A58.5 58.5 0 0070.3 45.6v-.1c1.4-14.8-2.3-27.6-9.8-39a.2.2 0 00-.1 0zM23.7 37.3c-3.4 0-6.2-3.1-6.2-6.9s2.7-6.9 6.2-6.9 6.3 3.1 6.2 6.9c0 3.8-2.8 6.9-6.2 6.9zm22.9 0c-3.4 0-6.2-3.1-6.2-6.9s2.7-6.9 6.2-6.9 6.3 3.1 6.2 6.9c0 3.8-2.7 6.9-6.2 6.9z" />
    </svg>
  );
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@200;300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { background: #050507; overflow-x: hidden; position: relative; }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(88,101,242,0.4); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(88,101,242,0.6); }

  .fade-section {
    opacity: 0;
    transform: translateY(32px);
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .fade-section.visible {
    opacity: 1;
    transform: translateY(0);
  }

  @keyframes letterIn {
    from { opacity: 0; transform: translateY(30px) scale(0.8) rotateX(-10deg); filter: blur(10px); }
    to { opacity: 1; transform: translateY(0) scale(1) rotateX(0); filter: blur(0); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.08); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(6px); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes glow {
    0%, 100% { text-shadow: 0 0 10px rgba(88, 101, 242, 0.3), 0 0 20px rgba(88, 101, 242, 0.15); }
    50% { text-shadow: 0 0 20px rgba(88, 101, 242, 0.6), 0 0 40px rgba(88, 101, 242, 0.3); }
  }
`;

const s = {
  loadingScreen: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050507" },
  loadingPulse: { width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(88,101,242,0.2)", borderTopColor: "#5865F2", animation: "spin 0.8s linear infinite" },

  canvas: { position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" },
  orbTop: { position: "fixed", top: -400, right: -300, width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(circle, rgba(88,101,242,0.12) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, animation: "pulse 12s ease-in-out infinite" },
  orbBottom: { position: "fixed", bottom: -500, left: -300, width: 1000, height: 1000, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, animation: "pulse 14s ease-in-out infinite 2s" },
  orbMid: { position: "fixed", top: "50%", left: "-20%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, animation: "pulse 16s ease-in-out infinite 4s" },

  navbar: { position: "fixed", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 40px", zIndex: 100, backdropFilter: "blur(30px)", background: "rgba(5,5,7,0.5)", borderBottom: "1px solid rgba(88,101,242,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" },
  navLogo: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, letterSpacing: 3, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg, #5865F2, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  navRight: { display: "flex", alignItems: "center", gap: 16 },
  navBtn: { display: "inline-flex", alignItems: "center", background: "linear-gradient(135deg, #5865F2, #3B82F6)", border: "1px solid rgba(88,101,242,0.3)", color: "#fff", padding: "12px 26px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)", boxShadow: "0 8px 24px rgba(88,101,242,0.25)", letterSpacing: 0.5 },

  scrollWrap: { position: "relative", zIndex: 10, fontFamily: "'Outfit', sans-serif", color: "#fff" },

  hero: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "140px 24px 80px", textAlign: "center", position: "relative" },
  heroInner: { transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)" },
  welcomeLetters: { display: "flex", gap: "clamp(8px, 2vw, 20px)", justifyContent: "center", marginBottom: 28 },
  heroLetter: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(48px, 8vw, 84px)", fontWeight: 800, lineHeight: 1, color: "rgba(255,255,255,0.95)", animation: "letterIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both", userSelect: "none", textShadow: "0 2px 20px rgba(88,101,242,0.2)" },
  heroHeading: { fontFamily: "'Outfit', sans-serif", fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 800, letterSpacing: -0.8, marginBottom: 20, lineHeight: 1.15 },
  welcomeHeading: { fontFamily: "'Outfit', sans-serif", fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 800, letterSpacing: -0.6, marginBottom: 16, lineHeight: 1.2 },
  gradientText: { background: "linear-gradient(135deg, #5865F2, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", position: "relative" },
  gradientText2: { background: "linear-gradient(135deg, #F97316, #EC4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  nickHighlight: { color: "#06B6D4", fontWeight: 900, textShadow: "0 0 20px rgba(6,182,212,0.4)" },
  heroSub: { fontSize: "clamp(16px, 1.8vw, 20px)", color: "rgba(255,255,255,0.55)", maxWidth: 560, marginLeft: "auto", marginRight: "auto", marginBottom: 44, lineHeight: 1.8, fontWeight: 300 },
  ctaGroup: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  ctaBtn: { display: "inline-flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg, #5865F2 0%, #3B82F6 100%)", border: "1px solid rgba(88,101,242,0.4)", color: "#fff", padding: "16px 40px", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)", letterSpacing: 0.3, boxShadow: "0 12px 40px rgba(88,101,242,0.3), inset 0 1px 1px rgba(255,255,255,0.2)" },

  scrollHint: { position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.25)", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontWeight: 400, animation: "float 3.5s ease-in-out infinite" },
  scrollArrow: { animation: "bob 2.5s ease-in-out infinite", opacity: 0.7 },

  section: { padding: "120px 24px", maxWidth: 1200, marginLeft: "auto", marginRight: "auto" },
  agentSection: { padding: "120px 24px", maxWidth: 1400, marginLeft: "auto", marginRight: "auto", background: "linear-gradient(180deg, rgba(88,101,242,0.04) 0%, transparent 100%)" },
  sectionTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, letterSpacing: 1, textAlign: "center", marginBottom: 16, background: "linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  sectionSub: { fontSize: 18, color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 60, fontWeight: 300 },

  featuresGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 },
  featureCard: { background: "rgba(88,101,242,0.04)", border: "1px solid rgba(88,101,242,0.15)", borderRadius: 20, padding: "40px 36px", transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)", cursor: "default", position: "relative", overflow: "hidden" },
  featureIcon: { fontSize: 48, display: "block", marginBottom: 20 },
  featureTitle: { fontSize: 22, fontWeight: 800, marginBottom: 14, letterSpacing: -0.3 },
  featureDesc: { fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.8, fontWeight: 300 },

  agentGridWrap: { marginTop: 60 },
  agentBadge: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 48, background: "linear-gradient(135deg, rgba(88,101,242,0.1), rgba(6,182,212,0.1))", border: "2px solid rgba(88,101,242,0.2)", borderRadius: 20, padding: "24px 48px", backdropFilter: "blur(20px)" },
  agentBadgeText: { fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase" },
  agentBadgeValue: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 900, background: "linear-gradient(135deg, #5865F2, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  agentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 12, maxWidth: 900, marginLeft: "auto", marginRight: "auto" },
  agentTag: { background: "rgba(88,101,242,0.08)", border: "1px solid rgba(88,101,242,0.2)", color: "rgba(255,255,255,0.7)", padding: "12px", borderRadius: 10, textAlign: "center", fontSize: 12, fontWeight: 600, letterSpacing: 1, cursor: "default", transition: "all 0.3s", textTransform: "uppercase" },

  statsRow: { display: "flex", justifyContent: "center", gap: "clamp(40px, 8vw, 120px)", flexWrap: "wrap" },
  statBlock: { textAlign: "center" },
  statNumber: { display: "block", fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(44px, 6vw, 64px)", fontWeight: 900, letterSpacing: 1, background: "linear-gradient(135deg, #5865F2, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 },
  statLabel: { fontSize: 15, color: "rgba(255,255,255,0.4)", fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase" },

  ctaSection: { paddingTop: 80, paddingBottom: 140, background: "linear-gradient(180deg, transparent 0%, rgba(88,101,242,0.05) 100%)", borderTop: "1px solid rgba(88,101,242,0.1)" },
  ctaTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, letterSpacing: 1, marginBottom: 16 },
  ctaSub: { fontSize: 18, color: "rgba(255,255,255,0.45)", fontWeight: 300, marginBottom: 0 },

  footer: { padding: "50px 24px", borderTop: "1px solid rgba(88,101,242,0.1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap", background: "rgba(88,101,242,0.02)" },
  footerLogo: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 800, letterSpacing: 2, color: "rgba(88,101,242,0.6)" },
  footerDivider: { color: "rgba(255,255,255,0.1)", fontSize: 16 },
  footerText: { fontSize: 13, color: "rgba(255,255,255,0.25)", fontWeight: 300, letterSpacing: 0.5 },
};
