import React, { useState, useEffect } from "react";
import { 
  X, 
  User, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Bookmark, 
  Clock, 
  History, 
  Paperclip, 
  CheckSquare, 
  Plus, 
  Trash2, 
  ArrowRightCircle, 
  HelpCircle,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Obra, WorkflowMovimentacao, ChecklistItem } from "../../types";
import WorkflowTimeline from "./WorkflowTimeline";
import WorkflowHistory from "./WorkflowHistory";

interface WorkflowDrawerProps {
  contractId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // call when state updates to reload parent data
}

// Stages & Substage Definitions
export const STAGES = [
  "Solicitação",
  "Arquitetura",
  "Orçamento",
  "Proposta",
  "Projeto Executivo",
  "Produção",
  "Execução",
  "Financeiro",
  "Encerrado"
] as const;

export const SUBSTAGES: Record<string, string[]> = {
  "Solicitação": ["Triagem / Cadastro", "Análise Preliminar"],
  "Arquitetura": ["Estudo Preliminar", "Anteprojeto", "Projeto Legal"],
  "Orçamento": ["Levantamento Quantitativo", "Cotação de Insumos", "Fechamento da Planilha"],
  "Proposta": ["Elaboração da Proposta", "Apresentação ao Cliente", "Negociação"],
  "Projeto Executivo": ["Detalhamento Técnico", "Compatibilização", "Emissão de Pranchas"],
  "Produção": ["Folha de corte Hunter Douglas", "Produção", "Pintura", "Expedição"],
  "Execução": ["Mobilização", "Instalação", "Vistoria / Entrega"],
  "Financeiro": ["Medição", "Emissão de NF", "Cobrança", "Recebimento"],
  "Encerrado": ["Arquivamento", "Pós-venda"]
};

export default function WorkflowDrawer({ contractId, isOpen, onClose, onSuccess }: WorkflowDrawerProps) {
  const [contract, setContract] = useState<Obra | null>(null);
  const [history, setHistory] = useState<WorkflowMovimentacao[]>([]);
  const [isLoadingContract, setIsLoadingContract] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Tabs: 'detalhes' | 'timeline' | 'checklist' | 'anexos' | 'historico' | 'movimentar'
  const [activeTab, setActiveTab] = useState<"detalhes" | "movimentar" | "checklist" | "anexos" | "historico">("detalhes");

  // Checklist local state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [isSavingChecklist, setIsSavingChecklist] = useState(false);

  // Movement Form state
  const [novaEtapa, setNovaEtapa] = useState<string>("");
  const [subetapa, setSubetapa] = useState<string>("");
  const [workflowStatus, setWorkflowStatus] = useState<string>("Em Andamento");
  const [workflowResponsavel, setWorkflowResponsavel] = useState<string>("");
  const [workflowPrazo, setWorkflowPrazo] = useState<string>("");
  const [workflowLogoUrl, setWorkflowLogoUrl] = useState<string>("");
  const [descricao, setDescricao] = useState<string>("");
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

  // Load Contract Data
  const fetchContractData = async () => {
    if (!contractId) return;
    setIsLoadingContract(true);
    try {
      const res = await fetch(`/api/obras/${contractId}`);
      if (res.ok) {
        const data = await res.json();
        setContract(data);
        setChecklist(data.workflowChecklist || []);
        
        // Pre-fill movement form
        setNovaEtapa(data.workflowEtapa || "Solicitação");
        setSubetapa(data.workflowSubetapa || "");
        setWorkflowStatus(data.workflowStatus || "Em Andamento");
        setWorkflowResponsavel(data.workflowResponsavel || "");
        setWorkflowPrazo(data.workflowPrazo || data.prazo || "");
        setWorkflowLogoUrl(data.workflowLogoUrl || "");
      }
    } catch (e) {
      console.error("Erro ao buscar contrato:", e);
    } finally {
      setIsLoadingContract(false);
    }
  };

  // Load History Logs
  const fetchHistoryData = async () => {
    if (!contractId) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/obras/${contractId}/workflow/movimentacoes`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Erro ao buscar historico:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && contractId) {
      fetchContractData();
      fetchHistoryData();
      setActiveTab("detalhes");
    }
  }, [isOpen, contractId]);

  // Adjust Subetapa options when selected NovaEtapa changes
  useEffect(() => {
    if (novaEtapa) {
      const subs = SUBSTAGES[novaEtapa] || [];
      if (subs.length > 0 && !subs.includes(subetapa)) {
        setSubetapa(subs[0]);
      } else if (subs.length === 0) {
        setSubetapa("");
      }
    }
  }, [novaEtapa]);

  // Handle Checklist Item Toggle
  const handleToggleCheckItem = async (itemId: string) => {
    const updated = checklist.map(item => 
      item.id === itemId ? { ...item, feito: !item.feito } : item
    );
    setChecklist(updated);
    saveChecklistToDb(updated);
  };

  // Handle Add Checklist Item
  const handleAddCheckItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckItem.trim()) return;
    const newItem: ChecklistItem = {
      id: "chk_" + Math.random().toString(36).substr(2, 9),
      descricao: newCheckItem.trim(),
      feito: false
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewCheckItem("");
    saveChecklistToDb(updated);
  };

  // Handle Delete Checklist Item
  const handleDeleteCheckItem = (itemId: string) => {
    const updated = checklist.filter(item => item.id !== itemId);
    setChecklist(updated);
    saveChecklistToDb(updated);
  };

  // Save Checklist
  const saveChecklistToDb = async (list: ChecklistItem[]) => {
    if (!contractId) return;
    setIsSavingChecklist(true);
    try {
      await fetch(`/api/obras/${contractId}/workflow/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: list })
      });
    } catch (e) {
      console.error("Erro ao salvar checklist:", e);
    } finally {
      setIsSavingChecklist(false);
    }
  };

  // Handle Submit Movement State transition
  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractId) return;
    setIsSubmittingMovement(true);
    try {
      const defaultDesc = `Movido para ${novaEtapa}` + (subetapa ? ` (${subetapa})` : "");
      const finalDesc = descricao.trim() || defaultDesc;
      const res = await fetch(`/api/obras/${contractId}/workflow/movimentar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novaEtapa,
          subetapa,
          descricao: finalDesc,
          observacao: finalDesc,
          workflowStatus,
          workflowResponsavel,
          workflowPrazo,
          workflowLogoUrl
        })
      });

      if (res.ok) {
        setDescricao("");
        // Reload contract and history
        await fetchContractData();
        await fetchHistoryData();
        setActiveTab("detalhes");
        onSuccess(); // Trigger reload of main indicators and grid
      } else {
        alert("Erro ao realizar movimentação operacional.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  // Mock attachments structure
  const [attachments, setAttachments] = useState<{ id: string, name: string, date: string, size: string }[]>([
    { id: "att-1", name: "contrato_assinado.pdf", date: "15/05/2026", size: "1.2 MB" },
    { id: "att-2", name: "memorial_descritivo.pdf", date: "16/05/2026", size: "480 KB" }
  ]);
  const [newAttachmentName, setNewAttachmentName] = useState("");

  const handleAddAttachmentMock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttachmentName.trim()) return;
    const newAtt = {
      id: `att-${Date.now()}`,
      name: newAttachmentName.trim() + (newAttachmentName.includes(".") ? "" : ".pdf"),
      date: new Date().toLocaleDateString("pt-BR"),
      size: "240 KB"
    };
    setAttachments([...attachments, newAtt]);
    setNewAttachmentName("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Body container */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-100">
        
        {/* Header Drawer */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            {contract?.workflowLogoUrl ? (
              <img
                src={contract.workflowLogoUrl}
                alt={contract.nome}
                className="w-10 h-10 object-contain border border-slate-200 p-1 rounded-lg bg-white shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-brand-secondary flex items-center justify-center font-extrabold text-sm text-white shrink-0 uppercase">
                {contract?.nome ? contract.nome.substring(0, 2).toUpperCase() : "PC"}
              </div>
            )}
            <div>
              <h3 className="text-sm font-black text-brand-text-primary uppercase tracking-tight leading-none mb-1">
                {contract?.nome || "Carregando..."}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 leading-none">
                {contract?.cliente || "Contrato Operacional"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 border-b border-slate-100 flex items-center gap-1 overflow-x-auto shrink-0 bg-white">
          <button
            onClick={() => setActiveTab("detalhes")}
            className={`py-2.5 px-3 border-b-2 text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === "detalhes"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setActiveTab("movimentar")}
            className={`py-2.5 px-3 border-b-2 text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === "movimentar"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Movimentar
          </button>
          <button
            onClick={() => setActiveTab("checklist")}
            className={`py-2.5 px-3 border-b-2 text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === "checklist"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Checklist
          </button>
          <button
            onClick={() => setActiveTab("anexos")}
            className={`py-2.5 px-3 border-b-2 text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === "anexos"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Anexos
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={`py-2.5 px-3 border-b-2 text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === "historico"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Histórico ({history.length})
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {isLoadingContract ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <div className="w-8 h-8 border-4 border-brand-primary border-b-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">
                Carregando dados...
              </p>
            </div>
          ) : contract ? (
            <div className="space-y-6">
              {/* 1. DETALHES TAB */}
              {activeTab === "detalhes" && (
                <div className="space-y-6">
                  {/* Grid Metadata Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Valor do Contrato
                      </span>
                      <p className="text-sm font-black text-slate-800 flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        }).format(contract.valorContrato || 0)}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Responsável
                      </span>
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 truncate">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        {contract.workflowResponsavel || "Não designado"}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Prazo Limite
                      </span>
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        {contract.workflowPrazo || contract.prazo || "Sem prazo"}
                      </p>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xs">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Status Geral
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${
                          contract.workflowStatus === "Atrasado" 
                            ? "bg-rose-500" 
                            : contract.workflowStatus === "Aguardando" 
                              ? "bg-amber-500" 
                              : contract.workflowStatus === "Finalizado"
                                ? "bg-emerald-500"
                                : "bg-blue-500"
                        }`} />
                        <span className="text-xs font-extrabold text-slate-700">
                          {contract.workflowStatus || "Em Andamento"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Substage Current Details banner */}
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-1">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">
                      Área Operacional Atual
                    </span>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-snug">
                      {contract.workflowEtapa} &mdash; <span className="text-indigo-700 font-extrabold">{contract.workflowSubetapa || "Cadastro inicial"}</span>
                    </h4>
                  </div>

                  {/* Description observations */}
                  {contract.workflowObservacao && (
                    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Observação Operacional Recente
                      </span>
                      <p className="text-xs font-semibold text-slate-600 leading-relaxed italic">
                        "{contract.workflowObservacao}"
                      </p>
                    </div>
                  )}

                  {/* Embedding the complete workflow progression checklist */}
                  <WorkflowTimeline currentStage={contract.workflowEtapa || "Solicitação"} />
                </div>
              )}

              {/* 2. MOVIMENTAR STATE TRANSITION FORM */}
              {activeTab === "movimentar" && (
                <form onSubmit={handleSubmitMovement} className="space-y-4 bg-white border border-slate-100 rounded-xl p-5 shadow-xs">
                  <div className="border-b border-slate-100 pb-2 mb-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Registrar Nova Movimentação
                    </h4>
                    <p className="text-[10px] font-semibold text-slate-400 leading-normal">
                      Mova o contrato para a próxima etapa do fluxograma e registre no histórico da empresa.
                    </p>
                  </div>

                  {/* Nova Etapa */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Nova Etapa Principal
                    </label>
                    <select
                      value={novaEtapa}
                      onChange={(e) => setNovaEtapa(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all cursor-pointer font-extrabold bg-slate-50"
                    >
                      {STAGES.map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subetapa */}
                  {novaEtapa && SUBSTAGES[novaEtapa]?.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Atividade / Subetapa Específica
                      </label>
                      <select
                        value={subetapa}
                        onChange={(e) => setSubetapa(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all cursor-pointer font-bold bg-slate-50"
                      >
                        {SUBSTAGES[novaEtapa].map(sub => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {/* Status */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Status Operacional
                      </label>
                      <select
                        value={workflowStatus}
                        onChange={(e) => setWorkflowStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all cursor-pointer font-bold bg-slate-50"
                      >
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Atrasado">Atrasado</option>
                        <option value="Aguardando">Aguardando Terceiros</option>
                        <option value="Finalizado">Finalizado</option>
                      </select>
                    </div>

                    {/* Responsável */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Responsável Operacional
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Carlos Henrique"
                        value={workflowResponsavel}
                        onChange={(e) => setWorkflowResponsavel(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all font-bold placeholder:font-normal"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Prazo */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Prazo Limite / SLA (ex: 15/08)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 25/11/2026"
                        value={workflowPrazo}
                        onChange={(e) => setWorkflowPrazo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all font-bold placeholder:font-normal"
                      />
                    </div>

                    {/* Logo Url */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        URL da Logomarca (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Link da imagem..."
                        value={workflowLogoUrl}
                        onChange={(e) => setWorkflowLogoUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all font-bold placeholder:font-normal"
                      />
                    </div>
                  </div>

                  {/* Descrição Log */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Descrição / Observações
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Enviado para a pintura, folha de corte finalizada..."
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all font-bold placeholder:font-normal"
                    />
                  </div>

                  {/* Actions */}
                  <button
                    type="submit"
                    disabled={isSubmittingMovement}
                    className="w-full py-2.5 bg-brand-primary hover:bg-brand-secondary text-white text-xs font-extrabold uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ArrowRightCircle className="w-4 h-4 text-brand-accent shrink-0" />
                    {isSubmittingMovement ? "Registrando..." : "Confirmar Movimentação"}
                  </button>
                </form>
              )}

              {/* 3. CHECKLIST INTERACTIVE TAB */}
              {activeTab === "checklist" && (
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Checklist do Processo
                      </h4>
                      <p className="text-[10px] font-semibold text-slate-400">
                        Atividades obrigatórias para este contrato.
                      </p>
                    </div>
                    {isSavingChecklist && (
                      <span className="text-[9px] font-bold font-mono text-indigo-500 uppercase animate-pulse">
                        Salvando...
                      </span>
                    )}
                  </div>

                  {/* Checklist List */}
                  {checklist.length === 0 ? (
                    <div className="text-center py-6 text-slate-400">
                      <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-500">Nenhum item cadastrado</p>
                      <p className="text-[10px] text-slate-400">Adicione as atividades que a equipe precisa concluir.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {checklist.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg group hover:border-slate-200 transition-all"
                        >
                          <label className="flex items-center gap-2.5 flex-1 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.feito}
                              onChange={() => handleToggleCheckItem(item.id)}
                              className="w-4 h-4 text-brand-primary border-slate-200 rounded-sm focus:ring-brand-primary/20 accent-indigo-600"
                            />
                            <span className={`text-xs font-bold leading-normal ${
                              item.feito ? "text-slate-400 line-through font-medium" : "text-slate-700"
                            }`}>
                              {item.descricao}
                            </span>
                          </label>
                          <button
                            onClick={() => handleDeleteCheckItem(item.id)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Item form */}
                  <form onSubmit={handleAddCheckItem} className="flex gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder="Nova tarefa de checklist..."
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all font-semibold"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-brand-primary hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-brand-accent shrink-0" />
                    </button>
                  </form>
                </div>
              )}

              {/* 4. ANEXOS / ATTACHMENTS PREPARED STRUCTURE */}
              {activeTab === "anexos" && (
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Anexos & Documentos
                    </h4>
                    <p className="text-[10px] font-semibold text-slate-400">
                      Arquivos e mídias vinculadas ao progresso deste contrato.
                    </p>
                  </div>

                  {/* Attachments List */}
                  {attachments.length === 0 ? (
                    <div className="text-center py-6 text-slate-400">
                      <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-500">Nenhum anexo</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((att) => (
                        <div key={att.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg hover:border-slate-200 transition-all">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {att.name.endsWith(".xlsx") || att.name.endsWith(".csv") ? (
                              <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
                            ) : (
                              <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate leading-none mb-1">
                                {att.name}
                              </p>
                              <span className="text-[9px] font-bold text-slate-400 leading-none">
                                {att.date} &bull; {att.size}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Mock Attachment */}
                  <form onSubmit={handleAddAttachmentMock} className="flex gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder="Nome do arquivo para simular upload..."
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all font-semibold"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-brand-primary hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-brand-accent shrink-0" />
                    </button>
                  </form>
                </div>
              )}

              {/* 5. HISTORICO TAB */}
              {activeTab === "historico" && (
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Histórico Completo de Mudanças
                    </h4>
                    <p className="text-[10px] font-semibold text-slate-400">
                      Registro imutável auditável de toda transição operacional.
                    </p>
                  </div>
                  <WorkflowHistory history={history} isLoading={isLoadingHistory} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <HelpCircle className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-bold">Não foi possível carregar os dados do contrato.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
