import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const LETTERS = ["V", "A", "N", "T", "A", "G", "E"];
const fadeOrder = [6, 5, 4, 3, 2, 1, 0];

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://vntg-api-production.up.railway.app";

export default function ScrollScene() {
  const lettersRef = useRef([]);
  const scrollHintRef = useRef(null);
  const marbleRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const redirected = useRef(false);
  const navigate = useNavigate();

  // If already logged in, skip to dashboard
  useEffect(() => {
    if (localStorage.getItem("vntg_session")) {
      navigate("/dashboard");
    }
  }, []);

  useEffect(() => {
    const start = 0.05;
    const end = 0.9;
    const count = LETTERS.length;
    const win = (end - start) / count;

    function onScroll() {
      const total =
        document.documentElement.scrollHeight - window.innerHeight;
      const t = total > 0 ? window.scrollY / total : 0;

      if (t > 0.95 && !redirected.current) {
        redirected.current = true;
        window.location.href = `${API_URL}/api/login`;
        return;
      }

      /* ── scroll hint ── */
      const hint = scrollHintRef.current;
      if (hint) {
        const h = Math.max(0, 1 - t / 0.06);
        hint.style.opacity = h;
        hint.style.transform = `translateX(-50%) translateY(${(1 - h) * 10}px)`;
      }

      /* ── marble bg ── */
      const marble = marbleRef.current;
      if (marble) {
        marble.style.opacity = Math.max(0, 0.12 - t * 0.14);
      }

      /* ── panels fade & slide out ── */
      const panelFadeStart = 0.03;
      const panelFadeEnd = 0.35;
      let panelOp = 1;
      let panelBlur = 0;
      let panelShift = 0;

      if (t <= panelFadeStart) {
        panelOp = 1;
      } else if (t < panelFadeEnd) {
        const p = (t - panelFadeStart) / (panelFadeEnd - panelFadeStart);
        const ep = 1 - (1 - p) * (1 - p);
        panelOp = 1 - ep;
        panelBlur = ep * 8;
        panelShift = ep * 30;
      } else {
        panelOp = 0;
      }

      const lp = leftPanelRef.current;
      if (lp) {
        lp.style.opacity = panelOp;
        lp.style.filter = panelBlur > 0 ? `blur(${panelBlur}px)` : "none";
        lp.style.transform = `translateX(${-panelShift}px)`;
      }

      const rp = rightPanelRef.current;
      if (rp) {
        rp.style.opacity = panelOp;
        rp.style.filter = panelBlur > 0 ? `blur(${panelBlur}px)` : "none";
        rp.style.transform = `translateX(${panelShift}px)`;
      }

      /* ── letters ── */
      for (let fi = 0; fi < count; fi++) {
        const li = fadeOrder[fi];
        const el = lettersRef.current[li];
        if (!el) continue;

        const s = start + fi * win;
        const mid = s + win * 0.4;
        const e = s + win;

        let op = 0.9,
          blur2 = 0,
          y = 0,
          sc = 1;

        if (t < s) {
          op = 0.9;
        } else if (t < mid) {
          const p = (t - s) / (mid - s);
          const ep = 1 - (1 - p) * (1 - p);
          op = 0.9 - ep * 0.75;
          blur2 = ep * 6;
          y = ep * 15;
          sc = 1 - ep * 0.05;
        } else if (t < e) {
          const p = (t - mid) / (e - mid);
          op = 0.15 - p * 0.15;
          blur2 = 6 + p * 4;
          y = 15 + p * 8;
          sc = 0.95 - p * 0.03;
        } else {
          op = 0;
        }

        el.style.opacity = Math.max(0, op);
        el.style.filter = blur2 > 0 ? `blur(${blur2}px)` : "none";
        el.style.transform = `translateY(${y}px) scale(${sc})`;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── shared panel style ── */
  const panelStyle = {
    background: "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: "28px 24px",
    width: "min(320px, 38vw)",
    willChange: "transform, opacity, filter",
    pointerEvents: "none",
  };

  const titleStyle = {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: "clamp(16px, 2.2vw, 22px)",
    letterSpacing: 2,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 12,
    textTransform: "uppercase",
  };

  const textStyle = {
    fontFamily: "'Outfit', sans-serif",
    fontSize: "clamp(11px, 1.4vw, 14px)",
    lineHeight: 1.65,
    color: "rgba(255, 255, 255, 0.45)",
    fontWeight: 300,
  };

  const accentStyle = {
    color: "rgba(255, 255, 255, 0.65)",
    fontWeight: 400,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; }
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
      `}</style>

      <div style={{ background: "#000", height: "170vh" }}>
        {/* Marble texture */}
        <div
          ref={marbleRef}
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: "url(/marble.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.12,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />

        {/* Main layout: panels + letters */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(24px, 5vw, 80px)",
            padding: "0 clamp(16px, 4vw, 48px)",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {/* Left panel — platforma */}
          <div ref={leftPanelRef} style={panelStyle}>
            <div style={titleStyle}>Platforma</div>
            <p style={textStyle}>
              <span style={accentStyle}>Vantage</span> to polskie centrum
              Valorant — łączymy graczy, trenerów i twórców w jednym miejscu.
            </p>
            <p style={{ ...textStyle, marginTop: 10 }}>
              VODy pro playerów, analiza gier, narzędzia do rozwoju
              i&nbsp;community, które napędza Twój grind.
            </p>
          </div>

          {/* Center — VANTAGE letters */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {LETTERS.map((letter, i) => (
              <span
                key={i}
                ref={(el) => (lettersRef.current[i] = el)}
                style={{
                  display: "block",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: "clamp(28px, 5.5vw, 56px)",
                  lineHeight: 1,
                  color: "#fff",
                  opacity: 0.9,
                  willChange: "transform, opacity, filter",
                  userSelect: "none",
                }}
              >
                {letter}
              </span>
            ))}
          </div>

          {/* Right panel — trenerzy */}
          <div ref={rightPanelRef} style={panelStyle}>
            <div style={titleStyle}>Dla trenerów</div>
            <p style={textStyle}>
              Masz wiedzę i doświadczenie?{" "}
              <span style={accentStyle}>
                Dołącz jako trener
              </span>{" "}
              — buduj swoją markę, docieraj do uczniów i zarabiaj na coachingu.
            </p>
            <p style={{ ...textStyle, marginTop: 10 }}>
              Dajemy Ci platformę, widoczność i narzędzia. Ty wnosisz skill.
            </p>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          ref={scrollHintRef}
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 10,
            letterSpacing: 3,
            textTransform: "uppercase",
            fontWeight: 300,
            zIndex: 15,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <span>Zescrolluj aby się zalogować</span>
          <svg
            width="10"
            height="16"
            viewBox="0 0 14 20"
            fill="none"
            style={{
              animation: "bob 2s ease-in-out infinite",
              opacity: 0.7,
            }}
          >
            <path
              d="M7 3L7 15"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <path
              d="M3 12L7 16.5L11 12"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </>
  );
}