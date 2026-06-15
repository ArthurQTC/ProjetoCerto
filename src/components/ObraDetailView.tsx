import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Coins,
  Percent,
  Plus,
  Trash2,
  Ban,
  CheckCircle,
  Edit,
  Search,
  Building,
  Layers,
  FileSpreadsheet,
  FolderOpen,
  FolderPlus,
  GripVertical,
  RotateCcw,
  FileText,
  UploadCloud,
  X,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Projeto, ItemOrcamento } from "../types";
import { useUIStore } from "../store";
import ItemFormModal from "./ItemFormModal";
import CreateProjectModal from "./CreateObraModal";
import CreateCategoryModal from "./CreateCategoryModal";

export default function ObraDetailView() {
  const queryClient = useQueryClient();
  const navigateToProjects = useUIStore((state) => state.navigateToProjects);
  const navigateToSteps = useUIStore((state) => state.navigateToSteps);
  const selectedProjectId = useUIStore((state) => state.selectedProjectId || state.selectedObraId);

  const [searchTerm, setSearchTerm] = useState("");
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemOrcamento | null>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  
  // Live PDF-Matching Proposal Preview
  const [isBudgetPreviewOpen, setIsBudgetPreviewOpen] = useState(false);
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState("");
  const [docValidity, setDocValidity] = useState("");
  const [docClientName, setDocClientName] = useState("");
  const [docClientCnpj, setDocClientCnpj] = useState("");
  const [docClientAddress, setDocClientAddress] = useState("");
  const [docClientEmail, setDocClientEmail] = useState("");
  const [docScope, setDocScope] = useState("");
  const [docScopePct, setDocScopePct] = useState("***60%***");
  const [selectedBudgetItems, setSelectedBudgetItems] = useState<Record<string, boolean>>({});

  // Document attachments and inline pdf preview states
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null);

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      const novoDoc = {
        id: "doc-" + Date.now(),
        nome: file.name,
        data: new Date().toISOString().split('T')[0],
        tamanho: (file.size / (1024 * 1024)).toFixed(1) + " MB",
        url: base64Url,
      };

      const updatedDocs = [...(project?.documentos || []), novoDoc];
      try {
        const res = await fetch(`/api/projetos/${project?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentos: updatedDocs }),
        });
        if (!res.ok) throw new Error("Erro ao salvar documento");
        refetch();
        queryClient.invalidateQueries({ queryKey: ["projectDetail", project?.id] });
      } catch (err: any) {
        alert("Erro ao enviar arquivo: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Deseja Excluir o PDF permanentemente?")) return;
    const updatedDocs = (project?.documentos || []).filter((doc: any) => doc.id !== docId);
    try {
      const res = await fetch(`/api/projetos/${project?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentos: updatedDocs }),
      });
      if (!res.ok) throw new Error("Erro ao excluir arquivo");
      if (activePdfUrl && project?.documentos?.find((d: any) => d.id === docId)?.url === activePdfUrl) {
        setActivePdfUrl(null);
      }
      refetch();
      queryClient.invalidateQueries({ queryKey: ["projectDetail", project?.id] });
    } catch (err: any) {
      alert("Erro ao excluir documento: " + err.message);
    }
  };

  // Local state to support instant, smooth real-time drag and drop
  const [localItems, setLocalItems] = useState<ItemOrcamento[]>([]);
  
  // Drag and Drop ordering states
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  // Soft deleted Lixeira states
  const [showLixeira, setShowLixeira] = useState(false);
  const [confirmingItemId, setConfirmingItemId] = useState<string | null>(null);
  const [confirmingEmptyTrash, setConfirmingEmptyTrash] = useState(false);

  // Secure project deletion modal states
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Fixed item deletion confirmation states
  const [fixedItemToDelete, setFixedItemToDelete] = useState<ItemOrcamento | null>(null);
  const [isPermanentDeleteOfFixed, setIsPermanentDeleteOfFixed] = useState(false);

  // Fetch single Project (Projeto) data
  const { data: project, isLoading, isError, refetch } = useQuery<Projeto>({
    queryKey: ["projectDetail", selectedProjectId],
    queryFn: async () => {
      const res = await fetch(`/api/projetos/${selectedProjectId}`);
      if (!res.ok) throw new Error("Falha ao buscar detalhes do projeto");
      return res.json();
    },
    enabled: !!selectedProjectId,
  });

  useEffect(() => {
    if (project?.itens) {
      setLocalItems(project.itens);
    }
  }, [project?.itens]);

  useEffect(() => {
    if (project) {
      const defaultId = project.id.replace(/\D/g, "");
      setDocNumber(project.numeroPedido || (defaultId ? defaultId.substring(0, 4) : "9461"));
      
      const today = new Date();
      setDocDate(today.toLocaleDateString("pt-BR"));
      
      const validityDate = new Date();
      validityDate.setDate(validityDate.getDate() + 30);
      setDocValidity(validityDate.toLocaleDateString("pt-BR"));
      
      setDocClientName(project.cliente || project.nome);
      setDocClientCnpj("03.786.187/0017-56");
      setDocClientAddress("Rua Itacolomi - RESIDENCIA BOA VISTA - Conjunto Habitacional Jardim Sabiá - Senador Canedo - GO - CEP: 75250-005");
      setDocClientEmail("savio@threeway.com.br");
      setDocScope("FORNECIMENTO DE MATERIAIS PARA ESTRUTURA E SUBESTRUTURA PARA RECEBIMENTO DOS BRISES + MÃO DE OBRA DE INSTALAÇÃO DO BRISES THB 150 HUNTER DOUGLAS");
      setDocScopePct("***60%***");

      // Pre-select all active budget items initially
      const initialSelected: Record<string, boolean> = {};
      project?.itens?.forEach((item) => {
        if (item.status === "ATIVO") {
          initialSelected[item.id] = true;
        }
      });
      setSelectedBudgetItems(initialSelected);
    }
  }, [project, isBudgetPreviewOpen]);

  // Toggle item statuses
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, payload }: { itemId: string; payload: Partial<ItemOrcamento> }) => {
      const res = await fetch(`/api/itens/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status do item");
      return res.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["projectDetail", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });

  // Delete item
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/itens/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao remover item");
      }
      return res.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["projectDetail", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (err: any) => {
      alert("Falha ao remover item definitivo: " + err.message);
    }
  });

  // Empty trash mutation
  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projetos/${selectedProjectId}/lixeira`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao esvaziar lixeira");
      }
      return res.json();
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["projectDetail", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (err: any) => {
      alert("Falha ao esvaziar lixeira: " + err.message);
    }
  });

  // Delete entire project
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projetos/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir projeto");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      navigateToProjects();
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-4 border-brand-primary/10 border-t-brand-primary rounded-full animate-spin" />
        <p className="text-sm text-brand-text-secondary font-semibold">Carregando planilha do projeto...</p>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="p-8 bg-brand-error/5 border border-brand-error/10 rounded-2xl max-w-2xl mx-auto mt-12 text-center text-brand-error">
        <h3 className="font-bold text-base">Planilha de projeto indisponível</h3>
        <p className="text-xs mt-1.5 opacity-90">O cadastro pode ter sido removido ou o servidor Express está inoperante.</p>
        <button
          onClick={() => navigateToProjects()}
          className="mt-4 px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl text-xs font-bold transition-colors"
        >
          Voltar à Lista de Projetos
        </button>
      </div>
    );
  }

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatBRLNoDecimals = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Status badge style helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LIXEIRA":
        return <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider py-0.5 px-2 bg-red-50 text-red-600 border border-red-200 rounded-md">Lixeira</span>;
      default:
        return null;
    }
  };

  const handleToggleStatus = (item: ItemOrcamento, targetStatus: "ATIVO" | "LIXEIRA" | "FORA_DO_ORCAMENTO") => {
    updateItemMutation.mutate({ itemId: item.id, payload: { status: targetStatus } });
  };

  const handleSoftDeleteItem = (item: ItemOrcamento) => {
    if (item.id.startsWith("fixed-")) {
      setFixedItemToDelete(item);
      setIsPermanentDeleteOfFixed(false);
      return;
    }
    updateItemMutation.mutate({ itemId: item.id, payload: { status: "LIXEIRA" } });
  };

  const handlePermanentDeleteItem = (itemId: string) => {
    if (itemId.startsWith("fixed-")) {
      const item = project?.itens?.find((i: any) => i.id === itemId);
      if (item) {
        setFixedItemToDelete(item);
        setIsPermanentDeleteOfFixed(true);
        return;
      }
    }
    deleteItemMutation.mutate(itemId);
  };

  const handleConfirmDeleteFixedItem = () => {
    if (!fixedItemToDelete) return;

    if (isPermanentDeleteOfFixed) {
      deleteItemMutation.mutate(fixedItemToDelete.id);
    } else {
      updateItemMutation.mutate({ itemId: fixedItemToDelete.id, payload: { status: "LIXEIRA" } });
    }
    setFixedItemToDelete(null);
  };

  // Drag and Drop handlers for full-row drag and drop with real-time preview and blank preview rows
  const handleDragStart = (e: React.DragEvent, id: string) => {
    const target = e.target as HTMLElement;
    // Evita arrastar quando clica em botões ou elementos interativos
    if (target.closest("button") || target.closest("a") || target.closest("input") || target.closest("td:last-child")) {
      e.preventDefault();
      return;
    }
    
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);

    // Timeout allows browser to capture the fully visible row screenshot as the drag image first
    setTimeout(() => {
      setDraggedId(id);
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, hoveredId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === hoveredId) return;

    const idxOfDragged = localItems.findIndex((i) => i.id === draggedId);
    const idxOfHovered = localItems.findIndex((i) => i.id === hoveredId);

    if (idxOfDragged !== -1 && idxOfHovered !== -1) {
      const newLocalItems = [...localItems];
      const [removed] = newLocalItems.splice(idxOfDragged, 1);
      newLocalItems.splice(idxOfHovered, 0, removed);

      setLocalItems(newLocalItems);
    }
  };

  const handleDragEnd = async () => {
    setDraggedId(null);
    try {
      const itemIds = localItems.map((i) => i.id);
      const res = await fetch(`/api/projetos/${selectedProjectId}/reordenar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds }),
      });
      if (!res.ok) throw new Error("Erro de resposta do servidor");
      refetch();
    } catch (err) {
      console.error("Falha ao salvar reordenação dos itens:", err);
    }
  };

  // Process work-level cost distribution chart data (group by category name for local fine-granularity)
  const activeItems = (project.itens || []).filter((i) => i.status === "ATIVO");
  const costCategoryMap: Record<string, number> = {};
  activeItems.forEach((i) => {
    if (i.categoria) {
      const catName = i.categoria.nome;
      costCategoryMap[catName] = (costCategoryMap[catName] || 0) + Number(i.valor);
    }
  });

  const categoryChartData = Object.keys(costCategoryMap).map((catName) => ({
    name: catName,
    value: costCategoryMap[catName],
  }));

  const CATEGORY_COLORS = ["#0D3B66", "#1F5A8A", "#D9A441", "#16A34A", "#F59E0B", "#DC2626", "#475569", "#334155", "#0F172A"];

  // Filter items in the table
  const filteredItems = localItems.filter((item) => {
    if (showLixeira) {
      return item.status === "LIXEIRA";
    }

    if (item.status === "LIXEIRA") return false;

    const matchesSearch =
      item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.categoria && item.categoria.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.observacao && item.observacao.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const marginIsPositive = project.margemLiquida >= 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Upper Title Block - Compact & Professional */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigateToProjects()}
            className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg hover:text-slate-700 transition-colors"
            title="Voltar à Lista de Projetos"
            id="back_to_projects_list_btn"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-extrabold text-brand-primary bg-brand-primary/5 border border-brand-primary/10 py-0.5 px-2 rounded-md font-mono">
                REGISTRO DE PROJETO
              </span>
              {project.cliente && (
                <span className="text-[9px] font-bold text-brand-text-secondary bg-slate-100 py-0.5 px-2 rounded-md border border-slate-200">
                  Cliente: {project.cliente}
                </span>
              )}
            </div>
            <h1 className="text-lg font-extrabold tracking-tight text-brand-text-primary">{project.nome}</h1>
            {project.observacoes && (
              <p className="text-[11px] text-brand-text-secondary font-semibold">{project.observacoes}</p>
            )}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => navigateToSteps(project.id)}
            className="px-3 py-1.5 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
            id="go_to_steps_btn"
          >
            <CheckCircle className="w-3.5 h-3.5 text-brand-accent" />
            Ir para Etapas do Contrato
          </button>
          <button
            onClick={() => setIsEditProjectOpen(true)}
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-brand-text-primary rounded-lg font-bold text-xs transition-colors flex items-center gap-1"
            id="edit_project_details_btn"
          >
            <Edit className="w-3.5 h-3.5 text-slate-400" />
            Editar Cadastro
          </button>
          <button
            onClick={() => setIsDeleteProjectModalOpen(true)}
            className="p-1.5 border border-brand-error/15 bg-brand-error/5 hover:bg-brand-error hover:text-white text-brand-error rounded-lg transition-all"
            title="Deseja excluir o projeto?"
            id="delete_project_details_btn"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* COMPACT KPI CARDS ROW - Clean & Executive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CONTRACT VALUE */}
        <div className="bg-brand-primary p-4 rounded-xl border border-brand-secondary shadow-md text-white transition-all duration-300 hover:shadow-lg">
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block">Valor Do Contrato PC</span>
          <h3 className="text-base font-extrabold font-mono text-brand-accent tracking-tight mt-1">
            {formatBRL(project.valorContrato)}
          </h3>
        </div>

        {/* VISÃO GERAL (CUSTOS ATIVOS) */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Visão Custo Geral</span>
          <h3 className="text-base font-extrabold font-mono text-brand-text-primary tracking-tight mt-1">
            {formatBRL(project.visaoGeral)}
          </h3>
        </div>

        {/* MARGEM LÍQUIDA */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Margem Líquida</span>
          <h3 className={`text-base font-extrabold font-mono tracking-tight mt-1 ${marginIsPositive ? "text-brand-success" : "text-brand-error"}`}>
            {formatBRL(project.margemLiquida)}
          </h3>
        </div>

        {/* MARGEM (%) */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Percentual Margem</span>
          <h3 className={`text-base font-extrabold font-mono tracking-tight mt-1 ${marginIsPositive ? "text-brand-success" : "text-brand-error"}`}>
            {project.percentualMargem.toFixed(2)}%
          </h3>
        </div>
      </div>

      {/* Main Budget Sheet Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Budget Table representation */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-brand-primary" />
                <h3 className="text-xs font-extrabold text-brand-text-primary">Planilha de Custos do Orçamento</h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1.5 w-3 h-3 text-brand-text-secondary" />
                  <input
                    type="text"
                    placeholder="Filtrar item..."
                    className="pl-7 pr-2.5 py-1 text-[10px] border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-brand-primary/25 hover:border-slate-300 transition-colors w-28 sm:w-36"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    id="item_search_detail"
                  />
                </div>
                {/* Lixeira Filter */}
                <button
                  onClick={() => {
                    setShowLixeira(!showLixeira);
                  }}
                  className={`p-1 border rounded-lg transition-all inline-flex items-center gap-1 text-[9px] font-bold ${
                    showLixeira
                      ? "bg-red-50 border-red-200 text-brand-error animate-pulse"
                      : "bg-white border-slate-200 text-brand-text-secondary hover:bg-slate-50"
                  }`}
                  id="toggle_show_lixeira_btn"
                >
                  <Trash2 className="w-3 h-3" />
                  Lixeira ({project.itens?.filter(i => i.status === "LIXEIRA").length || 0})
                </button>
                {/* Esvaziar Lixeira Button */}
                {showLixeira && project.itens?.some(i => i.status === "LIXEIRA") && (
                  confirmingEmptyTrash ? (
                    <button
                      onClick={() => {
                        emptyTrashMutation.mutate();
                        setConfirmingEmptyTrash(false);
                      }}
                      onMouseLeave={() => setConfirmingEmptyTrash(false)}
                      className="p-1 px-2.5 bg-red-700 hover:bg-red-800 text-white font-extrabold text-[9px] rounded-lg transition-all flex items-center gap-1 shrink-0 border border-transparent shadow-xs animate-pulse"
                      id="empty_trash_confirm_btn"
                    >
                      <CheckCircle className="w-3" />
                      Remover Tudo? (Confirmar)
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmingEmptyTrash(true)}
                      className="p-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[9px] rounded-lg transition-colors flex items-center gap-1 shrink-0 border border-transparent shadow-xs"
                      id="empty_trash_btn"
                    >
                      <Trash2 className="w-3 h-3" />
                      Limpar Lixeira
                    </button>
                  )
                )}
                {/* Nova Categoria Inside the Project Screen */}
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="px-2.5 py-1 text-brand-primary border border-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors"
                  id="add_category_btn"
                >
                  <FolderPlus className="w-3 h-3" />
                  Nova Categoria
                </button>
                {/* Novo Item */}
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setIsItemModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors"
                  id="add_item_btn"
                >
                  <Plus className="w-3 h-3" />
                  Novo Item
                </button>
                {/* Visualizar Orçamento Materiais */}
                <button
                  onClick={() => setIsBudgetPreviewOpen(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                  id="visualize_budget_materials_btn"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Orçamento Materiais (PDF)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredItems.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="py-2 px-1 text-center font-bold text-brand-text-secondary w-6 shrink-0"></th>
                      <th className="py-2 px-3 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">Descrição</th>
                      <th className="py-2 px-3 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">Categoria</th>
                      <th className="py-2 px-3 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider text-right">Valor</th>
                      <th className="py-2 px-3 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider text-center">Status</th>
                      <th className="py-2 px-3 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-[11px]">
                    {filteredItems.map((item, index) => {
                      const isOutOfBudget = item.status === "FORA_DO_ORCAMENTO";
                      const isLixeira = item.status === "LIXEIRA";
                      const isCurrentDragged = draggedId !== null && item.id === draggedId;

                      return (
                        <tr
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragOver={handleDragOver}
                          onDragEnter={(e) => handleDragEnter(e, item.id)}
                          onDragEnd={handleDragEnd}
                          className={`transition-all duration-155 border-t border-slate-150 ${
                            isCurrentDragged
                              ? "opacity-40 bg-slate-100/90 scale-[0.99] border-2 border-dashed border-brand-primary/50 shadow-inner"
                              : isOutOfBudget
                              ? "opacity-50 bg-slate-50/50 hover:bg-brand-primary/5 cursor-grab active:cursor-grabbing"
                              : isLixeira
                              ? "bg-red-50/10 hover:bg-brand-primary/5 cursor-grab active:cursor-grabbing"
                              : "hover:bg-brand-primary/5 cursor-grab active:cursor-grabbing"
                          }`}
                        >
                          {/* Grip handle indicator */}
                          <td className="py-2.5 px-1 text-center select-none w-6 shrink-0">
                            <GripVertical className="w-3 h-3 mx-auto text-slate-300 hover:text-slate-500" />
                          </td>
                          <td className="py-2.5 px-3 font-bold text-brand-text-primary">
                            <div>
                              <p className={isOutOfBudget ? "line-through text-brand-text-secondary" : ""}>{item.descricao}</p>
                              {item.observacao && (
                                <p className="text-[9px] text-brand-text-secondary mt-0.5 font-semibold italic">
                                  Obs: {item.observacao}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-brand-text-secondary font-semibold">
                            <span className="inline-flex flex-col">
                              <span>{item.categoria?.nome || "Sem Categoria"}</span>
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${isOutOfBudget ? "text-brand-text-secondary" : "text-brand-text-primary"}`}>
                            {formatBRL(item.valor)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="py-2.5 px-3" draggable="false" onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {isLixeira ? (
                                <>
                                  <button
                                    onClick={() => handleToggleStatus(item, "ATIVO")}
                                    className="p-1 hover:bg-green-50 text-brand-success hover:text-green-700 rounded transition-colors inline-flex items-center gap-0.5"
                                    title="Restaurar Lançamento"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span className="text-[9px] font-extrabold uppercase">Restaurar</span>
                                  </button>
                                  {confirmingItemId === item.id ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePermanentDeleteItem(item.id);
                                        setConfirmingItemId(null);
                                      }}
                                      onMouseLeave={() => setConfirmingItemId(null)}
                                      className="p-1 px-2.5 bg-red-650 hover:bg-red-700 text-white rounded font-extrabold text-[9px] uppercase tracking-wider inline-flex items-center gap-1 transition-all duration-150 animate-pulse"
                                      title="Clique para confirmar a exclusão permanente"
                                    >
                                      Confirmar?
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmingItemId(item.id);
                                      }}
                                      className="p-1 hover:bg-red-50 text-brand-error rounded transition-colors inline-flex items-center gap-0.5"
                                      title="Excluir Permanentemente"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span className="text-[9px] font-extrabold uppercase">Definitivo</span>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setIsItemModalOpen(true);
                                    }}
                                    className="p-1 hover:bg-slate-100 text-slate-400 hover:text-brand-primary rounded transition-colors"
                                    title="Editar item"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>

                                  {/* Toggle active */}
                                  {item.status !== "ATIVO" && (
                                    <button
                                      onClick={() => handleToggleStatus(item, "ATIVO")}
                                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-brand-success rounded transition-colors"
                                      title="Ativar no Orçamento"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleSoftDeleteItem(item)}
                                    className="p-1 hover:bg-red-50 text-slate-400 hover:text-brand-error rounded transition-colors"
                                    title="Mover para Lixeira"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
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
                <div className="p-10 text-center text-slate-350">
                  <Layers className="w-6 h-6 mx-auto opacity-30 mb-2" />
                  <p className="font-semibold text-xs">Nenhum item localizado com os filtros selecionados.</p>
                </div>
              )}
            </div>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between text-[10px] font-bold text-brand-text-secondary">
            <span>Orçamento do Projeto: {filteredItems.length} registros listados</span>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-1 space-y-5">
          {/* Documentos Section */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs space-y-3">
            <h4 className="text-sm font-extrabold text-brand-text-primary flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-accent animate-pulse" />
                Documentos ({project.documentos?.length || 0})
              </span>
            </h4>
            
            {/* List of currently attached documents */}
            {project.documentos && project.documentos.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {project.documentos.map((doc) => (
                  <div key={doc.id} className="p-2 border border-slate-150 rounded-lg hover:border-brand-accent transition-colors flex items-center justify-between gap-2.5 bg-slate-50/50">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-brand-accent shrink-0" />
                      <div className="truncate text-left">
                        <p className="text-[10px] font-bold text-brand-text-primary truncate" title={doc.nome}>
                          {doc.nome}
                        </p>
                        <p className="text-[9px] text-brand-text-secondary">
                          {doc.data} • {doc.tamanho}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setActivePdfUrl(doc.url)}
                        className="p-1 px-2 hover:bg-white border border-slate-200 text-brand-accent rounded-md text-[9px] font-extrabold transition-colors uppercase"
                        title="Ver PDF Inline"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1 hover:bg-red-50 text-brand-error rounded-md transition-colors"
                        title="Excluir Documento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-350 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                <FileText className="w-5 h-5 mx-auto opacity-30 mb-1" />
                <p className="text-[10px] font-bold">Nenhum documento anexado</p>
              </div>
            )}

            {/* Upload Area */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-brand-accent rounded-xl p-3 cursor-pointer hover:bg-slate-50 transition-all">
                <div className="flex flex-col items-center justify-center text-center">
                  <UploadCloud className="w-5 h-5 text-brand-accent mb-1 animate-bounce" />
                  <p className="text-[10px] font-extrabold text-brand-text-primary">Anexar Documento PDF / Imagem</p>
                  <p className="text-[8px] text-brand-text-secondary mt-0.5">Clique ou arraste o arquivo aqui</p>
                </div>
                <input 
                  type="file" 
                  accept="application/pdf,image/*" 
                  className="hidden" 
                  onChange={handleLocalFileUpload} 
                />
              </label>
            </div>
          </div>

          {/* Cost distribution by categories */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-extrabold text-brand-text-primary flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Coins className="w-4 h-4 text-brand-accent scale-110" />
                Distribuição do Orçamento
              </h4>
              <p className="text-[10px] text-brand-text-secondary mt-1.5 font-semibold">
                Detalhamento percentual de despesas correntes, filtrado unicamente pelas categorias de custos ativos.
              </p>
            </div>

            {categoryChartData.length > 0 ? (
              <div className="flex flex-col items-center justify-center mt-4">
                <div className="w-full h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [formatBRLNoDecimals(Number(value)), ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-col gap-1.5 mt-4 w-full text-left max-h-[140px] overflow-y-auto pr-1">
                  {(() => {
                    const totalBudget = categoryChartData.reduce((acc, item) => acc + item.value, 0);
                    return categoryChartData.map((item, index) => {
                      const pct = totalBudget > 0 ? ((item.value / totalBudget) * 100).toFixed(1) : "0";
                      return (
                        <div key={item.name} className="flex items-center justify-between text-[10px] font-bold text-brand-text-secondary py-1 border-b border-slate-50">
                          <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                            <span className="truncate" title={item.name}>{item.name} <span className="text-[9px] text-slate-400 font-normal ml-0.5">({pct}%)</span></span>
                          </div>
                          <strong className="font-mono text-brand-text-primary ml-2 shrink-0">{formatBRLNoDecimals(item.value)}</strong>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-44 mt-4 text-slate-350">
                <Building className="w-6 h-6 opacity-30 mb-1.5" />
                <p className="text-[11px] font-bold">Nenhum custo operacional ativo cadastrado</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insert Item form modal popup overlay */}
      <ItemFormModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setSelectedItem(null);
        }}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
        }}
        obraId={project.id}
        itemToEdit={selectedItem}
      />

      {/* Nova Categoria popup/modal overlay */}
      <CreateCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={() => {
          // Re-trigger categories fetch across modals
          queryClient.invalidateQueries({ queryKey: ["categories"] });
          refetch();
        }}
      />

      {/* Project modification modal overlay */}
      <CreateProjectModal
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
        }}
        projectToEdit={project}
      />

      {/* Secure confirmation modal for Project Deletion */}
      {isDeleteProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => {
            setIsDeleteProjectModalOpen(false);
            setDeleteConfirmationText("");
          }} />

          <div className="relative bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full p-6 overflow-hidden animate-in fade-in zoom-in duration-200">
            <h4 className="text-sm font-extrabold text-brand-text-primary">Tem certeza que deseja excluir?</h4>
            <p className="text-xs text-brand-text-secondary mt-2 leading-relaxed font-semibold">
              Será excluído permanentemente. Se sim, digite <strong className="text-brand-error">&apos;Sim&apos;</strong> para confirmar a exclusão de <span className="text-brand-text-primary font-bold italic">"{project.nome}"</span>.
            </p>

            <div className="mt-4">
              <input
                type="text"
                className="w-full text-xs font-bold py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-error/20 focus:border-brand-error hover:border-slate-300 transition-colors"
                placeholder="Digite 'Sim' para confirmar"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                autoFocus
                id="obra_delete_confirm_p_input"
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-5 border-t border-slate-100 pt-4 shrink-0">
              <button
                type="button"
                className="px-4 py-2 border border-slate-200 text-brand-text-secondary hover:text-brand-text-primary font-bold text-xs rounded-xl transition-colors"
                onClick={() => {
                  setIsDeleteProjectModalOpen(false);
                  setDeleteConfirmationText("");
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-brand-error hover:bg-brand-error/90 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={deleteConfirmationText !== "Sim" && deleteConfirmationText !== "sim"}
                onClick={() => {
                  deleteProjectMutation.mutate(project.id);
                  setIsDeleteProjectModalOpen(false);
                  setDeleteConfirmationText("");
                }}
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Item Deletion Confirmation Modal */}
      {fixedItemToDelete && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setFixedItemToDelete(null)} />

          <div className="relative bg-white rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full p-6 overflow-hidden animate-in fade-in zoom-in duration-200 text-left">
            <div className="flex items-center gap-2 text-amber-600 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <h4 className="text-sm font-extrabold text-brand-text-primary">Tem certeza que deseja excluir?</h4>
            </div>
            
            <p className="text-xs text-brand-text-secondary leading-relaxed font-semibold">
              Você está tentando excluir o item <strong className="text-brand-text-primary">"{fixedItemToDelete.descricao}"</strong>, que é um item de cálculo automático de imposto ou taxa de administração.
            </p>
            <p className="text-xs text-brand-text-secondary mt-2 leading-relaxed font-semibold">
              {isPermanentDeleteOfFixed 
                ? "Este item de cálculo fixo será apagado permanentemente! Isso pode causar inconsistências nos resumos financeiros e indicadores integrados do contrato do projeto."
                : "Este item fixo será movido para a Lixeira, o que suspenderá sua participação nos resumos financeiros e indicadores do projeto."}
            </p>

            <div className="flex justify-end gap-2.5 mt-5 border-t border-slate-100 pt-4 shrink-0">
              <button
                type="button"
                className="px-4 py-2 border border-slate-200 text-brand-text-secondary hover:text-brand-text-primary font-bold text-xs rounded-xl transition-colors"
                onClick={() => setFixedItemToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors"
                onClick={handleConfirmDeleteFixedItem}
              >
                {isPermanentDeleteOfFixed ? "Sim, Excluir Definitivamente" : "Sim, Mover para Lixeira"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up modal screen overlapping for PDF document previewing */}
      {activePdfUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
            onClick={() => setActivePdfUrl(null)} 
          />

          <div className="relative bg-white w-full max-w-4xl h-[85vh] rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal header details and full-size actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-150 flex items-center justify-between gap-3 shrink-0 text-left">
              <div className="flex items-center gap-2 truncate text-left">
                <FileText className="w-5 h-5 text-brand-accent shrink-0" />
                <div>
                  <h4 className="text-xs font-black tracking-wide text-brand-text-primary uppercase">
                    Visualização do PDF
                  </h4>
                  <p className="text-[10px] text-brand-text-secondary truncate max-w-[300px] sm:max-w-[450px] font-mono">
                    {project.documentos?.find(d => d.url === activePdfUrl)?.nome || activePdfUrl}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activePdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-brand-primary hover:border-brand-accent rounded-lg text-[10px] font-extrabold transition-colors uppercase tracking-wider"
                  title="Abrir em Nova Aba"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-brand-accent" />
                  <span className="hidden sm:inline">Nova Aba</span>
                </a>
                <button
                  onClick={() => setActivePdfUrl(null)}
                  className="p-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-brand-text-primary transition-colors cursor-pointer"
                  title="Fechar Visualizador"
                  id="close_pdf_modal_btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal body with high-resolution iframe */}
            <div className="flex-1 bg-slate-100 p-2 relative flex flex-col justify-stretch">
              <iframe 
                src={activePdfUrl} 
                className="w-full h-full rounded-xl border border-slate-200 bg-white shadow-inner flex-1" 
                title="PDF Full Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Dynamic PDF-matching Materials Budget Export & Preview Modal */}
      {isBudgetPreviewOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-4 bg-slate-900/70 backdrop-blur-xs">
          {/* Custom Print Stylesheet to hide everything else and style the budget page strictly on A4 */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              html, body {
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-budget-document, #printable-budget-document * {
                visibility: visible !important;
              }
              #printable-budget-document {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 1.5cm 1.2cm !important;
                border: none !important;
                box-shadow: none !important;
                page-break-after: avoid !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />

          <div className="relative bg-white w-full h-full md:h-[95vh] md:max-w-7xl md:rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-150 flex items-center justify-between gap-3 shrink-0 text-left no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-black tracking-wide text-brand-text-primary uppercase">
                    Visualização do Orçamento
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-[10px] font-extrabold transition-colors uppercase tracking-wider shadow-sm cursor-pointer"
                  title="Imprimir ou Salvar como PDF usando a ferramenta nativa do navegador"
                >
                  <UploadCloud className="w-3.5 h-3.5 rotate-180" />
                  Imprimir / Baixar PDF
                </button>
                <button
                  onClick={() => setIsBudgetPreviewOpen(false)}
                  className="p-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-brand-text-primary transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100 no-print:bg-white">
              {/* Left Config Panel */}
              <div className="w-full lg:w-[350px] bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 p-4 overflow-y-auto flex flex-col gap-4 text-xs text-left shrink-0 no-print">
                <h5 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] border-b border-slate-200 pb-1">
                  Parâmetros do Documento
                </h5>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider mb-1">
                      Num. Orçamento
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider mb-1">
                      Data de Emissão
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider mb-1">
                    Validade da Proposta
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    value={docValidity}
                    onChange={(e) => setDocValidity(e.target.value)}
                  />
                </div>

                <h5 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] border-b border-slate-200 pb-1 mt-2">
                  Dados do Cliente
                </h5>

                <div>
                  <label className="block text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider mb-1">
                    Nome / Razão Social
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    value={docClientName}
                    onChange={(e) => setDocClientName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider mb-1">
                    CNPJ Cliente
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    value={docClientCnpj}
                    onChange={(e) => setDocClientCnpj(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider mb-1">
                    E-mail Cliente
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    value={docClientEmail}
                    onChange={(e) => setDocClientEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider mb-1">
                    Endereço Completo
                  </label>
                  <textarea
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500 resize-none font-sans"
                    value={docClientAddress}
                    onChange={(e) => setDocClientAddress(e.target.value)}
                  />
                </div>

                <h5 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] border-b border-slate-200 pb-1 mt-2">
                  Escopo & Observações
                </h5>

                <div>
                  <label className="block text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider mb-1">
                    Descrição do Escopo / Fornecimento
                  </label>
                  <textarea
                    rows={3}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500 resize-none font-sans"
                    value={docScope}
                    onChange={(e) => setDocScope(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-extrabold text-brand-text-secondary uppercase tracking-wider mb-1">
                    Percentual / Complemento
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    value={docScopePct}
                    onChange={(e) => setDocScopePct(e.target.value)}
                  />
                </div>

                <h5 className="font-bold text-slate-800 uppercase tracking-widest text-[10px] border-b border-slate-200 pb-1 mt-2">
                  Escolher Itens do Orçamento
                </h5>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {project?.itens?.filter(item => item.status === "ATIVO").map((item) => (
                    <label key={item.id} className="flex items-start gap-2 p-1.5 hover:bg-slate-100 rounded-md cursor-pointer text-[10px] font-semibold leading-relaxed">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 text-amber-600 focus:ring-amber-500 border-slate-300 rounded"
                        checked={selectedBudgetItems[item.id] !== false}
                        onChange={(e) => {
                          setSelectedBudgetItems(prev => ({
                            ...prev,
                            [item.id]: e.target.checked
                          }));
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-slate-800 font-bold" title={item.descricao}>{item.descricao}</p>
                        <span className="text-[9px] text-slate-400 font-mono block">
                          {item.categoria?.nome || "Sem Categoria"} &bull; {formatBRLNoDecimals(item.valor)}
                        </span>
                      </div>
                    </label>
                  ))}
                  {(!project?.itens || project.itens.filter(item => item.status === "ATIVO").length === 0) && (
                    <p className="text-[9px] text-slate-400 italic">Nenhum item ativo disponível.</p>
                  )}
                </div>
              </div>

              {/* Right Live Preview Panel */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start">
                {/* Simulated A4 Container */}
                <div 
                  id="printable-budget-document"
                  className="bg-white shadow-xl w-full max-w-[210mm] min-h-[297mm] p-6 md:p-12 border border-slate-200 text-left text-slate-900 font-sans relative flex flex-col justify-between"
                  style={{ minHeight: '297mm', boxSizing: 'border-box' }}
                >
                  <div>
                    {/* Top Date & Doc ID Row */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium tracking-tight mb-2">
                      <span>{docValidity}</span>
                      <span className="font-semibold text-slate-800">Orçamento <span className="font-bold font-mono text-xs">{docNumber}</span></span>
                    </div>

                    {/* Double-line divider */}
                    <div className="border-t border-slate-300 my-1 font-semibold" />

                    {/* Header: Vendor Brand Info Card */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-3 items-center">
                      {/* Left: Brand logo & Vendor CNPJ/Address details */}
                      <div className="md:col-span-8 flex gap-4 items-center text-left">
                        {/* Site Favicon Logo */}
                        <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                          <img
                            src={localStorage.getItem("logo_url") || "https://dptxkbsyzfntolgmhniz.supabase.co/storage/v1/object/sign/ProjetoCerto/faviconProjetoCerto.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yY2MyYjJkMS1hMDBkLTQ5N2EtYTQwMC0zOWM0MjFkZmNmYWEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJQcm9qZXRvQ2VydG8vZmF2aWNvblByb2pldG9DZXJ0by5wbmciLCJpYXQiOjE3ODA0MjQxNDIsImV4cCI6MjA5NTc4NDE0Mn0._ofXmRtiUUM0MbiBO-FO7fBd5btjixNn1B7EGjNUVy4"}
                            alt="Logo"
                            className="w-12 h-12 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-[14px] font-black tracking-tight text-slate-900 uppercase">PROJETO CERTO</h2>
                          <p className="text-[8.5px] text-slate-650 leading-snug mt-1 max-w-md font-semibold">
                            Setor SGCV - BLOCO 65/8 LOTE 03 LOJA 04 VILA DA PAPER HOUSE - Zona Industrial (Guará) - Brasília - DF - CEP: 71215-100
                          </p>
                          <p className="text-[8.5px] text-slate-600 font-medium leading-normal mt-0.5">
                            PROJETO CERTO SOLUCOES INTELIGENTES EIRELI
                          </p>
                          <p className="text-[8px] text-slate-500 font-mono mt-0.5">
                            CNPJ: 14.938.262/0001-06 &nbsp; IE: 0759696400159
                          </p>
                        </div>
                      </div>

                      {/* Right: Vendor Contacts */}
                      <div className="md:col-span-4 text-left md:text-right flex flex-col md:items-end justify-center">
                        <span className="text-xs font-black text-slate-900 tracking-tight font-mono mb-0.5">(61) 3346-7565</span>
                        <span className="text-[9px] font-bold text-slate-650 hover:underline">comercial@projetocerto.com.br</span>
                      </div>
                    </div>

                    {/* Double-line divider */}
                    <div className="border-b-2 border-slate-900 my-1 pb-1" />

                    {/* Client Info & Validity Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-slate-300 rounded-lg overflow-hidden mt-3 text-[10px]">
                      {/* Customer Details Segment */}
                      <div className="md:col-span-3 p-4 border-r border-slate-300 bg-white leading-relaxed flex flex-col justify-between">
                        <div>
                          <h3 className="font-extrabold text-slate-950 uppercase text-[11px] mb-1">{docClientName}</h3>
                          {docClientCnpj && (
                            <p className="text-slate-500 font-mono text-[9px]">CNPJ: {docClientCnpj}</p>
                          )}
                          {docClientAddress && (
                            <p className="text-slate-600 mt-1 font-semibold text-[9.5px]">{docClientAddress}</p>
                          )}
                        </div>
                        {docClientEmail && (
                          <p className="text-slate-600 hover:underline mt-1.5 font-mono font-bold text-[9px]">{docClientEmail}</p>
                        )}
                      </div>

                      {/* Proposal Validity Group */}
                      <div className="bg-slate-50/50 p-4 flex flex-col justify-center items-start md:items-center text-left md:text-center shrink-0">
                        <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Validade da proposta</span>
                        <span className="text-[10px] font-black text-slate-850 mt-1.5 bg-white px-2 py-1 border border-slate-200 rounded-md shadow-3xs">{docValidity}</span>
                      </div>
                    </div>

                    {/* Solid horizontal bar wrapper */}
                    <div className="border-t border-slate-300 my-4" />

                    {/* Proposal description scope text area representation */}
                    <div className="py-2.5 px-0.5 text-slate-800 font-semibold text-[9.5px] leading-relaxed uppercase">
                      <p className="whitespace-pre-line">{docScope}</p>
                      {docScopePct && (
                        <p className="mt-1 font-black tracking-widest text-slate-500">{docScopePct}</p>
                      )}
                    </div>

                    {/* Solid horizontal bar wrapper */}
                    <div className="border-t border-slate-300 mb-4" />

                    {/* Materials table listing items dynamically */}
                    <div className="mt-4">
                      <table className="w-full text-left border-collapse text-[10px] font-semibold leading-relaxed">
                        <thead>
                          <tr className="border-b border-t border-slate-300 bg-slate-50/50">
                            <th className="py-1.5 px-2 font-bold text-slate-700 w-12 text-center uppercase tracking-tight">Qt.</th>
                            <th className="py-1.5 px-3 font-bold text-slate-700 uppercase tracking-tight">Produto/Serviço</th>
                            <th className="py-1.5 px-3 font-bold text-slate-750 uppercase tracking-tight">Detalhe do item</th>
                            <th className="py-1.5 px-3 font-bold text-slate-700 text-right uppercase tracking-tight w-28">Valor unitário</th>
                            <th className="py-1.5 px-3 font-bold text-slate-700 text-right uppercase tracking-tight w-28">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-250">
                          {(() => {
                            const chosenItems = project?.itens?.filter(
                              (item) => item.status === "ATIVO" && selectedBudgetItems[item.id] !== false
                            ) || [];

                            if (chosenItems.length > 0) {
                              return chosenItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/20">
                                  <td className="py-3 px-2 text-center text-slate-700">1</td>
                                  <td className="py-3 px-3 font-bold text-slate-900 max-w-xs">{item.descricao}</td>
                                  <td className="py-3 px-3 text-slate-600 italic whitespace-pre-line max-w-xs font-semibold">
                                    {item.observacao || "FORNECIMENTO DE ESTRUTURA/SUBESTRUTURA"}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-850">
                                    {formatBRLNoDecimals(item.valor)}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-950">
                                    {formatBRLNoDecimals(item.valor)}
                                  </td>
                                </tr>
                              ));
                            } else {
                              return (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-slate-400 font-bold uppercase tracking-wider text-[8.5px]">
                                    Nenhum item ativo selecionado para compor este orçamento.
                                  </td>
                                </tr>
                              );
                            }
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Dynamic Totals and net calculation matches layout */}
                    {(() => {
                      const chosenItems = project?.itens?.filter(
                        (item) => item.status === "ATIVO" && selectedBudgetItems[item.id] !== false
                      ) || [];
                      const totBudget = chosenItems.reduce((acc, item) => acc + (item.valor || 0), 0);

                      if (chosenItems.length > 0) {
                        return (
                          <div className="mt-6 flex justify-end">
                            <div className="w-56 border-t border-slate-350 text-[10px] uppercase font-bold tracking-tight">
                              <div className="flex justify-between py-1.5 border-b border-dashed border-slate-205">
                                <span className="text-slate-500">Total</span>
                                <span className="font-mono font-black text-slate-900">{formatBRLNoDecimals(totBudget)}</span>
                              </div>
                              <div className="flex justify-between py-1.5">
                                <span className="text-slate-850">Valor líquido</span>
                                <span className="font-mono font-black text-slate-950 text-xs">{formatBRLNoDecimals(totBudget)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Document Page Footer */}
                  <div className="border-t border-slate-300 pt-3.5 flex justify-between items-center text-[8.5px] text-slate-450 font-bold tracking-widest leading-none mt-12 bg-white">
                    <span className="uppercase">PROJETO CERTO SOLUÇÕES INTELIGENTES</span>
                    <span>Página 1 de 1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
