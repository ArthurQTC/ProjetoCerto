import { Goal } from "lucide-react";

interface ProgressBarKPIProps {
  title: string;
  current: number;
  goal: number;
  color: "indigo" | "rose" | "emerald";
  description?: string;
  hideBar?: boolean;
}

export default function ProgressBarKPI({ title, current, goal, color, description, hideBar }: ProgressBarKPIProps) {
  const percent = goal > 0 ? (current / goal) * 100 : 0;
  const isOverLimit = percent > 100;
  const clampedPercent = Math.min(percent, 100).toFixed(2);
  const formattedPercent = percent.toFixed(2);

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

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-widest block">{title}</span>
        <h4 className="text-base font-extrabold font-mono tracking-tight text-brand-text-primary mt-1.5 flex items-baseline gap-1 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-100">
          <span className="text-brand-primary">{formatCurrency(current)}</span>
          <span className="text-slate-300 font-sans mx-1">/</span>
          <span className="text-brand-text-secondary text-sm font-medium">{formatCurrency(goal)}</span>
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
              Meta Fixada
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
