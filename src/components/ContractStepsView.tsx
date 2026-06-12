import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "../store";
import { DashboardStats, ProjetoSummary } from "../types";
import {
  Search,
  Calendar,
  Hash,
  ArrowRight,
  TrendingUp,
  FolderOpen,
  CheckCircle,
  HelpCircle,
  Clock,
  Settings,
  Filter
} from "lucide-react";

export default function ContractStepsView() {
  const queryClient = useQueryClient();
  const navigateToProject = useUIStore((state) => state.navigateToProject);
  const selectedProjectId = useUIStore((state) => state.selectedProjectId);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONSOLIDADO" | "A_FECHAR">("ALL");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Fetch all projects stats data
  const { data, isLoading, isError, refetch } = useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Erro ao buscar estatísticas do painel");
      return res.json();
    },
  });

  // Keep a local draft state for inputs (prazo & numeroPedido & observacoes) so typing is instant & debounced or saved on blur
  const [localDrafts, setLocalDrafts] = useState<Record<string, { prazo: string; numeroPedido: string; observacoes: string }>>({});

  const projects: ProjetoSummary[] = data?.projetos || data?.obras || [];

  // Refs to always access the latest drafts and projects in unmount cleanup
  const draftsRef = useRef(localDrafts);
  const projectsRef = useRef(projects);
  
  useEffect(() => {
    draftsRef.current = localDrafts;
  }, [localDrafts]);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Populate draft inputs from fetched projects on load/update
  useEffect(() => {
    if (projects.length > 0) {
      const drafts: Record<string, { prazo: string; numeroPedido: string; observacoes: string }> = {};
      projects.forEach((p) => {
        drafts[p.id] = {
          prazo: p.prazo || "",
          numeroPedido: p.numeroPedido || "",
          observacoes: p.observacoes || "",
        };
      });
      setLocalDrafts((prev) => ({ ...drafts, ...prev }));
    }
  }, [JSON.stringify(projects)]);

  // Handle auto-save on unmount (e.g. navigating via sidebar menu tabs)
  useEffect(() => {
    return () => {
      const drafts = draftsRef.current;
      const originalProjects = projectsRef.current;
      if (!originalProjects || originalProjects.length === 0) return;

      originalProjects.forEach((p) => {
        const draft = drafts[p.id];
        if (!draft) return;

        const payload: Partial<ProjetoSummary> = {};
        let changed = false;

        const originalPrazo = p.prazo || "";
        if (originalPrazo !== draft.prazo) {
          payload.prazo = draft.prazo;
          changed = true;
        }

        const originalPedido = p.numeroPedido || "";
        if (originalPedido !== draft.numeroPedido) {
          payload.numeroPedido = draft.numeroPedido;
          changed = true;
        }

        const originalObs = p.observacoes || "";
        if (originalObs !== draft.observacoes) {
          payload.observacoes = draft.observacoes;
          changed = true;
        }

        if (changed) {
          fetch(`/api/projetos/${p.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).catch((err) => {
            console.error("Erro ao salvar rascunho no unmount:", err);
          });
        }
      });
    };
  }, []);

  const handleRedirect = async (projectId: string) => {
    const draft = localDrafts[projectId];
    const p = projects.find((x) => x.id === projectId);
    if (draft && p) {
      const payload: Partial<ProjetoSummary> = {};
      let changed = false;

      const originalPrazo = p.prazo || "";
      if (originalPrazo !== draft.prazo) {
        payload.prazo = draft.prazo;
        changed = true;
      }

      const originalPedido = p.numeroPedido || "";
      if (originalPedido !== draft.numeroPedido) {
        payload.numeroPedido = draft.numeroPedido;
        changed = true;
      }

      const originalObs = p.observacoes || "";
      if (originalObs !== draft.observacoes) {
        payload.observacoes = draft.observacoes;
        changed = true;
      }

      if (changed) {
        try {
          await fetch(`/api/projetos/${projectId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
          queryClient.invalidateQueries({ queryKey: ["projectDetail", projectId] });
        } catch (e) {
          console.error("Erro ao salvar rascunho de redirecionamento:", e);
        }
      }
    }
    navigateToProject(projectId);
  };

  // Mutation to update contract step metadata on the server
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ProjetoSummary> }) => {
      setSaveStatus("saving");
      setSavingId(id);
      const res = await fetch(`/api/projetos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Erro ao atualizar etapas do contrato");
      }
      return res.json();
    },
    onSuccess: (updatedContract) => {
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["projectDetail", updatedContract.id] });
      setTimeout(() => {
        setSaveStatus("idle");
        setSavingId(null);
      }, 1000);
    },
    onError: (err: any) => {
      alert("Erro ao salvar: " + err.message);
      setSaveStatus("idle");
      setSavingId(null);
    }
  });

  const handleToggleStepIndex = (project: ProjetoSummary, stepIndex: 1 | 2 | 3) => {
    let payload;
    if (stepIndex === 1 && project.etapaProjeto && !project.etapaCotacao && !project.etapaFabricacao) {
      payload = {
        etapaProjeto: false,
        etapaCotacao: false,
        etapaFabricacao: false,
      };
    } else {
      payload = {
        etapaProjeto: stepIndex >= 1,
        etapaCotacao: stepIndex >= 2,
        etapaFabricacao: stepIndex >= 3,
      };
    }
    updateProjectMutation.mutate({
      id: project.id,
      payload,
    });
  };

  const handleDraftChange = (projectId: string, field: "prazo" | "numeroPedido" | "observacoes", value: string) => {
    setLocalDrafts((prev) => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [field]: value,
      },
    }));
  };

  const handleSaveField = (projectId: string, field: "prazo" | "numeroPedido" | "observacoes", value: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    
    // Only save if the value actually changed
    const originalValue = field === "prazo" 
      ? (project.prazo || "") 
      : field === "numeroPedido" 
        ? (project.numeroPedido || "") 
        : (project.observacoes || "");
        
    if (originalValue === value) return;

    updateProjectMutation.mutate({
      id: projectId,
      payload: { [field]: value },
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-20">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-brand-accent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest animate-pulse">Carregando Etapas dos Contratos...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center max-w-lg mx-auto my-12">
        <p className="text-sm font-extrabold text-brand-error uppercase tracking-wider">Falha ao Carregar Contratos</p>
        <p className="text-xs text-brand-text-secondary mt-1 font-semibold">Não foi possível carregar as informações das etapas a partir do servidor.</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:bg-brand-secondary transition-colors">Tentar Novamente</button>
      </div>
    );
  }

  // Filter projects based on query parameters
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.cliente && p.cliente.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "ALL" || p.statusContrato === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-brand-text-primary flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-brand-accent animate-pulse" />
            Etapas do Contrato
          </h1>
          <p className="text-xs text-brand-text-secondary mt-1 font-semibold">
            Painel dos marcos do contrato – controle de Projeto, Cotação, Instalação, Prazos e N° Pedidos.
          </p>
        </div>
        
        {/* Activity indicator bar global */}
        {saveStatus !== "idle" && (
          <div className="flex items-center gap-2 bg-brand-primary/5 border border-brand-primary/10 rounded-xl px-3 py-1.5 self-start md:self-auto">
            <div className={`w-2 h-2 rounded-full ${saveStatus === "saving" ? "bg-amber-500 animate-ping" : "bg-green-500"}`} />
            <span className="text-[10px] font-extrabold font-mono text-brand-text-primary uppercase tracking-wider">
              {saveStatus === "saving" ? "Salvando Alterações..." : "Modificações Salvas!"}
            </span>
          </div>
        )}
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-center gap-3.5 bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por contrato ou cliente..."
            className="w-full text-xs font-semibold py-2 pl-9 pr-4 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors bg-slate-50/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="steps_search"
          />
        </div>
        
        {/* Status filtering segment */}
        <div className="flex items-center gap-1 bg-slate-100/60 p-1 rounded-lg w-full md:w-auto shrink-0 justify-around">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
              statusFilter === "ALL" ? "bg-white text-brand-primary shadow-xs" : "text-brand-text-secondary hover:text-brand-primary"
            }`}
          >
            Todos ({projects.length})
          </button>
          <button
            onClick={() => setStatusFilter("CONSOLIDADO")}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
              statusFilter === "CONSOLIDADO" ? "bg-white text-brand-primary shadow-xs" : "text-brand-text-secondary hover:text-brand-primary"
            }`}
          >
            Consolidados ({projects.filter((p) => p.statusContrato === "CONSOLIDADO").length})
          </button>
          <button
            onClick={() => setStatusFilter("A_FECHAR")}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
              statusFilter === "A_FECHAR" ? "bg-white text-brand-primary shadow-xs" : "text-brand-text-secondary hover:text-brand-primary"
            }`}
          >
            A Fechar ({projects.filter((p) => p.statusContrato === "A_FECHAR").length})
          </button>
        </div>
      </div>

      {/* CONTRACT LIST CARD GRID */}
      {filteredProjects.length > 0 ? (
        <div className="space-y-4">
          {filteredProjects.map((p) => {
            const drafts = localDrafts[p.id] || { prazo: p.prazo || "", numeroPedido: p.numeroPedido || "", observacoes: p.observacoes || "" };
            const isTarget = selectedProjectId === p.id;
            
            // Calculate progress percentage (3 steps: Projeto, Cotação, Instalação)
            const stepsCount = [p.etapaProjeto, p.etapaCotacao, p.etapaFabricacao].filter(Boolean).length;
            const progressPercent = (stepsCount / 3) * 100;

            return (
              <div
                key={p.id}
                className={`p-5 rounded-2xl border transition-all duration-300 bg-white ${
                  isTarget
                    ? "border-brand-accent shadow-md ring-2 ring-brand-accent/15 scale-[1.01]"
                    : "border-slate-150 hover:border-slate-300 hover:shadow-xs shadow-2xs"
                }`}
                id={`steps_card_${p.id}`}
              >
                {/* Visual target pointer flag */}
                {isTarget && (
                  <div className="inline-flex items-center gap-1 text-[8px] font-extrabold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-md uppercase tracking-wider mb-2 animate-pulse">
                    Foco Selecionado
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                  
                  {/* Left Column: Contract Identifiers */}
                  <div className="lg:col-span-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-400">
                      <FolderOpen className="w-4 h-4 text-brand-primary shrink-0" />
                      <span className="text-[10px] font-extrabold text-brand-text-secondary uppercase tracking-widest truncate max-w-[120px]">
                        Contrato
                      </span>
                      <span className={`text-[8px] font-bold py-0.5 px-2 rounded-md ${
                        p.statusContrato === "CONSOLIDADO" 
                          ? "bg-green-50 text-green-700 border border-green-150" 
                          : "bg-amber-50 text-amber-700 border border-amber-150"
                      }`}>
                        {p.statusContrato === "CONSOLIDADO" ? "Consolidado" : "A Fechar"}
                      </span>
                    </div>
                    
                    <h3 className="text-sm font-extrabold text-brand-text-primary tracking-tight truncate" title={p.nome}>
                      {p.nome}
                    </h3>
                    
                    {p.cliente && (
                      <p className="text-[11px] font-bold text-brand-text-secondary truncate">
                        Cliente: <span className="text-brand-text-primary">{p.cliente}</span>
                      </p>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={() => handleRedirect(p.id)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-brand-primary hover:text-brand-accent transition-colors py-1 px-3 bg-slate-50 border border-slate-150 rounded-lg hover:border-brand-accent/35 hover:bg-white"
                        title="Ir para Orçamento"
                        id={`btn_budget_redirect_${p.id}`}
                      >
                        Ir para Orçamento
                        <ArrowRight className="w-3 h-3 text-brand-accent" />
                      </button>
                    </div>
                  </div>

                  {/* Center Column: Stage Timeline Nodes Checkpoints */}
                  <div className="lg:col-span-5 space-y-3.5 px-2">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-brand-text-secondary uppercase tracking-widest pb-1 border-b border-slate-50">
                      <span>Progresso Executivo</span>
                      <strong className="text-brand-primary font-mono">{progressPercent.toFixed(0)}%</strong>
                    </div>

                    <div className="relative pt-4 pb-2.5">
                      {/* Timeline horizontal background joining line */}
                      <div className="absolute top-[28px] left-[16.6%] right-[16.6%] h-1 bg-slate-100 rounded-full z-0" />
                      
                      {/* Timeline horizontal filled progress indicator line */}
                      <div 
                        className="absolute top-[28px] left-[16.6%] h-1 bg-brand-success rounded-full transition-all duration-350 z-0"
                        style={{ 
                          width: stepsCount === 3 ? "66.8%" : stepsCount === 2 ? "33.4%" : "0%"
                        }} 
                      />

                      <div className="flex items-center justify-between relative z-10 font-sans">
                        {/* Projeto Node */}
                        <div className="flex flex-col items-center gap-1.5 w-1/3">
                          <button
                            onClick={() => handleToggleStepIndex(p, 1)}
                            disabled={savingId === p.id && saveStatus === "saving"}
                            className={`w-7 h-7 rounded-full flex items-center justify-center border font-extrabold text-[11px] transition-all duration-250 cursor-pointer ${
                              p.etapaProjeto
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-600/20 scale-105"
                                : "bg-white text-slate-400 border-slate-200 hover:border-indigo-600 hover:text-indigo-600"
                            }`}
                            title="Alternar Projeto"
                            id={`toggle_projeto_${p.id}`}
                          >
                            {p.etapaProjeto ? "✓" : "1"}
                          </button>
                          <span className={`text-[9px] font-extrabold text-center uppercase tracking-wider ${
                            p.etapaProjeto ? "text-indigo-700 font-bold" : "text-brand-text-secondary"
                          }`}>
                            Projeto
                          </span>
                        </div>

                        {/* Cotação Node */}
                        <div className="flex flex-col items-center gap-1.5 w-1/3">
                          <button
                            onClick={() => handleToggleStepIndex(p, 2)}
                            disabled={savingId === p.id && saveStatus === "saving"}
                            className={`w-7 h-7 rounded-full flex items-center justify-center border font-extrabold text-[11px] transition-all duration-250 cursor-pointer ${
                              p.etapaCotacao
                                ? "bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-600/20 scale-105"
                                : "bg-white text-slate-400 border-slate-200 hover:border-amber-600 hover:text-amber-600"
                            }`}
                            title="Alternar Cotação"
                            id={`toggle_cotacao_${p.id}`}
                          >
                            {p.etapaCotacao ? "✓" : "2"}
                          </button>
                          <span className={`text-[9px] font-extrabold text-center uppercase tracking-wider ${
                            p.etapaCotacao ? "text-amber-700 font-bold" : "text-brand-text-secondary"
                          }`}>
                            Cotação
                          </span>
                        </div>

                        {/* Instalação Node */}
                        <div className="flex flex-col items-center gap-1.5 w-1/3">
                          <button
                            onClick={() => handleToggleStepIndex(p, 3)}
                            disabled={savingId === p.id && saveStatus === "saving"}
                            className={`w-7 h-7 rounded-full flex items-center justify-center border font-extrabold text-[11px] transition-all duration-250 cursor-pointer ${
                              p.etapaFabricacao
                                ? "bg-brand-success text-white border-brand-success shadow-xs ring-2 ring-brand-success/20 scale-105"
                                : "bg-white text-slate-400 border-slate-200 hover:border-brand-success hover:text-brand-success"
                            }`}
                            title="Alternar Instalação"
                            id={`toggle_fabricacao_${p.id}`}
                          >
                            {p.etapaFabricacao ? "✓" : "3"}
                          </button>
                          <span className={`text-[9px] font-extrabold text-center uppercase tracking-wider ${
                            p.etapaFabricacao ? "text-brand-success font-bold" : "text-brand-text-secondary"
                          }`}>
                            Instalação
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Prazo and N° Pedido Fields */}
                  <div className="lg:col-span-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-3 w-full self-stretch justify-around">
                    
                    {/* Prazo Data field */}
                    <div className="space-y-1 w-full flex-1">
                      <label className="flex items-center gap-1 text-[10px] font-extrabold text-brand-text-secondary uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                        Prazo:
                      </label>
                      <input
                        type="date"
                        className="w-full text-xs font-bold font-mono py-1.5 px-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-brand-accent transition-colors text-brand-text-primary"
                        value={drafts.prazo}
                        onChange={(e) => handleDraftChange(p.id, "prazo", e.target.value)}
                        onBlur={(e) => handleSaveField(p.id, "prazo", e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        placeholder="Não definido"
                        id={`input_prazo_${p.id}`}
                      />
                    </div>

                    {/* N° Pedido alphanumeric highlighted card */}
                    <div className="space-y-1 w-full flex-1">
                      <label className="flex items-center gap-1 text-[10px] font-extrabold text-brand-text-secondary uppercase tracking-widest text-[#D9A441]">
                        <Hash className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                        N° Pedido:
                      </label>
                      <input
                        type="text"
                        className="w-full text-xs font-extrabold font-mono py-1.5 px-2 bg-white border border-[#D9A441]/30 text-brand-primary placeholder:text-slate-300 focus:outline-hidden focus:ring-1 focus:ring-[#D9A441] rounded-lg transition-all focus:border-[#D9A441]"
                        placeholder="Ex: PED-1200"
                        value={drafts.numeroPedido}
                        onChange={(e) => handleDraftChange(p.id, "numeroPedido", e.target.value)}
                        onBlur={(e) => handleSaveField(p.id, "numeroPedido", e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        id={`input_n_pedido_${p.id}`}
                      />
                    </div>

                  </div>

                </div>

                {/* Bottom Row: Description/Notes Input */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col md:flex-row items-center gap-3">
                  <span className="text-[10px] font-extrabold text-brand-text-secondary uppercase tracking-widest shrink-0 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Descrição / Obs:
                  </span>
                  <input
                    type="text"
                    placeholder="Insira detalhes rápidos da etapa do contrato (ex: aguardando material, aprovado pelo cliente...)"
                    className="flex-1 w-full text-xs font-semibold py-1.5 px-3 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-brand-primary placeholder:text-slate-300 transition-colors text-brand-text-primary"
                    value={drafts.observacoes}
                    onChange={(e) => handleDraftChange(p.id, "observacoes", e.target.value)}
                    onBlur={(e) => handleSaveField(p.id, "observacoes", e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    id={`input_observacoes_${p.id}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-slate-350 bg-white border border-dashed border-slate-200 rounded-3xl">
          <FolderOpen className="w-10 h-10 mx-auto opacity-30 mb-3 animate-pulse text-brand-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary">Nenhum contrato corresponde à pesquisa</p>
          <p className="text-[10px] text-slate-400 mt-1">Experimente remover os termos de busca ou mudar a aba de status.</p>
        </div>
      )}
    </div>
  );
}
