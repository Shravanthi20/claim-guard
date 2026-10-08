import { useEffect, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { Navigate, Outlet } from "react-router-dom";
import { apiFetch } from "../services/api";
import type { Role, User } from "../types";

export default function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { try { await getCurrentUser(); const r = await apiFetch("/users/me"); if (r.ok) setUser(await r.json()); } catch { setUser(null); } finally { setLoading(false); } })(); }, []);
  if (loading) return <div className="loading">Checking your session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === "ADMIN" ? "/admin" : user.role === "INVESTIGATOR" ? "/investigator" : "/customer"} replace />;
  return <Outlet context={user} />;
}