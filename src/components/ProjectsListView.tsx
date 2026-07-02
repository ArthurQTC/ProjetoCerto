import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
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
  Trash2,
  FileSpreadsheet,
  RotateCcw
} from "lucide-react";
import { useUIStore, useAuthStore } from "../store";
import { DashboardStats, Projeto } from "../types";
import CreateProjectModal from "./CreateObraModal";

const formatDateBR = (dateStr?: string | null) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function ProjectsListView() {
  const navigateToProject = useUIStore((state) => state.navigateToProject);
  const projectFilter = useUIStore((state) => state.projectFilter);
  const { hasPermission } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Projeto | null>(null);
  const [showLixeira, setShowLixeira] = useState(false);
  const [stickyColumns, setStickyColumns] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState<string>("");
  const [permanentDeleteConfirmationId, setPermanentDeleteConfirmationId] = useState<string | null>(null);
  const [permanentDeleteConfirmationName, setPermanentDeleteConfirmationName] = useState<string>("");

  // Auto-reset trash view on tab change
  useEffect(() => {
    setShowLixeira(false);
  }, [projectFilter]);

  // GLOBAL CUSTO ADM STATES
  const [isGlobalCostModalOpen, setIsGlobalCostModalOpen] = useState(false);
  const [globalCostValue, setGlobalCostValue] = useState("5");
  const [isGlobalConfirmOpen, setIsGlobalConfirmOpen] = useState(false);

  // INDIVIDUAL CUSTO ADM STATES
  const [selectedProjectForAdm, setSelectedProjectForAdm] = useState<any | null>(null);
  const [individualCostValue, setIndividualCostValue] = useState("");
  const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);

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
    if (!confirm(`Tem certeza que deseja enviar o projeto "${name}" para a lixeira?`)) {
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

  const handleRestoreProject = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Tem certeza que deseja restaurar o projeto "${name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/projetos/${id}/restaurar`, { method: "POST" });
      if (!res.ok) throw new Error("Erro ao restaurar projeto");
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteProjectPermanent = async (id: string) => {
    try {
      const res = await fetch(`/api/projetos/${id}?permanent=true`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover projeto permanentemente");
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["obras"] });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditProjectClick = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToEdit(project);
    setIsNewProjectModalOpen(true);
  };

  const handleEditCustoAdmClick = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProjectForAdm(project);
    
    let initialVal = "";
    if (project.custoAdm !== null && project.custoAdm !== undefined) {
      initialVal = String(project.custoAdm);
    } else {
      const dbItem = project.itens?.find((i: any) => i.descricao === "Custo ADM");
      if (dbItem && dbItem.observacao) {
        initialVal = dbItem.observacao.replace("%", "").trim();
      } else {
        initialVal = "5";
      }
    }
    setIndividualCostValue(initialVal);
    setIsIndividualModalOpen(true);
  };

  const handleExportToExcel = () => {
    import("xlsx").then((XLSX) => {
      if (filteredProjects.length === 0) {
        alert("Nenhum contrato para exportar.");
        return;
      }

      const workbook = XLSX.utils.book_new();

      filteredProjects.forEach((project: any) => {
        // Create project details rows
        const projectDetails = [
          { Propriedade: "Contrato", Valor: project.nome },
          { Propriedade: "ID", Valor: project.id },
          { Propriedade: "Status", Valor: project.statusContrato },
          { Propriedade: "Data de Criação", Valor: project.createdAt ? new Date(project.createdAt).toLocaleDateString("pt-BR") : "" },
          { Propriedade: "Cliente", Valor: project.cliente || "-" },
          { Propriedade: "Receita", Valor: project.valorContrato ? formatBRL(project.valorContrato) : "-" },
          { Propriedade: "Custo Direto", Valor: project.visaoGeral ? formatBRL(project.visaoGeral) : "-" },
          { Propriedade: "Margem Líquida", Valor: project.margemLiquida ? formatBRL(project.margemLiquida) : "-" },
          { Propriedade: "Despesa ADM", Valor: project.despesaAdm ? formatBRL(project.despesaAdm) : "-" },
          { Propriedade: "Prazo da Obra", Valor: project.prazo || "-" },
          { Propriedade: "Nº do Pedido", Valor: project.numeroPedido || "-" },
          {},
          { Propriedade: "---", Valor: "---" },
          { Propriedade: "ITENS DO CONTRATO", Valor: "" }
        ];

        const itemRows = (project.itens || []).map((item: any) => ({
          "Descrição": item.descricao,
          "Categoria": item.categoria?.nome || "-",
          "Valor Original (R$)": item.valor,
          "Subitens": item.subitens && item.subitens.length > 0 ? item.subitens.map((s: any) => s.descricao + ": " + formatBRL(s.valor)).join(" | ") : "-",
          "Status": item.status,
          "Observação": item.observacao || "-",
        }));

        const worksheetDados = XLSX.utils.json_to_sheet(projectDetails, { skipHeader: true });
        XLSX.utils.sheet_add_json(worksheetDados, itemRows, { origin: "A16" });

        // Ensure valid sheet name
        let sheetName = project.nome ? project.nome.substring(0, 31).replace(/[\\/*?:\[\]]/g, '') : "Contrato";
        
        // Handle duplicate sheet names if projects have same name
        let count = 1;
        const baseName = sheetName;
        while (workbook.SheetNames.includes(sheetName)) {
          const suffix = ` (${count})`;
          sheetName = baseName.substring(0, 31 - suffix.length) + suffix;
          count++;
        }

        XLSX.utils.book_append_sheet(workbook, worksheetDados, sheetName);
      });

      XLSX.writeFile(workbook, `Contratos_${projectFilter === "A_FECHAR" ? "Orcamentos" : "Consolidados"}_Export-${new Date().toISOString().split('T')[0]}.xlsx`);
    });
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
    const targetStatus = showLixeira 
      ? (projectFilter === "A_FECHAR" ? "EXCLUIDO_ORCAMENTO" : "EXCLUIDO_CONTRATO")
      : projectFilter;
    const matchesStatus = (o.statusContrato || "CONSOLIDADO") === targetStatus;
    const matchesSearch = o.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.cliente && o.cliente.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesSearch;
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
            {projectFilter === "A_FECHAR" ? "Gestão de Orçamentos a Fechar" : "Gestão de Contratos"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Alterar Custo ADM Global */}
          {hasPermission("acoes", "editar") && hasPermission("colunas", "custoAdm", "editar") && (
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/configuracoes/custo-adm-global");
                  if (res.ok) {
                    const data = await res.json();
                    setGlobalCostValue(String(data.valor));
                  } else {
                    setGlobalCostValue("5");
                  }
                } catch (err) {
                  setGlobalCostValue("5");
                }
                setIsGlobalCostModalOpen(true);
              }}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              id="global_update_cost_adm_btn"
            >
              <Percent className="w-4 h-4 text-brand-accent" />
              <span>Alterar Custo ADM</span>
            </button>
          )}

          {/* Exportar Excel */}
          <button
            onClick={handleExportToExcel}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            id="export_all_projects_excel_btn"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>
          
          {hasPermission("acoes", "editar") && (
            <button
              onClick={() => {
                setProjectToEdit(null);
                setIsNewProjectModalOpen(true);
              }}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
              id="projects_list_new_project_btn"
            >
              <Plus className="w-4 h-4 text-white" />
              {projectFilter === "A_FECHAR" ? "Novo Orçamento" : "Novo Contrato"}
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs for Active vs. Lixeira (Deleted) */}
      <div className="flex border-b border-slate-100 gap-6 pb-0.5">
        <button
          onClick={() => setShowLixeira(false)}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            !showLixeira 
              ? "border-brand-primary text-brand-primary font-black" 
              : "border-transparent text-slate-400 hover:text-slate-600 font-semibold"
          }`}
        >
          Ativos
        </button>
        <button
          onClick={() => setShowLixeira(true)}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            showLixeira 
              ? "border-red-500 text-red-600 font-black" 
              : "border-transparent text-slate-400 hover:text-slate-600 font-semibold"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
          Lixeira (Excluídos)
        </button>
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
                placeholder={projectFilter === "A_FECHAR" ? "Pesquisar orçamento ou cliente..." : "Pesquisar contrato ou cliente..."}
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                id="project_search_input"
              />
            </div>
            <p className="text-[10px] font-bold text-brand-text-secondary bg-slate-50 border border-slate-100 py-1 px-2 rounded-md shrink-0">
              {filteredProjects.length === 1 
                ? (projectFilter === "A_FECHAR" ? "1 orçamento localizado" : "1 contrato localizado") 
                : `${filteredProjects.length} ${projectFilter === "A_FECHAR" ? "orçamentos localizados" : "contratos localizados"}`}
            </p>
            <button
              onClick={() => setStickyColumns(!stickyColumns)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                stickyColumns ? "bg-brand-primary text-white" : "bg-slate-100 text-brand-text-secondary hover:bg-slate-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {stickyColumns ? "Colunas Fixas" : "Fixar Colunas"}
            </button>
          </div>

        </div>

        <div className="overflow-x-auto rounded-b-2xl overflow-hidden">
          {filteredProjects.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`bg-slate-50 border-b border-slate-100 ${stickyColumns ? "sticky top-0 z-20" : ""}`}>
                  <th className="py-3 px-5 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">
                    {projectFilter === "A_FECHAR" ? "Orçamento" : "Contrato"}
                  </th>
                  <th className="py-3 px-5 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider text-right">
                    {hasPermission("colunas", "valorContrato") 
                      ? (projectFilter === "A_FECHAR" ? "Valor Orçamento" : "Valor Contrato") 
                      : "Valor (Restrito)"}
                  </th>
                  <th className="py-3 px-5 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider text-right">
                    {projectFilter === "A_FECHAR" ? "Custo dos Orçamentos" : "Custo dos Contratos"}
                  </th>
                  <th className="py-3 px-5 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider text-right">
                    {hasPermission("colunas", "valorContrato") ? "Margem Líquida" : "Margem (Restrita)"}
                  </th>
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
                      onClick={() => {
                        if (!showLixeira) {
                          navigateToProject(p.id);
                        }
                      }}
                      className={
                        showLixeira 
                          ? "transition-colors group" 
                          : "hover:bg-brand-primary/5 cursor-pointer transition-colors group"
                      }
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
                        {hasPermission("colunas", "valorContrato") ? formatBRL(p.valorContrato) : "••••••"}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-brand-text-primary">
                        {formatBRL(p.visaoGeral)}
                      </td>
                      <td
                        className={`py-3.5 px-5 text-right font-mono font-extrabold ${
                          marginIsPositive ? "text-brand-success" : "text-brand-error"
                        }`}
                      >
                        {hasPermission("colunas", "margemLiquida") ? formatBRL(p.margemLiquida) : "••••••"}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`inline-block font-mono font-bold py-0.5 px-2 rounded-md ${
                            marginIsPositive
                              ? "bg-brand-success/5 text-brand-success border border-brand-success/15"
                              : "bg-brand-error/5 text-brand-error border border-brand-error/15"
                          }`}
                        >
                          {hasPermission("colunas", "margemLiquida") ? `${p.percentualMargem.toFixed(2)}%` : "••••••"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {showLixeira ? (
                            <>
                              <button
                                onClick={(e) => handleRestoreProject(p.id, p.nome, e)}
                                className="p-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 rounded-md transition-colors inline-flex items-center gap-1 text-[10px]"
                                title="Restaurar"
                              >
                                <RotateCcw className="w-3 h-3 text-emerald-600" />
                                Restaurar
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPermanentDeleteConfirmationId(p.id);
                                  setPermanentDeleteConfirmationName(p.nome);
                                }}
                                className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 rounded-md transition-colors inline-flex items-center gap-1 text-[10px]"
                                title="Excluir Permanentemente"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                                Excluir Permanente
                              </button>
                            </>
                          ) : (
                            <>
                              {hasPermission("acoes", "editar") && (
                                <button
                                  onClick={(e) => handleEditProjectClick(p, e)}
                                  className="p-1 px-2 hover:bg-slate-100 text-brand-text-secondary hover:text-brand-text-primary font-bold border border-slate-200/65 rounded-md transition-colors inline-flex items-center gap-1 text-[10px]"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Editar
                                </button>
                              )}
                              {hasPermission("acoes", "editar") && hasPermission("colunas", "custoAdm", "editar") && (
                                <button
                                  onClick={(e) => handleEditCustoAdmClick(p, e)}
                                  className="p-1 px-2 hover:bg-slate-100 text-slate-700 hover:text-brand-text-primary font-bold border border-slate-200/65 rounded-md transition-colors inline-flex items-center gap-1 text-[10px]"
                                  title="Editar Custo ADM deste contrato"
                                >
                                  <Percent className="w-3 h-3 text-brand-accent animate-pulse" />
                                  Editar Custo ADM
                                </button>
                              )}
                              <button
                                onClick={() => navigateToProject(p.id)}
                                className="p-1 px-2.5 bg-brand-primary/5 hover:bg-brand-primary text-brand-primary hover:text-white font-bold rounded-md transition-colors inline-flex items-center gap-0.5 text-[10px]"
                              >
                                Abrir
                                <ChevronRight className="w-3 h-3" />
                              </button>
                              {hasPermission("acoes", "editar") && (
                                <button
                                  onClick={(e) => handleDeleteProject(p.id, p.nome, e)}
                                  className="p-1 px-2 hover:bg-red-50 text-slate-400 hover:text-red-600 font-bold border border-slate-200/65 hover:border-red-200 rounded-md transition-colors inline-flex items-center gap-1 text-[10px]"
                                  title="Enviar para a lixeira"
                                >
                                  <Trash2 className="w-3 h-3 text-slate-400 group-hover:text-red-500" />
                                  Excluir
                                </button>
                              )}
                            </>
                          )}
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
              <p className="font-semibold text-xs">
                {projectFilter === "A_FECHAR" ? "Nenhum orçamento cadastrado ou encontrado..." : "Nenhum projeto cadastrado ou encontrado..."}
              </p>
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

      {/* MODAL: GLOBAL CUSTO ADM */}
      <AnimatePresence>
        {isGlobalCostModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 p-6 space-y-5 overflow-hidden"
            >
              {!isGlobalConfirmOpen ? (
                // STEP 1: FORM
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="p-2 bg-brand-primary/5 rounded-lg text-brand-primary">
                      <Percent className="w-5 h-5 text-brand-accent animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase text-brand-text-primary tracking-wider" style={{ fontFamily: "Inter, sans-serif" }}>
                        Atualizar Custo ADM Global
                      </h3>
                      <p className="text-[10px] font-bold text-brand-text-secondary uppercase">
                        {projectFilter === "A_FECHAR" ? "Módulo: Orçamentos a Fechar" : "Módulo: Contratos Consolidados"}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-brand-text-secondary leading-relaxed font-semibold">
                    Esta alteração definirá a porcentagem padrão para todos os registros que utilizam o Custo ADM global.
                  </p>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">
                      Novo Custo ADM (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="Ex: 8"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-bold"
                        value={globalCostValue}
                        onChange={(e) => setGlobalCostValue(e.target.value)}
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="space-y-1.5">
                    <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                      Sugestões Rápidas:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {["5%", "7%", "10%", "12%"].map((pct) => {
                        const val = pct.replace("%", "");
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setGlobalCostValue(val)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                              globalCostValue === val
                                ? "bg-brand-primary/5 text-brand-primary border-brand-primary/30"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-650 border-slate-200"
                            }`}
                          >
                            {pct}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsGlobalCostModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const numeric = Number(globalCostValue);
                        if (isNaN(numeric) || numeric < 0 || globalCostValue === "") {
                          alert("Digite uma porcentagem de custo ADM válida.");
                          return;
                        }
                        setIsGlobalConfirmOpen(true);
                      }}
                      className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              ) : (
                // STEP 2: CONFIRMATION
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <h3 className="text-sm font-black uppercase text-red-600 tracking-wider">
                        Confirmar Alteração Global
                      </h3>
                      <p className="text-[10px] font-bold text-brand-text-secondary uppercase">
                        Ação em lote solicitada
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-brand-text-primary font-bold leading-relaxed bg-red-50 p-4 rounded-xl border border-red-100">
                    Esta ação irá alterar o Custo ADM de todos os registros exibidos neste módulo.
                    <br />
                    <span className="font-extrabold text-red-700 mt-2 block text-sm">
                      Novo Custo ADM: {globalCostValue}%
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Deseja continuar? O ERP recalculará todos os valores de venda, margem e KPIs automaticamente.
                  </p>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsGlobalConfirmOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/configuracoes/custo-adm-global", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              valor: Number(globalCostValue),
                              statusContrato: projectFilter,
                            }),
                          });
                          if (!res.ok) {
                            const errData = await res.json();
                            throw new Error(errData.error || "Erro ao salvar custo global");
                          }
                          queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
                          setIsGlobalConfirmOpen(false);
                          setIsGlobalCostModalOpen(false);
                        } catch (error: any) {
                          alert(error.message);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: INDIVIDUAL CUSTO ADM */}
      <AnimatePresence>
        {isIndividualModalOpen && selectedProjectForAdm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-100 p-6 space-y-4"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="p-2 bg-brand-primary/5 rounded-lg text-brand-primary">
                  <Percent className="w-5 h-5 text-brand-accent animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-brand-text-primary tracking-wider" style={{ fontFamily: "Inter, sans-serif" }}>
                    Editar Custo ADM
                  </h3>
                  <p className="text-[10px] font-bold text-slate-500 leading-tight">
                    {selectedProjectForAdm.nome}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">
                  Custo ADM (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Ex: 8"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-bold"
                    value={individualCostValue}
                    onChange={(e) => setIndividualCostValue(e.target.value)}
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                </div>
                {individualCostValue !== "" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIndividualCostValue("")}
                      className="text-[10px] text-red-600 hover:underline font-bold"
                    >
                      Remover Custo Individual (Usar Global)
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-slate-450 leading-normal font-semibold">
                Este percentual será aplicado exclusivamente a este registro. Ao limpar o campo, o projeto voltará a seguir o Custo ADM Global.
              </p>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsIndividualModalOpen(false);
                    setSelectedProjectForAdm(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const costVal = individualCostValue === "" ? null : Number(individualCostValue);
                      const res = await fetch(`/api/projetos/${selectedProjectForAdm.id}/custo-adm`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ custoAdm: costVal })
                      });
                      if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.error || "Erro ao atualizar custo ADM");
                      }
                      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
                      setIsIndividualModalOpen(false);
                      setSelectedProjectForAdm(null);
                    } catch (error: any) {
                      alert(error.message);
                    }
                  }}
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PERMANENT DELETE CONFIRMATION */}
      <AnimatePresence>
        {permanentDeleteConfirmationId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-red-100 overflow-hidden p-6 space-y-4"
            >
              <h3 className="text-sm font-black uppercase text-red-700 tracking-wider">
                Excluir Permanentemente
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Tem certeza que deseja excluir permanentemente o projeto "{permanentDeleteConfirmationName}"? Esta ação não pode ser desfeita e removerá todos os dados, subitens e orçamentos vinculados.
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPermanentDeleteConfirmationId(null);
                    setPermanentDeleteConfirmationName("");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  onClick={() => {
                    handleDeleteProjectPermanent(permanentDeleteConfirmationId);
                    setPermanentDeleteConfirmationId(null);
                    setPermanentDeleteConfirmationName("");
                  }}
                >
                  Excluir Permanentemente
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
