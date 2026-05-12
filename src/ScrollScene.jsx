import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "https://vntg-api-production.up.railway.app";

function useFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("vis"); obs.unobserve(el); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Fade({ children, style, delay = 0 }) {
  const ref = useFadeIn();
  return (
    <div ref={ref} className="fi" style={{ ...style, transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export default function ScrollScene() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);
  const [sy, setSy] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [gotoReady, setGotoReady] = useState(false);
  const gotoTimer = useRef(null);

  useEffect(() => {
    const K = "vntg_session";
    const save = (t) => {
      try { localStorage.setItem(K, t); } catch {}
      document.cookie = `${K}=${t};expires=${new Date(Date.now() + 30 * 864e5).toUTCString()};path=/;SameSite=Lax`;
    };
    const read = () => {
      try { const t = localStorage.getItem(K); if (t) return t; } catch {}
      const m = document.cookie.match(new RegExp(`(?:^|; )${K}=([^;]*)`));
      return m ? m[1] : null;
    };
    const fromUrl = sp.get("token");
    if (fromUrl) { save(fromUrl); window.history.replaceState({}, "", "/"); }
    const tok = fromUrl || read();
    if (!tok) { setReady(true); return; }
    fetch(`${API}/api/me`, { headers: { Authorization: `Bearer ${tok}` } })
      .then((r) => { if (!r.ok) throw 0; return r.json(); })
      .then((d) => { setUser(d); setReady(true); })
      .catch(() => setReady(true));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const h = () => setSy(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const login = useCallback(() => { window.location.href = `${API}/api/login`; }, []);
  const go = useCallback(() => {
    navigate(user?.onboarding_complete ? "/dashboard" : "/onboarding");
  }, [user, navigate]);

  if (!ready) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000" }}>
      <style>{CSS}</style>
      <div className="spinner" />
    </div>
  );

  const nick = user?.vantage_nick || user?.global_name || user?.username;

  return (
    <>
      <style>{CSS}</style>

      {/* ─── NAVBAR ─── */}
      <nav className="nav" style={{
        background: sy > 60 ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.3)",
        backdropFilter: sy > 60 ? "blur(24px) saturate(1.3)" : "blur(12px)",
      }}>
        <span className="nav-logo">VANTAGE</span>
      </nav>

      {/* ─── MAIN CONTENT ─── */}
      <div className="main">

        {/* ═══ HERO ═══ */}
        <section className="hero">
          <div className={`hero-in ${show ? "vis" : ""}`}>
            {user ? (
              <>
                <span className="hero-tag hero-tag-welcome">Welcome</span>
                <h1 className="hero-big"><span className="gold-text">{nick}</span></h1>
                <p className="hero-p">Your competitive edge awaits.</p>
                <div
                  className="goto-wrap"
                  onMouseEnter={() => { gotoTimer.current = setTimeout(() => setGotoReady(true), 200); }}
                  onMouseLeave={() => { clearTimeout(gotoTimer.current); setGotoReady(false); }}
                >
                  <span className="goto-label">Explore &rarr;</span>
                  <div className="goto-divider" />
                  <div className="goto-options" style={{ pointerEvents: gotoReady ? "all" : "none" }}>
                    <button onClick={() => navigate("/dashboard")} className="goto-opt">Pro View</button>
                    <button onClick={() => navigate("/dashboard?tab=consistency")} className="goto-opt">Vlingo</button>
                    <button onClick={() => navigate("/dashboard?tab=analyzer")} className="goto-opt">Game Analyzer</button>
                    <button onClick={() => navigate("/dashboard?tab=profile")} className="goto-opt">Profile</button>
                  </div>
                </div>

              </>
            ) : (
              <>
                <span className="hero-tag">GET CONSISTENT</span>
                <h1 className="hero-big">
                  MASTER<br />
                  <span className="gold-text">VALORANT</span>
                </h1>
                <p className="hero-p">
                  Watch professional players dominate with every agent.<br />
                  Filter by playstyle, map, or player. Learn from the best.
                </p>
                <button onClick={login} className="cta">
                  Get Started Free
                  <span className="arr">&rarr;</span>
                </button>
              </>
            )}
          </div>

          {!user && (
            <div className="scroll-cue" style={{ opacity: Math.max(0, 1 - sy / 120), pointerEvents: "none" }}>
              <span>SCROLL</span>
              <div className="scroll-bar" />
            </div>
          )}
        </section>

        {/* ═══ NON-AUTH SECTIONS ═══ */}
        {!user && (
          <>
            {/* ── Transition gradient ── */}
            <div style={{ height: 160, background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.92))", pointerEvents: "none" }} />

            {/* ── Features ── */}
            <section className="sec">
              <div className="sec-in">
                <Fade>
                  <span className="sec-tag">WHY VANTAGE</span>
                  <h2 className="sec-h">Everything you need<br />to rank up.</h2>
                </Fade>
                <div className="feat-grid">
                  {[
                    ["01", "All Agents Covered", "Every agent. Every playstyle. From Duelists to Controllers — master them all with pro-level demos."],
                    ["02", "Real-Time Filtering", "Find the exact content you need. Filter by agent, map, player, or role. Results in milliseconds."],
                    ["03", "Pro-Level Insights", "Study positioning, utility usage, and game sense from players at the highest level of play."],
                  ].map(([n, t, d], i) => (
                    <Fade key={i} delay={i * 120}>
                      <div className="feat-card">
                        <span className="feat-n">{n}</span>
                        <h3>{t}</h3>
                        <p>{d}</p>
                      </div>
                    </Fade>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Stats ── */}
            <section className="sec sec-transparent">
              <div className="sec-in">
                <div className="stats">
                  {[["500+", "PRO VODS"], ["ALL", "AGENTS"], ["FREE", "FOREVER"]].map(([v, l], i) => (
                    <Fade key={i} delay={i * 100}>
                      <div className="stat">
                        <span className="stat-v">{v}</span>
                        <span className="stat-l">{l}</span>
                      </div>
                    </Fade>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="sec sec-cta">
              <div className="sec-in" style={{ textAlign: "center" }}>
                <Fade>
                  <h2 className="sec-h" style={{ marginBottom: 16 }}>Ready to rank up?</h2>
                  <p className="cta-desc">Join the community. Learn from the pros. Dominate.</p>
                  <button onClick={login} className="cta">
                    Join Now
                    <span className="arr">&rarr;</span>
                  </button>
                </Fade>
              </div>
            </section>

            {/* ── Footer ── */}
            <footer className="foot">
              <span className="foot-logo">VANTAGE</span>
              <span className="foot-sep">|</span>
              <span className="foot-t">Built for the competitive Valorant community.</span>
              <span className="foot-sep">|</span>
              <span className="foot-disclaimer">Not affiliated with or endorsed by Riot Games.</span>
              <span className="foot-sep">|</span>
              <button className="foot-contact" onClick={() => setContactOpen(true)}>Contact</button>
            </footer>
          </>
        )}
      </div>

      {/* ── Report Bug (logged in, fixed bottom-left) ── */}
      {user && (
        <div className="sc-contact-wrap"
          onMouseEnter={e => { const l = e.currentTarget.querySelector("span"); l.style.opacity="1"; l.style.transform="translateY(0)"; }}
          onMouseLeave={e => { const l = e.currentTarget.querySelector("span"); l.style.opacity="0"; l.style.transform="translateY(4px)"; }}
        >
          <span className="sc-contact-label">Contact</span>
          <button className="sc-contact-btn" onClick={() => setContactOpen(true)}>📱</button>
        </div>
      )}

      {/* ── Contact modal ── */}
      {contactOpen && (
        <div className="sc-modal-overlay" onClick={() => setContactOpen(false)}>
          <div className="sc-modal-box" onClick={e => e.stopPropagation()}>
            <p className="sc-modal-title">Contact</p>
            <p className="sc-modal-sub">Report a bug or reach us at</p>
            <a href="mailto:vantage@vntg.com.pl" className="sc-modal-email">vantage@vntg.com.pl</a>
            <button className="sc-modal-close" onClick={() => setContactOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:#000;overflow-x:hidden;font-family:'Outfit',sans-serif;color:#fff}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}

/* ── Navbar ── */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(24px,5vw,64px);height:72px;transition:all .4s ease;border-bottom:1px solid rgba(255,255,255,0.04)}
.nav-logo{font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;letter-spacing:6px}
.nav-btn{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.85);padding:10px 28px;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .3s;letter-spacing:.5px}
.nav-btn:hover{background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.2)}

/* ── Main ── */
.main{position:relative;z-index:10}

/* ── Hero ── */
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px 24px 80px;text-align:center;position:relative}
.hero-in{transition:all 1.2s cubic-bezier(.16,1,.3,1);opacity:0;transform:translateY(40px)}
.hero-in.vis{opacity:1;transform:translateY(0)}

.hero-tag{display:inline-block;font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:600;letter-spacing:5px;color:rgba(255,255,255,0.3);margin-bottom:32px;padding:8px 24px;border:1px solid rgba(255,255,255,0.08);border-radius:100px}
.hero-tag-welcome{width:160px;text-align:center;box-sizing:border-box}

.hero-big{font-family:'Bebas Neue',sans-serif;font-size:clamp(72px,14vw,180px);line-height:.9;letter-spacing:3px;margin-bottom:32px}

.gold-text{background:linear-gradient(135deg,#C9A84C,#E8D5A0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

.hero-p{font-size:clamp(15px,1.5vw,18px);color:rgba(255,255,255,0.35);max-width:480px;margin:0 auto 48px;line-height:1.8;font-weight:300}

/* ── CTA Button ── */
.cta{display:inline-flex;align-items:center;gap:12px;background:#fff;color:#000;padding:16px 48px;border-radius:100px;font-size:15px;font-weight:700;cursor:pointer;border:none;font-family:'Outfit',sans-serif;transition:all .3s cubic-bezier(.34,1.56,.64,1);letter-spacing:.3px}
.cta:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(255,255,255,0.12)}
.arr{font-size:18px;transition:transform .3s}
.cta:hover .arr{transform:translateX(5px)}
.goto-wrap{display:inline-flex;align-items:center;justify-content:center;background:#fff;border-radius:100px;padding:16px 32px;gap:0;width:160px;max-width:160px;overflow:hidden;transition:max-width .35s cubic-bezier(.34,1.2,.64,1),width .35s cubic-bezier(.34,1.2,.64,1),box-shadow .4s;cursor:default;white-space:nowrap;box-sizing:border-box}
.goto-wrap:hover{max-width:420px;width:420px;box-shadow:0 16px 48px rgba(255,255,255,0.12)}
.goto-label{font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;color:#000;letter-spacing:.3px;flex-shrink:0;opacity:1;transition:opacity .3s ease .55s;position:absolute}
.goto-wrap:hover .goto-label{opacity:0;transition:opacity .15s ease;pointer-events:none}
.goto-divider{display:none}
.goto-options{display:flex;align-items:center;gap:4px;opacity:0;transition:opacity 0s;pointer-events:none}
.goto-wrap:hover .goto-options{opacity:1;transition:opacity .25s .35s;pointer-events:all}
.goto-opt{background:transparent;border:none;color:#000;padding:8px 14px;border-radius:100px;font-size:14px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer;transition:background .2s;letter-spacing:.3px;flex-shrink:0}
.goto-opt:hover{background:rgba(0,0,0,0.08)}
.goto-disabled{opacity:0.35;cursor:default}
.goto-disabled:hover{background:transparent}
.goto-hint{font-family:'Outfit',sans-serif;font-size:11px;color:rgba(255,255,255,0.2);letter-spacing:2px;margin-top:14px;text-transform:uppercase}

/* ── Scroll Cue ── */
.scroll-cue{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px;color:rgba(255,255,255,0.15);font-family:'Space Grotesk',sans-serif;font-size:9px;letter-spacing:5px;animation:fl 3s ease-in-out infinite}
.scroll-bar{width:1px;height:32px;background:linear-gradient(180deg,rgba(255,255,255,0.15),transparent);animation:sp 2s infinite ease-in-out}

/* ── Sections ── */
.sec{padding:clamp(80px,10vw,140px) 24px;background:rgba(0,0,0,0.92);border-top:1px solid rgba(255,255,255,0.04)}
.sec-in{max-width:1100px;margin:0 auto}
.sec-tag{display:inline-block;font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:600;letter-spacing:4px;color:#C9A84C;margin-bottom:20px}
.sec-h{font-family:'Space Grotesk',sans-serif;font-size:clamp(28px,4.5vw,50px);font-weight:700;line-height:1.2;margin-bottom:64px}

/* ── Features ── */
.feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}@media(max-width:860px){.feat-grid{grid-template-columns:1fr}}
.feat-card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:44px 32px;transition:all .4s ease;position:relative;overflow:hidden}
.feat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.25),transparent);opacity:0;transition:opacity .4s}
.feat-card:hover{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.1);transform:translateY(-4px)}
.feat-card:hover::before{opacity:1}
.feat-n{display:block;font-family:'Space Grotesk',sans-serif;font-size:52px;font-weight:800;color:rgba(255,255,255,0.04);margin-bottom:20px;line-height:1}
.feat-card h3{font-family:'Space Grotesk',sans-serif;font-size:18px;font-weight:700;margin-bottom:14px;letter-spacing:.5px}
.feat-card p{font-size:14px;color:rgba(255,255,255,0.35);line-height:1.8;font-weight:300}

/* ── Stats ── */
.sec-transparent{background:transparent!important;border-top:none!important}
.stats{display:flex;justify-content:center;gap:clamp(48px,8vw,120px);flex-wrap:wrap}
.stat{text-align:center}
.stat-v{display:block;font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,9vw,88px);line-height:1;margin-bottom:8px}
.stat-l{font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:600;letter-spacing:5px;color:rgba(255,255,255,0.2)}

/* ── Final CTA ── */
.sec-cta{background:rgba(0,0,0,0.94)!important}
.cta-desc{font-size:17px;color:rgba(255,255,255,0.3);margin-bottom:44px;font-weight:300}

/* ── Footer ── */
.foot{padding:44px 24px;border-top:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;background:rgba(0,0,0,0.97)}
.foot-logo{font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700;letter-spacing:5px;color:rgba(255,255,255,0.15)}
.foot-sep{color:rgba(255,255,255,0.05)}
.foot-t{font-size:12px;color:rgba(255,255,255,0.1);font-weight:300}
.foot-disclaimer{font-size:11px;color:rgba(255,255,255,0.07);font-weight:300}
.foot-contact{background:none;border:none;font-size:11px;color:rgba(255,255,255,0.15);font-weight:400;cursor:pointer;font-family:'Outfit',sans-serif;letter-spacing:1px;transition:color .2s;padding:0}
.foot-contact:hover{color:rgba(255,255,255,0.45)}
.sc-contact-wrap{position:fixed;bottom:24px;left:16px;z-index:50;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:all}
.sc-contact-label{font-family:'Outfit',sans-serif;font-size:11px;color:rgba(255,255,255,0.35);letter-spacing:1px;white-space:nowrap;opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s;pointer-events:none}
.sc-contact-btn{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:17px;cursor:pointer;transition:background .2s}
.sc-contact-btn:hover{background:rgba(255,255,255,0.09)}
.sc-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);z-index:100;display:flex;align-items:center;justify-content:center}
.sc-modal-box{background:#0d0d10;border:1px solid rgba(255,255,255,0.09);border-radius:20px;padding:36px 40px;display:flex;flex-direction:column;align-items:center;gap:12px;min-width:300px}
.sc-modal-title{font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase}
.sc-modal-sub{font-family:'Outfit',sans-serif;font-size:13px;color:rgba(255,255,255,0.3)}
.sc-modal-email{font-family:'Outfit',sans-serif;font-size:15px;color:#C9A84C;font-weight:600;text-decoration:none;letter-spacing:.3px}
.sc-modal-close{margin-top:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:100px;padding:8px 24px;color:rgba(255,255,255,0.4);font-size:13px;font-family:'Outfit',sans-serif;cursor:pointer}

/* ── Fade-in ── */
.fi{opacity:0;transform:translateY(28px);transition:all .8s cubic-bezier(.16,1,.3,1)}
.fi.vis{opacity:1;transform:translateY(0)}

/* ── Spinner ── */
.spinner{width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,255,255,0.08);border-top-color:rgba(255,255,255,0.6);animation:spin .8s linear infinite}

/* ── Animations ── */
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fl{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-8px)}}
@keyframes sp{0%,100%{transform:scaleY(.4);opacity:.15}50%{transform:scaleY(1);opacity:.4}}

/* ── Responsive ── */
@media(max-width:768px){
  .hero-big{letter-spacing:1px}
  .hero-tag{font-size:9px;letter-spacing:3px;padding:6px 16px}
}
`;
