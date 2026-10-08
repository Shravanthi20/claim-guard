import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/api";
import type { Claim, User } from "../types";
import ClaimCard from "../components/ClaimCard";
export default function CustomerDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]); const [user, setUser] = useState<User | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([apiFetch("/users/me"), apiFetch("/claims")]).then(async ([u, c]) => { if (!u.ok || !c.ok) throw new Error("Unable to load your dashboard"); setUser(await u.json()); const data = await c.json(); setClaims(Array.isArray(data) ? data : data.claims || []); }).catch(e => setError(e instanceof Error ? e.message : "Unable to load dashboard")).finally(() => setLoading(false)); }, []);
  return <><div className="page-heading"><div><p className="eyebrow">CUSTOMER PORTAL</p><h1>{user?.name ? `Welcome, ${user.name}` : "My claims"}</h1><p className="muted">Track submissions and provide supporting evidence.</p></div><Link className="button" to="/customer/claims/new">+ Submit a claim</Link></div>{error && <div className="alert error">{error}</div>}{loading && <div className="loading">Loading your claims…</div>} {!loading && <div className="claim-grid">{claims.map(c => <ClaimCard key={c.id} claim={c} />)}</div>}{!loading && !claims.length && !error && <div className="empty"><h2>No claims yet</h2><p>When you submit a claim, it will appear here.</p></div>}</>;
}
