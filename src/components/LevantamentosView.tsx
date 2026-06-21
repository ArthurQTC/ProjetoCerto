import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Coins,
  Plus,
  Search,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  Trash2,
  Edit,
  SlidersHorizontal,
  X,
  Tag
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useUIStore } from "../store";
import { Levantamento, Material, LevantamentoSubestrutura } from "../types";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function getMonthGroup(dateStr: string) {
  if (!dateStr) return "Outros / Em aberto";
  
  // Try DD/MM/AAAA
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const mIdx = parseInt(parts[1], 10) - 1;
    const year = parts[2];
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_NAMES[mIdx]} ${year}`;
    }
  }
  
  // Try YYYY-MM-DD
  const partsYMD = dateStr.split("-");
  if (partsYMD.length === 3) {
    const mIdx = parseInt(partsYMD[1], 10) - 1;
    const year = partsYMD[0];
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_NAMES[mIdx]} ${year}`;
    }
  }
  
  return "Outros / Em aberto";
}

// Flexible dynamic date input handler allowing free editing, middle insertions/deletions without cursor displacement
const handleDateInputChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (val: string) => void
) => {
  let val = e.target.value;
  
  // Only allow digits and slashes
  val = val.replace(/[^0-9/]/g, "").slice(0, 10);
  
  // Automatically format if they enter 8 digits without slashes, e.g. "01062026" -> "01/06/2026"
  const digits = val.replace(/\D/g, "");
  if (val.length === 8 && !val.includes("/")) {
    val = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }
  
  setter(val);
};

// Validate that the date is 100% complete with DD/MM/AAAA format
function isValidDateFull(dateStr: string): boolean {
  if (!dateStr) return false;
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateStr)) return false;
  
  const parts = dateStr.split("/");
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 2000 || y > 2100) return false;
  
  return true;
}

export default function LevantamentosView() {
  const queryClient = useQueryClient();
  const navigateToProject = useUIStore((state) => state.navigateToProject);

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [filterCliente, setFilterCliente] = useState("");
  const [filterResponsavel, setFilterResponsavel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMaterialId, setFilterMaterialId] = useState("");

  // Modals States
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Levantamento | null>(null);
  const [isMaterialCatalogOpen, setIsMaterialCatalogOpen] = useState(false);
  const [isNewMaterialOpen, setIsNewMaterialOpen] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // Material Form State
  const [materialCodigo, setMaterialCodigo] = useState("");
  const [materialDescricao, setMaterialDescricao] = useState("");

  // Survey Form States
  const [formObra, setFormObra] = useState("");
  const [formCliente, setFormCliente] = useState("");
  const [formDataSolicitacao, setFormDataSolicitacao] = useState("");
  const [formAbc, setFormAbc] = useState("");
  const [formSolicitante, setFormSolicitante] = useState("");
  const [formResponsavel, setFormResponsavel] = useState<"Andrew" | "Mayra">("Mayra");
  const [formStatus, setFormStatus] = useState<"Concluído" | "Em Desenvolvimento" | "Pendente">("Pendente");
  const [formPrevisao, setFormPrevisao] = useState("");
  const [formStatusEnvio, setFormStatusEnvio] = useState<"Enviado" | "Pendente">("Pendente");
  
  // Dynamic list of multiple materials / subestruturas
  const [formSubestruturas, setFormSubestruturas] = useState<{ materialId: string; qtdM2: string; valorUnitario: string }[]>([]);

  // Success Conversion modal state
  const [conversionSuccess, setConversionSuccess] = useState<{
    open: boolean;
    contractId: string;
    ref: string;
    obra: string;
  } | null>(null);

  // Queries
  const { data: levantamentos = [], isLoading: isLevLoading } = useQuery<Levantamento[]>({
    queryKey: ["levantamentos"],
    queryFn: async () => {
      const res = await fetch("/api/levantamentos");
      if (!res.ok) throw new Error("Erro de servidor ao buscar levantamentos");
      return res.json();
    }
  });

  const { data: materiais = [], isLoading: isMatLoading } = useQuery<Material[]>({
    queryKey: ["materiais"],
    queryFn: async () => {
      const res = await fetch("/api/materiais");
      if (!res.ok) throw new Error("Erro ao buscar catálogo de materiais");
      return res.json();
    }
  });

  // Unique month groups available
  const availableMonthGroups = useMemo(() => {
    const months = levantamentos.map(l => getMonthGroup(l.dataSolicitacao));
    const unique = Array.from(new Set(months));
    
    return unique.sort((a, b) => {
      if (a === "Outros / Em aberto") return 1;
      if (b === "Outros / Em aberto") return -1;
      
      const getMonthVal = (groupStr: string) => {
        const parts = groupStr.split(" ");
        if (parts.length !== 2) return 0;
        const mIdx = MONTH_NAMES.indexOf(parts[0]);
        const year = parseInt(parts[1], 10);
        return new Date(year, mIdx === -1 ? 0 : mIdx, 1).getTime();
      };
      
      return getMonthVal(b) - getMonthVal(a); // Descending (Newest months first)
    });
  }, [levantamentos]);

  // Handle active month selection fallback
  const activeMonthGroup = useMemo(() => {
    if (selectedMonth && availableMonthGroups.includes(selectedMonth)) {
      return selectedMonth;
    }
    if (availableMonthGroups.length > 0) {
      return availableMonthGroups[0];
    }
    const d = new Date();
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }, [selectedMonth, availableMonthGroups]);

  const monthGroupsToRender = useMemo(() => {
    if (availableMonthGroups.length > 0) return availableMonthGroups;
    const now = new Date();
    return [`${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`];
  }, [availableMonthGroups]);

  // Set default active month on mount/data received
  if (!selectedMonth && availableMonthGroups.length > 0) {
    setSelectedMonth(availableMonthGroups[0]);
  }

  // Filtered Surveys matching filters AND selected dynamic month group
  const filteredLevantamentos = useMemo(() => {
    return levantamentos.filter(lev => {
      // 1. Month Tab Match
      const levMonthGroup = getMonthGroup(lev.dataSolicitacao);
      if (levMonthGroup !== activeMonthGroup) {
        return false;
      }
      // 2. Client search
      if (filterCliente && !lev.cliente.toLowerCase().includes(filterCliente.toLowerCase()) && !lev.obra.toLowerCase().includes(filterCliente.toLowerCase())) {
        return false;
      }
      // 3. Responsavel
      if (filterResponsavel && lev.responsavel !== filterResponsavel) {
        return false;
      }
      // 4. Status
      if (filterStatus && lev.status !== filterStatus) {
        return false;
      }
      // 5. Material Filter (matches any in the subestruturas array)
      if (filterMaterialId) {
        const hasMatObj = lev.subestruturas?.some(sub => sub.materialId === filterMaterialId);
        const legacyMatMatch = lev.materialId === filterMaterialId;
        if (!hasMatObj && !legacyMatMatch) return false;
      }
      return true;
    });
  }, [levantamentos, activeMonthGroup, filterCliente, filterResponsavel, filterStatus, filterMaterialId]);

  // Total metros quadrados dynamic KPI summation
  const totalMetrosQuadrados = useMemo(() => {
    return filteredLevantamentos.reduce((acc, current) => {
      const subs = current.subestruturas || [];
      if (subs.length > 0) {
        return acc + subs.reduce((itemSum, s) => itemSum + (Number(s.qtdM2) || 0), 0);
      }
      return acc + (Number(current.qtdM2) || 0);
    }, 0);
  }, [filteredLevantamentos]);

  // Total monetário valor calculated as summation of (qtd * unit price) for filtered subset
  const totalValueSum = useMemo(() => {
    return filteredLevantamentos.reduce((acc, current) => {
      const subs = current.subestruturas || [];
      if (subs.length > 0) {
        return acc + subs.reduce((itemSum, s) => itemSum + ((Number(s.qtdM2) || 0) * (Number(s.valorUnitario) || 0)), 0);
      }
      return acc; // legacy items don't have valorUnitario (default to 0.00)
    }, 0);
  }, [filteredLevantamentos]);

  // Active items list derived
  const currentActiveMaterials = useMemo(() => {
    return materiais.filter(m => m.ativo);
  }, [materiais]);

  // Reset filter criteria fields
  const clearFilters = () => {
    setFilterCliente("");
    setFilterResponsavel("");
    setFilterStatus("");
    setFilterMaterialId("");
  };

  // Safe helper to obtain sum value for a single row
  const getLevantamentoTotalVal = (lev: Levantamento): number => {
    const subs = lev.subestruturas || [];
    if (subs.length > 0) {
      return subs.reduce((sum, s) => sum + ((Number(s.qtdM2) || 0) * (Number(s.valorUnitario) || 0)), 0);
    }
    return 0;
  };

  // --- MUTATIONS ---
  
  // Create / Edit Survey
  const saveSurveyMutation = useMutation({
    mutationFn: async (payload: Partial<Levantamento>) => {
      const url = editingSurvey ? `/api/levantamentos/${editingSurvey.id}` : "/api/levantamentos";
      const method = editingSurvey ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro de servidor ao salvar levantamento");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levantamentos"] });
      setIsSurveyModalOpen(false);
      setEditingSurvey(null);
    },
    onError: (err: any) => {
      alert("Falha ao salvar registro: " + err.message);
    }
  });

  // Delete Survey
  const deleteSurveyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/levantamentos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro de servidor ao excluir registro");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["levantamentos"] });
    },
    onError: (err: any) => {
      alert("Falha ao excluir registro: " + err.message);
    }
  });

  // Convert to Orçamento a Fechar
  const convertToContractMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/levantamentos/${id}/enviar-contrato`, { method: "POST" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro de servidor ao converter para Orçamento a Fechar");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["levantamentos"] });
      queryClient.invalidateQueries({ queryKey: ["obras"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      const original = levantamentos.find(l => l.id === variables);
      if (original) {
        setConversionSuccess({
          open: true,
          contractId: data.contratoAFecharId,
          ref: original.ref,
          obra: original.obra
        });
      }
    },
    onError: (err: any) => {
      alert("Erro ao enviar: " + err.message);
    }
  });

  // Create Material
  const createMaterialMutation = useMutation({
    mutationFn: async (payload: Partial<Material>) => {
      const res = await fetch("/api/materiais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Código duplicado ou inválido.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
      setMaterialCodigo("");
      setMaterialDescricao("");
      setIsNewMaterialOpen(false);
    },
    onError: (err: any) => {
      alert("Erro ao criar material: " + err.message);
    }
  });

  // Toggle/Rename Material
  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Material> }) => {
      const res = await fetch(`/api/materiais/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Erro ao atualizar material");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
    }
  });

  // Delete Material
  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/materiais/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Não foi possível excluir");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais"] });
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  // Setup modal for adding
  const handleOpenAddSurveyModal = () => {
    setEditingSurvey(null);
    setFormObra("");
    setFormCliente("");
    
    // Default today formatted as DD/MM/AAAA
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    setFormDataSolicitacao(`${dd}/${mm}/${yyyy}`);
    
    setFormAbc("C");
    setFormSolicitante("");
    setFormResponsavel("Mayra");
    setFormStatus("Pendente");
    setFormPrevisao("");
    setFormStatusEnvio("Pendente");
    
    // Default with one empty subestrutura row
    setFormSubestruturas([
      { materialId: currentActiveMaterials[0]?.id || "", qtdM2: "", valorUnitario: "" }
    ]);
    
    setIsSurveyModalOpen(true);
  };

  // Setup modal for editing
  const handleOpenEditSurveyModal = (survey: Levantamento) => {
    setEditingSurvey(survey);
    setFormObra(survey.obra);
    setFormCliente(survey.cliente || "");
    setFormDataSolicitacao(survey.dataSolicitacao);
    setFormAbc(survey.abc || "");
    setFormSolicitante(survey.solicitante || "");
    setFormResponsavel(survey.responsavel);
    setFormStatus(survey.status);
    setFormPrevisao(survey.previsao || "");
    setFormStatusEnvio(survey.statusEnvio);
    
    if (survey.subestruturas && survey.subestruturas.length > 0) {
      setFormSubestruturas(survey.subestruturas.map(s => ({
        materialId: s.materialId,
        qtdM2: String(s.qtdM2),
        valorUnitario: String(s.valorUnitario || "0")
      })));
    } else {
      // Fallback
      setFormSubestruturas([
        { materialId: survey.materialId || "", qtdM2: String(survey.qtdM2 || ""), valorUnitario: "0" }
      ]);
    }
    
    setIsSurveyModalOpen(true);
  };

  const handleSubmitSurveyForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formObra || !formDataSolicitacao) {
      alert("Preencha todos os campos obrigatórios marcados com *");
      return;
    }

    // Validate that dates are fully typed DD/MM/AAAA
    if (!isValidDateFull(formDataSolicitacao)) {
      alert("Por favor, preencha a Data de Solicitação completa no formato DD/MM/AAAA (ex: 02/02/2026).");
      return;
    }

    if (formPrevisao && !isValidDateFull(formPrevisao)) {
      alert("Por favor, preencha a Data de Previsão completa no formato DD/MM/AAAA (ex: 05/02/2026).");
      return;
    }

    // Subestruturas check
    if (formSubestruturas.length === 0) {
      alert("Adicione pelo menos uma subestrutura ao levantamento.");
      return;
    }

    // Validate entries
    for (let i = 0; i < formSubestruturas.length; i++) {
      const item = formSubestruturas[i];
      if (!item.materialId) {
        alert("Selecione a Subestrutura em todos os campos cadastrados.");
        return;
      }
    }

    // Format subestruturas payload
    const processedSubs = formSubestruturas.map(item => {
      const rawQty = item.qtdM2 ? String(item.qtdM2).trim().replace(",", ".") : "";
      const rawVal = item.valorUnitario ? String(item.valorUnitario).trim().replace(",", ".") : "";
      const q = rawQty ? parseFloat(rawQty) : 0;
      const v = rawVal ? parseFloat(rawVal) : 0;
      return {
        materialId: item.materialId,
        qtdM2: isNaN(q) ? 0 : q,
        valorUnitario: isNaN(v) ? 0 : v
      };
    });

    const payload: Partial<Levantamento> = {
      obra: formObra,
      cliente: formCliente,
      dataSolicitacao: formDataSolicitacao,
      abc: formAbc,
      solicitante: formSolicitante,
      responsavel: formResponsavel,
      status: formStatus,
      previsao: formPrevisao,
      subestruturas: processedSubs,
      statusEnvio: formStatusEnvio
    };

    saveSurveyMutation.mutate(payload);
  };

  const handleCreateNewMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialCodigo || !materialDescricao) {
      alert("Código e Descrição são obrigatórios.");
      return;
    }
    createMaterialMutation.mutate({
      codigo: materialCodigo,
      descricao: materialDescricao,
      ativo: true
    });
  };

  return (
    <div className="space-y-6" id="levantamentos_view_container">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-brand-text-primary tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-[#D9A441]" />
            Módulo de Levantamentos & Orçamentos
          </h1>
          <p className="text-xs text-brand-text-secondary mt-1">
            Planeje, cadastre estimativas físicas de obras e envie os dados para a carteira de orçamentos a fechar com um só clique.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setIsMaterialCatalogOpen(true)}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 inline-flex items-center gap-2 transition-colors cursor-pointer"
            id="btn_abrir_materiais"
          >
            <Tag className="w-4 h-4 text-slate-500" />
            Catálogo de Materiais
          </button>
          <button
            onClick={handleOpenAddSurveyModal}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 transition-colors cursor-pointer shadow-sm hover:shadow"
            id="btn_novo_levantamento"
          >
            <Plus className="w-4 h-4 text-brand-accent shrink-0" />
            Novo Levantamento
          </button>
        </div>
      </div>

      {/* MONTH BAR NAVIGATION */}
      <div className="bg-white p-2 rounded-2xl border border-slate-100 flex items-center gap-1 overflow-x-auto shadow-sm min-h-[56px]">
        <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase ml-3 mr-2 font-sans hidden sm:inline">Mês:</span>
        <div className="flex gap-1">
          {monthGroupsToRender.map((month) => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                activeMonthGroup === month
                  ? "bg-brand-primary text-white shadow-sm border border-brand-primary"
                  : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
              }`}
            >
              {month}
            </button>
          ))}
        </div>
      </div>

      {/* UPPER KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
          id="kpi_total_metros"
        >
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">Total metros e valores</span>
            <div className="text-3xl font-black text-brand-primary tracking-tight font-sans">
              {totalMetrosQuadrados.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
            </div>
            <p className="text-sm font-extrabold text-slate-800 font-mono">
              Valor Total Estimado: R$ {totalValueSum.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-12 h-12 bg-[#D9A441]/10 rounded-full flex items-center justify-center">
            <Layers className="w-5 h-5 text-[#D9A441]" />
          </div>
        </motion.div>

        {/* Dynamic Count of States */}
        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1 w-full">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">Status do Mês</span>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5" />
                Concluído: {filteredLevantamentos.filter(l => l.status === "Concluído").length}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg font-sans">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                Em Desenvolvimento: {filteredLevantamentos.filter(l => l.status === "Em Desenvolvimento").length}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-slate-50 text-slate-600 border border-slate-100 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5" />
                Pendente: {filteredLevantamentos.filter(l => l.status === "Pendente").length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            Filtros Ativos ({activeMonthGroup})
          </h3>
          {(filterCliente || filterResponsavel || filterStatus || filterMaterialId) && (
            <button
              onClick={clearFilters}
              className="text-[10px] font-bold text-brand-danger hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Cliente search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-300 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por obra ou cliente..."
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-brand-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          {/* Responsavel select */}
          <select
            value={filterResponsavel}
            onChange={(e) => setFilterResponsavel(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-brand-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="">Responsável (Todos)</option>
            <option value="Andrew">Andrew</option>
            <option value="Mayra">Mayra</option>
          </select>

          {/* Status select */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-brand-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="">Status (Todos)</option>
            <option value="Concluído">Concluído</option>
            <option value="Em Desenvolvimento">Em Desenvolvimento</option>
            <option value="Pendente">Pendente</option>
          </select>

          {/* Material Select */}
          <select
            value={filterMaterialId}
            onChange={(e) => setFilterMaterialId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-brand-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            <option value="">Subestrutura (Todos)</option>
            {materiais.map(mat => (
              <option key={mat.id} value={mat.id}>
                [{mat.codigo}] {mat.descricao}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SPREADSHEET TABLE GRID CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLevLoading ? (
          <div className="p-12 text-center text-xs text-brand-text-secondary font-mono">
            Buscando dados no Postgres da AWS RDS...
          </div>
        ) : filteredLevantamentos.length === 0 ? (
          <div className="p-14 text-center space-y-3">
            <Layers className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Nenhum registro encontrado</h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Não há levantamentos cadastrados para o mês de <strong className="text-slate-600 font-bold">{activeMonthGroup}</strong> com os filtros ativos. Clique em "Novo Levantamento" para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto animate-show">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-100">
                  <th className="py-3 px-4 w-16">REF</th>
                  <th className="py-3 px-4">OBRA</th>
                  <th className="py-3 px-4">CLIENTE</th>
                  <th className="py-3 px-4">DATA DE SOLICITAÇÃO</th>
                  <th className="py-3 px-4 text-center w-12">ABC</th>
                  <th className="py-3 px-4">SOLICITANTE</th>
                  <th className="py-3 px-4">RESPONSÁVEL</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                  <th className="py-3 px-4">PREVISÃO</th>
                  <th className="py-3 px-4">MATERIAL</th>
                  <th className="py-3 px-4 text-right">QTD m²</th>
                  <th className="py-3 px-4 text-right">VALOR</th>
                  <th className="py-3 px-4 text-center">STATUS DE ENVIO</th>
                  <th className="py-3 px-4 text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLevantamentos.map((lev) => {
                  const totalVal = getLevantamentoTotalVal(lev);
                  const subList = lev.subestruturas && lev.subestruturas.length > 0
                    ? lev.subestruturas
                    : [{ materialId: lev.materialId, material: lev.material, qtdM2: lev.qtdM2 || 0, valorUnitario: 0 }];

                  return (
                    <tr key={lev.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-extrabold text-brand-primary">
                        {lev.ref}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {lev.obra}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {lev.cliente || <span className="text-slate-300 italic">-</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium font-mono">
                        {lev.dataSolicitacao}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                          lev.abc === "A" ? "bg-red-50 text-red-600 border border-red-100" :
                          lev.abc === "B" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                          "bg-green-50 text-green-600 border border-green-100"
                        }`}>
                          {lev.abc || "C"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {lev.solicitante || <span className="text-slate-300 italic">-</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-bold whitespace-nowrap">
                        {lev.responsavel}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          lev.status === "Concluído" ? "bg-brand-success/10 text-brand-success border border-brand-success/20" :
                          lev.status === "Em Desenvolvimento" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                          "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {lev.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium font-mono whitespace-nowrap">
                        {lev.previsao || <span className="text-slate-300 italic">-</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px]">
                        <div className="space-y-1.5">
                          {subList.map((sub, sIdx) => (
                            <div key={sIdx} className="leading-tight flex items-center gap-1">
                              <span className="font-bold text-slate-800 font-mono text-[9px] bg-slate-100 border border-slate-200 rounded px-1 py-0.2 shrink-0">
                                {sub.material?.codigo || "MAT"}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate" title={sub.material?.descricao}>
                                {sub.material?.descricao || "Produto"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800 font-mono">
                        <div className="space-y-1.5">
                          {subList.map((sub, sIdx) => (
                            <div key={sIdx} className="text-[11px]">
                              {(Number(sub.qtdM2) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                        <div className="text-[11px] font-mono leading-tight">
                          R$ {totalVal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {subList.length > 1 && (
                          <span className="text-[9px] font-medium text-slate-400 block pt-0.5 leading-none">
                            ({subList.length} itens)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {lev.contratoAFecharId ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border border-green-250 text-[10px] font-bold uppercase rounded-lg">
                            Enviado
                          </span>
                        ) : (
                          <button
                            onClick={() => convertToContractMutation.mutate(lev.id)}
                            disabled={convertToContractMutation.isPending}
                            className="p-1 px-3 bg-[#D9A441]/10 hover:bg-[#D9A441]/20 text-[#D9A441] hover:text-[#b38025] rounded-xl border border-transparent inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all disabled:opacity-40"
                            title="Gerar Orçamento a Fechar automático"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {lev.contratoAFecharId && (
                            <button
                              onClick={() => {
                                if (lev.contratoAFecharId) navigateToProject(lev.contratoAFecharId);
                              }}
                              className="p-1 px-1.5 bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary border border-brand-primary/10 rounded-xl font-bold cursor-pointer transition-colors"
                              title="Ver Orçamento Gerado"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditSurveyModal(lev)}
                            className="p-1 px-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 cursor-pointer transition-all"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmationId(lev.id)}
                            className="p-1 px-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-100 cursor-pointer transition-all"
                            title="Apagar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL: SURVEY CREATION OR UPDATE FORM */}
      <AnimatePresence>
        {isSurveyModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-xl shadow-xl border border-slate-100 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                  {editingSurvey ? `Editar Levantamento ${editingSurvey.ref}` : "Criar Novo Levantamento"}
                </h3>
                <button
                  onClick={() => setIsSurveyModalOpen(false)}
                  className="p-1 bg-white hover:bg-slate-100 rounded-xl text-slate-400 border border-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitSurveyForm} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  {/* Obra (Required) */}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider pb-1">Nome do Projeto/Obra *</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      value={formObra}
                      onChange={(e) => setFormObra(e.target.value)}
                      placeholder="Ex: Sport Club Itaquera"
                      required
                    />
                  </div>

                  {/* Cliente (Optional) */}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider pb-1">Cliente</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      value={formCliente}
                      onChange={(e) => setFormCliente(e.target.value)}
                      placeholder="Ex: Controlar Eng (Opcional)"
                    />
                  </div>

                  {/* Data Solicitacao (Mask) */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider pb-1">Data de Solicitação *</label>
                    <input
                      type="text"
                      maxLength={10}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                      value={formDataSolicitacao}
                      onChange={(e) => handleDateInputChange(e, setFormDataSolicitacao)}
                      placeholder="DD/MM/AAAA"
                      required
                    />
                  </div>

                  {/* Previsao Data (Mask) */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider pb-1">Previsão de Envio</label>
                    <input
                      type="text"
                      maxLength={10}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                      value={formPrevisao}
                      onChange={(e) => handleDateInputChange(e, setFormPrevisao)}
                      placeholder="DD/MM/AAAA"
                    />
                  </div>

                  {/* Dynamic Subestruturas Editor */}
                  <div className="col-span-2 border-t border-slate-100 pt-3">
                    <div className="flex justify-between items-center pb-2 flex-wrap gap-1">
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Subestruturas *</label>
                      <button
                        type="button"
                        onClick={() => setFormSubestruturas([...formSubestruturas, { materialId: currentActiveMaterials[0]?.id || "", qtdM2: "", valorUnitario: "" }])}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[9px] font-extrabold uppercase rounded-lg border border-slate-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-[#D9A441]" /> Adicionar Subestrutura
                      </button>
                    </div>

                    <div className="space-y-2 pr-0.5">
                      {formSubestruturas.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-slate-50/50 p-2 border border-slate-200/60 rounded-xl relative">
                          <div className="flex-1 min-w-[120px]">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase pb-0.5">Subestrutura</label>
                            <select
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold focus:ring-1 focus:ring-brand-primary"
                              value={item.materialId}
                              onChange={(e) => {
                                const copy = [...formSubestruturas];
                                copy[idx].materialId = e.target.value;
                                setFormSubestruturas(copy);
                              }}
                            >
                              <option value="">Selecione...</option>
                              {currentActiveMaterials.map(mat => (
                                <option key={mat.id} value={mat.id}>
                                  [{mat.codigo}] - {mat.descricao}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-20">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase pb-0.5">Qtd (m²)</label>
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-right font-mono"
                              value={item.qtdM2}
                              placeholder="0,00"
                              onChange={(e) => {
                                const copy = [...formSubestruturas];
                                copy[idx].qtdM2 = e.target.value;
                                setFormSubestruturas(copy);
                              }}
                            />
                          </div>

                          <div className="w-24">
                            <label className="block text-[8px] font-bold text-slate-400 uppercase pb-0.5">Valor Unit. (R$)</label>
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-right font-mono"
                              value={item.valorUnitario}
                              placeholder="0,00"
                              onChange={(e) => {
                                const copy = [...formSubestruturas];
                                copy[idx].valorUnitario = e.target.value;
                                setFormSubestruturas(copy);
                              }}
                            />
                          </div>

                          {formSubestruturas.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setFormSubestruturas(formSubestruturas.filter((_, i) => i !== idx))}
                              className="p-1 px-1.5 bg-white hover:bg-red-50 text-red-500 rounded-lg border border-slate-200 text-xs font-bold transition-colors cursor-pointer self-end mb-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ABC code */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider pb-1">Curva ABC</label>
                    <input
                      type="text"
                      maxLength={5}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      value={formAbc}
                      onChange={(e) => setFormAbc(e.target.value)}
                      placeholder="C"
                    />
                  </div>

                  {/* Solicitante */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider pb-1">Solicitante</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      value={formSolicitante}
                      onChange={(e) => setFormSolicitante(e.target.value)}
                      placeholder="Ex: Reginaldo (Opcional)"
                    />
                  </div>

                  {/* Responsavel */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider pb-1">Responsável *</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      value={formResponsavel}
                      onChange={(e) => setFormResponsavel(e.target.value as any)}
                      required
                    >
                      <option value="Mayra">Mayra</option>
                      <option value="Andrew">Andrew</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider pb-1">Status *</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      required
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em Desenvolvimento">Em Desenvolvimento</option>
                      <option value="Concluído">Concluído</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsSurveyModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saveSurveyMutation.isPending}
                    className="px-5 py-2 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {saveSurveyMutation.isPending ? "Salvando..." : "Gravar Dados"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: MATERIALS CATALOG MANAGEMENT DRAWER */}
      <AnimatePresence>
        {isMaterialCatalogOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Material catalog header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-brand-primary" />
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Catálogo de Materiais</h3>
                </div>
                <button
                  onClick={() => {
                    setIsMaterialCatalogOpen(false);
                    setIsNewMaterialOpen(false);
                  }}
                  className="p-1 bg-white hover:bg-slate-100 rounded-xl text-slate-400 border border-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Material catalog layout content */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {!isNewMaterialOpen ? (
                  <button
                    onClick={() => setIsNewMaterialOpen(true)}
                    className="w-full py-2 bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary text-xs font-black border border-brand-primary/10 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Novo Material ao Catálogo
                  </button>
                ) : (
                  <form onSubmit={handleCreateNewMaterial} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3.5">
                    <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Cadastrar Novo Produto</h4>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase font-mono">Código do Material *</label>
                      <input
                        type="text"
                        placeholder="Ex: C40 / Brise-01"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono uppercase"
                        value={materialCodigo}
                        onChange={(e) => setMaterialCodigo(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase font-mono">Descrição / Detalhes *</label>
                      <input
                        type="text"
                        placeholder="Ex: Concreto C40 de alto teor"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        value={materialDescricao}
                        onChange={(e) => setMaterialDescricao(e.target.value)}
                        required
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setIsNewMaterialOpen(false)}
                        className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={createMaterialMutation.isPending}
                        className="px-4 py-1 bg-brand-primary text-white rounded-lg font-bold hover:bg-brand-secondary disabled:opacity-50"
                      >
                        Salvar
                      </button>
                    </div>
                  </form>
                )}

                {/* Materials List */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Lista de Materiais</h4>
                  
                  {isMatLoading ? (
                    <div className="text-center font-mono text-slate-300 text-[11px] py-4">Buscando banco...</div>
                  ) : materiais.length === 0 ? (
                    <div className="text-center text-slate-400 text-xs py-10">Nenhum material cadastrado.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                      {materiais.map((mat) => (
                        <div key={mat.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="space-y-0.5 animate-show">
                            <span className="text-[10px] font-bold text-brand-primary font-mono bg-[#D9A441]/5 border border-[#D9A441]/10 px-1.5 py-0.5 rounded">
                              {mat.codigo}
                            </span>
                            <div className="text-xs font-bold text-slate-700 font-sans pt-1 leading-tight">{mat.descricao}</div>
                            <div className="text-[10px] text-slate-400 italic">
                              Status: {mat.ativo ? "Ativo no sistema" : "Desativado"}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                             <button
                               onClick={() => {
                                 updateMaterialMutation.mutate({
                                   id: mat.id,
                                   payload: { ativo: !mat.ativo }
                                 });
                               }}
                               className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border cursor-pointer ${
                                 mat.ativo
                                   ? "bg-green-50 text-green-700 border-green-100 hover:bg-green-100"
                                   : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                               }`}
                               title={mat.ativo ? "Clique para inativar" : "Clique para ativar"}
                             >
                               {mat.ativo ? "Ativo" : "Inativo"}
                             </button>
                             <button
                               onClick={() => {
                                 if (confirm(`Deseja mesmo remover "${mat.codigo}" do catálogo?`)) {
                                   deleteMaterialMutation.mutate(mat.id);
                                 }
                               }}
                               className="p-1 hover:bg-red-50 text-red-500 rounded border border-transparent hover:border-red-100 cursor-pointer"
                               title="Remover"
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 text-[10px] font-medium text-slate-400 text-center">
                Estes materiais estão vinculados à base de dados relacional e podem ser utilizados para novos levantamentos.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SUCCESS ORÇAMENTO NOTIFIER */}
      <AnimatePresence>
        {conversionSuccess && conversionSuccess.open && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden text-center relative p-8 space-y-6"
            >
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto border border-green-100">
                <CheckCircle className="w-8 h-8 text-green-600 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-brand-primary tracking-tight">
                  Levantamento Convertido!
                </h3>
                <p className="text-xs text-brand-text-secondary leading-relaxed">
                  O levantamento <strong className="text-slate-800 font-bold">{conversionSuccess.ref}</strong> foi integrado com êxito à carteira de orçamentos da empresa.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-left text-xs space-y-2 leading-relaxed">
                <div>
                  <strong className="text-slate-400 uppercase text-[9px] font-mono tracking-wider">Origem:</strong>
                  <div className="font-bold text-slate-700">{conversionSuccess.ref} - {conversionSuccess.obra}</div>
                </div>
                <div className="border-t border-slate-100/60 pt-2">
                  <strong className="text-slate-400 uppercase text-[9px] font-mono tracking-wider">Novo Registro Criado:</strong>
                  <div className="text-brand-success font-black">Orçamento a Fechar</div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    const cid = conversionSuccess.contractId;
                    setConversionSuccess(null);
                    navigateToProject(cid);
                  }}
                  className="w-full py-3 bg-brand-primary text-white text-xs font-extrabold rounded-xl shadow hover:bg-brand-secondary transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4 text-brand-accent shrink-0 animate-pulse" />
                  <span>Ir para Orçamento a Fechar</span>
                </button>
                <button
                  onClick={() => setConversionSuccess(null)}
                  className="w-full py-3 bg-slate-50 text-slate-500 border border-slate-100 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Continuar em Levantamentos
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DELETE CONFIRMATION */}
      <AnimatePresence>
        {deleteConfirmationId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-100 overflow-hidden p-6 space-y-4"
            >
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                Excluir Levantamento
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Tem certeza que deseja excluir este levantamento?
              </p>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmationId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  onClick={() => {
                    deleteSurveyMutation.mutate(deleteConfirmationId);
                    setDeleteConfirmationId(null);
                  }}
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
