import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import type { Claim, ClaimStatus, Role, User } from "../types";
import ClaimCard from "../components/ClaimCard";
export default function AdminDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(""); const [role, setRole] = useState<Extract<Role, "CUSTOMER" | "INVESTIGATOR">>("INVESTIGATOR"); const [roleMessage, setRoleMessage] = useState(""); const [roleBusy, setRoleBusy] = useState(false);
  useEffect(() => { apiFetch("/claims").then(r => r.ok ? r.json() : Promise.reject(new Error("Unable to load analytics"))).then(d => setClaims(Array.isArray(d) ? d : d.claims || [])).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  const updateRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setRoleMessage(""); setRoleBusy(true);
    try {
      const response = await apiFetch("/users/role", { method: "PATCH", body: JSON.stringify({ email, role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update role");
      const updatedUser = data as User;
      setRoleMessage(`${updatedUser.email} is now ${updatedUser.role}.`);
      setEmail("");
    } catch (e) { setRoleMessage(e instanceof Error ? e.message : "Unable to update role"); }
    finally { setRoleBusy(false); }
  };
  const total = claims.reduce((sum, c) => sum + Number(c.claimedAmount || 0), 0); const average = claims.length ? total / claims.length : 0; const count = (s: string) => claims.filter(c => c.status === s).length; const risk = (s: string) => claims.filter(c => c.riskAssessment?.riskLevel === s).length;
  const rows = (["SUBMITTED","UNDER_REVIEW","ADDITIONAL_INFO_REQUIRED","APPROVED","REJECTED"] as ClaimStatus[]).map(status => ({ status, count: count(status), amount: claims.filter(c => c.status === status).reduce((sum, c) => sum + Number(c.claimedAmount || 0), 0) }));
  return <><div className="page-heading"><div><p className="eyebrow">ADMINISTRATION</p><h1>Claims analytics</h1><p className="muted">Portfolio overview from claims available to the platform.</p></div></div>{error && <div className="alert error">{error}</div>}{loading && <div className="loading">Loading analytics…</div>}<div className="stats"><div><strong>{claims.length}</strong><span>Total claims</span></div><div><strong>₹{total.toLocaleString("en-IN")}</strong><span>Total claimed amount</span></div><div><strong>₹{average.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong><span>Average claim</span></div><div><strong>{risk("HIGH")}</strong><span>High-risk claims</span></div></div><section className="panel"><h2>Assign investigator access</h2><p className="muted">Public sign-up creates customer accounts. Use this admin-only control to grant or revoke investigator access.</p><form className="role-form" onSubmit={updateRole}><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="User email" aria-label="User email" /><select value={role} onChange={e => setRole(e.target.value as Extract<Role, "CUSTOMER" | "INVESTIGATOR">)} aria-label="Role"><option value="INVESTIGATOR">Investigator</option><option value="CUSTOMER">Customer</option></select><button className="button" disabled={roleBusy}>{roleBusy ? "Updating…" : "Update role"}</button></form>{roleMessage && <p className="form-message">{roleMessage}</p>}</section><section className="panel analytics-table"><h2>Status analytics</h2><table><thead><tr><th>Status</th><th>Claims</th><th>Claimed amount</th><th>Average</th></tr></thead><tbody>{rows.map(row => <tr key={row.status}><td>{row.status.replaceAll("_", " ")}</td><td>{row.count}</td><td>₹{row.amount.toLocaleString("en-IN")}</td><td>₹{row.count ? (row.amount / row.count).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "0"}</td></tr>)}</tbody></table></section><h2 className="section-title">Recent claims</h2><div className="claim-grid">{claims.map(c => <ClaimCard key={c.id} claim={c} />)}</div></>;
}
