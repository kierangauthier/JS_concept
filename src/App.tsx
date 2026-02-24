import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { TerrainLayout } from "@/components/layout/TerrainLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Quotes from "./pages/Quotes";
import Jobs from "./pages/Jobs";
import Planning from "./pages/Planning";
import Purchases from "./pages/Purchases";
import Workshop from "./pages/Workshop";
import Invoicing from "./pages/Invoicing";
import AdminPage from "./pages/AdminPage";
import TerrainToday from "./pages/terrain/TerrainToday";
import InterventionDetail from "./pages/terrain/InterventionDetail";
import TerrainJobs from "./pages/terrain/TerrainJobs";
import TerrainPhotos from "./pages/terrain/TerrainPhotos";
import TerrainHours from "./pages/terrain/TerrainHours";
import TerrainProfile from "./pages/terrain/TerrainProfile";
import TerrainQueue from "./pages/terrain/TerrainQueue";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Desktop layout */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/planning" element={<Planning />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/workshop" element={<Workshop />} />
              <Route path="/invoicing" element={<Invoicing />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            {/* Terrain mobile layout */}
            <Route element={<TerrainLayout />}>
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
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
