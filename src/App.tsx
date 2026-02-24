import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Quotes from "./pages/Quotes";
import Jobs from "./pages/Jobs";
import Planning from "./pages/Planning";
import Terrain from "./pages/Terrain";
import Purchases from "./pages/Purchases";
import Workshop from "./pages/Workshop";
import Invoicing from "./pages/Invoicing";
import AdminPage from "./pages/AdminPage";
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
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/planning" element={<Planning />} />
              <Route path="/terrain" element={<Terrain />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/workshop" element={<Workshop />} />
              <Route path="/invoicing" element={<Invoicing />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
