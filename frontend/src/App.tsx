import { Toaster } from "react-hot-toast";
import { Routes, Route, Navigate } from "react-router-dom";

import { PrivateRoute } from "./components";
import { AuthProvider } from "./context/AuthContext";
import { LoginPage, RegisterPage } from "./pages/auth";
import { DashboardPage } from "./pages/dashboard-page/DashboardPage";

export const App = (): JSX.Element => (
  <AuthProvider>
    <Toaster position="top-right" toastOptions={{ duration: 4000 }} containerStyle={{ top: 80 }} />
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
    </Routes>
  </AuthProvider>
);
