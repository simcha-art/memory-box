import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { AuthPage } from "../features/auth/AuthPage";
import { useAuth } from "../features/auth/AuthContext";
import { AdminPage } from "../pages/AdminPage";
import { ItemsPage } from "../pages/ItemsPage";
import { RemindersPage } from "../pages/RemindersPage";
import { WorkspaceProvider } from "../stores/WorkspaceStore";
import { usePreferences } from "../stores/PreferencesStore";

function LoadingScreen() {
  const { t } = usePreferences();
  return (
    <main className="boot-screen">
      <span className="brand-icon">
        <span>m</span>
      </span>
      <p>{t("loadingApp")}</p>
    </main>
  );
}

function WorkspaceLayout() {
  return (
    <WorkspaceProvider>
      <AppShell />
    </WorkspaceProvider>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminRoute() {
  const { user } = useAuth();
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/items" replace />;
}

export function AppRouter() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? <Navigate to="/items" replace /> : <AuthPage mode="login" />
        }
      />
      <Route
        path="/register"
        element={
          user ? <Navigate to="/items" replace /> : <AuthPage mode="register" />
        }
      />
      <Route element={<ProtectedRoutes />}>
        <Route element={<WorkspaceLayout />}>
          <Route index element={<Navigate to="/items" replace />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>
      <Route
        path="*"
        element={<Navigate to={user ? "/items" : "/login"} replace />}
      />
    </Routes>
  );
}
