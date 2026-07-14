import React from "react";
import { User, Calendar, Clock, ArrowRight, FileText, CornerDownRight } from "lucide-react";
import { WorkflowMovimentacao } from "../../types";

interface WorkflowHistoryProps {
  history: WorkflowMovimentacao[];
  isLoading?: boolean;
}

export default function WorkflowHistory({ history, isLoading = false }: WorkflowHistoryProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2">
        <div className="w-6 h-6 border-2 border-indigo-500 border-b-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
          Buscando histórico...
        </p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs font-bold text-slate-500 mb-0.5">Sem registros ainda</p>
        <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
          Toda movimentação operacional deste contrato será registrada automaticamente e exibida aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="relative border-l border-slate-100 pl-4 ml-2.5 space-y-5 py-2">
      {history.map((mov, idx) => (
        <div key={mov.id || idx} className="relative group">
          {/* Bullet dot indicator */}
          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white shadow-xs group-hover:scale-110 transition-transform" />

          {/* Log Entry header */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                {mov.usuario}
              </span>
              <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 font-mono">
                <span className="flex items-center gap-0.5">
                  <Calendar className="w-2.5 h-2.5" />
                  {mov.data}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {mov.hora}
                </span>
              </div>
            </div>

            {/* Stage Transition */}
            <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold pt-1">
              {mov.etapaAnterior ? (
                <>
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                    {mov.etapaAnterior}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                </>
              ) : (
                <span className="text-slate-400 italic">Novo cadastro</span>
              )}
              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                {mov.novaEtapa}
              </span>
              {mov.subetapa && (
                <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded-md flex items-center gap-0.5">
                  <CornerDownRight className="w-2.5 h-2.5 shrink-0" />
                  {mov.subetapa}
                </span>
              )}
            </div>

            {/* Description and Observacao */}
            {mov.descricao && (
              <p className="text-xs text-slate-600 leading-normal pt-1 font-medium">
                {mov.descricao}
              </p>
            )}

            {mov.observacao && mov.observacao !== mov.descricao && (
              <div className="mt-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-500 italic leading-normal">
                {mov.observacao}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
