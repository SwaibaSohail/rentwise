import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import LandlordDashboard from "./pages/LandlordDashboard";
import TenantDashboard from "./pages/TenantDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
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
      <Route
        path="/payments/success"
        element={<ProtectedRoute role="TENANT"><PaymentSuccess /></ProtectedRoute>}
      />
      <Route
        path="/payments/cancel"
        element={
          <main className="mx-auto max-w-lg p-8 text-center">
            <h1 className="text-2xl font-bold">Payment canceled</h1>
            <p className="mt-2 text-muted-foreground">Your payment was not completed.</p>
            <Link to="/" className="mt-6 inline-block text-sm underline">Back to dashboard</Link>
          </main>
        }
      />
    </Routes>
  );
}
