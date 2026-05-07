import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://vntg-api-production.up.railway.app";

const LETTERS = ["V", "A", "N", "T", "A", "G", "E"];
const AGENTS = ["JETT", "REYNA", "RAZE", "PHOENIX", "NEON", "YORU", "ISO", "SAGE", "SKYE", "KILLJOY", "CYPHER", "CHAMBER", "DEADLOCK", "GEKKO", "FADE", "SOVA", "BREACH", "KAYO", "TEJO", "OMEN", "BRIMSTONE", "VIPER", "ASTRA", "HARBOR", "CLOVE", "MIKS", "VYSE", "WAYLAY", "VETO"];

/* ═══════════════════════════════════════════════════
   Brain Network + Crystals + Particles Canvas System
   ═══════════════════════════════════════════════════ */
function createScene(canvas) {
  const ctx = canvas.getContext("2d");
  let particles = [], brainNodes = [], crystals = [];
  let mouse = { x: -9999, y: -9999 };
  let scrollY = 0, raf;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function initBrain() {
    brainNodes = [];
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.40;
    const scale = Math.min(canvas.width * 0.35, canvas.height * 0.28, 300);
    const mob = canvas.width < 700;

    for (let side = -1; side <= 1; side += 2) {
      const count = mob ? 55 : 100;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 0.3 + Math.random() * 0.7;
        let x = cx + side * scale * 0.35 + Math.cos(a) * scale * r * 0.95;
        let y = cy + Math.sin(a) * scale * r * 0.72;
        const wrinkle = Math.sin(x * 0.015 + y * 0.012) * scale * 0.05;
        x += wrinkle; y += wrinkle * 0.7;
        if (Math.abs(x - cx) < scale * 0.05 && y < cy + scale * 0.12) continue;
        brainNodes.push({
          x, y, bx: x, by: y,
          r: 1.2 + Math.random() * 2,
          ph: Math.random() * Math.PI * 2,
          sp: 0.3 + Math.random() * 1,
          accent: Math.random() < 0.14,
        });
      }
    }
  }

  function initCrystals() {
    crystals = [];
    const n = canvas.width < 700 ? 8 : 20;
    for (let i = 0; i < n; i++) {
      crystals.push({
        x: Math.random() * canvas.width,
        by: Math.random() * canvas.height * 1.5,
        size: 10 + Math.random() * 28,
        rot: Math.random() * Math.PI * 2,
        rs: (Math.random() - 0.5) * 0.012,
        fs: 0.2 + Math.random() * 0.6,
        ph: Math.random() * Math.PI * 2,
        dp: 0.15 + Math.random() * 0.85,
        op: 0.18 + Math.random() * 0.22,
        gold: Math.random() < 0.3,
      });
    }
  }

  function initParticles() {
    particles = [];
    const n = Math.floor((canvas.width * canvas.height) / 22000);
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: 0.4 + Math.random() * 0.8,
        o: 0.04 + Math.random() * 0.12,
      });
    }
  }

  function init() {
    initParticles();
    initBrain();
    initCrystals();
  }

  function draw() {
    const t = Date.now() * 0.001;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* ── Brain fade on scroll ── */
    const bf = Math.max(0, 1 - scrollY / (canvas.height * 0.6));

    if (bf > 0.01) {
      /* connections */
      const md = Math.min(canvas.width, canvas.height) * 0.14;
      ctx.lineWidth = 0.7;
      for (let i = 0; i < brainNodes.length; i++) {
        const a = brainNodes[i];
        a.x = a.bx + Math.sin(t * a.sp + a.ph) * 2.2;
        a.y = a.by + Math.cos(t * a.sp * 0.6 + a.ph) * 1.5;
        for (let j = i + 1; j < brainNodes.length; j++) {
          const b = brainNodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < md) {
            const base = 0.14 * (1 - d / md) * bf;
            const mx2 = (a.x + b.x) / 2, my2 = (a.y + b.y) / 2;
            const mDist = Math.sqrt((mouse.x - mx2) ** 2 + (mouse.y - my2) ** 2);
            const mg = mDist < 250 ? (1 - mDist / 250) * 0.25 : 0;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(120,140,255,${base + mg})`;
            ctx.stroke();
          }
        }
      }

      /* nodes with glow */
      for (const n of brainNodes) {
        const mDist = Math.sqrt((mouse.x - n.x) ** 2 + (mouse.y - n.y) ** 2);
        const glow = mDist < 200 ? (1 - mDist / 200) * 0.6 : 0;
        const pulse = Math.sin(t * 1.5 + n.ph) * 0.12 + 0.88;
        const sz = n.r * pulse + glow * 3;

        if (glow > 0.1 || n.accent) {
          ctx.shadowBlur = n.accent ? 12 : 8 + glow * 16;
          ctx.shadowColor = n.accent ? "rgba(201,168,76,0.6)" : "rgba(88,101,242,0.5)";
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, sz, 0, Math.PI * 2);
        if (n.accent) {
          ctx.fillStyle = `rgba(201,168,76,${(0.7 + glow * 0.3) * pulse * bf})`;
        } else {
          ctx.fillStyle = `rgba(160,175,255,${(0.5 + glow * 0.4) * pulse * bf})`;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    /* ── Crystals ── */
    for (const c of crystals) {
      c.rot += c.rs;
      const cy2 = c.by + Math.sin(t * c.fs + c.ph) * 18 - scrollY * c.dp * 0.35;
      const col = c.gold ? "201,168,76" : "120,140,255";

      ctx.save();
      ctx.translate(c.x, cy2);
      ctx.rotate(c.rot);
      ctx.globalAlpha = c.op;

      /* diamond shape */
      ctx.beginPath();
      ctx.moveTo(0, -c.size);
      ctx.lineTo(c.size * 0.55, 0);
      ctx.lineTo(0, c.size * 0.75);
      ctx.lineTo(-c.size * 0.55, 0);
      ctx.closePath();
      ctx.fillStyle = `rgba(${col},0.06)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${col},0.45)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      /* cross lines */
      ctx.beginPath();
      ctx.moveTo(-c.size * 0.55, 0);
      ctx.lineTo(c.size * 0.55, 0);
      ctx.moveTo(0, -c.size);
      ctx.lineTo(0, c.size * 0.75);
      ctx.strokeStyle = `rgba(${col},0.18)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.restore();
    }

    /* ── Ambient particles ── */
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const g = dist < 200 ? (1 - dist / 200) * 0.4 : 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + g * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(120,140,255,${p.o + g * 0.3})`;
      ctx.fill();
    }

    /* particle connections near mouse */
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      if (Math.abs(mouse.x - a.x) > 160 || Math.abs(mouse.y - a.y) > 160) continue;
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        if (Math.abs(mouse.x - b.x) > 160 || Math.abs(mouse.y - b.y) > 160) continue;
        const d = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(88,101,242,${0.06 * (1 - d / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    raf = requestAnimationFrame(draw);
  }

  function onMouse(e) { mouse.x = e.clientX; mouse.y = e.clientY; }
  function onScroll() { scrollY = window.scrollY; }

  resize(); init(); draw();
  window.addEventListener("resize", () => { resize(); init(); });
  window.addEventListener("mousemove", onMouse);
  window.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("mousemove", onMouse);
    window.removeEventListener("scroll", onScroll);
  };
}

/* ═══════════════════════════════════════
   UI Components
   ═══════════════════════════════════════ */
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
        background: hovered ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
        border: "1px solid",
        borderColor: hovered ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "36px 30px",
        transition: "all 0.4s cubic-bezier(0.25,0.46,0.45,0.94)",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
        transitionDelay: `${delay}ms`,
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
        boxShadow: hovered ? "0 20px 60px rgba(0,0,0,0.3), 0 0 40px rgba(201,168,76,0.05)" : "none",
      }}
    >
      {/* top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)",
        opacity: hovered ? 1 : 0, transition: "opacity 0.4s",
      }} />
      <span style={{ fontSize: 36, display: "block", marginBottom: 18 }}>{icon}</span>
      <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>{title}</h3>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.8, fontWeight: 300 }}>{desc}</p>
    </div>
  );
}

function AgentGrid() {
  const ref = useFadeIn();
  return (
    <div ref={ref} className="fade-section" style={{ marginTop: 50 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 40,
        border: "1px solid rgba(201,168,76,0.15)", borderRadius: 16, padding: "20px 40px",
        background: "rgba(201,168,76,0.03)",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.4)", letterSpacing: 3, textTransform: "uppercase" }}>AGENTS COVERED</span>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 40, fontWeight: 900, color: "#C9A84C" }}>ALL</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))", gap: 8, maxWidth: 800, margin: "0 auto" }}>
        {AGENTS.map((a, i) => (
          <div key={i} style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.5)", padding: 10, borderRadius: 8, textAlign: "center",
            fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
          }} title={a}>{a.slice(0, 3)}</div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Main ScrollScene Component
   ═══════════════════════════════════════ */
export default function ScrollScene() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  /* Auth */
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
    if (tokenFromUrl) { saveToken(tokenFromUrl); window.history.replaceState({}, "", "/"); }
    const token = tokenFromUrl || readToken();
    if (!token) { setAuthChecked(true); return; }
    fetch(`${API_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setUser(data); setAuthChecked(true); })
      .catch(() => { setAuthChecked(true); });
  }, []);

  /* Canvas */
  useEffect(() => {
    if (!canvasRef.current) return;
    return createScene(canvasRef.current);
  }, []);

  /* Hero entrance */
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = useCallback(() => { window.location.href = `${API_URL}/api/login`; }, []);
  const handleContinue = useCallback(() => {
    if (user && !user.onboarding_complete) navigate("/onboarding");
    else navigate("/dashboard");
  }, [user, navigate]);

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050507" }}>
        <style>{CSS}</style>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(201,168,76,0.2)", borderTopColor: "#C9A84C", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const displayNick = user?.vantage_nick || user?.global_name || user?.username;

  return (
    <>
      <style>{CSS}</style>
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }} />

      {/* ─── NAV ─── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(20px, 4vw, 48px)", height: 64,
        background: "rgba(5,5,7,0.6)", backdropFilter: "blur(24px) saturate(1.3)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <span style={{
          fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700,
          letterSpacing: 4, color: "#fff",
        }}>VANTAGE</span>
        <div>
          {user ? (
            <button onClick={handleContinue} style={S.navBtn}>Dashboard</button>
          ) : (
            <button onClick={handleLogin} style={S.navBtn}>Sign in</button>
          )}
        </div>
      </nav>

      {/* ─── CONTENT ─── */}
      <div style={{ position: "relative", zIndex: 10, fontFamily: "'Outfit',sans-serif", color: "#fff" }}>

        {/* ═══ HERO ═══ */}
        <section style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "120px 24px 80px", textAlign: "center", position: "relative",
        }}>
          <div style={{
            transition: "all 1.2s cubic-bezier(0.16,1,0.3,1)",
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(50px)",
          }}>
            {user ? (
              <>
                <div style={S.letters}>
                  {LETTERS.map((l, i) => (
                    <span key={i} style={{ ...S.letter, animationDelay: `${i * 0.07}s` }}>{l}</span>
                  ))}
                </div>
                <h1 style={S.heroH1}>WELCOME, <span style={{ color: "#C9A84C" }}>{displayNick}</span></h1>
                <p style={S.heroSub}>Your competitive edge awaits.</p>
                <button onClick={handleContinue} style={S.ctaBtn}>
                  {user.onboarding_complete ? "Go to Dashboard" : "Complete Setup"}
                  <span style={S.arrow}>&#8594;</span>
                </button>
              </>
            ) : (
              <>
                <div style={S.letters}>
                  {LETTERS.map((l, i) => (
                    <span key={i} style={{ ...S.letter, animationDelay: `${i * 0.07}s` }}>{l}</span>
                  ))}
                </div>
                <h1 style={S.heroH1}>
                  Master <span style={{ color: "#C9A84C" }}>Valorant</span> Through{" "}
                  <span style={{ color: "#7B8CDE" }}>Pro Play</span>
                </h1>
                <p style={S.heroSub}>
                  Watch professional players dominate with every agent.<br />
                  Filter by playstyle, map, or player. Learn from the best.
                </p>
                <button onClick={handleLogin} style={S.ctaBtn}>
                  Get Started Free <span style={S.arrow}>&#8594;</span>
                </button>
              </>
            )}
          </div>

          {/* Moffett-style info blocks */}
          {!user && (
            <>
              <div className="info-block" style={{ ...S.infoBlock, right: "clamp(24px,5vw,80px)", top: "28%" }}>
                <div style={S.infoLabel}><span style={S.infoDot} />ANALYSIS</div>
                <div style={S.infoDesc}>advanced game analytics,<br/>coaching from top-tier<br/>players worldwide</div>
              </div>
              <div className="info-block" style={{ ...S.infoBlock, left: "clamp(24px,5vw,80px)", top: "60%" }}>
                <div style={S.infoLabel}><span style={S.infoDot} />COMMUNITY</div>
                <div style={S.infoDesc}>join an active community,<br/>share strategies and<br/>level up together</div>
              </div>
            </>
          )}

          {/* scroll hint */}
          {!user && (
            <div style={{
              position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              color: "rgba(255,255,255,0.2)", fontSize: 10, letterSpacing: 4,
              textTransform: "uppercase", fontFamily: "'Space Grotesk',sans-serif",
              animation: "float 3.5s ease-in-out infinite",
            }}>
              <span>Scroll</span>
              <div style={{ width: 1, height: 28, background: "linear-gradient(180deg, rgba(255,255,255,0.2), transparent)", animation: "scrollPulse 2s infinite ease-in-out" }} />
            </div>
          )}
        </section>

        {/* ═══ NON-AUTH SECTIONS ═══ */}
        {!user && (
          <>
            {/* Features */}
            <section style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto", position: "relative" }}>
              {/* Graph decoration */}
              <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }} viewBox="0 0 1200 500" preserveAspectRatio="none">
                <polyline points="0,350 100,330 200,340 350,280 500,300 650,230 800,260 950,200 1100,210 1200,150" fill="none" stroke="#C9A84C" strokeWidth="2" />
                <polyline points="0,400 150,390 300,370 500,340 700,310 900,280 1100,250 1200,220" fill="none" stroke="#5865F2" strokeWidth="1.5" />
                <circle cx="650" cy="230" r="4" fill="#C9A84C" opacity="0.5" />
                <circle cx="1200" cy="150" r="3" fill="#C9A84C" opacity="0.6" />
              </svg>

              <FadeSection>
                <h2 style={S.secTitle}>Why VANTAGE?</h2>
                <p style={S.secSub}>The complete toolkit for competitive Valorant players.</p>
              </FadeSection>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                <FeatureCard icon="&#9678;" title="All Agents Covered" desc="Every single agent. Every playstyle. From Duelists to Controllers — master them all with pro-level demonstrations." delay={0} />
                <FeatureCard icon="&#9889;" title="Real-Time Filtering" desc="Find the exact content you need. Filter by agent, map, player, or role. See results instantly." delay={100} />
                <FeatureCard icon="&#9733;" title="Professional Insights" desc="Learn strategies from players at the highest level. Study positioning, utility usage, and game sense." delay={200} />
              </div>
            </section>

            {/* Agents */}
            <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
              <FadeSection><h2 style={S.secTitle}>Complete Coverage</h2></FadeSection>
              <AgentGrid />
            </section>

            {/* Stats */}
            <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "clamp(40px, 8vw, 120px)", flexWrap: "wrap" }}>
                <FadeSection style={{ textAlign: "center" }} delay={0}>
                  <span style={S.statNum}>500+</span>
                  <span style={S.statLabel}>Pro VODs</span>
                </FadeSection>
                <FadeSection style={{ textAlign: "center" }} delay={100}>
                  <span style={S.statNum}>29</span>
                  <span style={S.statLabel}>Agents</span>
                </FadeSection>
                <FadeSection style={{ textAlign: "center" }} delay={200}>
                  <span style={S.statNum}>Free</span>
                  <span style={S.statLabel}>Forever</span>
                </FadeSection>
              </div>
            </section>

            {/* CTA */}
            <section style={{
              padding: "80px 24px 140px", textAlign: "center",
              borderTop: "1px solid rgba(201,168,76,0.08)",
              background: "linear-gradient(180deg, transparent, rgba(201,168,76,0.02))",
            }}>
              <FadeSection style={{ textAlign: "center" }}>
                <h2 style={{ ...S.secTitle, marginBottom: 14 }}>Ready to Rank Up?</h2>
                <p style={{ fontSize: 17, color: "rgba(255,255,255,0.35)", fontWeight: 300, marginBottom: 40 }}>
                  Join the community. Learn from the pros. Dominate.
                </p>
                <button onClick={handleLogin} style={S.ctaBtn}>
                  Join Now <span style={S.arrow}>&#8594;</span>
                </button>
              </FadeSection>
            </section>

            {/* Footer */}
            <footer style={{
              padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap",
            }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 3, color: "rgba(201,168,76,0.4)" }}>VANTAGE</span>
              <span style={{ color: "rgba(255,255,255,0.08)" }}>|</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", fontWeight: 300 }}>Built for the competitive Valorant community.</span>
            </footer>
          </>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════
   CSS + Styles
   ═══════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { background: #050507; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.25); border-radius: 3px; }

  .fade-section {
    opacity: 0; transform: translateY(28px);
    transition: all 0.8s cubic-bezier(0.16,1,0.3,1);
  }
  .fade-section.visible { opacity: 1; transform: translateY(0); }

  @keyframes letterIn {
    from { opacity: 0; transform: translateY(40px) scale(0.7); filter: blur(12px); }
    to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  }
  @keyframes float {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50%      { transform: translateX(-50%) translateY(-10px); }
  }
  @keyframes scrollPulse {
    0%,100% { transform: scaleY(0.4); opacity: 0.2; }
    50%     { transform: scaleY(1); opacity: 0.5; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes infoIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .info-block { animation: infoIn 0.8s ease-out forwards; opacity: 0; }

  @media (max-width: 900px) {
    .info-block { display: none !important; }
  }
`;

const S = {
  navBtn: {
    display: "inline-flex", alignItems: "center",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.8)", padding: "10px 24px", borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Outfit',sans-serif", transition: "all 0.25s", letterSpacing: 0.5,
  },
  letters: {
    display: "flex", gap: "clamp(6px, 2vw, 18px)", justifyContent: "center", marginBottom: 24,
  },
  letter: {
    fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(44px, 8vw, 90px)",
    fontWeight: 800, lineHeight: 1, color: "rgba(255,255,255,0.92)",
    animation: "letterIn 0.9s cubic-bezier(0.16,1,0.3,1) both",
    userSelect: "none",
    textShadow: "0 0 40px rgba(201,168,76,0.15), 0 0 80px rgba(88,101,242,0.1)",
  },
  heroH1: {
    fontFamily: "'Outfit',sans-serif", fontSize: "clamp(24px, 3.5vw, 48px)",
    fontWeight: 800, letterSpacing: -0.5, marginBottom: 18, lineHeight: 1.2,
  },
  heroSub: {
    fontSize: "clamp(15px, 1.6vw, 19px)", color: "rgba(255,255,255,0.4)",
    maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.8, fontWeight: 300,
  },
  ctaBtn: {
    display: "inline-flex", alignItems: "center", gap: 10,
    background: "linear-gradient(135deg, rgba(201,168,76,0.9), rgba(180,140,50,0.9))",
    border: "1px solid rgba(201,168,76,0.4)", color: "#050507",
    padding: "15px 40px", borderRadius: 10, fontSize: 15, fontWeight: 700,
    cursor: "pointer", fontFamily: "'Outfit',sans-serif",
    transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)", letterSpacing: 0.3,
    boxShadow: "0 8px 32px rgba(201,168,76,0.2)",
  },
  arrow: { fontSize: 18, transition: "transform 0.3s" },

  /* Moffett-style info blocks */
  infoBlock: {
    position: "absolute", maxWidth: 200,
  },
  infoDot: {
    display: "inline-block", width: 7, height: 7, borderRadius: "50%",
    background: "#C9A84C", marginRight: 8,
    boxShadow: "0 0 10px rgba(201,168,76,0.5)",
  },
  infoLabel: {
    fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700,
    letterSpacing: 3, color: "rgba(255,255,255,0.8)", marginBottom: 8,
    display: "flex", alignItems: "center",
  },
  infoDesc: {
    fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, lineHeight: 1.8,
    color: "rgba(255,255,255,0.3)",
  },

  secTitle: {
    fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(28px, 4.5vw, 48px)",
    fontWeight: 800, letterSpacing: 1, textAlign: "center", marginBottom: 14, color: "#fff",
  },
  secSub: {
    fontSize: 16, color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: 50, fontWeight: 300,
  },
  statNum: {
    display: "block", fontFamily: "'Space Grotesk',sans-serif",
    fontSize: "clamp(40px, 6vw, 60px)", fontWeight: 900, letterSpacing: 1,
    color: "#C9A84C", marginBottom: 6,
  },
  statLabel: {
    fontSize: 14, color: "rgba(255,255,255,0.3)", fontWeight: 500, letterSpacing: 2, textTransform: "uppercase",
  },
};
