import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Coins,
  Percent,
  Search,
  ChevronRight,
  FolderOpen,
  DollarSign,
  Briefcase,
  AlertCircle,
  X
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import KPICard from "./KPICard";
import ProgressBarKPI from "./ProgressBarKPI";
import DateRangePicker from "./DateRangePicker";
import { DashboardStats } from "../types";
import { useUIStore } from "../store";

const formatDateBR = (dateStr?: string | null) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const parseLocalDate = (dateVal: any, isEnd = false): Date | null => {
  if (!dateVal) return null;
  
  let dateStr = "";
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, "0");
    const d = String(dateVal.getDate()).padStart(2, "0");
    dateStr = `${y}-${m}-${d}`;
  } else if (typeof dateVal === "string") {
    dateStr = dateVal;
  } else {
    return null;
  }

  const cleanStr = dateStr.trim().substring(0, 10);
  const parts = cleanStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const date = new Date(year, month, day);
      if (isEnd) {
        date.setHours(23, 59, 59, 999);
      } else {
        date.setHours(0, 0, 0, 0);
      }
      return date;
    }
  }

  return null;
};

export default function DashboardView() {
  const navigateToProject = useUIStore((state) => state.navigateToProject);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAdmDetails, setShowAdmDetails] = useState(false);
  const [admMeta, setAdmMeta] = useState<number>(() => {
    const saved = localStorage.getItem("dashboard_adm_meta");
    return saved ? parseFloat(saved) : 800000;
  });

  const handleAdmMetaChange = (newGoal: number) => {
    setAdmMeta(newGoal);
    localStorage.setItem("dashboard_adm_meta", String(newGoal));
  };

  const { data, isLoading, isError, refetch } = useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Erro ao buscar estatísticas do painel");
      return res.json();
    },
  });

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5">
        <div className="w-9 h-9 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin" />
        <p className="text-xs text-brand-text-secondary font-bold">Carregando painel financeiro consolidado...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 bg-brand-error/5 border border-brand-error/10 rounded-xl max-w-xl mx-auto mt-10 text-center text-brand-error">
        <AlertCircle className="w-8 h-8 mx-auto opacity-70 mb-2" />
        <h3 className="font-bold text-sm">Falha na conexão com o ERP</h3>
        <p className="text-[11px] mt-1 opacity-80">Por favor, confirme se o serviço de dados está respondendo.</p>
        <button
          onClick={() => refetch()}
          className="mt-3.5 px-3 py-1.5 bg-brand-error/10 font-bold text-xs border border-brand-error/20 text-brand-error rounded-lg hover:bg-brand-error/25 transition-colors"
        >
          Reconectar Painel
        </button>
      </div>
    );
  }

  // Filter projects by search, CONSOLIDADO status, and contract date range
  const filteredProjects = (data.projetos || data.obras || [])
    .filter((p) => (p.statusContrato || "CONSOLIDADO") === "CONSOLIDADO")
    .filter((p) => {
      const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.cliente && p.cliente.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesDate = true;
      
      // Determine contract start and end dates in a timezone-safe manner
      const contractStart = parseLocalDate(p.dataInicioContrato || p.createdAt, false);
      const contractEnd = parseLocalDate(p.dataFimContrato || p.dataInicioContrato || p.createdAt, true);

      if (startDate && contractEnd) {
        const filterStart = parseLocalDate(startDate, false);
        if (filterStart && contractEnd < filterStart) {
          matchesDate = false;
        }
      }

      if (endDate && contractStart) {
        const filterEnd = parseLocalDate(endDate, true);
        if (filterEnd && contractStart > filterEnd) {
          matchesDate = false;
        }
      }

      // If a date filter is applied but the project has no valid tracking date, hide it
      if ((startDate || endDate) && !contractStart) {
        matchesDate = false;
      }

      return matchesSearch && matchesDate;
    });

  // Setup data for charts - Compact & clean
  const barChartData = filteredProjects
    .slice(0, 8)
    .map((p) => ({
      name: p.nome.length > 12 ? `${p.nome.substring(0, 12)}...` : p.nome,
      fullName: p.nome,
      id: p.id,
      Contrato: p.valorContrato,
      Custos: p.visaoGeral,
      Margem: p.margemLiquida,
      Percentual: p.percentualMargem,
    }));

  const handleBarClick = (entry: any) => {
    const id = entry?.id || entry?.payload?.id;
    if (id) {
      navigateToProject(id);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const currentData = payload[0].payload;
      const isPositive = currentData.Margem >= 0;
      return (
        <div className="bg-white p-3 border border-slate-100 rounded-xl shadow-lg text-xs space-y-2 min-w-[210px] animate-in fade-in zoom-in-95 duration-100">
          <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-1 mb-1 truncate max-w-[240px]">
            {currentData.fullName}
          </p>
          <div className="flex justify-between gap-3 items-center">
            <span className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Valor Contrato</span>
            <span className="font-mono font-bold text-amber-600">{formatBRL(currentData.Contrato)}</span>
          </div>
          <div className="flex justify-between gap-3 items-center">
            <span className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Custo Geral</span>
            <span className="font-mono font-bold text-slate-800">{formatBRL(currentData.Custos)}</span>
          </div>
          <div className="flex justify-between gap-3 items-center border-t border-slate-100 pt-1.5 mt-1">
            <span className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Margem Líquida</span>
            <span className={`font-mono font-bold ${isPositive ? "text-brand-success" : "text-brand-error"}`}>
              {formatBRL(currentData.Margem)}
            </span>
          </div>
          <div className="flex justify-between gap-3 items-center">
            <span className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Margem (%)</span>
            <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md ${isPositive ? "bg-brand-success/5 text-brand-success border border-brand-success/15" : "bg-brand-error/5 text-brand-error border border-brand-error/15"}`}>
              {currentData.Percentual.toFixed(2)}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const COLORS = ["#EA580C", "#1E293B", "#D97706", "#334155", "#9A3412", "#475569", "#7C2D12", "#1E1B4B"];
  const pieData = data.chartCosts.filter((item) => item.value > 0);

  const translateGroup = (grp: string) => {
    return (
      {
        MATERIAL: "Materiais Insumos",
        MAO_OBRA: "Mão de Obra",
        ADMINISTRACAO: "Administração",
        IMPOSTOS: "Impostos",
        LOGISTICA: "Logística / Transp.",
        OUTROS: "Outros Custos",
      }[grp] || grp
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header Section with Progress bars on the right */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-2">
        <div>
          <h1 className="text-2xl font-black text-brand-text-primary tracking-tight">Dashboard</h1>
          <p className="text-xs text-brand-text-secondary font-semibold uppercase tracking-wider">Centro de Custos Obras</p>
        </div>
        
        {/* Progress indicators placed in the top right, above the main KPI cards */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
          <div className="w-full sm:w-80 md:w-96 lg:w-[380px] xl:w-[420px] shrink-0">
            <ProgressBarKPI
              title="PROJEÇÃO 2026"
              current={data.kpiProjecao.atual}
              goal={6000000}
              color="emerald"
              hideBar={false}
            />
          </div>
          <div className="w-full sm:w-80 md:w-96 lg:w-[380px] xl:w-[420px] shrink-0">
            <ProgressBarKPI
              title="DESPESAS ADM"
              current={data.kpiAdm.atual}
              goal={admMeta}
              color="emerald"
              hideBar={false}
              onGoalChange={handleAdmMetaChange}
              onClick={() => setShowAdmDetails(true)}
            />
          </div>
        </div>
      </div>

      {/* Row 1: KPI Cards spread full-width to prevent any wrapping or squeezing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Receita Contratual"
          value={data.totalContratos}
          type="currency"
          icon={<Briefcase className="w-4.5 h-4.5 text-amber-600" />}
          subtitle="Faturamento total"
          id="hdr_receita_contratual_total"
        />
        <KPICard
          title="Custo dos Contratos"
          value={data.totalVisaoGeral}
          type="currency"
          icon={<TrendingUp className="w-4.5 h-4.5 text-brand-accent" />}
          subtitle="Projetos em progresso"
          id="hdr_custo_ativo_total"
        />
        <KPICard
          title="Margem Líquida"
          value={data.totalMargem}
          type="currency"
          icon={<Coins className="w-4.5 h-4.5 text-brand-success" />}
          subtitle="Lucro Líquido"
          trend={{
            value: data.totalContratos > 0 ? (data.totalMargem / data.totalContratos) * 100 : 0,
            label: "Lucro Líquido",
            positive: data.totalMargem >= 0,
          }}
          id="hdr_lucro_consolidado"
        />
        <KPICard
          title="Percentual LL"
          value={data.percentualMedio}
          type="percentage"
          icon={<Percent className="w-4.5 h-4.5 text-brand-secondary" />}
          subtitle="Lucro Líquido"
          id="hdr_percentual_margem_medio"
        />
      </div>

      {/* Main Content Split: Cards on left, sidebar with stats on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left Column (spans 2/3 of space on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Chart: Contracts vs operating cost */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-brand-text-primary uppercase tracking-wide">Custo Geral vs. Valor Contrato</h4>
              <p className="text-[10px] text-brand-text-secondary mt-0.5 font-semibold">Comparativo do Valor do Contrato PC com a evolução dos Custos Gerais.</p>
            </div>
            <div className="w-full h-52 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v: number) => `${v / 1000}k`} tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={6} iconType="circle" wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                  <Bar dataKey="Contrato" name="Valor Contrato" fill="#F97316" radius={[3, 3, 0, 0]} barSize={12} onClick={handleBarClick} className="cursor-pointer hover:opacity-85 transition-opacity" style={{ cursor: "pointer" }} />
                  <Bar dataKey="Custos" name="Custo Geral" fill="#1A1A1A" radius={[3, 3, 0, 0]} barSize={12} onClick={handleBarClick} className="cursor-pointer hover:opacity-85 transition-opacity" style={{ cursor: "pointer" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Projects list preview table inside the dashboard */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-xs">
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-success" />
                  <h3 className="text-xs font-extrabold text-brand-text-primary uppercase tracking-wide">Contratos Projeto Certo</h3>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-1.5 w-3.5 h-3.5 text-brand-text-secondary" />
                  <input
                    type="text"
                    placeholder="Pesquisar contrato ou cliente..."
                    className="w-full pl-8 pr-3 py-1.5 text-[10px] border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-brand-primary/25 hover:border-slate-300 transition-colors"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    id="project_search_dashboard"
                  />
                </div>
              </div>

              {/* Date Filters Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-50 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-extrabold uppercase tracking-wide text-[9px]">Filtro de Período:</span>
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-b-xl overflow-hidden">
              {filteredProjects.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100">
                      <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider">Contrato</th>
                      <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider text-right">Valor Contrato</th>
                      <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider">Cliente</th>
                      <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider text-right">Custo do Contrato</th>
                      <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider text-right">Margem Líquida</th>
                      <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider text-center">Margem (%)</th>
                      <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] text-brand-text-primary">
                    {filteredProjects.map((p) => {
                      const marginIsPositive = p.margemLiquida >= 0;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => navigateToProject(p.id)}
                          className="hover:bg-brand-primary/5 cursor-pointer transition-colors group"
                        >
                          <td className="py-2.5 px-4 text-brand-text-primary group-hover:text-brand-primary transition-colors">
                            <div className="font-bold">{p.nome}</div>
                            {(p.dataInicioContrato || p.dataFimContrato) && (
                              <div className="text-[10px] text-slate-400 font-semibold mt-0.5 flex flex-wrap items-center gap-1">
                                <span>Período:</span>
                                <span>{p.dataInicioContrato ? formatDateBR(p.dataInicioContrato) : "N/I"}</span>
                                <span className="opacity-60">até</span>
                                <span>{p.dataFimContrato ? formatDateBR(p.dataFimContrato) : "N/I"}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-brand-text-primary">
                            {formatBRL(p.valorContrato)}
                          </td>
                          <td className="py-2.5 px-4 text-brand-text-secondary font-semibold">
                            {p.cliente || "Geral / Interno"}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-medium text-brand-text-primary">
                            {formatBRL(p.visaoGeral)}
                          </td>
                          <td
                            className={`py-2.5 px-4 text-right font-mono font-bold ${
                              marginIsPositive ? "text-brand-success" : "text-brand-error"
                            }`}
                          >
                            {formatBRL(p.margemLiquida)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`inline-block font-mono font-bold py-0.5 px-1.5 rounded-md ${
                                marginIsPositive
                                  ? "bg-brand-success/5 text-brand-success border border-brand-success/15"
                                  : "bg-brand-error/5 text-brand-error border border-brand-error/15"
                              }`}
                            >
                              {p.percentualMargem.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button className="p-0.5 px-2 hover:bg-brand-primary hover:text-white text-brand-primary border border-brand-primary/10 hover:border-transparent rounded-md transition-colors inline-flex items-center gap-0.5 text-[9px] font-bold">
                              Abrir
                              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 text-brand-text-secondary/30">
                  <FolderOpen className="w-8 h-8 opacity-40 mb-1.5" />
                  <p className="font-semibold text-xs">Nenhum projeto localizado...</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Sidebar Column (spans 1/3 of space on desktop) */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* Chart 2: Cost group distribution */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-brand-text-primary uppercase tracking-wide">Gráfico das Despesas</h4>
            </div>
            {pieData.length > 0 ? (
              <div className="flex flex-col items-center justify-center mt-3">
                <div className="w-full h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={56}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [formatBRL(Number(value)), ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 w-full text-left">
                  {(() => {
                    const totalPieVal = pieData.reduce((acc, p) => acc + p.value, 0);
                    return pieData.map((item, index) => {
                      const percentage = totalPieVal > 0 ? Math.round((item.value / totalPieVal) * 100) : 0;
                      return (
                        <div key={item.name} className="flex items-center gap-1 text-[9px] font-bold text-brand-text-secondary border-b border-slate-50 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="truncate" title={translateGroup(item.name)}>
                            {translateGroup(item.name)} {percentage}%
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-36 mt-4 text-brand-text-secondary/30">
                <FolderOpen className="w-6 h-6 opacity-30 mb-1" />
                <p className="text-[10px] font-bold">Sem despesas registradas ativas</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ADM Despesas detail modal */}
      {showAdmDetails && (() => {
        const projectsForAdmModal = (data?.projetos || data?.obras || [])
          .filter((p) => (p.statusContrato || "CONSOLIDADO") === "CONSOLIDADO")
          .map((p) => {
            const itensAdm = (p.itens || [])
              .filter((i: any) => i.status === "ATIVO" && i.descricao?.trim().toUpperCase() === "CUSTO ADM")
              .map((i: any) => {
                const pct = p.valorContrato > 0 ? (Number(i.valor) / Number(p.valorContrato)) * 100 : 0;
                return {
                  id: i.id,
                  descricao: i.descricao,
                  valor: Number(i.valor),
                  percentual: pct,
                  observacao: i.observacao,
                };
              });

            return {
              id: p.id,
              nome: p.nome,
              cliente: p.cliente,
              valorContrato: p.valorContrato,
              despesaAdm: p.despesaAdm || 0,
              itensAdm,
            };
          })
          .sort((a, b) => b.despesaAdm - a.despesaAdm);

        const grandTotalAdm = projectsForAdmModal.reduce((sum, p) => sum + p.despesaAdm, 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-base font-black text-brand-text-primary tracking-tight">
                    Despesas ADM - Detalhado
                  </h3>
                  <p className="text-[11px] text-brand-text-secondary mt-0.5">
                    Total Consolidado: <span className="font-bold text-brand-primary">{formatBRL(grandTotalAdm)}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowAdmDetails(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4 text-left">
                {projectsForAdmModal.length === 0 ? (
                  <div className="text-center py-6 text-brand-text-secondary/50">
                    <AlertCircle className="w-8 h-8 mx-auto opacity-40 mb-2" />
                    <p className="text-xs font-bold">Nenhum contrato consolidado encontrado.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectsForAdmModal.map((p, index) => {
                      return (
                        <div
                          key={p.id}
                          className="p-4 bg-white border border-slate-100 hover:border-slate-300 rounded-xl transition-all hover:shadow-xs flex flex-col gap-3"
                        >
                          {/* Contract Main Row: clickable to navigate */}
                          <div 
                            onClick={() => {
                              setShowAdmDetails(false);
                              navigateToProject(p.id);
                            }}
                            className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer group"
                          >
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  #{index + 1}
                                </span>
                                <h4 className="text-xs font-extrabold text-brand-text-primary group-hover:text-brand-primary transition-colors truncate">
                                  {p.nome}
                                </h4>
                              </div>
                              {p.cliente && (
                                <p className="text-[10px] text-brand-text-secondary truncate font-semibold ml-8 font-sans">
                                  {p.cliente}
                                </p>
                              )}
                            </div>

                            {/* Right info: Total value block, clean and without 'Total ADM: ' phrase */}
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-slate-800 font-mono block">
                                {formatBRL(p.despesaAdm)}
                              </span>
                              <div className="flex items-center justify-end gap-1.5 mt-1">
                                <span className="text-[9px] text-brand-text-secondary font-sans font-semibold">
                                  Contrato: {formatBRL(p.valorContrato)}
                                </span>
                                <span className="text-[10px] text-brand-primary font-mono font-bold">
                                  ({((p.despesaAdm / (p.valorContrato || 1)) * 100).toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Nested List of ADM Items with sequential order and custom percentage bar */}
                          {p.itensAdm.length > 0 ? (
                            <div className="ml-8 border-l-2 border-slate-100 pl-3.5 py-1 space-y-3.5">
                              {p.itensAdm.map((item, itemIdx) => {
                                const itemWeightOnGrandTotal = grandTotalAdm > 0 ? (item.valor / grandTotalAdm) * 100 : 0;
                                return (
                                  <div key={item.id} className="space-y-1">
                                    <div className="flex items-center justify-between gap-2 text-[11px]">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[9px] font-mono font-bold bg-slate-50 text-slate-400 border border-slate-100 px-1 py-0.5 rounded leading-none">
                                          {itemIdx + 1}
                                        </span>
                                        <span className="font-bold text-slate-700 truncate" title={item.descricao}>
                                          {item.descricao}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2.5 shrink-0">
                                        <span className="font-mono text-slate-900 font-bold text-xs">
                                          {formatBRL(item.valor)}
                                        </span>
                                        <span className="text-[9px] font-mono font-extrabold bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded-sm leading-none shrink-0" title={`${itemWeightOnGrandTotal.toFixed(2)}% do Total Consolidado ADM`}>
                                          {itemWeightOnGrandTotal.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Visual representation card of weight against whole ADM cost */}
                                    <div className="flex items-center gap-2 pl-5">
                                      <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-50/50">
                                        <div 
                                          className="bg-brand-primary h-full rounded-full transition-all duration-500"
                                          style={{ width: `${Math.min(itemWeightOnGrandTotal, 100)}%` }}
                                        />
                                      </div>
                                      <span className="text-[8px] text-slate-400 font-sans font-bold uppercase tracking-wider shrink-0">
                                        do Total Consolidado
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="ml-8 py-1 text-slate-400 font-medium text-[10px] italic">
                              Sem itens de despesa administrativa cadastrados neste contrato.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
                <button
                  onClick={() => setShowAdmDetails(false)}
                  className="px-4 py-2 text-xs font-bold border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
