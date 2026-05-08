import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://vntg-api-production.up.railway.app";

function readToken() {
  try { const t = localStorage.getItem("vntg_session"); if (t) return t; } catch {}
  const m = document.cookie.match(/(?:^|; )vntg_session=([^;]*)/);
  return m ? m[1] : null;
}

function authHeaders() {
  return { Authorization: `Bearer ${readToken()}`, "Content-Type": "application/json" };
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1=nick, 2=avatar, 3=done

  // Nick state
  const [nick, setNick] = useState("");
  const [nickStatus, setNickStatus] = useState(null); // null | "checking" | "available" | "taken" | "invalid"
  const [nickError, setNickError] = useState("");
  const [nickSaving, setNickSaving] = useState(false);
  const debounceRef = useRef(null);

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarData, setAvatarData] = useState(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const fileRef = useRef(null);

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const token = readToken();
    if (!token) { navigate("/"); return; }

    fetch(`${API_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => {
        if (data.onboarding_complete) { navigate("/dashboard"); return; }
        setUser(data);
        if (data.vantage_nick) {
          setNick(data.vantage_nick);
          setStep(2);
        }
        setLoading(false);
      })
      .catch(() => navigate("/"));
  }, []);

  // Nick availability check
  useEffect(() => {
    if (!nick || nick.length < 3) {
      setNickStatus(null);
      setNickError("");
      return;
    }
    if (!/^[A-Za-z0-9_]{3,20}$/.test(nick)) {
      setNickStatus("invalid");
      setNickError("3-20 characters, letters/numbers/underscore only.");
      return;
    }
    setNickStatus("checking");
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`${API_URL}/api/check-nick/${encodeURIComponent(nick)}`)
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
    return () => clearTimeout(debounceRef.current);
  }, [nick]);

  const saveNick = useCallback(async () => {
    if (nickStatus !== "available") return;
    setNickSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/onboarding/nick`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ nick }),
      });
      const data = await res.json();
      if (!res.ok) { setNickError(data.error || "Failed."); setNickSaving(false); return; }
      setStep(2);
    } catch {
      setNickError("Network error.");
    }
    setNickSaving(false);
  }, [nick, nickStatus]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 350000) { alert("Image too large. Max 350KB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
      setAvatarData(reader.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const saveAvatar = useCallback(async () => {
    setAvatarSaving(true);
    if (avatarData) {
      try {
        await fetch(`${API_URL}/api/onboarding/avatar`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ avatar: avatarData }),
        });
      } catch {}
    }
    // Complete onboarding
    try {
      const res = await fetch(`${API_URL}/api/onboarding/complete`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.ok) {
        setStep(3);
        setShowConfetti(true);
        setTimeout(() => navigate("/dashboard"), 2500);
      }
    } catch {}
    setAvatarSaving(false);
  }, [avatarData, navigate]);

  if (loading) {
    return (
      <div style={s.screen}>
        <style>{CSS}</style>
        <div style={s.pulse} />
      </div>
    );
  }

  const discordAvatar = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || "V")}&background=1a1a2e&color=fff&size=128&bold=true&format=svg`;

  return (
    <>
      <style>{CSS}</style>

      {/* Background */}
      <div style={s.orbTop} />
      <div style={s.orbBottom} />

      <div style={s.screen}>
        {/* Progress bar */}
        <div style={s.progressWrap}>
          <div style={s.progressTrack}>
            <div style={{ ...s.progressBar, width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }} />
          </div>
          <span style={s.progressLabel}>Step {Math.min(step, 2)} of 2</span>
        </div>

        {/* Card */}
        <div style={s.card}>
          {/* ── Step 1: Nick ── */}
          {step === 1 && (
            <div style={s.stepContent} key="step1">
              <div style={s.stepIcon}>✏️</div>
              <h2 style={s.stepTitle}>Choose Your Nick</h2>
              <p style={s.stepDesc}>
                This is how other players will see you on Vantage.
              </p>

              <div style={s.inputWrap}>
                <input
                  type="text"
                  value={nick}
                  onChange={(e) => setNick(e.target.value.replace(/\s/g, ""))}
                  placeholder="e.g. ProPlayer99"
                  maxLength={20}
                  style={{
                    ...s.input,
                    borderColor:
                      nickStatus === "available" ? "rgba(34,197,94,0.4)" :
                      nickStatus === "taken" || nickStatus === "invalid" ? "rgba(239,68,68,0.4)" :
                      "rgba(255,255,255,0.08)",
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") saveNick(); }}
                  autoFocus
                />
                <div style={s.inputIndicator}>
                  {nickStatus === "checking" && <span style={s.miniSpinner} />}
                  {nickStatus === "available" && <span style={{ color: "#22C55E" }}>✓</span>}
                  {(nickStatus === "taken" || nickStatus === "invalid") && <span style={{ color: "#EF4444" }}>✗</span>}
                </div>
              </div>
              {nickError && <p style={s.errorText}>{nickError}</p>}
              {nickStatus === "available" && <p style={s.successText}>Nice! This nick is available.</p>}

              <button
                onClick={saveNick}
                disabled={nickStatus !== "available" || nickSaving}
                style={{
                  ...s.btn,
                  opacity: nickStatus === "available" && !nickSaving ? 1 : 0.4,
                  cursor: nickStatus === "available" && !nickSaving ? "pointer" : "not-allowed",
                }}
              >
                {nickSaving ? "Saving…" : "Continue"}
              </button>
            </div>
          )}

          {/* ── Step 2: Avatar ── */}
          {step === 2 && (
            <div style={s.stepContent} key="step2">
              <div style={s.stepIcon}>📸</div>
              <h2 style={s.stepTitle}>Set Your Avatar</h2>
              <p style={s.stepDesc}>
                Upload a custom avatar or keep your Discord one.
              </p>

              <div style={s.avatarPicker}>
                <div style={s.avatarPreviewWrap}>
                  <img
                    src={avatarPreview || discordAvatar}
                    alt="Avatar"
                    style={s.avatarImg}
                  />
                  <div style={s.avatarRing} />
                </div>
                <button onClick={() => fileRef.current?.click()} style={s.uploadBtn}>
                  Upload Image
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <span style={s.avatarHint}>PNG, JPG, or WebP — max 350KB</span>
              </div>

              <div style={s.btnRow}>
                <button onClick={() => setStep(1)} style={s.backBtn}>← Back</button>
                <button
                  onClick={saveAvatar}
                  disabled={avatarSaving}
                  style={s.btn}
                >
                  {avatarSaving ? "Finishing…" : avatarData ? "Save & Finish" : "Skip & Finish"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 3 && (
            <div style={{ ...s.stepContent, ...s.doneContent }} key="step3">
              {showConfetti && <ConfettiCanvas />}
              <div style={s.doneCheck}>✓</div>
              <h2 style={s.stepTitle}>You're All Set!</h2>
              <p style={s.stepDesc}>Welcome to Vantage, <strong>{nick}</strong>.</p>
              <p style={{ ...s.stepDesc, marginTop: 8 }}>Redirecting to dashboard…</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Confetti ── */
function ConfettiCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#C9A84C", "#E8D5A0", "#22C55E", "#F59E0B", "#EC4899", "#A855F7"];
    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 2,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 4 + 2,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      o: 1,
    }));

    let raf;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vy += 0.05;
        if (p.y > canvas.height + 20) { p.o -= 0.02; }
        if (p.o <= 0) continue;
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = p.o;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none" }} />;
}

/* ── CSS ── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #000; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
  @keyframes checkBounce {
    0% { transform: scale(0); }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }
  @keyframes miniSpin { to { transform: rotate(360deg); } }
`;

/* ── Styles ── */
const s = {
  screen: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif", color: "#fff", position: "relative", padding: "24px 16px" },
  pulse: { width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(201,168,76,0.2)", borderTopColor: "#C9A84C", animation: "spin 0.8s linear infinite" },

  orbTop: { position: "fixed", top: -300, right: -200, width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, animation: "pulse 8s ease-in-out infinite" },
  orbBottom: { position: "fixed", bottom: -400, left: -200, width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0, animation: "pulse 10s ease-in-out infinite 2s" },

  progressWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 32, width: "100%", maxWidth: 440 },
  progressTrack: { width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" },
  progressBar: { height: "100%", background: "linear-gradient(90deg, #C9A84C, #E8D5A0)", borderRadius: 3, transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)" },
  progressLabel: { fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: 400, letterSpacing: 1 },

  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "clamp(28px, 5vw, 48px)", width: "100%", maxWidth: 440, animation: "fadeUp 0.5s ease-out" },

  stepContent: { animation: "fadeUp 0.4s ease-out" },
  stepIcon: { fontSize: 40, marginBottom: 16 },
  stepTitle: { fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: -0.3 },
  stepDesc: { fontSize: 14, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, fontWeight: 300, marginBottom: 28 },

  inputWrap: { position: "relative", marginBottom: 8 },
  input: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 44px 14px 16px", fontSize: 16, color: "#fff", fontFamily: "'Outfit', sans-serif", outline: "none", transition: "border-color 0.2s" },
  inputIndicator: { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16 },
  miniSpinner: { display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#C9A84C", borderRadius: "50%", animation: "miniSpin 0.6s linear infinite" },
  errorText: { fontSize: 12, color: "#EF4444", marginBottom: 16, fontWeight: 400 },
  successText: { fontSize: 12, color: "#22C55E", marginBottom: 16, fontWeight: 400 },

  btn: { width: "100%", background: "#C9A84C", border: "none", color: "#000", padding: "14px 24px", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.2s", marginTop: 8 },
  backBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", padding: "14px 24px", borderRadius: 12, fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.2s", flex: "0 0 auto" },
  btnRow: { display: "flex", gap: 12, marginTop: 8 },

  avatarPicker: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 28 },
  avatarPreviewWrap: { position: "relative", width: 100, height: 100 },
  avatarImg: { width: 100, height: 100, borderRadius: "50%", border: "3px solid rgba(201,168,76,0.3)", objectFit: "cover", display: "block" },
  avatarRing: { position: "absolute", top: "50%", left: "50%", width: 112, height: 112, transform: "translate(-50%, -50%)", borderRadius: "50%", border: "2px solid rgba(201,168,76,0.12)", pointerEvents: "none" },
  uploadBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.2s" },
  avatarHint: { fontSize: 11, color: "rgba(255,255,255,0.2)", fontWeight: 300 },

  doneContent: { textAlign: "center" },
  doneCheck: { width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #E8D5A0)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, marginBottom: 20, animation: "checkBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)" },
};
