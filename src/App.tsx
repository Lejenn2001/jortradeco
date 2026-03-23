import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import DashboardSignals from "./pages/DashboardSignals.tsx";
import DashboardMarket from "./pages/DashboardMarket.tsx";
import DashboardChat from "./pages/DashboardChat.tsx";
import DashboardPnL from "./pages/DashboardPnL.tsx";
import DashboardCommunity from "./pages/DashboardCommunity.tsx";
import DashboardAnalytics from "./pages/DashboardAnalytics.tsx";
import DashboardSettings from "./pages/DashboardSettings.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import Contact from "./pages/Contact.tsx";
import NotFound from "./pages/NotFound.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/signals" element={<DashboardSignals />} />
            <Route path="/dashboard/market" element={<DashboardMarket />} />
            <Route path="/dashboard/chat" element={<DashboardChat />} />
            <Route path="/dashboard/pnl" element={<DashboardPnL />} />
            <Route path="/dashboard/community" element={<DashboardCommunity />} />
            <Route path="/dashboard/analytics" element={<DashboardAnalytics />} />
            <Route path="/dashboard/settings" element={<DashboardSettings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
