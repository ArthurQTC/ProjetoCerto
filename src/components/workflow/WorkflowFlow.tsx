import React, { useState } from "react";
import { ChevronRight, AlertTriangle, Clock, Briefcase, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Obra } from "../../types";
import WorkflowCard from "./WorkflowCard";

interface WorkflowFlowProps {
  contracts: Obra[];
  onContractClick: (contractId: string) => void;
}

export const WORKFLOW_STAGES = [
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

export const STAGE_COLORS: Record<string, { border: string, bg: string, text: string, dot: string }> = {
  "Solicitação": { border: "border-indigo-100", bg: "bg-indigo-50/50", text: "text-indigo-800", dot: "bg-indigo-500" },
  "Arquitetura": { border: "border-violet-100", bg: "bg-violet-50/50", text: "text-violet-800", dot: "bg-violet-500" },
  "Orçamento": { border: "border-pink-100", bg: "bg-pink-50/50", text: "text-pink-800", dot: "bg-pink-500" },
  "Proposta": { border: "border-rose-100", bg: "bg-rose-50/50", text: "text-rose-800", dot: "bg-rose-500" },
  "Projeto Executivo": { border: "border-blue-100", bg: "bg-blue-50/50", text: "text-blue-800", dot: "bg-blue-500" },
  "Produção": { border: "border-cyan-100", bg: "bg-cyan-50/50", text: "text-cyan-800", dot: "bg-cyan-500" },
  "Execução": { border: "border-amber-100", bg: "bg-amber-50/50", text: "text-amber-800", dot: "bg-amber-500" },
  "Financeiro": { border: "border-emerald-100", bg: "bg-emerald-50/50", text: "text-emerald-800", dot: "bg-emerald-500" },
  "Encerrado": { border: "border-slate-200", bg: "bg-slate-100/50", text: "text-slate-800", dot: "bg-slate-500" }
};

export default function WorkflowFlow({ contracts, onContractClick }: WorkflowFlowProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>("Solicitação");

  const totalContracts = contracts.length;

  return (
    <div className="space-y-6">
      {/* 1. HORIZONTAL FLOW GRAPH */}
      <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
        <div className="flex items-center gap-3 min-w-[1200px] px-1">
          {WORKFLOW_STAGES.map((stage, idx) => {
            const stageContracts = contracts.filter(c => c.workflowEtapa === stage);
            const count = stageContracts.length;
            const delayedCount = stageContracts.filter(c => c.workflowStatus === "Atrasado").length;
            const waitingCount = stageContracts.filter(c => c.workflowStatus === "Aguardando").length;
            const percent = totalContracts > 0 ? ((count / totalContracts) * 100).toFixed(0) : "0";
            
            const color = STAGE_COLORS[stage];
            const isSelected = selectedStage === stage;

            return (
              <React.Fragment key={stage}>
                {/* Stage Box Panel */}
                <motion.div
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedStage(stage)}
                  className={`w-[145px] shrink-0 border rounded-xl p-3.5 flex flex-col justify-between h-[155px] cursor-pointer transition-all ${
                    isSelected 
                      ? "ring-2 ring-brand-primary border-brand-primary bg-white shadow-md scale-[1.03]" 
                      : `${color.border} ${color.bg} hover:bg-white hover:shadow-xs`
                  }`}
                >
                  {/* Top: Circle bullet and percent */}
                  <div className="flex items-center justify-between">
                    <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                    <span className="text-[10px] font-black text-slate-400 font-mono bg-white px-1.5 py-0.5 rounded-md border border-slate-100/80">
                      {percent}%
                    </span>
                  </div>

                  {/* Mid: Title */}
                  <div className="my-2 min-w-0">
                    <h5 className={`text-xs font-black truncate leading-tight uppercase tracking-tight ${color.text}`}>
                      {stage}
                    </h5>
                  </div>

                  {/* Bottom: Counts & Warnings */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">Contratos</span>
                      <span className="text-xs font-black text-slate-800">{count}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[9px] font-bold font-mono">
                      {delayedCount > 0 && (
                        <span className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded-md flex items-center gap-0.5" title="Atrasados">
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-500 animate-pulse shrink-0" />
                          {delayedCount}
                        </span>
                      )}
                      {waitingCount > 0 && (
                        <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded-md flex items-center gap-0.5" title="Aguardando terceiros">
                          <Clock className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          {waitingCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Arrow Connector */}
                {idx < WORKFLOW_STAGES.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mx-0.5" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 2. EXPANDED DETAILED STATE GRID */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
              Estágio Selecionado
            </span>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${selectedStage ? STAGE_COLORS[selectedStage]?.dot : "bg-slate-400"}`} />
              {selectedStage} &mdash; Contratos Ativos
            </h4>
          </div>
          <div className="px-3 py-1 bg-white border border-slate-100 rounded-lg shadow-2xs">
            <span className="text-xs font-black text-brand-primary">
              {selectedStage ? contracts.filter(c => c.workflowEtapa === selectedStage).length : 0} Contratos
            </span>
          </div>
        </div>

        {/* Contract Cards Grid */}
        <AnimatePresence mode="wait">
          {selectedStage && (
            <motion.div
              key={selectedStage}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {contracts.filter(c => c.workflowEtapa === selectedStage).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <HelpCircle className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-500 mb-0.5">Nenhum contrato nesta etapa</p>
                  <p className="text-[10px] text-slate-400 max-w-xs">
                    Mova contratos para "{selectedStage}" utilizando a ferramenta de movimentação no painel lateral de qualquer contrato.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {contracts
                    .filter(c => c.workflowEtapa === selectedStage)
                    .map(contract => (
                      <WorkflowCard
                        key={contract.id}
                        contract={contract}
                        onClick={() => onContractClick(contract.id)}
                      />
                    ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
