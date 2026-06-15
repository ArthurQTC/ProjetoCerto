import { useState, useEffect } from "react";
import { Goal, Edit2, Check } from "lucide-react";

interface ProgressBarKPIProps {
  title: string;
  current: number;
  goal: number;
  color: "indigo" | "rose" | "emerald";
  description?: string;
  hideBar?: boolean;
  onGoalChange?: (newGoal: number) => void;
  onClick?: () => void;
}

export default function ProgressBarKPI({ 
  title, 
  current, 
  goal, 
  color, 
  description, 
  hideBar,
  onGoalChange,
  onClick
}: ProgressBarKPIProps) {
  const percent = goal > 0 ? (current / goal) * 100 : 0;
  const clampedPercent = Math.min(percent, 100).toFixed(2);
  const formattedPercent = percent.toFixed(2);

  const formatBRLValue = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatBRLInputValue = (valueStr: string) => {
    const digits = valueStr.replace(/\D/g, "");
    if (!digits) return "0,00";
    const cents = parseInt(digits, 10);
    const floatVal = cents / 100;
    return formatBRLValue(floatVal);
  };

  const parseBRLInputValue = (formattedStr: string) => {
    const digits = formattedStr.replace(/\D/g, "");
    if (!digits) return 0;
    return parseInt(digits, 10) / 100;
  };

  const [isEditing, setIsEditing] = useState(false);
  const [valInput, setValInput] = useState(formatBRLValue(goal));

  // Sync valInput if goal parameter changes externally
  useEffect(() => {
    setValInput(formatBRLValue(goal));
  }, [goal]);

  const themeColors = {
    indigo: {
      bar: "bg-brand-primary",
      bg: "bg-brand-primary/5",
      text: "text-brand-primary font-extrabold",
      border: "border-brand-primary/10",
    },
    rose: {
      bar: "bg-brand-error",
      bg: "bg-brand-error/5",
      text: "text-brand-error font-extrabold",
      border: "border-brand-error/10",
    },
    emerald: {
      bar: "bg-brand-success",
      bg: "bg-brand-success/5",
      text: "text-brand-success font-extrabold",
      border: "border-brand-success/15",
    },
  }[color];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleSave = () => {
    const parsed = parseBRLInputValue(valInput);
    if (parsed >= 0) {
      onGoalChange?.(parsed);
    } else {
      setValInput(formatBRLValue(goal));
    }
    setIsEditing(false);
  };

  return (
    <div 
      className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200 ${
        onClick ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50/20" : ""
      }`}
      onClick={onClick}
    >
      <div>
        <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest block">{title}</span>
        <h4 className="text-xs min-[380px]:text-sm sm:text-base font-extrabold font-mono tracking-tight text-brand-text-primary mt-1.5 flex items-center flex-nowrap whitespace-nowrap gap-1 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-100 overflow-x-auto scrollbar-none">
          <span className="text-brand-primary shrink-0">{formatCurrency(current)}</span>
          <span className="text-slate-300 font-sans mx-1 shrink-0">/</span>
          {isEditing ? (
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] text-slate-400 font-sans">R$</span>
              <input
                type="text"
                className="w-28 px-1.5 py-0.5 rounded border border-slate-300 text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-1 focus:ring-brand-primary text-right"
                value={valInput}
                onChange={(e) => {
                  const formatted = formatBRLInputValue(e.target.value);
                  setValInput(formatted);
                }}
                onBlur={handleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") {
                    setValInput(formatBRLValue(goal));
                    setIsEditing(false);
                  }
                }}
                autoFocus
              />
              <button 
                id={`btn_save_goal_edit_${title.toLowerCase().replace(/\s+/g, '_')}`}
                onClick={handleSave} 
                className="p-1 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md shrink-0" 
                title="Salvar"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 select-none shrink-0">
              <span className="text-brand-text-secondary text-sm font-medium shrink-0">{formatCurrency(goal)}</span>
              {onGoalChange && (
                <button
                  id={`btn_edit_goal_${title.toLowerCase().replace(/\s+/g, '_')}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setValInput(formatBRLValue(goal));
                    setIsEditing(true);
                  }}
                  className="p-1 text-slate-500 hover:text-brand-primary bg-slate-100/80 hover:bg-slate-200/85 rounded-md transition-all duration-200 cursor-pointer text-xs shrink-0"
                  title="Editar Meta"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </h4>
        {description && !hideBar && (
          <p className="text-[10px] text-brand-text-secondary mt-1.5 font-semibold">{description}</p>
        )}
      </div>

      {!hideBar && (
        <div className="mt-4">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${themeColors.bar}`}
              style={{ width: `${clampedPercent}%` }}
            />
          </div>

          <div className="flex justify-between items-center mt-2.5 text-[10px] font-bold text-brand-text-secondary">
            <span className="flex items-center gap-1 opacity-70">
              <Goal className="w-3 h-3 text-brand-text-secondary" />
              Meta
            </span>
            <span className={`${themeColors.text} bg-slate-100 py-0.5 px-1.5 rounded-md`}>
              {formattedPercent}% atingido
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
