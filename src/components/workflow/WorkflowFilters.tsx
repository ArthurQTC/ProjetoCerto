import React from "react";
import { Search, SlidersHorizontal, RefreshCw, X } from "lucide-react";

export interface FilterState {
  empresa: string;
  cliente: string;
  responsavel: string;
  etapa: string;
  status: string;
  periodo: string;
  search: string;
}

interface WorkflowFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
  uniqueClientes: string[];
  uniqueResponsáveis: string[];
}

export default function WorkflowFilters({
  filters,
  onChange,
  onClear,
  uniqueClientes,
  uniqueResponsáveis
}: WorkflowFiltersProps) {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ ...filters, [name]: value });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const stages = [
    "Solicitação",
    "Arquitetura",
    "Orçamento",
    "Proposta",
    "Projeto Executivo",
    "Produção",
    "Execução",
    "Financeiro",
    "Encerrado"
  ];

  const statuses = [
    { value: "Em Andamento", label: "Em Andamento" },
    { value: "Atrasado", label: "Atrasado" },
    { value: "Aguardando", label: "Aguardando Terceiros" },
    { value: "Finalizado", label: "Finalizado" }
  ];

  const hasActiveFilters = Object.values(filters).some(val => val !== "");

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs space-y-4">
      {/* Search and Top Info bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por contrato ou cliente..."
            value={filters.search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-all"
            >
              <X className="h-3.5 w-3.5" />
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Empresa */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Empresa / Origem
          </label>
          <select
            name="empresa"
            value={filters.empresa}
            onChange={handleSelectChange}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all bg-slate-50 font-medium cursor-pointer"
          >
            <option value="">Todas</option>
            <option value="Hunter Douglas">Hunter Douglas</option>
            <option value="Projeto Certo">Projeto Certo</option>
          </select>
        </div>

        {/* Cliente */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Cliente
          </label>
          <select
            name="cliente"
            value={filters.cliente}
            onChange={handleSelectChange}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all bg-slate-50 font-medium cursor-pointer"
          >
            <option value="">Todos</option>
            {uniqueClientes.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Responsável */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Responsável
          </label>
          <select
            name="responsavel"
            value={filters.responsavel}
            onChange={handleSelectChange}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all bg-slate-50 font-medium cursor-pointer"
          >
            <option value="">Todos</option>
            {uniqueResponsáveis.map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Etapa */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Etapa Atual
          </label>
          <select
            name="etapa"
            value={filters.etapa}
            onChange={handleSelectChange}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all bg-slate-50 font-medium cursor-pointer"
          >
            <option value="">Todas</option>
            {stages.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            name="status"
            value={filters.status}
            onChange={handleSelectChange}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all bg-slate-50 font-medium cursor-pointer"
          >
            <option value="">Todos</option>
            {statuses.map(st => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* Período */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Período / Criação
          </label>
          <select
            name="periodo"
            value={filters.periodo}
            onChange={handleSelectChange}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all bg-slate-50 font-medium cursor-pointer"
          >
            <option value="">Qualquer data</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </div>
      </div>
    </div>
  );
}
