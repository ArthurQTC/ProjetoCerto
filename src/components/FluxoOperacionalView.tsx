import React, { useState, useEffect } from "react";
import { 
  GitFork, 
  Kanban, 
  RefreshCw, 
  Calendar, 
  User, 
  Clock, 
  Search, 
  ArrowUpRight, 
  TrendingUp, 
  CheckSquare, 
  History, 
  BarChart3, 
  ClipboardList, 
  ShieldAlert,
  ChevronRight,
  SlidersHorizontal
} from "lucide-react";
import { 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import WorkflowFilters, { FilterState } from "./workflow/WorkflowFilters";
import WorkflowIndicators from "./workflow/WorkflowIndicators";
import WorkflowFlow from "./workflow/WorkflowFlow";
import WorkflowTraditional from "./workflow/WorkflowTraditional";
import WorkflowKanban from "./workflow/WorkflowKanban";
import WorkflowDrawer from "./workflow/WorkflowDrawer";
import { useUIStore, useAuthStore } from "../store";
import { Obra } from "../types";

export default function FluxoOperacionalView() {
  const fluxoSubView = useUIStore((state) => state.fluxoSubView);
  const setFluxoSubView = useUIStore((state) => state.setFluxoSubView);
  const { hasPermission } = useAuthStore();

  const [contracts, setContracts] = useState<Obra[]>([]);
  const [globalHistory, setGlobalHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    empresa: "",
    cliente: "",
    responsavel: "",
    etapa: "",
    status: "",
    periodo: "",
    search: ""
  });

  // Load contracts from the backend
  const loadContracts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/obras");
      if (res.ok) {
        const data = await res.json();
        const normalized = data.map((item: any) => ({
          ...item,
          workflowEtapa: item.workflowEtapa || "Solicitação",
          workflowStatus: item.workflowStatus || "Em Andamento"
        }));
        setContracts(normalized);
      }
    } catch (e) {
      console.error("Erro ao carregar contratos operacionais:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Load global history for the Histórico tab
  const loadGlobalHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/workflow/movimentacoes");
      if (res.ok) {
        const data = await res.json();
        setGlobalHistory(data);
      }
    } catch (e) {
      console.error("Erro ao buscar histórico global do workflow:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  useEffect(() => {
    if (fluxoSubView === "historico") {
      loadGlobalHistory();
    }
  }, [fluxoSubView]);

  // Enforce module-level permission fallback redirection
  useEffect(() => {
    const permissionsMap = {
      dashboard: "fluxoOperacionalDashboard",
      tradicional: "fluxoOperacionalTradicional",
      executivo: "fluxoOperacionalExecutivo",
      painel: "fluxoOperacionalPainel",
      workflow: "fluxoOperacionalWorkflow",
      historico: "fluxoOperacionalHistorico"
    };

    const currentPermKey = permissionsMap[fluxoSubView as keyof typeof permissionsMap];
    if (!currentPermKey || !hasPermission("modulos", currentPermKey as any)) {
      // Switch to the first submodule with permission
      const firstAvailableSub = Object.keys(permissionsMap).find(key => 
        hasPermission("modulos", permissionsMap[key as keyof typeof permissionsMap] as any)
      );
      if (firstAvailableSub) {
        setFluxoSubView(firstAvailableSub as any);
      }
    }
  }, [fluxoSubView, hasPermission, setFluxoSubView]);

  const handleClearFilters = () => {
    setFilters({
      empresa: "",
      cliente: "",
      responsavel: "",
      etapa: "",
      status: "",
      periodo: "",
      search: ""
    });
  };

  // Filtering Logic
  const filteredContracts = contracts.filter(c => {
    if (filters.empresa) {
      const orig = ((c as any).origem || (c as any).empresa || "").toLowerCase();
      if (!orig.includes(filters.empresa.toLowerCase())) return false;
    }
    if (filters.cliente && c.cliente !== filters.cliente) return false;
    if (filters.responsavel && c.workflowResponsavel !== filters.responsavel) return false;
    if (filters.etapa && c.workflowEtapa !== filters.etapa) return false;
    if (filters.status && c.workflowStatus !== filters.status) return false;
    if (filters.periodo) {
      const limitDays = parseInt(filters.periodo, 10);
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - limitDays);
      const creation = new Date(c.createdAt || Date.now());
      if (creation < limitDate) return false;
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      const nameMatches = c.nome?.toLowerCase().includes(term);
      const clientMatches = c.cliente?.toLowerCase().includes(term);
      const obsMatches = c.workflowObservacao?.toLowerCase().includes(term);
      if (!nameMatches && !clientMatches && !obsMatches) return false;
    }
    return true;
  });

  const uniqueClientes = Array.from(new Set(contracts.map(c => c.cliente).filter(Boolean))) as string[];
  const uniqueResponsáveis = Array.from(new Set(contracts.map(c => c.workflowResponsavel).filter(Boolean))) as string[];

  const handleOpenContractDetails = (id: string) => {
    setSelectedContractId(id);
    setIsDrawerOpen(true);
  };

  // Helper to calculate progress percentage of current stage checklist
  const getChecklistProgress = (c: Obra) => {
    const list = c.workflowChecklist || [];
    if (list.length === 0) return { done: 0, total: 0, percentage: 0 };
    const done = list.filter(item => item.feito).length;
    const total = list.length;
    const percentage = Math.round((done / total) * 100);
    return { done, total, percentage };
  };

  // Check general permission
  const checkSubPermission = (subKey: string) => {
    return hasPermission("modulos", subKey as any);
  };

  // Loading Screen
  if (isLoading && contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-100 rounded-2xl shadow-xs space-y-4">
        <div className="w-12 h-12 border-4 border-brand-primary border-b-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest animate-pulse">
          Sincronizando fluxo operacional...
         </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Subview Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-100 rounded-2xl p-6 shadow-xs gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-brand-primary">
            {fluxoSubView === "tradicional" && <GitFork className="w-6 h-6 text-brand-accent" />}
            {fluxoSubView === "executivo" && <GitFork className="w-6 h-6" />}
            {fluxoSubView === "painel" && <Kanban className="w-6 h-6" />}
            {fluxoSubView === "workflow" && <ClipboardList className="w-6 h-6" />}
            {fluxoSubView === "historico" && <History className="w-6 h-6" />}
            {fluxoSubView === "dashboard" && <BarChart3 className="w-6 h-6" />}
            
            <h1 className="text-xl font-black tracking-tight uppercase">
              {fluxoSubView === "tradicional" && "Fluxograma Tradicional"}
              {fluxoSubView === "executivo" && "Fluxograma Executivo"}
              {fluxoSubView === "painel" && "Painel Operacional"}
              {fluxoSubView === "workflow" && "Painel de Workflow"}
              {fluxoSubView === "historico" && "Histórico de Movimentações"}
              {fluxoSubView === "dashboard" && "Dashboard Operacional"}
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-semibold max-w-2xl">
            {fluxoSubView === "tradicional" && "Fluxograma operacional interativo da empresa, com raias de validação, aprovações, retornos e caminho percorrido destacado."}
            {fluxoSubView === "executivo" && "Visão lógica e sequencial simplificada dos processos principais de cada contrato."}
            {fluxoSubView === "painel" && "Quadro visual estilo Kanban para gerenciar a distribuição e movimentação de contratos de forma ágil pelas raias."}
            {fluxoSubView === "workflow" && "Gestão operacional e acompanhamento de tarefas, checklists de controle de qualidade e prazos por contrato."}
            {fluxoSubView === "historico" && "Auditoria completa e imutável das movimentações, responsáveis e observações registradas no fluxo operacional."}
            {fluxoSubView === "dashboard" && "Indicadores operacionais de desempenho, SLA de atendimento, gargalos de produção e métricas executivas."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => {
              loadContracts();
              if (fluxoSubView === "historico") loadGlobalHistory();
            }}
            disabled={isLoading || isLoadingHistory}
            className="p-2.5 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-4 h-4 ${(isLoading || isLoadingHistory) ? "animate-spin text-brand-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* RENDER VIEW DEPENDING ON SUBACTIVE VIEW */}
      
      {/* 1. FLUXOGRAMA TRADICIONAL */}
      {fluxoSubView === "tradicional" && checkSubPermission("fluxoOperacionalTradicional") && (
        <div className="space-y-6">
          <WorkflowFilters
            filters={filters}
            onChange={setFilters}
            onClear={handleClearFilters}
            uniqueClientes={uniqueClientes}
            uniqueResponsáveis={uniqueResponsáveis}
          />
          <WorkflowTraditional
            contracts={filteredContracts}
            onContractClick={handleOpenContractDetails}
          />
        </div>
      )}

      {/* 2. FLUXOGRAMA EXECUTIVO */}
      {fluxoSubView === "executivo" && checkSubPermission("fluxoOperacionalExecutivo") && (
        <div className="space-y-6">
          <WorkflowFilters
            filters={filters}
            onChange={setFilters}
            onClear={handleClearFilters}
            uniqueClientes={uniqueClientes}
            uniqueResponsáveis={uniqueResponsáveis}
          />
          <WorkflowFlow
            contracts={filteredContracts}
            onContractClick={handleOpenContractDetails}
          />
        </div>
      )}

      {/* 2. PAINEL KANBAN VIEW */}
      {fluxoSubView === "painel" && checkSubPermission("fluxoOperacionalPainel") && (
        <div className="space-y-6">
          <WorkflowFilters
            filters={filters}
            onChange={setFilters}
            onClear={handleClearFilters}
            uniqueClientes={uniqueClientes}
            uniqueResponsáveis={uniqueResponsáveis}
          />
          <WorkflowKanban
            contracts={filteredContracts}
            onContractClick={handleOpenContractDetails}
          />
        </div>
      )}

      {/* 3. WORKFLOW OPERATIONAL MANAGER LIST */}
      {fluxoSubView === "workflow" && checkSubPermission("fluxoOperacionalWorkflow") && (
        <div className="space-y-6">
          <WorkflowFilters
            filters={filters}
            onChange={setFilters}
            onClear={handleClearFilters}
            uniqueClientes={uniqueClientes}
            uniqueResponsáveis={uniqueResponsáveis}
          />

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Contratos no Workflow</h3>
              <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 rounded-full">
                {filteredContracts.length} contratos localizados
              </span>
            </div>

            {filteredContracts.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <SlidersHorizontal className="w-10 h-10 mx-auto text-slate-300 mb-2.5" />
                <p className="text-xs font-bold text-slate-600">Nenhum contrato encontrado</p>
                <p className="text-[10px] text-slate-400 mt-1">Experimente alterar os filtros aplicados na barra de controle.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contrato / Cliente</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etapa Atual</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subetapa / Atividade</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progresso Checklist</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Responsável</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prazo Limit (SLA)</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Status / Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredContracts.map((c) => {
                      const chk = getChecklistProgress(c);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {c.workflowLogoUrl ? (
                                <img
                                  src={c.workflowLogoUrl}
                                  alt={c.nome}
                                  className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200 p-1 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-brand-secondary/10 text-brand-secondary flex items-center justify-center font-extrabold text-xs shrink-0 uppercase">
                                  {c.nome.substring(0, 2)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate leading-none mb-1">{c.nome}</p>
                                <p className="text-[10px] font-semibold text-slate-400 truncate leading-none">{c.cliente}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase rounded-md">
                              {c.workflowEtapa}
                            </span>
                          </td>
                          <td className="p-4">
                            <p className="text-xs font-bold text-slate-600 truncate max-w-[150px]">
                              {c.workflowSubetapa || <span className="text-slate-300 font-normal">Não definida</span>}
                            </p>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1 w-32">
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span className="text-slate-400">{chk.done}/{chk.total} tarefas</span>
                                <span className={chk.percentage === 100 ? "text-emerald-500" : "text-brand-primary"}>
                                  {chk.percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    chk.percentage === 100 ? "bg-emerald-500" : "bg-brand-primary"
                                  }`}
                                  style={{ width: `${chk.percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-slate-600 font-semibold text-xs">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{c.workflowResponsavel || <span className="text-slate-300 font-normal">Sem atribuição</span>}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-slate-600 font-semibold text-xs">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{c.workflowPrazo || c.prazo || <span className="text-slate-300 font-normal">Sem prazo</span>}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  c.workflowStatus === "Atrasado" 
                                    ? "bg-rose-500 animate-pulse" 
                                    : c.workflowStatus === "Aguardando" 
                                      ? "bg-amber-500" 
                                      : c.workflowStatus === "Finalizado"
                                        ? "bg-emerald-500"
                                        : "bg-blue-500"
                                }`} />
                                <span className="text-[10px] font-extrabold text-slate-600 uppercase">
                                  {c.workflowStatus || "Andamento"}
                                </span>
                              </div>

                              <button
                                onClick={() => handleOpenContractDetails(c.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 text-slate-600 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <span>Gerenciar</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. HISTÓRICO VIEW */}
      {fluxoSubView === "historico" && checkSubPermission("fluxoOperacionalHistorico") && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Histórico Global de Transições</h3>
              <span className="text-[10px] font-bold font-mono px-2.5 py-1 bg-white border border-slate-200 text-slate-500 rounded-full">
                {globalHistory.length} registros auditáveis
              </span>
            </div>

            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <div className="w-8 h-8 border-3 border-brand-primary border-b-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">Carregando auditoria...</p>
              </div>
            ) : globalHistory.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <History className="w-12 h-12 mx-auto text-slate-300 mb-2.5" />
                <p className="text-xs font-bold text-slate-600">Nenhum registro de movimentação no sistema</p>
                <p className="text-[10px] text-slate-400 mt-1">Novas movimentações operacionais aparecerão cronologicamente aqui.</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="relative border-l border-slate-200 ml-4 space-y-6 pb-4">
                  {globalHistory.map((item) => (
                    <div key={item.id} className="relative pl-6 group">
                      {/* Timeline dot marker */}
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white bg-indigo-500 shadow-sm z-10 group-hover:scale-110 transition-transform" />

                      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2 pb-2 border-b border-slate-50">
                          <div>
                            <button
                              onClick={() => handleOpenContractDetails(item.obraId)}
                              className="text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-tight text-left block hover:underline"
                            >
                              {item.obraNome || "Contrato Desconhecido"}
                            </button>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                              {item.obraCliente}
                            </span>
                          </div>

                          <span className="text-[10px] font-bold font-mono text-slate-400 flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-slate-300" />
                            {new Date(item.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>

                        {/* Transition and details */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-extrabold uppercase rounded-sm">
                              {item.etapaOrigem || "Cadastro"}
                            </span>
                            <span className="text-xs text-slate-300 font-extrabold">➔</span>
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-extrabold uppercase rounded-sm">
                              {item.etapaDestino}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-slate-700">
                            &bull; {item.descricao}
                          </p>

                          {item.observacao && (
                            <p className="text-xs font-medium text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100/50 leading-relaxed">
                              "{item.observacao}"
                            </p>
                          )}

                          <div className="flex items-center gap-3 pt-1 text-[10px] font-bold text-slate-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-300" />
                              Operado por: <span className="text-slate-600">{item.operadorNome || "Equipe"}</span>
                            </span>
                            {item.responsavel && (
                              <span className="flex items-center gap-1 border-l border-slate-200 pl-3">
                                <User className="w-3.5 h-3.5 text-slate-300" />
                                Responsável Técnico: <span className="text-slate-600">{item.responsavel}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. DASHBOARD VIEW WITH INTERACTIVE STATISTICS */}
      {fluxoSubView === "dashboard" && checkSubPermission("fluxoOperacionalDashboard") && (
        <div className="space-y-6">
          {/* Key Indicators Panel */}
          <WorkflowIndicators contracts={contracts} />

          {/* Graphical Distributions Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Status distribution PieChart */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Status Geral de Contratos</h3>
                <p className="text-[10px] font-semibold text-slate-400">Percentual de contratos por status operacional</p>
              </div>

              <div className="h-64 flex flex-col md:flex-row items-center justify-between">
                <div className="w-full md:w-1/2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: "Em Andamento", value: contracts.filter(c => c.workflowStatus === "Em Andamento").length, color: "#3B82F6" },
                          { name: "Atrasado", value: contracts.filter(c => c.workflowStatus === "Atrasado").length, color: "#EF4444" },
                          { name: "Aguardando", value: contracts.filter(c => c.workflowStatus === "Aguardando").length, color: "#F59E0B" },
                          { name: "Finalizado", value: contracts.filter(c => c.workflowStatus === "Finalizado").length, color: "#10B981" }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {[
                          { name: "Em Andamento", color: "#3B82F6" },
                          { name: "Atrasado", color: "#EF4444" },
                          { name: "Aguardando", color: "#F59E0B" },
                          { name: "Finalizado", color: "#10B981" }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ fontSize: "10px", borderRadius: "8px" }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                {/* Custom Legends */}
                <div className="w-full md:w-1/2 space-y-3 pl-4 md:border-l border-slate-100">
                  {[
                    { label: "Em Andamento", count: contracts.filter(c => c.workflowStatus === "Em Andamento").length, color: "bg-blue-500", desc: "Contratos ativos em execução padrão." },
                    { label: "Atrasados", count: contracts.filter(c => c.workflowStatus === "Atrasado").length, color: "bg-rose-500 animate-pulse", desc: "Contratos com prazo SLA expirado." },
                    { label: "Aguardando Terceiros", count: contracts.filter(c => c.workflowStatus === "Aguardando").length, color: "bg-amber-500", desc: "Bloqueados aguardando cliente/fornecedor." },
                    { label: "Concluídos", count: contracts.filter(c => c.workflowStatus === "Finalizado").length, color: "bg-emerald-500", desc: "Contratos finalizados com sucesso." }
                  ].map((leg) => {
                    const total = contracts.length || 1;
                    const pct = Math.round((leg.count / total) * 100);
                    return (
                      <div key={leg.label} className="flex items-start gap-2.5">
                        <span className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${leg.color}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-700">{leg.label}</span>
                            <span className="text-[10px] font-black text-slate-400">({leg.count} - {pct}%)</span>
                          </div>
                          <p className="text-[9px] font-semibold text-slate-400 leading-tight mt-0.5">{leg.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SLA performance BarChart */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Carga Operacional por Responsável</h3>
                <p className="text-[10px] font-semibold text-slate-400">Contratos ativos sob gestão técnica de cada integrante</p>
              </div>

              <div className="h-64 w-full">
                {uniqueResponsáveis.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">
                    Nenhum responsável técnico designado ainda.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={uniqueResponsáveis.map(resp => {
                        const userContracts = contracts.filter(c => c.workflowResponsavel === resp);
                        return {
                          Responsavel: resp.split(" ")[0], // short name
                          Completo: resp,
                          Ativos: userContracts.filter(c => c.workflowStatus === "Em Andamento").length,
                          Atrasados: userContracts.filter(c => c.workflowStatus === "Atrasado").length,
                          Concluidos: userContracts.filter(c => c.workflowStatus === "Finalizado").length
                        };
                      })}
                      margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="Responsavel" tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{ fontSize: "10px", borderRadius: "8px" }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
                      <Bar dataKey="Ativos" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Atrasados" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Concluidos" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Side Drawer Panel for individual contract actions */}
      <WorkflowDrawer
        contractId={selectedContractId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={loadContracts}
      />
    </div>
  );
}
