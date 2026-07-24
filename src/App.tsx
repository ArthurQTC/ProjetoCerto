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
  Users,
  LogOut,
  UserCheck,
  ShieldAlert,
  GitFork,
  ChevronDown,
  Key,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useUIStore, useAuthStore } from "./store";
import DashboardView from "./components/DashboardView";
import ProjectsListView from "./components/ProjectsListView";
import ObraDetailView from "./components/ObraDetailView";
import ContractStepsView from "./components/ContractStepsView";
import LevantamentosView from "./components/LevantamentosView";
import UsuariosView from "./components/UsuariosView";
import LoginView from "./components/LoginView";
import FluxoOperacionalView from "./components/FluxoOperacionalView";
import ContratosAtivosView from "./components/ContratosAtivosView";

// Global Fetch Interceptor to automatically attach authorization tokens and prevent HTML JSON parsing errors
const originalFetch = window.fetch;
const customFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const token = localStorage.getItem("auth_token");
  if (token) {
    init = init || {};
    init.headers = init.headers || {};
    if (init.headers instanceof Headers) {
      init.headers.set("Authorization", `Bearer ${token}`);
    } else if (Array.isArray(init.headers)) {
      init.headers.push(["Authorization", `Bearer ${token}`]);
    } else {
      init.headers = {
        ...init.headers,
        "Authorization": `Bearer ${token}`,
      };
    }
  }
  
  try {
    const response = await originalFetch(input, init);
    const urlString = typeof input === "string" ? input : (input instanceof URL ? input.href : input.url);
    
    // Check if it's a local API request
    const isLocalApi = urlString.startsWith("/api/") || 
                        urlString.startsWith("api/") || 
                        (urlString.includes("/api/") && (urlString.startsWith(window.location.origin) || !urlString.startsWith("http")));
                        
    if (isLocalApi) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        console.warn(`[Fetch Interceptor App] API request to ${urlString} returned HTML instead of JSON. Overriding to prevent client crash.`);
        
        const mockErrorBody = JSON.stringify({
          error: "Servidor temporariamente indisponível ou rota não encontrada (404/500).",
          details: "O servidor retornou uma página HTML em vez de dados JSON.",
          status: response.status
        });
        
        return new Response(mockErrorBody, {
          status: response.status >= 200 && response.status < 300 ? 500 : response.status,
          statusText: response.statusText || "Internal Server Error (HTML response)",
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

try {
  Object.defineProperty(window, "fetch", {
    value: customFetch,
    configurable: true,
    writable: true,
    enumerable: true,
  });
} catch (e) {
  console.warn("Could not redefine window.fetch using Object.defineProperty. Falling back to direct assignment.", e);
  try {
    (window as any).fetch = customFetch;
  } catch (err) {
    console.error("Failed to intercept window.fetch globally:", err);
  }
}

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
  const fluxoSubView = useUIStore((state) => state.fluxoSubView);
  const fluxoMenuExpanded = useUIStore((state) => state.fluxoMenuExpanded);
  const projectFilter = useUIStore((state) => state.projectFilter);
  const navigateToDashboard = useUIStore((state) => state.navigateToDashboard);
  const navigateToProjects = useUIStore((state) => state.navigateToProjects);
  const navigateToSteps = useUIStore((state) => state.navigateToSteps);
  const navigateToLevantamentos = useUIStore((state) => state.navigateToLevantamentos);
  const navigateToUsuarios = useUIStore((state) => state.navigateToUsuarios);
  const navigateToFluxoOperacional = useUIStore((state) => state.navigateToFluxoOperacional);

  const { user, isAuthenticated, isChecking, logout, hasPermission } = useAuthStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [logoFailed, setLogoFailed] = useState(false);
  const [maintenanceModule, setMaintenanceModule] = useState<string | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

  // Inactivity timeout of 15 minutes
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: any;
    const INACTIVITY_TIME = 15 * 60 * 1000; // 15 minutes

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        setShowSessionExpiredModal(true);
      }, INACTIVITY_TIME);
    };

    const events = ["mousemove", "mousedown", "keypress", "scroll", "touchstart"];
    
    const addListeners = () => {
      events.forEach((event) => {
        window.addEventListener(event, resetTimer, { passive: true });
      });
    };

    const removeListeners = () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };

    addListeners();
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      removeListeners();
    };
  }, [isAuthenticated, logout]);

  // Estados de alteração de senha própria
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordStep, setChangePasswordStep] = useState<1 | 2>(1);
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState("");
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");

  // Check auth status on boot
  useEffect(() => {
    const tokenInStorage = localStorage.getItem("auth_token");
    if (!tokenInStorage) {
      useAuthStore.setState({ isChecking: false, isAuthenticated: false, user: null });
      return;
    }

    fetch("/api/me")
      .then(res => {
        if (!res.ok) throw new Error("Sessão inválida");
        return res.json();
      })
      .then(data => {
        useAuthStore.setState({ user: data.user, isAuthenticated: true, isChecking: false });
      })
      .catch(() => {
        localStorage.removeItem("auth_token");
        useAuthStore.setState({ user: null, isAuthenticated: false, isChecking: false });
      });
  }, []);

  const handleSendVerificationCode = async () => {
    setIsSendingCode(true);
    setPasswordErrorMessage("");
    setPasswordSuccessMessage("");
    try {
      const res = await fetch("/api/perfil/enviar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao enviar código.");
      }
      setPasswordSuccessMessage(data.message || "Código enviado com sucesso!");
      setChangePasswordStep(2);
    } catch (err: any) {
      setPasswordErrorMessage(err.message || "Erro de conexão ao enviar código.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !newPassword || !confirmPassword) {
      setPasswordErrorMessage("Todos os campos são obrigatórios.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage("A nova senha e a confirmação não conferem.");
      return;
    }
    if (newPassword.length < 4) {
      setPasswordErrorMessage("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }

    setIsSubmittingPassword(true);
    setPasswordErrorMessage("");
    setPasswordSuccessMessage("");
    try {
      const res = await fetch("/api/perfil/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: verificationCode,
          novaSenha: newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao alterar a senha.");
      }
      setPasswordSuccessMessage("Sua senha foi alterada com sucesso!");
      setVerificationCode("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setChangePasswordStep(1);
        setPasswordSuccessMessage("");
      }, 2000);
    } catch (err: any) {
      setPasswordErrorMessage(err.message || "Erro de conexão ao alterar senha.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleClosePasswordModal = () => {
    setShowChangePasswordModal(false);
    setChangePasswordStep(1);
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrorMessage("");
    setPasswordSuccessMessage("");
  };

  const maskEmail = (emailStr: string) => {
    if (!emailStr) return "";
    const [local, domain] = emailStr.split("@");
    if (!domain) return emailStr;
    const maskedLocal = local.length > 2 
      ? local[0] + "***" + local[local.length - 1] 
      : local[0] + "***";
    const [domainName, domainExt] = domain.split(".");
    const maskedDomain = domainName.length > 2
      ? domainName[0] + "***" + domainName[domainName.length - 1]
      : domainName[0] + "***";
    return `${maskedLocal}@${maskedDomain}.${domainExt}`;
  };

  // Redirect to first available view if they don't have access to current one
  useEffect(() => {
    if (isAuthenticated && user) {
      let hasAccess = false;
      if (activeView === "dashboard" && hasPermission("modulos", "dashboard")) hasAccess = true;
      else if (activeView === "projects" && projectFilter === "CONSOLIDADO" && hasPermission("modulos", "contratosConsolidados")) hasAccess = true;
      else if (activeView === "projects" && projectFilter === "ENTREGUE" && hasPermission("modulos", "contratosEntregues")) hasAccess = true;
      else if (activeView === "projects" && projectFilter === "A_FECHAR" && hasPermission("modulos", "orcamentosAFechar")) hasAccess = true;
      else if (activeView === "contratos-ativos" && hasPermission("modulos", "contratosAtivos")) hasAccess = true;
      else if (activeView === "steps" && hasPermission("modulos", "etapasContrato")) hasAccess = true;
      else if (activeView === "levantamentos" && hasPermission("modulos", "levantamentosOrcamentos")) hasAccess = true;
      else if (activeView === "fluxo-operacional") hasAccess = true;
      else if (activeView === "usuarios" && user.nivel === 'ADMIN') hasAccess = true;
      else if (activeView === "project-detail") hasAccess = true; // handled inside ObraDetailView

      if (!hasAccess && activeView !== "project-detail") {
        if (hasPermission("modulos", "dashboard")) {
          navigateToDashboard();
        } else if (hasPermission("modulos", "contratosConsolidados")) {
          navigateToProjects("CONSOLIDADO");
        } else if (hasPermission("modulos", "contratosEntregues")) {
          navigateToProjects("ENTREGUE");
        } else if (hasPermission("modulos", "orcamentosAFechar")) {
          navigateToProjects("A_FECHAR");
        } else if (hasPermission("modulos", "levantamentosOrcamentos")) {
          navigateToLevantamentos();
        } else if (user.nivel === 'ADMIN') {
          navigateToUsuarios();
        }
      }
    }
  }, [isAuthenticated, user, activeView, projectFilter, hasPermission, navigateToDashboard, navigateToProjects, navigateToLevantamentos, navigateToUsuarios]);

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

  // Automatically close session expired modal when logging in successfully
  useEffect(() => {
    if (isAuthenticated) {
      setShowSessionExpiredModal(false);
    }
  }, [isAuthenticated]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-brand-primary border-b-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Carregando ERP...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginView />
        {showSessionExpiredModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-500 animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  Tempo de sessão expirado.
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Por motivos de segurança, sua sessão foi encerrada devido à inatividade. Faça login novamente para continuar seu trabalho.
                </p>
              </div>

              <button
                onClick={() => setShowSessionExpiredModal(false)}
                className="w-full py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                Fazer Login
              </button>
            </motion.div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row text-brand-text-primary">
      {/* SIDEBAR NAVIGATION - Dark with strong brand identity */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-brand-primary text-white border-r border-brand-primary/10 transform md:translate-x-0 transition-transform duration-300 ease-in-out md:static ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            {/* Logo Brand Profile */}
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
              {hasPermission("modulos", "dashboard") && (
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
              )}

              {hasPermission("modulos", "contratosAtivos") && (
                <button
                  onClick={() => {
                    useUIStore.getState().navigateToContratosAtivos();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold leading-none flex items-center gap-2.5 transition-all duration-200 ${
                    activeView === "contratos-ativos"
                      ? "bg-brand-secondary text-white font-extrabold border-l-2 border-brand-accent pl-2.5"
                      : "text-white/70 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                  }`}
                  id="sidebar_nav_contratos_ativos"
                >
                  <Folders className="w-4 h-4 text-brand-accent" />
                  Contratos Ativos
                </button>
              )}

              {hasPermission("modulos", "contratosConsolidados") && (
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
              )}

              {hasPermission("modulos", "contratosEntregues") && (
                <button
                  onClick={() => {
                    navigateToProjects("ENTREGUE");
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold leading-none flex items-center gap-2.5 transition-all duration-200 ${
                    (activeView === "projects" && projectFilter === "ENTREGUE") || (activeView === "project-detail" && projectFilter === "ENTREGUE")
                      ? "bg-brand-secondary text-white font-extrabold border-l-2 border-brand-accent pl-2.5"
                      : "text-white/70 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                  }`}
                  id="sidebar_nav_projects_entregue"
                >
                  <Folders className="w-4 h-4 text-brand-accent" />
                  Contratos Entregues
                </button>
              )}

              {hasPermission("modulos", "orcamentosAFechar") && (
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
              )}

              {/* Etapas do Contrato - Ghost / Locked Module with maintenance control */}
              {hasPermission("modulos", "etapasContrato") && (
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
              )}

              {/* Levantamentos/Orçamentos - Fully Functional Module */}
              {hasPermission("modulos", "levantamentosOrcamentos") && (
                <button
                  onClick={() => {
                    navigateToLevantamentos();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold leading-none flex items-center gap-2.5 transition-all duration-200 ${
                    activeView === "levantamentos"
                      ? "bg-brand-secondary text-white font-extrabold border-l-2 border-brand-accent pl-2.5"
                      : "text-white/70 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                  }`}
                  id="sidebar_nav_levantamentos"
                >
                  <Coins className="w-4 h-4 text-brand-accent" />
                  <span>Levantamentos/Orçamentos</span>
                </button>
              )}

              {/* Fluxo Operacional - Expandable Accordion Menu */}
              {hasPermission("modulos", "fluxoOperacional") && (
                hasPermission("modulos", "fluxoOperacionalDashboard") ||
                hasPermission("modulos", "fluxoOperacionalTradicional") ||
                hasPermission("modulos", "fluxoOperacionalExecutivo") ||
                hasPermission("modulos", "fluxoOperacionalPainel") ||
                hasPermission("modulos", "fluxoOperacionalWorkflow") ||
                hasPermission("modulos", "fluxoOperacionalHistorico")
              ) && (
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      if (activeView === "fluxo-operacional") {
                        useUIStore.getState().setFluxoMenuExpanded(!fluxoMenuExpanded);
                      } else {
                        navigateToFluxoOperacional("dashboard");
                        useUIStore.getState().setFluxoMenuExpanded(true);
                      }
                    }}
                    className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold leading-none flex items-center justify-between transition-all duration-200 ${
                      activeView === "fluxo-operacional"
                        ? "bg-brand-secondary text-white font-extrabold border-l-2 border-brand-accent pl-2.5"
                        : "text-white/70 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                    }`}
                    id="sidebar_nav_fluxo_operacional"
                  >
                    <div className="flex items-center gap-2.5">
                      <GitFork className="w-4 h-4 text-brand-accent" />
                      <span>Fluxo Operacional</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${fluxoMenuExpanded ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {fluxoMenuExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pl-4 pr-1 py-1 space-y-1 bg-white/5 rounded-lg border border-white/5 overflow-hidden"
                      >
                        {/* 1. Dashboard */}
                        {hasPermission("modulos", "fluxoOperacionalDashboard") && (
                          <button
                            onClick={() => {
                              navigateToFluxoOperacional("dashboard");
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full py-2 px-3 rounded-md text-[11px] font-semibold leading-none flex items-center gap-2 transition-all duration-200 ${
                              activeView === "fluxo-operacional" && fluxoSubView === "dashboard"
                                ? "bg-white/10 text-white font-black"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                            id="subnav_dashboard"
                          >
                            <span className="text-sm">📊</span>
                            <span>Dashboard</span>
                          </button>
                        )}

                        {/* 2. Fluxograma Tradicional */}
                        {hasPermission("modulos", "fluxoOperacionalTradicional") && (
                          <button
                            onClick={() => {
                              navigateToFluxoOperacional("tradicional");
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full py-2 px-3 rounded-md text-[11px] font-semibold leading-none flex items-center gap-2 transition-all duration-200 ${
                              activeView === "fluxo-operacional" && fluxoSubView === "tradicional"
                                ? "bg-white/10 text-white font-black"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                            id="subnav_tradicional"
                          >
                            <span className="text-sm">🗺️</span>
                            <span>Fluxograma Tradicional</span>
                          </button>
                        )}

                        {/* 3. Fluxograma Executivo */}
                        {hasPermission("modulos", "fluxoOperacionalExecutivo") && (
                          <button
                            onClick={() => {
                              navigateToFluxoOperacional("executivo");
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full py-2 px-3 rounded-md text-[11px] font-semibold leading-none flex items-center gap-2 transition-all duration-200 ${
                              activeView === "fluxo-operacional" && fluxoSubView === "executivo"
                                ? "bg-white/10 text-white font-black"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                            id="subnav_executivo"
                          >
                            <span className="text-sm">📈</span>
                            <span>Fluxograma Executivo</span>
                          </button>
                        )}

                        {/* 4. Painel Operacional (Kanban) */}
                        {hasPermission("modulos", "fluxoOperacionalPainel") && (
                          <button
                            onClick={() => {
                              navigateToFluxoOperacional("painel");
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full py-2 px-3 rounded-md text-[11px] font-semibold leading-none flex items-center gap-2 transition-all duration-200 ${
                              activeView === "fluxo-operacional" && fluxoSubView === "painel"
                                ? "bg-white/10 text-white font-black"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                            id="subnav_painel"
                          >
                            <span className="text-sm">📋</span>
                            <span>Painel Operacional</span>
                          </button>
                        )}

                        {/* 5. Workflow */}
                        {hasPermission("modulos", "fluxoOperacionalWorkflow") && (
                          <button
                            onClick={() => {
                              navigateToFluxoOperacional("workflow");
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full py-2 px-3 rounded-md text-[11px] font-semibold leading-none flex items-center gap-2 transition-all duration-200 ${
                              activeView === "fluxo-operacional" && fluxoSubView === "workflow"
                                ? "bg-white/10 text-white font-black"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                            id="subnav_workflow"
                          >
                            <span className="text-sm">🔄</span>
                            <span>Workflow</span>
                          </button>
                        )}

                        {/* 6. Histórico */}
                        {hasPermission("modulos", "fluxoOperacionalHistorico") && (
                          <button
                            onClick={() => {
                              navigateToFluxoOperacional("historico");
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full py-2 px-3 rounded-md text-[11px] font-semibold leading-none flex items-center gap-2 transition-all duration-200 ${
                              activeView === "fluxo-operacional" && fluxoSubView === "historico"
                                ? "bg-white/10 text-white font-black"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                            id="subnav_historico"
                          >
                            <span className="text-sm">🕒</span>
                            <span>Histórico</span>
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Controle de Acessos */}
              {user?.nivel === 'ADMIN' && (
                <button
                  onClick={() => {
                    navigateToUsuarios();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold leading-none flex items-center gap-2.5 transition-all duration-200 ${
                    activeView === "usuarios"
                      ? "bg-brand-secondary text-white font-extrabold border-l-2 border-brand-accent pl-2.5"
                      : "text-white/70 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                  }`}
                  id="sidebar_nav_usuarios"
                >
                  <Users className="w-4 h-4 text-brand-accent" />
                  <span>Controle de Acessos</span>
                </button>
              )}

              {/* Alterar Senha - Ocultado por enquanto
              <button
                onClick={() => {
                  setShowChangePasswordModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold leading-none flex items-center gap-2.5 transition-all duration-200 text-white/70 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                id="sidebar_nav_alterar_senha"
              >
                <Key className="w-4 h-4 text-brand-accent" />
                <span>Alterar Senha</span>
              </button>
              */}
            </nav>
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
          aria-label="Abrir menu de navegação"
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
            <span>PROJETO CERTO GESTÃO</span>
          </div>
          <div className="flex items-center gap-4">
            {!logoFailed && logoUrl !== DEFAULT_LOGO_URL && (
              <img src={logoUrl} alt="Auxiliary Logo" className="h-6 object-contain grayscale opacity-60 hover:opacity-100 transition-opacity" />
            )}
            <div className="relative">
              <div 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 active:bg-slate-200 transition-all select-none"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-secondary flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                  {user?.nome ? user.nome.substring(0, 2).toUpperCase() : "PC"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-brand-text-primary truncate leading-none">{user?.nome}</p>
                  <p className="text-[9px] font-bold text-[#D9A441] uppercase tracking-wider mt-1 leading-none">{user?.nivel}</p>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    logout();
                  }}
                  aria-label="Sair da conta"
                  className="p-1.5 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg border border-slate-200 hover:border-red-200 transition-all cursor-pointer ml-1"
                  title="Sair"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* FLOATING PROFILE POPUP / DROPDOWN */}
              <AnimatePresence>
                {showProfileDropdown && (
                  <>
                    {/* Invisible backdrop to close the dropdown when clicking outside */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileDropdown(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-100 shadow-xl p-5 z-50 text-slate-700 space-y-4"
                    >
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-brand-secondary flex items-center justify-center font-black text-sm text-white uppercase">
                          {user?.nome ? user.nome.substring(0, 2).toUpperCase() : "PC"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-800 truncate leading-tight">{user?.nome}</p>
                          <p className="text-[10px] font-extrabold text-[#D9A441] uppercase tracking-widest mt-0.5 leading-none">{user?.nivel}</p>
                        </div>
                      </div>

                      <div className="space-y-3 text-[11px]">
                        <div>
                          <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] leading-none">E-mail Cadastrado</p>
                          <p className="font-bold text-slate-700 mt-1 break-all bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">{user?.email || "Não informado"}</p>
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] leading-none">Nome de Usuário</p>
                          <p className="font-bold text-slate-700 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">{user?.nome_usuario || user?.nome?.toLowerCase().replace(/\s+/g, '') || "Não informado"}</p>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            setShowChangePasswordModal(true);
                          }}
                          className="w-full py-2 px-3 bg-brand-primary hover:bg-brand-secondary text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl shadow-md shadow-brand-primary/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5 text-brand-accent" />
                          <span>Alterar Senha</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            logout();
                          }}
                          className="w-full py-2 px-3 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold text-[11px] uppercase tracking-wider rounded-xl border border-slate-200 hover:border-red-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sair da Conta</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Main workspace switching routing layout */}
          <div className="w-full max-w-full mx-auto">
            {activeView === "dashboard" && hasPermission("modulos", "dashboard") ? (
              <DashboardView />
            ) : activeView === "projects" && (
              (projectFilter === "CONSOLIDADO" && hasPermission("modulos", "contratosConsolidados")) ||
              (projectFilter === "ENTREGUE" && hasPermission("modulos", "contratosEntregues")) ||
              (projectFilter === "A_FECHAR" && hasPermission("modulos", "orcamentosAFechar"))
            ) ? (
              <ProjectsListView />
            ) : activeView === "contratos-ativos" && hasPermission("modulos", "contratosAtivos") ? (
              <ContratosAtivosView />
            ) : activeView === "steps" && hasPermission("modulos", "etapasContrato") ? (
              <ContractStepsView />
            ) : activeView === "levantamentos" && hasPermission("modulos", "levantamentosOrcamentos") ? (
              <LevantamentosView />
            ) : activeView === "fluxo-operacional" ? (
              <FluxoOperacionalView />
            ) : activeView === "usuarios" && user?.nivel === 'ADMIN' ? (
              <UsuariosView />
            ) : activeView === "project-detail" ? (
              <ObraDetailView />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
                <p className="text-slate-500 mb-6">Você não possui permissão para acessar este módulo.</p>
              </div>
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

      {/* MODAL DE ALTERAÇÃO DE SENHA */}
      <AnimatePresence>
        {showChangePasswordModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-brand-primary text-white p-6 relative">
                <button
                  onClick={handleClosePasswordModal}
                  className="absolute right-4 top-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-all cursor-pointer"
                  title="Fechar"
                >
                  <span className="text-sm">✕</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-brand-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight uppercase leading-tight">Alterar Senha</h3>
                    <p className="text-[10px] text-white/70 font-mono uppercase tracking-widest mt-0.5">Segurança da Conta</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar / Steps */}
              <div className="flex border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <div className={`flex-1 py-3 text-center border-r border-slate-100 ${changePasswordStep === 1 ? 'text-brand-primary bg-white font-extrabold border-b-2 border-brand-accent' : ''}`}>
                  1. Solicitar Código
                </div>
                <div className={`flex-1 py-3 text-center ${changePasswordStep === 2 ? 'text-brand-primary bg-white font-extrabold border-b-2 border-brand-accent' : ''}`}>
                  2. Validar & Alterar
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                {passwordErrorMessage && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <span className="text-sm">⚠️</span>
                    <span>{passwordErrorMessage}</span>
                  </div>
                )}
                
                {passwordSuccessMessage && (
                  <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                    <span className="text-sm">✅</span>
                    <span>{passwordSuccessMessage}</span>
                  </div>
                )}

                {changePasswordStep === 1 ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Para alterar sua senha, precisamos enviar um código de segurança de 6 dígitos para o e-mail registrado na sua conta.
                    </p>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200/50 flex items-center justify-center">
                        <span className="text-base">📧</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">E-mail Cadastrado</p>
                        <p className="text-xs font-bold text-slate-700 mt-1 truncate font-mono">{user?.email ? maskEmail(user.email) : "..."}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleSendVerificationCode}
                      disabled={isSendingCode}
                      className="w-full py-3 px-4 bg-brand-primary hover:bg-brand-secondary disabled:bg-slate-300 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSendingCode ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                          <span>Enviando Código...</span>
                        </>
                      ) : (
                        <span>Enviar Código de Segurança</span>
                      )}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Insira o código de 6 dígitos enviado para seu e-mail e defina sua nova senha.
                    </p>

                    {/* Código de Verificação */}
                    <div>
                      <label htmlFor="app_pwd_code_input" className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Código de 6 dígitos</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3.5 top-3 text-sm">🔑</span>
                        <input
                          id="app_pwd_code_input"
                          type="text"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="Digite o código"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-sm font-bold tracking-widest text-center focus:outline-none transition-all font-mono"
                          required
                        />
                      </div>
                    </div>

                    {/* Nova Senha */}
                    <div>
                      <label htmlFor="app_pwd_new_input" className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Nova Senha</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3.5 top-3 text-sm">🔒</span>
                        <input
                          id="app_pwd_new_input"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 4 caracteres"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-xs font-bold focus:outline-none transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* Confirmar Nova Senha */}
                    <div>
                      <label htmlFor="app_pwd_confirm_input" className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Confirmar Nova Senha</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3.5 top-3 text-sm">🔒</span>
                        <input
                          id="app_pwd_confirm_input"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a nova senha"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl text-xs font-bold focus:outline-none transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setChangePasswordStep(1)}
                        className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingPassword}
                        className="flex-2 py-3 px-4 bg-brand-primary hover:bg-brand-secondary disabled:bg-slate-300 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSubmittingPassword ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                            <span>Alterando...</span>
                          </>
                        ) : (
                          <span>Alterar Senha</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showSessionExpiredModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-500 animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  Tempo de sessão expirado.
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Por motivos de segurança, sua sessão foi encerrada devido à inatividade. Faça login novamente para continuar seu trabalho.
                </p>
              </div>

              <button
                onClick={() => setShowSessionExpiredModal(false)}
                className="w-full py-2.5 bg-brand-primary hover:bg-brand-secondary text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                Fazer Login
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
