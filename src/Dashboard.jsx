import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "https://vntg-api-production.up.railway.app";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Grab token from URL (after OAuth callback) or from localStorage
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      localStorage.setItem("discord_token", tokenFromUrl);
      // Clean the token out of the URL so it's not visible / bookmarkable
      window.history.replaceState({}, "", "/dashboard");
    }

    const token = tokenFromUrl || localStorage.getItem("discord_token");

    if (!token) {
      navigate("/");
      return;
    }

    // Fetch user data from backend
    fetch(`${API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("discord_token");
        navigate("/");
      });
  }, []);

  function handleLogout() {
    localStorage.removeItem("discord_token");
    navigate("/");
  }

  if (loading) return <div style={{ color: "white", padding: "2rem" }}>Ładowanie...</div>;
  if (error) return <div style={{ color: "red", padding: "2rem" }}>{error}</div>;

  return (
    <div style={{ color: "white", padding: "2rem" }}>
      {user.avatar && (
        <img
          src={user.avatar}
          alt="avatar"
          style={{ width: 80, height: 80, borderRadius: "50%" }}
        />
      )}
      <h2>{user.global_name || user.username}</h2>
      <p>@{user.username}</p>
      <p>{user.email}</p>
      <button onClick={handleLogout}>Wyloguj</button>
    </div>
  );
}
