import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://vntg-api-production.up.railway.app";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError("Brak tokenu — zaloguj się ponownie.");
      setLoading(false);
      return;
    }

    // Save token and clean URL
    sessionStorage.setItem("discord_token", token);
    window.history.replaceState({}, "", "/dashboard");

    fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać danych");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [searchParams]);

  const handleLogout = () => {
    sessionStorage.removeItem("discord_token");
    navigate("/");
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <span style={styles.loadingText}>Ładowanie...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <p style={styles.errorText}>{error}</p>
        <button style={styles.button} onClick={() => navigate("/")}>
          Wróć
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; }
      `}</style>

      <div style={styles.container}>
        <div style={styles.card}>
          {user.avatar && (
            <img src={user.avatar} alt="avatar" style={styles.avatar} />
          )}
          <h1 style={styles.name}>{user.global_name || user.username}</h1>
          <p style={styles.username}>@{user.username}</p>
          {user.email && <p style={styles.email}>{user.email}</p>}
          <button style={styles.button} onClick={handleLogout}>
            Wyloguj
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Outfit', sans-serif",
    padding: 20,
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "48px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    maxWidth: 360,
    width: "100%",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    marginBottom: 8,
    border: "2px solid rgba(255,255,255,0.1)",
  },
  name: {
    color: "#fff",
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: "-0.02em",
  },
  username: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontWeight: 300,
  },
  email: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    fontWeight: 300,
  },
  button: {
    marginTop: 20,
    padding: "10px 28px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "'Outfit', sans-serif",
    fontSize: 13,
    fontWeight: 400,
    cursor: "pointer",
    letterSpacing: 1,
    textTransform: "uppercase",
    transition: "all 0.2s",
  },
  loadingText: {
    color: "rgba(255,255,255,0.3)",
    fontFamily: "'Outfit', sans-serif",
    fontSize: 14,
  },
  errorText: {
    color: "rgba(255,100,100,0.6)",
    fontFamily: "'Outfit', sans-serif",
    fontSize: 14,
    marginBottom: 16,
  },
};
