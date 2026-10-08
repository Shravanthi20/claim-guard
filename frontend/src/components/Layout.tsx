import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "aws-amplify/auth";
import type { Role } from "../types";
export default function Layout({ children, role }: { children: ReactNode; role: Role }) {
  const navigate = useNavigate(); const location = useLocation();
  const links = role === "CUSTOMER" ? [{ to: "/customer", label: "My claims" }, { to: "/customer/claims/new", label: "Submit claim" }] : role === "INVESTIGATOR" ? [{ to: "/investigator", label: "Investigation queue" }] : [{ to: "/admin", label: "Analytics" }];
  return <div className="app-shell"><header className="topbar"><Link className="brand" to={links[0].to}>ClaimGuard <span>AI</span></Link><nav>{links.map(l => <Link className={location.pathname === l.to ? "active" : ""} key={l.to} to={l.to}>{l.label}</Link>)}</nav><button className="button ghost" onClick={async () => { await signOut(); navigate("/login", { replace: true }); }}>Sign out</button></header><main className="content">{children}</main></div>;
}
