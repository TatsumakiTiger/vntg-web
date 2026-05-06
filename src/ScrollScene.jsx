import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://vntg-api-production.up.railway.app";

const LETTERS = ["V", "A", "N", "T", "A", "G", "E"];

/* ── Particle system ── */
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
    const count = Math.floor((canvas.width * canvas.height) / 12000);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.3 + 0.05,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
      const glow = dist < 200 ? (1 - dist / 200) * 0.5 : 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + glow * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(88,101,242,${p.o + glow})`;
      ctx.fill();
    }

    // connection lines near mouse
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      const da = Math.sqrt((mouse.x - a.x) ** 2 + (mouse.y - a.y) ** 2);
      if (da > 180) continue;
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const db = Math.sqrt((mouse.x - b.x) ** 2 + (mouse.y - b.y) ** 2);
        if (db > 180) continue;
        const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(88,101,242,${0.08 * (1 - d / 120)})`;
          ctx.lineWidth = 0.5;
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

/* ── Section fade-in observer ── */
function useFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function FadeSection({ children, style, delay = 0 }) {
  const ref = useFadeIn();
  return (
    <div
      ref={ref}
      className="fade-section"
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Feature card ── */
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
        transform: hovered ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
        borderColor: hovered ? "rgba(88,101,242,0.3)" : "rgba(255,255,255,0.06)",
        boxShadow: hovered ? "0 12px 40px rgba(88,101,242,0.1)" : "none",
      }}
    >
      <span style={s.featureIcon}>{icon}</span>
      <h3 style={s.featureTitle}>{title}</h3>
      <p style={s.featureDesc}>{desc}</p>
    </div>
  );
}

/* ══════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════ */
export default function ScrollScene() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  // Token handling + auth check
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

  // Particles
  useEffect(() => {
    if (!canvasRef.current) return;
    return createParticles(canvasRef.current);
  }, []);

  // Hero entrance animation
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

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={s.canvas} />

      {/* Gradient orbs */}
      <div style={s.orbTop} />
      <div style={s.orbBottom} />

      {/* ── Navbar ── */}
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

      {/* ── Scroll container ── */}
      <div style={s.scrollWrap}>

        {/* ═══ HERO ═══ */}
        <section style={s.hero}>
          <div style={{
            ...s.heroInner,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(30px)",
          }}>
            {user ? (
              /* ── Logged-in hero ── */
              <>
                <div style={s.welcomeLetters}>
                  {LETTERS.map((l, i) => (
                    <span key={i} style={{ ...s.heroLetter, animationDelay: `${i * 0.08}s` }}>{l}</span>
                  ))}
                </div>
                <h1 style={s.welcomeHeading}>
                  WELCOME, <span style={s.nickHighlight}>{displayNick}</span>
                </h1>
                <p style={s.heroSub}>Your competitive edge awaits.</p>
                <button onClick={handleContinue} style={s.ctaBtn}>
                  {user.onboarding_complete ? "Go to Dashboard" : "Complete Setup"}
                  <span style={s.ctaArrow}>→</span>
                </button>
              </>
            ) : (
              /* ── Guest hero ── */
              <>
                <div style={s.welcomeLetters}>
                  {LETTERS.map((l, i) => (
                    <span key={i} style={{ ...s.heroLetter, animationDelay: `${i * 0.08}s` }}>{l}</span>
                  ))}
                </div>
                <h1 style={s.heroHeading}>Your Competitive Edge</h1>
                <p style={s.heroSub}>
                  Pro player VODs, analytics, and insights — all in one place.
                </p>
                <button onClick={handleLogin} style={s.ctaBtn}>
                  <DiscordIcon /> Get Started
                  <span style={s.ctaArrow}>→</span>
                </button>
              </>
            )}
          </div>

          {/* Scroll indicator */}
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

        {/* ═══ FEATURES (only for guests) ═══ */}
        {!user && (
          <>
            <section style={s.section}>
              <FadeSection>
                <h2 style={s.sectionTitle}>Everything You Need</h2>
                <p style={s.sectionSub}>Built for players who want to improve.</p>
              </FadeSection>
              <div style={s.featuresGrid}>
                <FeatureCard
                  icon="🎬"
                  title="Pro VODs"
                  desc="Access professional player POV recordings from top-tier matches, organized by agent, map, and player."
                  delay={0}
                />
                <FeatureCard
                  icon="🔍"
                  title="Smart Filters"
                  desc="Find exactly what you need. Filter by agent, map, player, or role — combinations update in real time."
                  delay={100}
                />
                <FeatureCard
                  icon="⚡"
                  title="Instant Access"
                  desc="One-click Discord sign in. No forms, no passwords. Your account links directly to your Discord profile."
                  delay={200}
                />
              </div>
            </section>

            {/* ═══ STATS ═══ */}
            <section style={s.section}>
              <div style={s.statsRow}>
                <StatBlock number="500+" label="Pro VODs" delay={0} />
                <StatBlock number="20+" label="Agents Covered" delay={100} />
                <StatBlock number="Free" label="Always" delay={200} />
              </div>
            </section>

            {/* ═══ CTA ═══ */}
            <section style={{ ...s.section, ...s.ctaSection }}>
              <FadeSection style={{ textAlign: "center" }}>
                <h2 style={s.ctaTitle}>Ready to Level Up?</h2>
                <p style={s.ctaSub}>Join the community and start learning from the pros.</p>
                <button onClick={handleLogin} style={{ ...s.ctaBtn, marginTop: 32 }}>
                  <DiscordIcon /> Sign in with Discord
                  <span style={s.ctaArrow}>→</span>
                </button>
              </FadeSection>
            </section>

            {/* Footer */}
            <footer style={s.footer}>
              <span style={s.footerLogo}>VANTAGE</span>
              <span style={s.footerText}>Built for the competitive community.</span>
            </footer>
          </>
        )}
      </div>
    </>
  );
}

/* ── Stat block ── */
function StatBlock({ number, label, delay }) {
  const ref = useFadeIn();
  return (
    <div ref={ref} className="fade-section" style={{ ...s.statBlock, transitionDelay: `${delay}ms` }}>
      <span style={s.statNumber}>{number}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  );
}

/* ── Discord icon ── */
function DiscordIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 71 55" fill="currentColor" style={{ marginRight: 8, flexShrink: 0 }}>
      <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A39 39 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.7 58.7 0 0017.7 9a.2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.7 38.7 0 01-5.5-2.6.2.2 0 010-.4l1.1-.9a.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .3 36.4 36.4 0 01-5.5 2.7.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.3.1A58.5 58.5 0 0070.3 45.6v-.1c1.4-14.8-2.3-27.6-9.8-39a.2.2 0 00-.1 0zM23.7 37.3c-3.4 0-6.2-3.1-6.2-6.9s2.7-6.9 6.2-6.9 6.3 3.1 6.2 6.9c0 3.8-2.8 6.9-6.2 6.9zm22.9 0c-3.4 0-6.2-3.1-6.2-6.9s2.7-6.9 6.2-6.9 6.3 3.1 6.2 6.9c0 3.8-2.7 6.9-6.2 6.9z" />
    </svg>
  );
}

/* ══════════════════════════════════════════
   Global CSS
   ══════════════════════════════════════════ */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { background: #050507; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

  .fade-section {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .fade-section.visible {
    opacity: 1;
    transform: translateY(0);
  }

  @keyframes letterIn {
    from { opacity: 0; transform: translateY(20px) scale(0.85); filter: blur(8px); }
    to   { opacity: 0.9; transform: translateY(0) scale(1); filter: blur(0); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(4px); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

/* ══════════════════════════════════════════
   Styles
   ══════════════════════════════════════════ */
const s = {
  loadingScreen: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050507" },
  loadingPulse: { width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(88,101,242,0.2)", borderTopColor: "#5865F2", animation: "spin 0.8s linear infinite" },

  canvas: { position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" },
  orbTop: { position: "fixed", top: -300, right: -200, width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(88,101,242,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, animation: "pulse 8s ease-in-out infinite" },
  orbBottom: { position: "fixed", bottom: -400, left: -200, width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, animation: "pulse 10s ease-in-out infinite 2s" },

  // Navbar
  navbar: { position: "fixed", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", zIndex: 100, backdropFilter: "blur(20px)", background: "rgba(5,5,7,0.6)", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  navLogo: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 4, color: "#fff" },
  navRight: { display: "flex", alignItems: "center", gap: 12 },
  navBtn: { display: "inline-flex", alignItems: "center", background: "#5865F2", border: "none", color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.2s", letterSpacing: 0.3 },

  // Scroll wrapper
  scrollWrap: { position: "relative", zIndex: 10, fontFamily: "'Outfit', sans-serif", color: "#fff" },

  // Hero
  hero: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 24px 60px", textAlign: "center", position: "relative" },
  heroInner: { transition: "all 0.9s cubic-bezier(0.16, 1, 0.3, 1)" },
  welcomeLetters: { display: "flex", gap: "clamp(6px, 1.5vw, 16px)", justifyContent: "center", marginBottom: 24 },
  heroLetter: { fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(36px, 7vw, 72px)", lineHeight: 1, color: "rgba(255,255,255,0.9)", animation: "letterIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both", userSelect: "none" },
  heroHeading: { fontFamily: "'Outfit', sans-serif", fontSize: "clamp(22px, 3.5vw, 42px)", fontWeight: 700, letterSpacing: -0.5, marginBottom: 16, lineHeight: 1.2 },
  welcomeHeading: { fontFamily: "'Outfit', sans-serif", fontSize: "clamp(20px, 3vw, 36px)", fontWeight: 700, letterSpacing: -0.5, marginBottom: 12, lineHeight: 1.2 },
  nickHighlight: { color: "#5865F2", position: "relative" },
  heroSub: { fontSize: "clamp(14px, 1.5vw, 18px)", color: "rgba(255,255,255,0.45)", maxWidth: 480, marginLeft: "auto", marginRight: "auto", marginBottom: 36, lineHeight: 1.7, fontWeight: 300 },
  ctaBtn: { display: "inline-flex", alignItems: "center", gap: 8, background: "#5865F2", border: "none", color: "#fff", padding: "14px 32px", borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.25s", letterSpacing: 0.3 },
  ctaArrow: { display: "inline-block", transition: "transform 0.25s", fontSize: 18 },

  scrollHint: { position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.25)", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", fontWeight: 300, animation: "float 3s ease-in-out infinite" },
  scrollArrow: { animation: "bob 2s ease-in-out infinite", opacity: 0.6 },

  // Sections
  section: { padding: "100px 24px", maxWidth: 1100, marginLeft: "auto", marginRight: "auto" },
  sectionTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: 2, textAlign: "center", marginBottom: 12 },
  sectionSub: { fontSize: 16, color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: 48, fontWeight: 300 },

  // Features
  featuresGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 },
  featureCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "32px 28px", transition: "all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)", cursor: "default" },
  featureIcon: { fontSize: 32, display: "block", marginBottom: 16 },
  featureTitle: { fontSize: 18, fontWeight: 700, marginBottom: 10, letterSpacing: -0.2 },
  featureDesc: { fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, fontWeight: 300 },

  // Stats
  statsRow: { display: "flex", justifyContent: "center", gap: "clamp(32px, 6vw, 80px)", flexWrap: "wrap" },
  statBlock: { textAlign: "center" },
  statNumber: { display: "block", fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: 2, background: "linear-gradient(135deg, #5865F2, #06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  statLabel: { fontSize: 14, color: "rgba(255,255,255,0.35)", fontWeight: 400, letterSpacing: 1, textTransform: "uppercase" },

  // CTA section
  ctaSection: { paddingTop: 60, paddingBottom: 100 },
  ctaTitle: { fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(28px, 4vw, 48px)", letterSpacing: 2, marginBottom: 12 },
  ctaSub: { fontSize: 16, color: "rgba(255,255,255,0.35)", fontWeight: 300, marginBottom: 0 },

  // Footer
  footer: { padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" },
  footerLogo: { fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: 3, color: "rgba(255,255,255,0.25)" },
  footerText: { fontSize: 12, color: "rgba(255,255,255,0.15)", fontWeight: 300 },
};
