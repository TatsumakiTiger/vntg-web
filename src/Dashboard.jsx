import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://vntg-api-production.up.railway.app";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Cookie is sent automatically — no token in URL or localStorage needed
    fetch(`${API_URL}/api/me`, {
      credentials: "include", // tells browser to send the httpOnly cookie
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
        navigate("/");
      });
  }, []);

  function handleLogout() {
    fetch(`${API_URL}/api/logout`, {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      navigate("/");
    });
  }

  if (loading)
    return (
      <div style={{ color: "white", padding: "2rem" }}>Ładowanie...</div>
    );
  if (error)
    return <div style={{ color: "red", padding: "2rem" }}>{error}</div>;

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
