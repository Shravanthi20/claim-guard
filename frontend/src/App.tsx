import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import CustomerDashboard from "./pages/CustomerDashboard";
import InvestigatorDashboard from "./pages/InvestigatorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ClaimDetails from "./pages/ClaimDetails";
import NewClaim from "./pages/NewClaim";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
export default function App() { return <BrowserRouter><Routes><Route path="/login" element={<Login />} /><Route element={<ProtectedRoute roles={["CUSTOMER"]} />}><Route element={<RoleLayout role="CUSTOMER" />}><Route path="/customer" element={<CustomerDashboard />} /><Route path="/customer/claims/new" element={<NewClaim />} /><Route path="/customer/claims/:id" element={<ClaimDetails canUpdate={false} />} /></Route></Route><Route element={<ProtectedRoute roles={["INVESTIGATOR"]} />}><Route element={<RoleLayout role="INVESTIGATOR" />}><Route path="/investigator" element={<InvestigatorDashboard />} /><Route path="/investigator/claims/:id" element={<ClaimDetails canUpdate />} /></Route></Route><Route element={<ProtectedRoute roles={["ADMIN"]} />}><Route element={<RoleLayout role="ADMIN" />}><Route path="/admin" element={<AdminDashboard />} /><Route path="/admin/claims/:id" element={<ClaimDetails canUpdate />} /></Route></Route><Route path="/" element={<Navigate to="/customer" replace />}><Route index element={null} /></Route><Route path="*" element={<Navigate to="/login" replace />} /></Routes></BrowserRouter>; }
function RoleLayout({ role }: { role: "CUSTOMER" | "INVESTIGATOR" | "ADMIN" }) { return <Layout role={role}><Outlet /></Layout>; }
