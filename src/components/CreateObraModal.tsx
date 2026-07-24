import { useState, useEffect } from "react";
import { Hammer, X } from "lucide-react";
import { Projeto } from "../types";
import { useUIStore } from "../store";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectToEdit?: Projeto | null;
}

export default function CreateProjectModal({ isOpen, onClose, onSuccess, projectToEdit }: CreateProjectModalProps) {
  const projectFilter = useUIStore((state) => state.projectFilter);
  const [nome, setNome] = useState("");
  const [cliente, setCliente] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [valorContrato, setValorContrato] = useState("");
  const [statusContrato, setStatusContrato] = useState<'CONSOLIDADO' | 'A_FECHAR' | 'ENTREGUE' | 'EXCLUIDO_CONTRATO' | 'EXCLUIDO_ORCAMENTO'>('CONSOLIDADO');
  const [dataInicioContrato, setDataInicioContrato] = useState("");
  const [dataFimContrato, setDataFimContrato] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatBRL = (value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) return "";
    const numberValue = parseFloat(cleanValue) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numberValue);
  };

  const formatNumberToBRL = (num: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  useEffect(() => {
    if (projectToEdit) {
      setNome(projectToEdit.nome);
      setCliente(projectToEdit.cliente || "");
      setObservacoes(projectToEdit.observacoes || "");
      setValorContrato(formatNumberToBRL(projectToEdit.valorContrato));
      setStatusContrato(projectToEdit.statusContrato || "CONSOLIDADO");
      setDataInicioContrato(projectToEdit.dataInicioContrato || "");
      setDataFimContrato(projectToEdit.dataFimContrato || "");
    } else {
      setNome("");
      setCliente("");
      setObservacoes("");
      setValorContrato("");
      setStatusContrato(projectFilter);
      setDataInicioContrato("");
      setDataFimContrato("");
    }
    setError(null);
  }, [projectToEdit, isOpen, projectFilter]);

  if (!isOpen) return null;

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValorContrato(formatBRL(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError("O nome do projeto é obrigatório");
      return;
    }
    // Convert formatted BRL back into Float
    const cleanVal = valorContrato.replace(/[^\d,]/g, "").replace(",", ".");
    const parsedValor = parseFloat(cleanVal);
    if (isNaN(parsedValor) || parsedValor < 0) {
      setError("O valor do contrato deve ser um número válido");
      return;
    }
    setError(null);
    setLoading(true);

    const payload = {
      nome: nome.trim(),
      cliente: cliente.trim() || null,
      observacoes: observacoes.trim() || null,
      valorContrato: parsedValor,
      statusContrato,
      dataInicioContrato: dataInicioContrato || null,
      dataFimContrato: dataFimContrato || null,
    };

    try {
      const url = projectToEdit ? `/api/projetos/${projectToEdit.id}` : "/api/projetos";
      const method = projectToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        const fullErrorMessage = [
          errData.error,
          errData.details ? `Detalhes: ${errData.details}` : "",
          errData.table ? `Tabela: ${errData.table}` : "",
          errData.hint ? `Dica: ${errData.hint}` : ""
        ].filter(Boolean).join(" | ");
        
        throw new Error(fullErrorMessage || "Erro ao salvar projeto");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      {/* Content */}
      <div className="relative bg-white rounded-2xl border border-slate-100 shadow-xl max-w-lg w-full p-6 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-primary/5 text-brand-primary rounded-lg">
              <Hammer className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-brand-text-primary">
              {projectToEdit 
                ? (projectFilter === "A_FECHAR" ? "Editar Cadastro de Orçamento" : "Editar Cadastro de Contrato") 
                : (projectFilter === "A_FECHAR" ? "Novo Orçamento" : "Novo Contrato")}
            </h3>
          </div>
          <button onClick={onClose} aria-label="Fechar modal" className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 bg-brand-error/5 border border-brand-error/10 text-brand-error rounded-xl text-xs font-bold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label htmlFor="projeto_nome_input" className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
                {projectFilter === "A_FECHAR" ? "Nome do Orçamento *" : "Nome do Contrato *"}
              </label>
              <input
                type="text"
                className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors"
                placeholder="Ex: Condomínio Belle Vue"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={loading}
                id="projeto_nome_input"
              />
            </div>

            <div>
              <label htmlFor="projeto_cliente_input" className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
                Cliente (Opcional)
              </label>
              <input
                type="text"
                className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors"
                placeholder="Ex: Construtora Alfa S.A."
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                disabled={loading}
                id="projeto_cliente_input"
              />
            </div>

            <div>
              <label htmlFor="projeto_valor_input" className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
                {projectFilter === "A_FECHAR" ? "Valor do Orçamento (R$) *" : "Valor do Contrato (R$) *"}
              </label>
              <input
                type="text"
                className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors font-mono font-semibold text-brand-primary"
                placeholder="R$ 0,00"
                value={valorContrato}
                onChange={handleValorChange}
                disabled={loading}
                id="projeto_valor_input"
              />
              <p className="text-[10px] text-brand-text-secondary mt-1 font-semibold">
                Este valor é formatado automaticamente em Real (BRL).
              </p>
            </div>

            <div>
              <label htmlFor="projeto_status_contrato_select" className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
                {projectFilter === "A_FECHAR" ? "Situação do Orçamento" : "Situação do Contrato"}
              </label>
              <select
                className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors bg-white font-semibold text-brand-primary"
                value={statusContrato}
                onChange={(e) => setStatusContrato(e.target.value as any)}
                disabled={loading}
                id="projeto_status_contrato_select"
              >
                <option value="CONSOLIDADO">Consolidado</option>
                <option value="A_FECHAR">A fechar</option>
                <option value="ENTREGUE">Entregue</option>
              </select>
            </div>

            <div>
              <label htmlFor="projeto_data_inicio_input" className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
                Envio do Orçamento
              </label>
              <input
                type="date"
                className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors bg-white font-semibold text-brand-primary"
                value={dataInicioContrato}
                onChange={(e) => setDataInicioContrato(e.target.value)}
                disabled={loading}
                id="projeto_data_inicio_input"
              />
            </div>

            <div>
              <label htmlFor="projeto_data_fim_input" className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
                Aprovação do Orçamento
              </label>
              <input
                type="date"
                className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors bg-white font-semibold text-brand-primary"
                value={dataFimContrato}
                onChange={(e) => setDataFimContrato(e.target.value)}
                disabled={loading}
                id="projeto_data_fim_input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="projeto_obs_input" className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
              Observações Adicionais (Opcional)
            </label>
            <textarea
              className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors h-24 resize-none"
              placeholder={projectFilter === "A_FECHAR" ? "Ex: Escopo do orçamento compreende pavimentação, terraplenagem e acabamento..." : "Ex: Escopo do contrato compreende pavimentação, terraplenagem e acabamento..."}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              disabled={loading}
              id="projeto_obs_input"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              className="px-4 py-2 border border-slate-200 text-brand-text-secondary hover:text-brand-text-primary font-bold text-sm hover:bg-slate-50 rounded-xl transition-colors"
              onClick={onClose}
              disabled={loading}
              id="cancel_projeto_btn"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
              disabled={loading}
              id="submit_projeto_btn"
            >
              {loading ? "Salvando..." : projectToEdit ? "Salvar Alterações" : (projectFilter === "A_FECHAR" ? "Criar Orçamento" : "Criar Contrato")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
