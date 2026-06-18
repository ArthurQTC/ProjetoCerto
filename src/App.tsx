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
  Lock,
  Wrench,
  Hammer,
} from "lucide-react";
import { motion } from "motion/react";
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
  const [maintenanceModule, setMaintenanceModule] = useState<string | null>(null);

  // Sync maintenance view if navigation is triggered programmatically to "steps"
  useEffect(() => {
    if (activeView === "steps") {
      setMaintenanceModule("Etapas do Contrato");
    } else {
      setMaintenanceModule(null);
    }
  }, [activeView]);

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
                Orçamentos a Fechar
              </button>

              {/* Etapas do Contrato - Ghost / Locked Module with maintenance control */}
              <button
                onClick={() => {
                  setMaintenanceModule("Etapas do Contrato");
                  setMobileMenuOpen(false);
                }}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold leading-none flex items-center justify-between transition-all duration-200 ${
                  maintenanceModule === "Etapas do Contrato" || activeView === "steps"
                    ? "bg-white/10 text-white font-extrabold border-l-2 border-brand-accent/60 pl-2.5"
                    : "text-white/40 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                }`}
                id="sidebar_nav_steps"
              >
                <div className="flex items-center gap-2.5">
                  <ListChecks className="w-4 h-4 text-brand-accent/50" />
                  <span>Etapas do Contrato</span>
                </div>
                <Lock className="w-3.5 h-3.5 text-[#D9A441] opacity-70 animate-pulse" />
              </button>

              {/* Levantamentos/Orçamentos - Ghost / Locked Module with maintenance control */}
              <button
                onClick={() => {
                  setMaintenanceModule("Levantamentos/Orçamentos");
                  setMobileMenuOpen(false);
                }}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold leading-none flex items-center justify-between transition-all duration-200 ${
                  maintenanceModule === "Levantamentos/Orçamentos"
                    ? "bg-white/10 text-white font-extrabold border-l-2 border-brand-accent/60 pl-2.5"
                    : "text-white/40 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                }`}
                id="sidebar_nav_levantamentos"
              >
                <div className="flex items-center gap-2.5">
                  <Coins className="w-4 h-4 text-brand-accent/50" />
                  <span>Levantamentos/Orçamentos</span>
                </div>
                <Lock className="w-3.5 h-3.5 text-[#D9A441] opacity-70 animate-pulse" />
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

      {/* Maintenance Popup Modal - Unclosable overlay */}
      {maintenanceModule && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden relative"
          >
            {/* Animated Warning Stripe Banner */}
            <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 relative overflow-hidden">
              <motion.div 
                animate={{ x: [-20, 0] }}
                transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, #000, #000 10px, transparent 10px, transparent 20px)",
                  backgroundSize: "28px 28px",
                  width: "120%"
                }}
              />
            </div>
                  <div className="p-8 text-center space-y-6">
              {/* Construction Animated Scene: Animated helper fitting a Brise-soleil onto a modern architecture facade */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 overflow-hidden relative shadow-inner">
                <svg viewBox="0 0 400 200" className="w-full h-40 mx-auto select-none overflow-visible">
                  {/* Grid Background representing architectural drawing blueprint */}
                  <defs>
                    <pattern id="grid_pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(217, 164, 65, 0.08)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid_pattern)" rx="8" />
                  
                  {/* Ground Level */}
                  <line x1="20" y1="170" x2="380" y2="170" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />

                  {/* MODERN ARCHITECTURE BUILDING FACADE (Pilotis & Slab levels) */}
                  <g transform="translate(180, 40)">
                    {/* Shadow of building */}
                    <rect x="0" y="0" width="180" height="90" fill="#F1F5F9" opacity="0.5" rx="3" />
                    
                    {/* Glass curtain wall at the back */}
                    <rect x="5" y="10" width="170" height="70" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" rx="2" />
                    <line x1="45" y1="10" x2="45" y2="80" stroke="#CBD5E1" strokeWidth="1" />
                    <line x1="90" y1="10" x2="90" y2="80" stroke="#CBD5E1" strokeWidth="1" />
                    <line x1="135" y1="10" x2="135" y2="80" stroke="#CBD5E1" strokeWidth="1" />

                    {/* Ground floor pilotis columns */}
                    <rect x="15" y="90" width="10" height="40" fill="#94A3B8" rx="1" />
                    <rect x="85" y="90" width="10" height="40" fill="#94A3B8" rx="1" />
                    <rect x="155" y="90" width="10" height="40" fill="#94A3B8" rx="1" />

                    {/* Top Concrete Slab Roof overhang */}
                    <rect x="-10" y="-8" width="200" height="18" fill="#F8FAFC" stroke="#64748B" strokeWidth="2" rx="3" />
                    {/* Mid concrete slab plate */}
                    <rect x="-5" y="80" width="190" height="10" fill="#F8FAFC" stroke="#64748B" strokeWidth="2" rx="2" />

                    {/* EXISTING FIXED BRISE-SOLEIL SLATS (WOODEN STYLE LOUVERS) */}
                    <rect x="15" y="10" width="6" height="70" fill="#B45309" rx="1" />
                    <rect x="30" y="10" width="6" height="70" fill="#B45309" rx="1" />
                    <rect x="45" y="10" width="6" height="70" fill="#B45309" rx="1" />
                    <rect x="60" y="10" width="6" height="70" fill="#B45309" rx="1" />
                    
                    {/* Slot at x=75 is vacant / missing brise-soleil - highlighted as target */}
                    <rect x="75" y="10" width="6" height="70" fill="none" stroke="#D9A441" strokeWidth="1.5" strokeDasharray="3 3" rx="1" opacity="0.8" />
                    
                    <rect x="105" y="10" width="6" height="70" fill="#B45309" rx="1" />
                    <rect x="120" y="10" width="6" height="70" fill="#B45309" rx="1" />
                    <rect x="135" y="10" width="6" height="70" fill="#B45309" rx="1" />
                    <rect x="150" y="10" width="6" height="70" fill="#B45309" rx="1" />
                    <rect x="165" y="10" width="6" height="70" fill="#B45309" rx="1" />
                  </g>

                  {/* SCAFFOLDING TOWER FOR THE WORKER */}
                  <g transform="translate(60, 60)">
                    {/* Scaffolding frames */}
                    <rect x="60" y="0" width="65" height="110" fill="none" stroke="#94A3B8" strokeWidth="2" />
                    <line x1="60" y1="0" x2="125" y2="110" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="2 2" />
                    <line x1="125" y1="0" x2="60" y2="110" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="2 2" />
                    <line x1="60" y1="55" x2="125" y2="55" stroke="#64748B" strokeWidth="2" />
                    
                    {/* Wooden walk board platform */}
                    <rect x="52" y="-5" width="81" height="8" fill="#D97706" stroke="#B45309" strokeWidth="1" rx="1.5" />
                  </g>

                  {/* HERO WORKER: Carrying and fitting the Brise-soleil */}
                  <motion.g
                    animate={{
                      x: [130, 213, 213, 130]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 4,
                      ease: "easeInOut",
                      times: [0, 0.45, 0.75, 1]
                    }}
                    style={{ y: 20 }}
                  >
                    {/* Helmet */}
                    <path d="M -2 12 C -2 3, 16 3, 16 12 Z" fill="#D9A441" />
                    <line x1="-5" y1="12" x2="19" y2="12" stroke="#D9A441" strokeWidth="2.5" strokeLinecap="round" />

                    {/* Head */}
                    <circle cx="7" cy="21" r="8" fill="#475569" />

                    {/* Torso body */}
                    <line x1="7" y1="29" x2="7" y2="58" stroke="#475569" strokeWidth="3" strokeLinecap="round" />

                    {/* Legs walking dynamically */}
                    <motion.line
                      x1="7"
                      y1="58"
                      animate={{
                        x2: [-2, 12, -2, 12, -2, -2, -2, 12, -2, 12, -2],
                        y2: [90, 88, 90, 88, 90, 90, 90, 88, 90, 88, 90]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 4,
                        ease: "linear",
                        times: [0, 0.11, 0.22, 0.33, 0.45, 0.75, 0.81, 0.87, 0.93, 0.97, 1]
                      }}
                      stroke="#475569"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <motion.line
                      x1="7"
                      y1="58"
                      animate={{
                        x2: [16, -2, 16, -2, 16, 16, 16, -2, 16, -2, 16],
                        y2: [90, 88, 90, 88, 90, 90, 90, 88, 90, 88, 90]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 4,
                        ease: "linear",
                        times: [0, 0.11, 0.22, 0.33, 0.45, 0.75, 0.81, 0.87, 0.93, 0.97, 1]
                      }}
                      stroke="#475569"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Left arm: extends forward, retracts back at side */}
                    <motion.line
                      x1="7"
                      y1="36"
                      animate={{
                        x2: [22, 22, 40, 40, 5, 5, 22],
                        y2: [30, 30, 42, 42, 45, 45, 30]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 4,
                        times: [0, 0.45, 0.55, 0.75, 0.82, 0.95, 1]
                      }}
                      stroke="#334155"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Right arm: extends forward, retracts back at side */}
                    <motion.line
                      x1="5"
                      y1="38"
                      animate={{
                        x2: [20, 20, 38, 38, 3, 3, 20],
                        y2: [34, 34, 46, 46, 48, 48, 34]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 4,
                        times: [0, 0.45, 0.55, 0.75, 0.82, 0.95, 1]
                      }}
                      stroke="#475569"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Brise Slat in his hands: carried, fitted, then left on the building */}
                    <motion.g
                      animate={{
                        x: [15, 15, 42, 42, 42, 15],
                        y: [10, 10, 30, 30, 30, 10],
                        rotate: [15, 15, 0, 0, 0, 15],
                        opacity: [1, 1, 1, 1, 0, 0]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 4,
                        times: [0, 0.45, 0.55, 0.72, 0.78, 1]
                      }}
                      style={{ transformOrigin: "18px 35px" }}
                    >
                      {/* Wood textured Brise-soleil louver */}
                      <rect x="0" y="0" width="6" height="70" fill="#D9A441" stroke="#B45309" strokeWidth="1" rx="1.5" />
                      <circle cx="3" cy="5" r="2.2" fill="#334155" />
                      <circle cx="3" cy="65" r="2.2" fill="#334155" />
                    </motion.g>
                  </motion.g>

                  {/* Sparks / fitting alignment circles when successfully fitted */}
                  <motion.g
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: [0, 0, 1.3, 0],
                      opacity: [0, 0, 1, 0]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 4,
                      ease: "easeOut",
                      times: [0, 0.43, 0.55, 0.85]
                    }}
                    transform="translate(258, 85)"
                  >
                    <circle cx="0" cy="-35" r="5" fill="none" stroke="#10B981" strokeWidth="1.5" />
                    <circle cx="0" cy="35" r="5" fill="none" stroke="#10B981" strokeWidth="1.5" strokeDasharray="2 2" />
                    <path d="M -8 -35 L -14 -35 M 8 -35 L 14 -35" stroke="#10B981" strokeWidth="1" />
                    <path d="M -8 35 L -14 35 M 8 35 L 14 35" stroke="#10B981" strokeWidth="1" />
                  </motion.g>
                </svg>
              </div>

              {/* Maintenance Text - Exactly as requested */}
              <div className="space-y-2 text-center">
                <h3 className="text-2xl font-black text-brand-text-primary tracking-tight font-sans">
                  Estamos em obras...
                </h3>
                <p className="text-xs text-brand-text-secondary leading-relaxed">
                  O módulo <strong className="text-brand-primary font-bold">{maintenanceModule}</strong> está em obras para melhorias de sistema.
                </p>
              </div>

              {/* Decorative dynamic badge indicating in construction */}
              <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3 inline-flex items-center gap-2 text-[10px] text-amber-800 font-extrabold max-w-xs mx-auto justify-center">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                <span>MÓDULO EM MANUTENÇÃO</span>
              </div>

              {/* Interactive Return to Dashboard Button */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    navigateToDashboard();
                    setMaintenanceModule(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all duration-150 uppercase tracking-wider cursor-pointer"
                  id="maintenance_back_to_dashboard_btn"
                >
                  <LayoutDashboard className="w-4 h-4 text-brand-accent shrink-0" />
                  <span>Voltar para o Dashboard</span>
                </button>
              </div>

              {/* Notice advising how to navigate away safely */}
              <p className="text-[9px] text-slate-400 font-mono font-bold leading-relaxed">
                Utilize o botão acima para voltar ao Dashboard ou escolha outro módulo ativo na barra lateral.
              </p>
            </div>
          </motion.div>
        </div>
      )}
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
