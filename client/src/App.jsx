
import React, { useEffect, useState } from "react";

const SITE = "https://www.locationphotobooth28.fr";
const FACEBOOK = "https://www.facebook.com/location.photobooth.28/";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Connexion impossible.");
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <img className="login-logo" src="/logo.jpg" alt="Location Photobooth 28" />
        <div className="eyebrow">LOCATION PHOTOBOOTH 28 SUITE</div>
        <h1>Administration</h1>
        <p className="muted">Connecte-toi pour gérer tes événements.</p>
        {error && <div className="alert">{error}</div>}
        <form onSubmit={submit}>
          <label>Adresse e-mail</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
          <label>Mot de passe</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
          <button className="primary" disabled={busy}>{busy ? "Connexion..." : "Se connecter"}</button>
        </form>
        <div className="login-links">
          <a href={SITE} target="_blank" rel="noreferrer">🌐 Site internet</a>
          <a href={FACEBOOK} target="_blank" rel="noreferrer">ⓕ Facebook</a>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ onLogout }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(setData);
  }, []);

  const stats = data?.stats || { events: 0, photos: 0, videos: 0, activeGalleries: 0 };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.jpg" alt="" />
          <div>
            <strong>LP28 Suite</strong>
            <span>Version 5.1</span>
          </div>
        </div>

        <nav>
          <button className="nav-item active">🏠 Tableau de bord</button>
          <button className="nav-item">📅 Événements</button>
          <button className="nav-item">📸 Galeries</button>
          <button className="nav-item">☁️ Google Drive</button>
          <button className="nav-item">⚙️ Paramètres</button>
        </nav>

        <div className="sidebar-footer">
          <a href={SITE} target="_blank" rel="noreferrer">www.locationphotobooth28.fr</a>
          <button className="logout" onClick={onLogout}>Déconnexion</button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <div className="eyebrow">LOCATION PHOTOBOOTH 28 SUITE</div>
            <h1>Tableau de bord</h1>
            <p className="muted">Ton espace de gestion événementielle.</p>
          </div>
          <button className="primary">＋ Nouvel événement</button>
        </header>

        <section className="stats-grid">
          <article className="stat-card"><span>Événements</span><strong>{stats.events}</strong></article>
          <article className="stat-card"><span>Photos</span><strong>{stats.photos}</strong></article>
          <article className="stat-card"><span>Vidéos</span><strong>{stats.videos}</strong></article>
          <article className="stat-card"><span>Galeries actives</span><strong>{stats.activeGalleries}</strong></article>
        </section>

        <section className="panel">
          <div>
            <div className="panel-kicker">Prêt pour la suite</div>
            <h2>Bienvenue dans Location Photobooth 28 Suite</h2>
            <p>
              La base React + Express + PWA est opérationnelle. La prochaine étape sera
              la création réelle des événements et des espaces organisateur / invités.
            </p>
          </div>
          <img src="/logo.jpg" alt="Location Photobooth 28" />
        </section>

        <section className="quick-grid">
          <a className="quick-card" href={SITE} target="_blank" rel="noreferrer">
            <span>🌐</span><strong>Site internet</strong><small>locationphotobooth28.fr</small>
          </a>
          <a className="quick-card" href={FACEBOOK} target="_blank" rel="noreferrer">
            <span>ⓕ</span><strong>Facebook</strong><small>Location Photobooth 28</small>
          </a>
          <div className="quick-card">
            <span>📱</span><strong>PWA</strong><small>Installable sur téléphone et PC</small>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState(false);

  async function refreshSession() {
    try {
      const r = await fetch("/api/session");
      const data = await r.json();
      setAuth(Boolean(data.authenticated));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refreshSession(); }, []);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    setAuth(false);
  }

  if (loading) return <div className="loading">Chargement…</div>;
  return auth ? <Dashboard onLogout={logout} /> : <Login onLogin={() => setAuth(true)} />;
}
