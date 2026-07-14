import React from "react";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Obra } from "../../types";
import WorkflowCard from "./WorkflowCard";
import { WORKFLOW_STAGES, STAGE_COLORS } from "./WorkflowFlow";

interface WorkflowKanbanProps {
  contracts: Obra[];
  onContractClick: (contractId: string) => void;
}

export default function WorkflowKanban({ contracts, onContractClick }: WorkflowKanbanProps) {
  return (
    <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
      <div className="flex gap-4 items-start min-w-[1600px] h-[calc(100vh-280px)] min-h-[500px]">
        {WORKFLOW_STAGES.map((stage) => {
          const stageContracts = contracts.filter(c => c.workflowEtapa === stage);
          const count = stageContracts.length;
          const delayedCount = stageContracts.filter(c => c.workflowStatus === "Atrasado").length;
          const waitingCount = stageContracts.filter(c => c.workflowStatus === "Aguardando").length;
          
          const color = STAGE_COLORS[stage];

          return (
            <div 
              key={stage} 
              className="w-[280px] shrink-0 bg-slate-50/70 border border-slate-100 rounded-2xl flex flex-col max-h-full shadow-inner"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-2xl">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                  <h4 className={`text-xs font-black truncate uppercase tracking-tight ${color.text}`}>
                    {stage}
                  </h4>
                </div>
                <span className="px-2 py-0.5 bg-slate-100 border border-slate-150 rounded-md text-[10px] font-extrabold text-slate-600 font-mono">
                  {count}
                </span>
              </div>

              {/* Warnings Subbar (if any overdue/waiting) */}
              {(delayedCount > 0 || waitingCount > 0) && (
                <div className="px-3 py-1 bg-white border-b border-slate-100 flex items-center gap-2 text-[9px] font-bold">
                  {delayedCount > 0 && (
                    <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                      <AlertCircle className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                      {delayedCount} Atrasados
                    </span>
                  )}
                  {waitingCount > 0 && (
                    <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                      {waitingCount} Aguardando
                    </span>
                  )}
                </div>
              )}

              {/* Cards List Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
                {stageContracts.length === 0 ? (
                  <div className="h-24 border border-dashed border-slate-200 rounded-xl flex items-center justify-center p-4 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Sem contratos
                    </p>
                  </div>
                ) : (
                  stageContracts.map((contract) => (
                    <WorkflowCard
                      key={contract.id}
                      contract={contract}
                      onClick={() => onContractClick(contract.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
