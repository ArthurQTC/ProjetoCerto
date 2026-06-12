import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Sparkles,
  LayoutDashboard,
  Menu,
  FolderLock,
  Plus,
  Coins,
  Folders,
  ListChecks,
} from "lucide-react";
import { useUIStore } from "./store";
import DashboardView from "./components/DashboardView";
import ProjectsListView from "./components/ProjectsListView";
import ObraDetailView from "./components/ObraDetailView";
import ContractStepsView from "./components/ContractStepsView";

// Initialize React Query Client for server state management
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const DEFAULT_LOGO_URL = "https://dptxkbsyzfntolgmhniz.supabase.co/storage/v1/object/sign/ProjetoCerto/faviconProjetoCerto.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yY2MyYjJkMS1hMDBkLTQ5N2EtYTQwMC0zOWM0MjFkZmNmYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJQcm9qZXRvQ2VydG8vZmF2aWNvblByb2pldG9DZXJ0by5wbmciLCJpYXQiOjE3ODA0MjQxNDIsImV4cCI6MjA5NTc4NDE0Mn0._ofXmRtiUUM0MbiBO-FO7fBd5btjixNn1B7EGjNUVy4";

function AppContent() {
  const activeView = useUIStore((state) => state.activeView);
  const projectFilter = useUIStore((state) => state.projectFilter);
  const navigateToDashboard = useUIStore((state) => state.navigateToDashboard);
  const navigateToProjects = useUIStore((state) => state.navigateToProjects);
  const navigateToSteps = useUIStore((state) => state.navigateToSteps);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [logoFailed, setLogoFailed] = useState(false);

  // Read logo_url from query param or localStorage to support dynamic branding overrides
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const customUrl = params.get("logo_url") || localStorage.getItem("logo_url");
    if (customUrl) {
      setLogoUrl(customUrl);
    }
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row text-brand-text-primary">
      {/* SIDEBAR NAVIGATION - Dark with strong brand identity */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-brand-primary text-white border-r border-brand-primary/10 transform md:translate-x-0 transition-transform duration-300 ease-in-out md:static ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex flex-col h-full justify-between">
          <div>
            {/* Logo Brand Profile - Unframed, transparent & large as requested */}
            <div className="px-6 py-6 border-b border-white/5 flex items-center gap-3">
              {!logoFailed ? (
                <img
                  src={logoUrl}
                  alt="Projeto Certo Logo"
                  className="w-14 h-14 object-contain transition-transform hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white font-extrabold text-base">
                  PC
                </div>
              )}
              <div>
                <h2 className="text-sm font-black tracking-wider text-white leading-tight">PROJETO CERTO</h2>
                <p className="text-[9px] font-bold text-[#D9A441] uppercase tracking-widest mt-0.5 leading-none">Gestão de Custos</p>
              </div>
            </div>

            {/* Primary Navigation links */}
            <nav className="px-3 py-6 space-y-2">
              <button
                onClick={() => {
                  navigateToDashboard();
                  setMobileMenuOpen(false);
                }}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold leading-none flex items-center gap-2.5 transition-all duration-200 ${
                  activeView === "dashboard"
                    ? "bg-brand-secondary text-white font-extrabold border-l-2 border-brand-accent pl-2.5"
                    : "text-white/70 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                }`}
                id="sidebar_nav_dashboard"
              >
                <LayoutDashboard className="w-4 h-4 text-white/80" />
                Dashboard
              </button>

              <button
                onClick={() => {
                  navigateToProjects("CONSOLIDADO");
                  setMobileMenuOpen(false);
                }}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold leading-none flex items-center gap-2.5 transition-all duration-200 ${
                  (activeView === "projects" && projectFilter === "CONSOLIDADO") || (activeView === "project-detail" && projectFilter === "CONSOLIDADO")
                    ? "bg-brand-secondary text-white font-extrabold border-l-2 border-brand-accent pl-2.5"
                    : "text-white/70 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                }`}
                id="sidebar_nav_projects_consolidado"
              >
                <Folders className="w-4 h-4 text-brand-accent" />
                Contratos Consolidados
              </button>

              <button
                onClick={() => {
                  navigateToProjects("A_FECHAR");
                  setMobileMenuOpen(false);
                }}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold leading-none flex items-center gap-2.5 transition-all duration-200 ${
                  (activeView === "projects" && projectFilter === "A_FECHAR") || (activeView === "project-detail" && projectFilter === "A_FECHAR")
                    ? "bg-brand-secondary text-white font-extrabold border-l-2 border-brand-accent pl-2.5"
                    : "text-white/70 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                }`}
                id="sidebar_nav_projects_a_fechar"
              >
                <FolderLock className="w-4 h-4 text-brand-accent" />
                Contratos a Fechar
              </button>

              <button
                onClick={() => {
                  navigateToSteps();
                  setMobileMenuOpen(false);
                }}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold leading-none flex items-center gap-2.5 transition-all duration-200 ${
                  activeView === "steps"
                    ? "bg-brand-secondary text-white font-extrabold border-l-2 border-brand-accent pl-2.5"
                    : "text-white/70 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                }`}
                id="sidebar_nav_steps"
              >
                <ListChecks className="w-4 h-4 text-brand-accent" />
                Etapas do Contrato
              </button>
            </nav>
          </div>

          <div>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER RESPONSIVE TOGGLE */}
      <header className="md:hidden flex items-center justify-between bg-brand-primary px-5 py-3 border-b border-brand-secondary/30 z-30 text-white">
        <div className="flex items-center gap-2">
          {!logoFailed ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="w-10 h-10 object-contain"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="text-xs font-extrabold text-white">PC</span>
          )}
          <span className="text-xs font-extrabold text-white tracking-wider">PROJETO CERTO</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          id="mobile_menu_toggle_btn"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Backdrop for mobile navigation menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* MAIN VIEWPORT WORKSPACE FOOTER CONTEXT */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header Panel bar with custom Logo support validation */}
        <div className="hidden md:flex items-center justify-between bg-white h-16 border-b border-slate-100 px-8 z-20">
          <div className="flex items-center gap-2.5 text-xs text-brand-text-secondary font-semibold font-mono">
            <span>PROJETO CERTO ERP</span>
          </div>
          <div className="flex items-center gap-2">
            {!logoFailed && logoUrl !== DEFAULT_LOGO_URL && (
              <img src={logoUrl} alt="Auxiliary Logo" className="h-6 object-contain grayscale opacity-60 hover:opacity-100 transition-opacity" />
            )}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-success bg-brand-success/5 py-1 px-2.5 rounded-full border border-brand-success/10 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-success"></span>
              <span>SISTEMA ATIVO</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 md:p-8 overflow-y-auto">
          {/* Main workspace switching routing layout */}
          <div className="max-w-7xl mx-auto">
            {activeView === "dashboard" ? (
              <DashboardView />
            ) : activeView === "projects" ? (
              <ProjectsListView />
            ) : activeView === "steps" ? (
              <ContractStepsView />
            ) : (
              <ObraDetailView />
            )}
          </div>
        </div>

        {/* Global technical copyright footer */}
        <footer className="py-4 px-8 border-t border-slate-100 bg-white text-center text-[10px] font-semibold text-brand-text-secondary flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span>© 2026 Projeto Certo Custos. Todos os direitos reservados.</span>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
