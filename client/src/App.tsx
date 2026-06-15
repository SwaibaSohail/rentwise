import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import LandlordDashboard from "./pages/LandlordDashboard";
import TenantDashboard from "./pages/TenantDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "LANDLORD" ? "/landlord" : "/tenant"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/landlord"
        element={<ProtectedRoute role="LANDLORD"><LandlordDashboard /></ProtectedRoute>}
      />
      <Route
        path="/tenant"
        element={<ProtectedRoute role="TENANT"><TenantDashboard /></ProtectedRoute>}
      />
    </Routes>
  );
}
