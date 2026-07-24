import { useState, useEffect } from "react";
import { FolderGit, Coins, X } from "lucide-react";
import { ItemOrcamento, Categoria, ItemStatus } from "../types";

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  obraId: string;
  itemToEdit?: ItemOrcamento | null;
}

export default function ItemFormModal({ isOpen, onClose, onSuccess, obraId, itemToEdit }: ItemFormModalProps) {
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<ItemStatus>("ATIVO");
  const [unidade, setUnidade] = useState<"Peças" | "Metro Quadrado">("Metro Quadrado");
  const [observacao, setObservacao] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [valorContrato, setValorContrato] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<"PERCENT" | "VALUE">("PERCENT");
  const [percentValue, setPercentValue] = useState("");

  const isFixedItem = itemToEdit ? (itemToEdit.descricao === "Imposto Fixo" || itemToEdit.descricao === "Custo ADM") : false;
  const hasSubItems = !!(itemToEdit?.subitens && itemToEdit.subitens.length > 0);

  const parseCurrencyToNumber = (val: string): number => {
    if (!val) return 0;
    const cleaned = val.replace(/\./g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const getBRLPreview = (valStr: string) => {
    const rawVal = parseCurrencyToNumber(valStr);
    if (!rawVal) return null;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(rawVal);
  };

  const handleCurrencyInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value === "") {
      setter("");
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    setter(numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  // Fetch categories list
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await fetch("/api/categorias");
        if (res.ok) {
          const data = await res.json();
          setCategorias(data);
          // Set first category as default if creating new
          if (data.length > 0 && !itemToEdit) {
            setCategoriaId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar categorias:", err);
      }
    };
    fetchCats();
  }, [itemToEdit, isOpen]);

  // Fetch the contract details to get valorContrato
  useEffect(() => {
    if (isOpen && obraId) {
      fetch(`/api/projetos/${obraId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.valorContrato !== undefined) {
            setValorContrato(Number(data.valorContrato));
          }
        })
        .catch((err) => console.error("Erro ao buscar valor do contrato:", err));
    }
  }, [isOpen, obraId]);

  // Load item attributes on edit
  useEffect(() => {
    if (itemToEdit) {
      setDescricao(itemToEdit.descricao);
      setCategoriaId(itemToEdit.categoriaId);
      setStatus(itemToEdit.status);
      setUnidade((itemToEdit as any).unidade || "Metro Quadrado");
      
      const isFixed = itemToEdit.descricao === "Imposto Fixo" || itemToEdit.descricao === "Custo ADM";
      if (isFixed) {
        const obs = itemToEdit.observacao || "";
        if (obs.includes("%")) {
          setAdjustmentType("PERCENT");
          const pct = obs.replace("%", "").trim();
          setPercentValue(pct);
          setValor("");
        } else {
          setAdjustmentType("VALUE");
          setValor(itemToEdit.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
          setPercentValue("");
        }
        setObservacao(itemToEdit.observacao || "");
      } else {
        setValor(itemToEdit.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setObservacao(itemToEdit.observacao || "");
      }
    } else {
      setDescricao("");
      setValor("");
      setStatus("ATIVO");
      setUnidade("Metro Quadrado");
      setObservacao("");
      setAdjustmentType("PERCENT");
      setPercentValue("");
      if (categorias.length > 0) {
        setCategoriaId(categorias[0].id);
      }
    }
    setError(null);
  }, [itemToEdit, isOpen, categorias]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      setError("A descrição do item é obrigatória");
      return;
    }
    if (!categoriaId) {
      setError("A categoria é obrigatória");
      return;
    }

    let parsedValor = 0;
    let savedObservacao = observacao.trim() || null;

    if (isFixedItem) {
      if (adjustmentType === "PERCENT") {
        const cleanPctStr = percentValue.replace(/[^0-9.]/g, "");
        const parsedPercent = parseFloat(cleanPctStr);
        if (isNaN(parsedPercent) || parsedPercent < 0) {
          setError("Informe um percentual válido");
          return;
        }
        parsedValor = Math.round(valorContrato * (parsedPercent / 100) * 100) / 100;
        savedObservacao = percentValue.trim() + "%";
      } else {
        parsedValor = parseCurrencyToNumber(valor);
        if (isNaN(parsedValor) || parsedValor < 0) {
          setError("Informe um valor de custo válido");
          return;
        }
        savedObservacao = "Valor Fixo";
      }
    } else {
      parsedValor = parseCurrencyToNumber(valor);
      if (isNaN(parsedValor) || parsedValor < 0) {
        setError("Informe um valor de custo válido");
        return;
      }
    }

    setLoading(true);
    setError(null);

    const payload: any = {
      descricao: descricao.trim(),
      categoriaId,
      valor: parsedValor,
      status,
      unidade,
      observacao: savedObservacao,
    };

    if (itemToEdit && hasSubItems) {
      const isValorChanged = Math.abs(parsedValor - itemToEdit.valor) > 0.01;
      if (isValorChanged) {
        const confirmDelete = window.confirm("Este item possui composições de subitens. Deseja realmente excluir todos os subitens para definir um valor manual?");
        if (!confirmDelete) {
          setLoading(false);
          return;
        }
        payload.subitens = [];
      }
    }

    try {
      const url = itemToEdit ? `/api/itens/${itemToEdit.id}` : `/api/projetos/${obraId}/itens`;
      const method = itemToEdit ? "PUT" : "POST";

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
        throw new Error(fullErrorMessage || "Erro ao salvar item no banco");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPercentPreviewBRL = () => {
    const cleanPct = percentValue.replace(/[^0-9.]/g, "");
    const parsedPercent = parseFloat(cleanPct);
    if (isNaN(parsedPercent)) return "R$ 0,00";
    const result = Math.round(valorContrato * (parsedPercent / 100) * 100) / 100;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      {/* Content */}
      <div className="relative bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full p-6 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-primary/5 text-brand-primary rounded-lg">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-brand-text-primary">
              {isFixedItem ? "Ajuste de Item de Custo Fixo" : itemToEdit ? "Editar Item de Orçamento" : "Adicionar Item ao Orçamento"}
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

          <div>
            <label htmlFor="item_desc_input" className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
              Descrição do Item {isFixedItem && "(Bloqueado)"}
            </label>
            <input
              type="text"
              className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              placeholder="Ex: Aquisição de vergalhão CA-50"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              disabled={loading || isFixedItem}
              id="item_desc_input"
            />
          </div>

          {!isFixedItem ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="item_category_select" className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
                    Categoria *
                  </label>
                  <select
                    className="w-full text-sm bg-white py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors cursor-pointer"
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    disabled={loading}
                    id="item_category_select"
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="item_valor_input" className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
                    Custo do Item *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400 font-mono text-sm font-bold select-none">R$</span>
                    <input
                      type="text"
                      className="w-full text-sm py-2 pl-9 pr-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors font-mono font-semibold disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
                      placeholder="0,00"
                      value={valor}
                      onChange={(e) => handleCurrencyInputChange(e, setValor)}
                      disabled={loading}
                      id="item_valor_input"
                    />
                  </div>
                  {hasSubItems && (
                    <p className="mt-1 text-[8.5px] font-bold text-amber-600 leading-tight">
                      Este item possui composições de subitens. Alterar o valor aqui excluirá todos os subitens após confirmação.
                    </p>
                  )}
                  {valor && getBRLPreview(valor) && (
                    <div id="cost_preview_brl" className="mt-1.5 text-[11px] font-mono text-brand-text-secondary bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 flex justify-between items-center animate-in fade-in slide-in-from-top-1 duration-150">
                      <span className="font-semibold text-slate-400">Visualização:</span>
                      <span className="text-brand-primary font-extrabold">{getBRLPreview(valor)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
                  Unidade do Item *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-750 font-bold cursor-pointer bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 w-1/2 justify-center hover:bg-slate-100 transition-colors">
                    <input
                      type="radio"
                      name="item_unidade"
                      value="Metro Quadrado"
                      checked={unidade === "Metro Quadrado"}
                      onChange={() => setUnidade("Metro Quadrado")}
                      disabled={loading}
                      className="cursor-pointer text-brand-primary focus:ring-brand-primary accent-emerald-600 h-4 w-4"
                    />
                    Metro Quadrado
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-755 font-bold cursor-pointer bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 w-1/2 justify-center hover:bg-slate-100 transition-colors">
                    <input
                      type="radio"
                      name="item_unidade"
                      value="Peças"
                      checked={unidade === "Peças"}
                      onChange={() => setUnidade("Peças")}
                      disabled={loading}
                      className="cursor-pointer text-brand-primary focus:ring-brand-primary accent-emerald-600 h-4 w-4"
                    />
                    Peças
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="item_obs_input" className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
                  Observação (Opcional)
                </label>
                <textarea
                  className="w-full text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors h-20 resize-none"
                  placeholder="Ex: Nota técnica, nome de fornecedores..."
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  disabled={loading}
                  id="item_obs_input"
                />
              </div>
            </>
          ) : (
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-4">
              <div>
                <span className="text-[10px] font-extrabold text-brand-primary uppercase tracking-widest block mb-1">
                  Ajuste do Item Fixo de Custo
                </span>
                <p className="text-[11px] text-brand-text-secondary font-medium mb-3">
                  Este custo de <strong>{descricao}</strong> pode ser definido exclusivamente por percentual sobre o valor total do contrato ou por valor absoluto.
                </p>
                
                <div className="flex bg-slate-200/50 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType("PERCENT")}
                    className={`flex-1 text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all ${
                      adjustmentType === "PERCENT" ? "bg-white text-brand-primary shadow-xs" : "text-brand-text-secondary hover:text-brand-primary"
                    }`}
                  >
                    Percentual (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType("VALUE")}
                    className={`flex-1 text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all ${
                      adjustmentType === "VALUE" ? "bg-white text-brand-primary shadow-xs" : "text-brand-text-secondary hover:text-brand-primary"
                    }`}
                  >
                    Valor Absoluto (R$)
                  </button>
                </div>
              </div>

              {adjustmentType === "PERCENT" ? (
                <div>
                  <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5 animate-in fade-in duration-100">
                    Aplica Percentual (%) *
                  </label>
                  <div className="relative animate-in fade-in duration-100">
                    <input
                      type="text"
                      className="w-full text-sm py-2 pl-3 pr-8 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors font-mono font-semibold text-brand-primary"
                      placeholder="Ex: 9.8"
                      value={percentValue}
                      onChange={(e) => setPercentValue(e.target.value)}
                      disabled={loading}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">%</span>
                  </div>
                  <div className="mt-1.5 text-[11px] font-mono text-brand-text-secondary bg-white px-3 py-1.5 rounded-lg border border-slate-100/60 flex justify-between items-center animate-in fade-in duration-150">
                    <span className="font-semibold text-slate-400 font-sans">Valor Calculado:</span>
                    <span className="text-brand-primary font-extrabold">{getPercentPreviewBRL()}</span>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in duration-100">
                  <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
                    Valor Fixo *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400 font-mono text-sm font-bold select-none">R$</span>
                    <input
                      type="text"
                      className="w-full text-sm py-2 pl-9 pr-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors font-mono font-semibold"
                      placeholder="0,00"
                      value={valor}
                      onChange={(e) => handleCurrencyInputChange(e, setValor)}
                      disabled={loading}
                      id="item_valor_input"
                    />
                  </div>
                  {valor && getBRLPreview(valor) && (
                    <div id="cost_preview_brl_fixed" className="mt-1.5 text-[11px] font-mono text-brand-text-secondary bg-white px-3 py-1.5 rounded-lg border border-slate-100/60 flex justify-between items-center animate-in fade-in duration-150">
                      <span className="font-semibold text-slate-400 font-sans">Confirmado:</span>
                      <span className="text-brand-primary font-extrabold">{getBRLPreview(valor)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              className="px-4 py-2 border border-slate-200 text-brand-text-secondary hover:text-brand-text-primary font-bold text-sm hover:bg-slate-50 rounded-xl transition-colors"
              onClick={onClose}
              disabled={loading}
              id="cancel_item_btn"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
              disabled={loading}
              id="submit_item_btn"
            >
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
