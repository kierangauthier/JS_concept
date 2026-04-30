import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import { TerrainLayout } from "@/components/layout/TerrainLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Suppliers from "./pages/Suppliers";
import Quotes from "./pages/Quotes";
import Jobs from "./pages/Jobs";
import Planning from "./pages/Planning";
import HR from "./pages/HR";
import Purchases from "./pages/Purchases";
import Workshop from "./pages/Workshop";
import Invoicing from "./pages/Invoicing";
import AdminPage from "./pages/AdminPage";
import AdminLegal from "./pages/AdminLegal";
import ImportData from "./pages/ImportData";
import Catalog from "./pages/Catalog";
import TimeEntries from "./pages/TimeEntries";
import TimeValidation from "./pages/TimeValidation";
import Absences from "./pages/Absences";
import Reports from "./pages/Reports";
import TerrainToday from "./pages/terrain/TerrainToday";
import InterventionDetail from "./pages/terrain/InterventionDetail";
import TerrainJobs from "./pages/terrain/TerrainJobs";
import TerrainPhotos from "./pages/terrain/TerrainPhotos";
import TerrainHours from "./pages/terrain/TerrainHours";
import TerrainProfile from "./pages/terrain/TerrainProfile";
import TerrainQueue from "./pages/terrain/TerrainQueue";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/LoginPage";
import LegalLayout from "./pages/legal/LegalLayout";
import MentionsLegales from "./pages/legal/MentionsLegales";
import Cgu from "./pages/legal/Cgu";
import Cgv from "./pages/legal/Cgv";
import Confidentialite from "./pages/legal/Confidentialite";
import Account from "./pages/Account";

/**
 * Wraps protected routes. Redirects to /login when not authenticated.
 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useApp();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Redirects authenticated users away from /login.
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

          {/* Public legal pages (accessible without login — required for commercial use). */}
          <Route element={<LegalLayout />}>
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/cgu" element={<Cgu />} />
            <Route path="/cgv" element={<Cgv />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
          </Route>

          {/* Protected desktop layout */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<Jobs />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/hr" element={<HR />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/workshop" element={<Workshop />} />
            <Route path="/invoicing" element={<Invoicing />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/time-entries" element={<TimeEntries />} />
            <Route path="/time-validation" element={<TimeValidation />} />
            <Route path="/absences" element={<Absences />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/legal" element={<AdminLegal />} />
            <Route path="/admin/import" element={<ImportData />} />
            <Route path="/account" element={<Account />} />
          </Route>

          {/* Protected terrain mobile layout */}
          <Route element={<RequireAuth><TerrainLayout /></RequireAuth>}>
            <Route path="/terrain" element={<TerrainToday />} />
            <Route path="/terrain/intervention/:id" element={<InterventionDetail />} />
            <Route path="/terrain/jobs" element={<TerrainJobs />} />
            <Route path="/terrain/photos" element={<TerrainPhotos />} />
            <Route path="/terrain/hours" element={<TerrainHours />} />
            <Route path="/terrain/profile" element={<TerrainProfile />} />
            <Route path="/terrain/queue" element={<TerrainQueue />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </ErrorBoundary>
);

export default App;
