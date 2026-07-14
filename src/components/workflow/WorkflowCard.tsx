import React from "react";
import { User, Calendar, MessageSquare, AlertCircle, Clock, CheckCircle2, Play } from "lucide-react";
import { Obra } from "../../types";

interface WorkflowCardProps {
  contract: Obra;
  onClick: () => void;
}

export default function WorkflowCard({ contract, onClick }: WorkflowCardProps) {
  const initials = contract.nome
    ? contract.nome.substring(0, 2).toUpperCase()
    : "CT";

  // Determine status styles & icons
  const getStatusInfo = (status?: string) => {
    switch (status) {
      case "Atrasado":
        return {
          bg: "bg-rose-50 border-rose-100",
          text: "text-rose-700",
          indicator: "bg-rose-500",
          icon: <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
        };
      case "Aguardando":
        return {
          bg: "bg-amber-50 border-amber-100",
          text: "text-amber-800",
          indicator: "bg-amber-500",
          icon: <Clock className="w-3 h-3 text-amber-500 shrink-0" />
        };
      case "Finalizado":
        return {
          bg: "bg-emerald-50 border-emerald-100",
          text: "text-emerald-700",
          indicator: "bg-emerald-500",
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
        };
      default:
        return {
          bg: "bg-blue-50 border-blue-100",
          text: "text-blue-700",
          indicator: "bg-blue-500",
          icon: <Play className="w-3 h-3 text-blue-500 shrink-0" />
        };
    }
  };

  const statusInfo = getStatusInfo(contract.workflowStatus);

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer hover:border-slate-200 group flex flex-col justify-between space-y-3.5 relative overflow-hidden"
    >
      {/* Visual Status Border Indicator */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${statusInfo.indicator}`} />

      {/* Card Header: Logo/Avatar + Title/Client */}
      <div className="flex items-start gap-3 pl-1.5">
        {contract.workflowLogoUrl ? (
          <img
            src={contract.workflowLogoUrl}
            alt={contract.nome}
            className="w-10 h-10 rounded-lg object-contain border border-slate-100 p-1 shrink-0 bg-white"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-sm shrink-0 uppercase">
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-black text-slate-800 truncate tracking-tight group-hover:text-brand-primary transition-colors uppercase leading-none mb-1">
            {contract.nome}
          </h4>
          <p className="text-[10px] font-bold text-slate-500 truncate leading-none">
            {contract.cliente || "Cliente não informado"}
          </p>
        </div>
      </div>

      {/* Card Body: Substage / Active Activity */}
      <div className="pl-1.5 space-y-1 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
          Atividade Atual
        </span>
        <p className="text-xs font-extrabold text-slate-700 leading-tight truncate">
          {contract.workflowSubetapa || "Nenhuma subetapa ativa"}
        </p>
      </div>

      {/* Card Footer: Metadata (Owner, Deadline, Status, Obs) */}
      <div className="pl-1.5 space-y-2">
        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-slate-500">
          <div className="flex items-center gap-1 truncate">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{contract.workflowResponsavel || "Não designado"}</span>
          </div>
          <div className="flex items-center gap-1 truncate justify-end">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-600">{contract.workflowPrazo || contract.prazo || "S/P"}</span>
          </div>
        </div>

        {/* Status Pill & Observations */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[10px] font-bold">
          <div className={`px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusInfo.bg} ${statusInfo.text}`}>
            {statusInfo.icon}
            <span>{contract.workflowStatus || "Em Andamento"}</span>
          </div>

          {contract.workflowObservacao && (
            <div className="flex items-center gap-1 text-slate-400 max-w-[50%] truncate" title={contract.workflowObservacao}>
              <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate italic font-medium">{contract.workflowObservacao}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
