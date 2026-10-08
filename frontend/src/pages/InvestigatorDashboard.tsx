import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import type { Claim, ClaimStatus } from "../types";
import ClaimCard from "../components/ClaimCard";
export default function InvestigatorDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]); const [status, setStatus] = useState("ALL"); const [risk, setRisk] = useState("ALL"); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch("/claims").then(r => r.ok ? r.json() : Promise.reject(new Error("Unable to load investigation queue"))).then(d => setClaims(Array.isArray(d) ? d : d.claims || [])).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => claims.filter(c => (status === "ALL" || c.status === status) && (risk === "ALL" || c.riskAssessment?.riskLevel === risk)), [claims, status, risk]);
  return <><div className="page-heading"><div><p className="eyebrow">INVESTIGATOR WORKSPACE</p><h1>Investigation queue</h1><p className="muted">Filter claims by workflow status and AI risk assessment.</p></div><div className="stat"><strong>{filtered.length}</strong><span>matching claims</span></div></div><div className="filters"><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option>ALL</option>{(["SUBMITTED","UNDER_REVIEW","ADDITIONAL_INFO_REQUIRED","APPROVED","REJECTED"] as ClaimStatus[]).map(s => <option key={s}>{s}</option>)}</select></label><label>Risk<select value={risk} onChange={e => setRisk(e.target.value)}><option>ALL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></label></div>{error && <div className="alert error">{error}</div>}{loading && <div className="loading">Loading claims…</div>}{!loading && !error && !filtered.length && <div className="empty">No claims match these filters.</div>}<div className="claim-grid">{filtered.map(c => <ClaimCard key={c.id} claim={c} />)}</div></>;
}
