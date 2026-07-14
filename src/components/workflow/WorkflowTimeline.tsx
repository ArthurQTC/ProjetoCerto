import React from "react";
import { Check, Dot, Circle } from "lucide-react";
import { motion } from "motion/react";

interface WorkflowTimelineProps {
  currentStage: string;
}

export default function WorkflowTimeline({ currentStage }: WorkflowTimelineProps) {
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

  const currentIndex = stages.indexOf(currentStage);

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 shadow-inner relative overflow-hidden">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
        Estágio do Contrato
      </h4>

      <div className="relative border-l border-slate-200/80 ml-3.5 pl-5 space-y-4 py-1">
        {stages.map((st, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={st} className="relative flex items-center">
              {/* Bullet Badge Indicator */}
              <div className="absolute -left-[28.5px] top-0 flex items-center justify-center">
                {isCompleted ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-4 ring-white shadow-xs">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                ) : isActive ? (
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-white ring-4 ring-white shadow-xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </motion.div>
                ) : (
                  <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300 ring-4 ring-white shadow-xs">
                    <Circle className="w-2 h-2 fill-slate-300" />
                  </div>
                )}
              </div>

              {/* Step Label Text */}
              <div className="flex flex-col">
                <span className={`text-xs font-bold leading-none ${
                  isCompleted 
                    ? "text-slate-600 font-extrabold" 
                    : isActive 
                      ? "text-brand-primary font-black scale-[1.02] origin-left" 
                      : "text-slate-400 font-semibold"
                }`}>
                  {st}
                </span>
                {isActive && (
                  <span className="text-[9px] font-bold text-[#D9A441] uppercase tracking-widest mt-1 animate-pulse">
                    Fase Atual
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
