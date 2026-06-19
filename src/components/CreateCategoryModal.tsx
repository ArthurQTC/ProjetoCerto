import { useState, useEffect } from "react";
import { FolderPlus, Trash2, X, Tag } from "lucide-react";
import { Categoria } from "../types";

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCategoryModal({ isOpen, onClose, onSuccess }: CreateCategoryModalProps) {
  const [nome, setNome] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCategoryId, setConfirmingCategoryId] = useState<string | null>(null);

  // Load existing categories on mount / open
  const loadCategories = async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/categorias");
      if (res.ok) {
        const data = await res.json();
        setCategorias(data);
      }
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      setNome("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError("O nome da categoria é obrigatório");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const fullErrorMessage = [
          errorData.error,
          errorData.details ? `Detalhes: ${errorData.details}` : "",
          errorData.table ? `Tabela: ${errorData.table}` : "",
          errorData.hint ? `Dica: ${errorData.hint}` : ""
        ].filter(Boolean).join(" | ");
        throw new Error(fullErrorMessage || "Falha ao cadastrar categoria");
      }

      setNome("");
      await loadCategories();
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/categorias/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        const fullErrorMessage = [
          errorData.error,
          errorData.details ? `Detalhes: ${errorData.details}` : "",
          errorData.table ? `Tabela: ${errorData.table}` : "",
          errorData.hint ? `Dica: ${errorData.hint}` : ""
        ].filter(Boolean).join(" | ");
        throw new Error(fullErrorMessage || "Falha ao excluir categoria");
      }

      await loadCategories();
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

      {/* Content */}
      <div className="relative bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full p-6 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-primary/5 text-brand-primary rounded-lg">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-brand-text-primary">Gerenciar Categorias</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable area */}
        <div className="overflow-y-auto py-4 space-y-5 flex-1 pr-1">
          {error && (
            <div className="p-3 bg-brand-error/5 border border-brand-error/10 text-brand-error rounded-xl text-xs font-bold shrink-0">
              {error}
            </div>
          )}

          {/* Form to Create Category */}
          <form onSubmit={handleSubmit} className="space-y-3 shrink-0">
            <div>
              <label className="block text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-1.5">
                Nova Categoria
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 text-sm py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary hover:border-slate-300 transition-colors"
                  placeholder="Ex: Alvenaria, Pintura, Vidros..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={loading}
                  id="category_name_input"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold text-xs rounded-xl transition-colors shrink-0 disabled:opacity-50"
                  disabled={loading}
                  id="submit_category_btn"
                >
                  {loading ? "Adicionando..." : "Adicionar"}
                </button>
              </div>
            </div>
          </form>

          {/* Divider */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-brand-text-secondary uppercase tracking-widest mb-3">
              Categorias Ativas ({categorias.length})
            </h4>

            {listLoading ? (
              <p className="text-[10px] text-slate-400 font-semibold italic">Carregando categorias...</p>
            ) : categorias.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {categorias.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 max-w-[55%]">
                      <Tag className="w-3.5 h-3.5 text-brand-primary/40 shrink-0" />
                      <span className="text-xs font-bold text-brand-text-primary truncate" title={cat.nome}>{cat.nome}</span>
                    </div>
                    {confirmingCategoryId === cat.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteCategory(cat.id);
                            setConfirmingCategoryId(null);
                          }}
                          className="px-2 py-1 bg-red-600 text-white rounded-lg text-[9px] font-extrabold hover:bg-red-700 transition-colors"
                        >
                          Sim (Apaga Itens)
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingCategoryId(null)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-700 font-extrabold text-[9px]"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingCategoryId(cat.id)}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-brand-error rounded-md transition-colors"
                        title="Excluir Categoria (e todos os lançamentos associados)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-350 italic font-semibold">Nenhuma categoria cadastrada.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            className="px-4 py-2 border border-slate-200 text-brand-text-secondary hover:text-brand-text-primary font-bold text-sm hover:bg-slate-50 rounded-xl transition-colors"
            onClick={onClose}
            id="close_category_mgmt_btn"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
