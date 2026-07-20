import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/toast";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";

import LoginPage from "@/pages/auth/LoginPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import DashboardPage from "@/pages/Dashboard";
import CasesListPage from "@/pages/cases/CasesListPage";
import CaseDetailPage from "@/pages/cases/CaseDetailPage";
import KanbanPage from "@/pages/cases/KanbanPage";
import CustomersListPage from "@/pages/customers/CustomersListPage";
import CustomerDetailPage from "@/pages/customers/CustomerDetailPage";
import CalendarPage from "@/pages/Calendar";
import ArchivePage from "@/pages/Archive";
import ReportsPage from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/cases" element={<CasesListPage />} />
                  <Route path="/cases/:id" element={<CaseDetailPage />} />
                  <Route path="/kanban" element={<KanbanPage />} />
                  <Route path="/customers" element={<CustomersListPage />} />
                  <Route path="/customers/:id" element={<CustomerDetailPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/archive" element={<ArchivePage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
