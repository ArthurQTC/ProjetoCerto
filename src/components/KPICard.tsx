import { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: number;
  type: "currency" | "percentage";
  icon: ReactNode;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    positive: boolean;
  };
  id?: string;
}

export default function KPICard({ title, value, type, icon, subtitle, trend, id }: KPICardProps) {
  const formattedValue =
    type === "currency"
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
      : `${value.toFixed(2)}%`;

  return (
    <div id={id} className="group relative bg-white p-6 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-brand-text-secondary uppercase tracking-widest">{title}</span>
        <div className="p-3 bg-brand-bg rounded-xl text-brand-secondary group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors duration-300">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-800">
          {formattedValue}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1.5 mt-2.5">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                trend.positive
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}
            >
              {trend.value >= 0 ? "+" : ""}{trend.value.toFixed(2)}%
            </span>
            <span className="text-[10px] bg-slate-50 text-slate-400 border border-slate-100 py-0.5 px-1.5 rounded-md font-medium">
              {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
