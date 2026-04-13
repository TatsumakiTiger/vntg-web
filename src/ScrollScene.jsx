import { useEffect, useRef } from "react";

const LETTERS = ["V", "A", "N", "T", "A", "G", "E"];
const fadeOrder = [6, 5, 4, 3, 2, 1, 0];

export default function ScrollScene() {
  const lettersRef = useRef([]);
  const scrollHintRef = useRef(null);
  const marbleRef = useRef(null);
  const redirected = useRef(false);

  useEffect(() => {
    const start = 0.05;
    const end = 0.9;
    const count = LETTERS.length;
    const win = (end - start) / count;

    function onScroll() {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const t = total > 0 ? window.scrollY / total : 0;

      if (t > 0.95 && !redirected.current) {
        redirected.current = true;
        window.location.href = "https://vntg-api-production.up.railway.app/api/login";
        return;
      }

      const hint = scrollHintRef.current;
      if (hint) {
        const h = Math.max(0, 1 - t / 0.06);
        hint.style.opacity = h;
        hint.style.transform = `translateX(-50%) translateY(${(1 - h) * 10}px)`;
      }

      // Marble fades out as letters disappear
      const marble = marbleRef.current;
      if (marble) {
        const mOp = Math.max(0, 0.12 - t * 0.14);
        marble.style.opacity = mOp;
      }

      for (let fi = 0; fi < count; fi++) {
        const li = fadeOrder[fi];
        const el = lettersRef.current[li];
        if (!el) continue;

        const s = start + fi * win;
        const mid = s + win * 0.4;
        const e = s + win;

        let op = 0.9, blur = 0, y = 0, sc = 1;

        if (t < s) {
          op = 0.9;
        } else if (t < mid) {
          const p = (t - s) / (mid - s);
          const ep = 1 - (1 - p) * (1 - p);
          op = 0.9 - ep * 0.75;
          blur = ep * 6;
          y = ep * 15;
          sc = 1 - ep * 0.05;
        } else if (t < e) {
          const p = (t - mid) / (e - mid);
          op = 0.15 - p * 0.15;
          blur = 6 + p * 4;
          y = 15 + p * 8;
          sc = 0.95 - p * 0.03;
        } else {
          op = 0;
        }

        el.style.opacity = Math.max(0, op);
        el.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
        el.style.transform = `translateY(${y}px) scale(${sc})`;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

        {/* Marble texture overlay */}
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

        {/* Letters */}
        <div style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 10,
        }}>
          {LETTERS.map((letter, i) => (
            <span
              key={i}
              ref={el => (lettersRef.current[i] = el)}
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
          <svg width="10" height="16" viewBox="0 0 14 20" fill="none"
            style={{ animation: "bob 2s ease-in-out infinite", opacity: 0.7 }}>
            <path d="M7 3L7 15" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round"/>
            <path d="M3 12L7 16.5L11 12" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </>
  );
}
