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
  AlertCircle
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import KPICard from "./KPICard";
import ProgressBarKPI from "./ProgressBarKPI";
import { DashboardStats } from "../types";
import { useUIStore } from "../store";

export default function DashboardView() {
  const navigateToProject = useUIStore((state) => state.navigateToProject);
  const [searchTerm, setSearchTerm] = useState("");

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

  // Filter projects by search and CONSOLIDADO status
  const filteredProjects = (data.projetos || data.obras || [])
    .filter((p) => (p.statusContrato || "CONSOLIDADO") === "CONSOLIDADO")
    .filter((p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cliente && p.cliente.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  // Setup data for charts - Compact & clean
  const barChartData = (data.projetos || data.obras || [])
    .filter((p) => (p.statusContrato || "CONSOLIDADO") === "CONSOLIDADO")
    .slice(0, 8)
    .map((p) => ({
      name: p.nome.length > 12 ? `${p.nome.substring(0, 12)}...` : p.nome,
      id: p.id,
      Contrato: p.valorContrato,
      Custos: p.visaoGeral,
      Margem: p.margemLiquida,
    }));

  const handleBarClick = (entry: any) => {
    const id = entry?.id || entry?.payload?.id;
    if (id) {
      navigateToProject(id);
    }
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
      {/* Top Section Grid - Stack progress indicators in the top-right column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Left/Main Column: Title and 5 Main KPI Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-brand-text-primary">Dashboard - Centro de Custos Obras</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KPICard
              title="Custo dos Contratos"
              value={data.totalVisaoGeral}
              type="currency"
              icon={<TrendingUp className="w-4 h-4 text-brand-accent" />}
              subtitle="Projetos em progresso"
              id="hdr_custo_ativo_total"
            />
            <KPICard
              title="Margem Líquida"
              value={data.totalMargem}
              type="currency"
              icon={<Coins className="w-4 h-4 text-brand-success" />}
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
              icon={<Percent className="w-4 h-4 text-brand-secondary" />}
              subtitle="Lucro Líquido"
              id="hdr_percentual_margem_medio"
            />
          </div>
        </div>

        {/* Right Stack: Projeção 2026 and Despesas ADM nested directly in upper right */}
        <div className="lg:col-span-1 space-y-3 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <ProgressBarKPI
            title="PROJEÇÃO 2026"
            current={data.kpiProjecao.atual}
            goal={6000000}
            color="emerald"
            hideBar={false}
          />
          <ProgressBarKPI
            title="DESPESAS ADM"
            current={data.kpiAdm.atual}
            goal={800000}
            color="emerald"
            hideBar={false}
          />
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart: Contracts vs operating cost */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
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
                <Tooltip
                  formatter={(value: any) => [formatBRL(Number(value)), ""]}
                  contentStyle={{ border: "none", borderRadius: "8px", fontSize: "11px", boxShadow: "0 4px 10px rgba(0,0,0,0.04)" }}
                />
                <Legend iconSize={6} iconType="circle" wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                <Bar dataKey="Contrato" name="Valor Contrato" fill="#F97316" radius={[3, 3, 0, 0]} barSize={12} onClick={handleBarClick} className="cursor-pointer hover:opacity-85 transition-opacity" style={{ cursor: "pointer" }} />
                <Bar dataKey="Custos" name="Custo Geral" fill="#1A1A1A" radius={[3, 3, 0, 0]} barSize={12} onClick={handleBarClick} className="cursor-pointer hover:opacity-85 transition-opacity" style={{ cursor: "pointer" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

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

      {/* Projects list preview table inside the dashboard */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-success " />
            <h3 className="text-xs font-extrabold text-brand-text-primary uppercase tracking-wide">Contratos Projeto Certo</h3>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1.5 w-3.5 h-3.5 text-brand-text-secondary" />
            <input
              type="text"
              placeholder="Pesquisar projeto ou cliente..."
              className="w-full pl-8 pr-3 py-1.5 text-[10px] border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-brand-primary/25 hover:border-slate-300 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="project_search_dashboard"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredProjects.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider">Contrato</th>
                  <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider">Cliente</th>
                  <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider text-right">Visão Custo Geral</th>
                  <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider text-right">Margem Líquida</th>
                  <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider text-center">Margem (%)</th>
                  <th className="py-2 px-4 text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider text-right">Contrato</th>
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
                      <td className="py-2.5 px-4 font-bold text-brand-text-primary group-hover:text-brand-primary transition-colors">
                        {p.nome}
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
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-brand-text-primary">
                        {formatBRL(p.valorContrato)}
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
  );
}
