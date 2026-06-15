import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Folder,
  Plus,
  Search,
  ChevronRight,
  TrendingUp,
  Percent,
  Coins,
  DollarSign,
  Edit2,
  Trash2
} from "lucide-react";
import { useUIStore } from "../store";
import { DashboardStats, Projeto } from "../types";
import CreateProjectModal from "./CreateObraModal";
import DateRangePicker from "./DateRangePicker";

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

export default function ProjectsListView() {
  const navigateToProject = useUIStore((state) => state.navigateToProject);
  const projectFilter = useUIStore((state) => state.projectFilter);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Projeto | null>(null);

  const queryClient = useQueryClient();

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

  const handleDeleteProject = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Tem certeza que deseja excluir o projeto "${name}" e todos os seus itens de orçamento?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/projetos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover projeto");
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditProjectClick = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToEdit(project);
    setIsNewProjectModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin" />
        <p className="text-sm text-brand-text-secondary font-semibold">Carregando lista de projetos...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 bg-brand-error/5 border border-brand-error/10 rounded-2xl max-w-2xl mx-auto mt-12 text-center text-brand-error">
        <h3 className="font-bold text-base">Falha ao carregar lista de projetos</h3>
        <p className="text-xs mt-1.5 opacity-90">Verifique sua conexão com o servidor do ERP.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-brand-error/10 font-bold text-xs border border-brand-error/20 text-brand-error rounded-lg hover:bg-brand-error/20 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Filter projects by search, statusContrato, and contract date range
  const filteredProjects = (data.projetos || data.obras || []).filter((o) => {
    const matchesStatus = (o.statusContrato || "CONSOLIDADO") === projectFilter;
    const matchesSearch = o.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.cliente && o.cliente.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesDate = true;
    
    // Determine contract start and end dates in a timezone-safe manner
    const contractStart = parseLocalDate(o.dataInicioContrato || o.createdAt, false);
    const contractEnd = parseLocalDate(o.dataFimContrato || o.dataInicioContrato || o.createdAt, true);

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

    return matchesStatus && matchesSearch && matchesDate;
  });

  // Calculate dynamic metrics specifically for projects of the selected status and date filters
  const totalContratosFiltered = filteredProjects.reduce((acc: number, o: any) => acc + (o.valorContrato || 0), 0);
  const totalVisaoGeralFiltered = filteredProjects.reduce((acc: number, o: any) => acc + (o.visaoGeral || 0), 0);
  const totalMargemFiltered = totalContratosFiltered - totalVisaoGeralFiltered;
  const percentualMedioFiltered = filteredProjects.length > 0
    ? filteredProjects.reduce((acc: number, o: any) => acc + (o.percentualMargem || 0), 0) / filteredProjects.length
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-brand-text-primary flex items-center gap-2">
            <Folder className="w-6 h-6 text-brand-accent animate-pulse" />
            {projectFilter === "A_FECHAR" ? "Gestão de Contratos a Fechar" : "Gestão de Contratos"}
          </h1>
        </div>
        <div>
          <button
            onClick={() => {
              setProjectToEdit(null);
              setIsNewProjectModalOpen(true);
            }}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
            id="projects_list_new_project_btn"
          >
            <Plus className="w-4 h-4 text-white" />
            Novo Contrato
          </button>
        </div>
      </div>

      {/* Mini Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-brand-primary/5 text-brand-primary rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider block">Receita Contratual</span>
            <span className="text-sm font-bold font-mono text-brand-text-primary">{formatBRL(totalContratosFiltered)}</span>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-brand-accent/5 text-brand-accent rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider block">Custo dos Contratos</span>
            <span className="text-sm font-bold font-mono text-brand-text-primary">{formatBRL(totalVisaoGeralFiltered)}</span>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-brand-success/5 text-brand-success rounded-lg">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider block">Margem Líquida</span>
            <span className="text-sm font-bold font-mono text-brand-success">{formatBRL(totalMargemFiltered)}</span>
          </div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="p-2 bg-brand-secondary/5 text-brand-secondary rounded-lg">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider block">Percentual LL</span>
            <span className="text-sm font-bold font-mono text-brand-text-primary">{percentualMedioFiltered.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs">
        <div className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-brand-text-secondary" />
              <input
                type="text"
                placeholder="Pesquisar contrato ou cliente..."
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                id="project_search_input"
              />
            </div>
            <p className="text-[10px] font-bold text-brand-text-secondary bg-slate-50 border border-slate-100 py-1 px-2 rounded-md shrink-0">
              {filteredProjects.length === 1 ? "1 contrato localizado" : `${filteredProjects.length} contratos localizados`}
            </p>
          </div>

          {/* Date Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Filtrar Período:</span>
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

        <div className="overflow-x-auto rounded-b-2xl overflow-hidden">
          {filteredProjects.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-3 px-5 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">Contrato</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider text-right">Valor Contrato</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider text-right">Custo dos Contratos</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider text-right">Margem Líquida</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider text-center">Margem (%)</th>
                  <th className="py-3 px-5 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-brand-text-primary">
                {filteredProjects.map((p: any) => {
                  const marginIsPositive = p.margemLiquida >= 0;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigateToProject(p.id)}
                      className="hover:bg-brand-primary/5 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-5 group-hover:text-brand-primary transition-colors">
                        <div className="font-extrabold text-brand-text-primary group-hover:text-brand-primary transition-colors text-sm">
                          {p.nome}
                        </div>
                        {p.cliente && (
                          <div className="text-[10px] text-brand-text-secondary font-bold uppercase mt-0.5">
                            {p.cliente}
                          </div>
                        )}
                        {(p.dataInicioContrato || p.dataFimContrato) && (
                          <div className="text-[10px] text-slate-400 font-semibold mt-1.5 flex flex-wrap items-center gap-1">
                            <span>Período:</span>
                            <span className="text-slate-500 font-bold">{p.dataInicioContrato ? formatDateBR(p.dataInicioContrato) : "N/I"}</span>
                            <span className="opacity-60">até</span>
                            <span className="text-slate-500 font-bold">{p.dataFimContrato ? formatDateBR(p.dataFimContrato) : "N/I"}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-brand-text-primary">
                        {formatBRL(p.valorContrato)}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-brand-text-primary">
                        {formatBRL(p.visaoGeral)}
                      </td>
                      <td
                        className={`py-3.5 px-5 text-right font-mono font-extrabold ${
                          marginIsPositive ? "text-brand-success" : "text-brand-error"
                        }`}
                      >
                        {formatBRL(p.margemLiquida)}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`inline-block font-mono font-bold py-0.5 px-2 rounded-md ${
                            marginIsPositive
                              ? "bg-brand-success/5 text-brand-success border border-brand-success/15"
                              : "bg-brand-error/5 text-brand-error border border-brand-error/15"
                          }`}
                        >
                          {p.percentualMargem.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => handleEditProjectClick(p, e)}
                            className="p-1 px-2.5 hover:bg-slate-100 text-brand-text-secondary hover:text-brand-text-primary font-bold border border-slate-200/65 rounded-md transition-colors inline-flex items-center gap-1 text-[10px]"
                          >
                            <Edit2 className="w-3 h-3" />
                            Editar
                          </button>
                          <button
                            onClick={() => navigateToProject(p.id)}
                            className="p-1 px-2.5 bg-brand-primary/5 hover:bg-brand-primary text-brand-primary hover:text-white font-bold rounded-md transition-colors inline-flex items-center gap-0.5 text-[10px]"
                          >
                            Abrir
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-brand-text-secondary/40">
              <Folder className="w-10 h-10 opacity-30 mb-2.5" />
              <p className="font-semibold text-xs">Nenhum projeto cadastrado ou encontrado...</p>
            </div>
          )}
        </div>
      </div>

      {/* Project Creation/Modification Modal Overlay */}
      <CreateProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => {
          setIsNewProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
        }}
        projectToEdit={projectToEdit}
      />
    </div>
  );
}
