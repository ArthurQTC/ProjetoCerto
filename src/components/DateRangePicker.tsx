import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  
  // Local temporary states for filtering
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  // Sync local states when the popover opens
  useEffect(() => {
    if (isOpen) {
      setLocalStartDate(startDate);
      setLocalEndDate(endDate);
    }
  }, [isOpen, startDate, endDate]);

  // Initialize reference date (default to today or June 2026 if today is in 2026)
  const [leftCalendarDate, setLeftCalendarDate] = useState(() => {
    const refDateStr = startDate || endDate || "";
    if (refDateStr) {
      return new Date(refDateStr);
    }
    return new Date(); // Defaults to system time
  });

  // Handle outside click to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mouseup", handleClickOutside);
  }, []);

  const formatToDateInput = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const r = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${r}`;
  };

  const parseFromDateInput = (str: string): Date | null => {
    if (!str) return null;
    const parts = str.split("-");
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

  const getPresetDates = (preset: string) => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const start = new Date(today);
    const end = new Date(today);

    switch (preset) {
      case "hoje":
        return { start, end };
      case "ontem":
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        return { start, end };
      case "semana":
        // Monday of current week
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        end.setDate(diff + 6);
        return { start, end };
      case "mes":
        start.setDate(1);
        end.setMonth(today.getMonth() + 1, 0);
        return { start, end };
      case "mes_passado":
        start.setMonth(today.getMonth() - 1, 1);
        end.setMonth(today.getMonth(), 0);
        return { start, end };
      case "ano":
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        return { start, end };
      case "ano_passado":
        start.setFullYear(today.getFullYear() - 1, 0, 1);
        end.setFullYear(today.getFullYear() - 1, 11, 31);
        return { start, end };
      case "tudo":
      default:
        return { start: null, end: null };
    }
  };

  const applyPreset = (preset: string) => {
    const { start, end } = getPresetDates(preset);
    if (!start || !end) {
      setLocalStartDate("");
      setLocalEndDate("");
    } else {
      setLocalStartDate(formatToDateInput(start));
      setLocalEndDate(formatToDateInput(end));
      setLeftCalendarDate(new Date(start));
    }
  };

  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return "__/__/____";
    const d = parseFromDateInput(dateStr);
    if (!d) return "__/__/____";
    return new Intl.DateTimeFormat("pt-BR").format(d);
  };

  const handleDayClick = (dayDate: Date) => {
    dayDate.setHours(12, 0, 0, 0);
    const startObj = parseFromDateInput(localStartDate);
    const endObj = parseFromDateInput(localEndDate);

    if (!startObj || (startObj && endObj)) {
      // First click or both set: start new selection
      setLocalStartDate(formatToDateInput(dayDate));
      setLocalEndDate("");
    } else {
      // Start is set but not end
      if (dayDate < startObj) {
        // Earlier than start: make it start
        setLocalStartDate(formatToDateInput(dayDate));
        setLocalEndDate("");
      } else {
        // Later or equal: make it end
        setLocalEndDate(formatToDateInput(dayDate));
      }
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const nextDate = new Date(leftCalendarDate);
    if (direction === "prev") {
      nextDate.setMonth(leftCalendarDate.getMonth() - 1);
    } else {
      nextDate.setMonth(leftCalendarDate.getMonth() + 1);
    }
    setLeftCalendarDate(nextDate);
  };

  const generateMonthDays = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();

    // First day of target month (0 = Sun, 1 = Mon...)
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Prior month overflow
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i, 12, 0, 0, 0),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i, 12, 0, 0, 0),
        isCurrentMonth: true,
      });
    }

    // Next month overflow to fill exactly 42 slots (6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i, 12, 0, 0, 0),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getDayClasses = (dayDate: Date, isCurrentMonth: boolean) => {
    const startObj = parseFromDateInput(localStartDate);
    const endObj = parseFromDateInput(localEndDate);
    
    dayDate.setHours(12, 0, 0, 0);
    const time = dayDate.getTime();
    
    const isStart = startObj && startObj.getTime() === time;
    let isEnd = endObj && endObj.getTime() === time;
    let inRange = startObj && endObj && time > startObj.getTime() && time < endObj.getTime();

    // Dynamically show preview range if start is set but end is not
    if (startObj && !endObj && hoveredDate) {
      const hoveredTime = hoveredDate.getTime();
      if (hoveredTime > startObj.getTime()) {
        if (time === hoveredTime) {
          isEnd = true;
        } else if (time > startObj.getTime() && time < hoveredTime) {
          inRange = true;
        }
      }
    }

    let base = "h-8 w-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all cursor-pointer relative select-none ";

    if (isStart || isEnd) {
      base += "bg-brand-primary text-white shadow-xs z-10 font-bold ";
    } else if (inRange) {
      base += "bg-brand-primary/10 text-brand-primary rounded-none hover:bg-brand-primary/20 ";
    } else if (!isCurrentMonth) {
      base += "text-slate-300 hover:bg-slate-50 ";
    } else {
      base += "text-slate-700 hover:bg-slate-100 ";
    }

    return base;
  };

  const getLeftAndRightCalendarDates = () => {
    const left = new Date(leftCalendarDate);
    const right = new Date(leftCalendarDate);
    right.setMonth(left.getMonth() + 1);
    return { left, right };
  };

  const { left: leftCal, right: rightCal } = getLeftAndRightCalendarDates();

  const getPortugueseMonthYear = (d: Date) => {
    const months = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  return (
    <div ref={containerRef} className="relative inline-block text-left" id="calendar_range_picker_wrapper">
      {/* Date trigger input fields displayed side by side */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center border border-slate-200 rounded-xl overflow-hidden cursor-pointer bg-white hover:border-slate-300 transition-colors shadow-xs"
      >
        <div className="bg-slate-50 border-r border-slate-200 p-2 text-slate-500 hover:bg-slate-100 transition-colors flex items-center justify-center">
          <Calendar className="w-4 h-4 text-brand-text-secondary" />
        </div>
        <div className="px-3.5 py-1.5 text-[10px] min-[360px]:text-xs font-bold font-mono text-slate-700 select-none">
          {startDate || endDate ? (
            <span>
              {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
            </span>
          ) : (
            <span className="text-slate-400 font-sans font-semibold">Selecione o Período</span>
          )}
        </div>
        {(startDate || endDate) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange("", "");
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 mr-1 rounded-full hover:bg-slate-100 transition-colors"
            title="Limpar período"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div 
          className="absolute left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ width: "660px", maxWidth: "calc(100vw - 2rem)" }}
        >
          {/* Main Content Area: presets + calendars */}
          <div className="flex flex-row overflow-hidden">
            {/* Preset Sidebar */}
            <div className="w-36 bg-slate-50/55 border-r border-slate-100 p-2.5 flex flex-col gap-1.5 shrink-0 select-none">
              <button
                onClick={() => applyPreset("hoje")}
                className="text-left px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-brand-primary/5 hover:text-brand-primary rounded-lg transition-colors cursor-pointer"
              >
                Hoje
              </button>
              <button
                onClick={() => applyPreset("ontem")}
                className="text-left px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-brand-primary/5 hover:text-brand-primary rounded-lg transition-colors cursor-pointer"
              >
                Ontem
              </button>
              <button
                onClick={() => applyPreset("semana")}
                className="text-left px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-brand-primary/5 hover:text-brand-primary rounded-lg transition-colors cursor-pointer"
              >
                Semana
              </button>
              <button
                onClick={() => applyPreset("mes")}
                className="text-left px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-brand-primary/5 hover:text-brand-primary rounded-lg transition-colors cursor-pointer"
              >
                Mês
              </button>
              <button
                onClick={() => applyPreset("mes_passado")}
                className="text-left px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-brand-primary/5 hover:text-brand-primary rounded-lg transition-colors cursor-pointer"
              >
                Mês passado
              </button>
              <button
                onClick={() => applyPreset("ano")}
                className="text-left px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-brand-primary/5 hover:text-brand-primary rounded-lg transition-colors cursor-pointer"
              >
                Ano
              </button>
              <button
                onClick={() => applyPreset("ano_passado")}
                className="text-left px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-brand-primary/5 hover:text-brand-primary rounded-lg transition-colors cursor-pointer"
              >
                Ano passado
              </button>
              <button
                onClick={() => applyPreset("tudo")}
                className="text-left px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-brand-primary/5 hover:text-brand-primary rounded-lg transition-colors cursor-pointer"
              >
                Tudo
              </button>
            </div>

            {/* Calendar Area */}
            <div className="flex-1 p-5 flex flex-col gap-4 overflow-hidden">
              {/* Header displaying specific Date values as editable inputs for manual writing or calendar selection */}
              <div className="space-y-1.5 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Insira as datas manualmente ou clique no calendário:
                </span>
                <div className="flex justify-between items-center gap-2.5">
                  {/* Left Input Display */}
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-1 px-2.5 flex items-center gap-1.5 focus-within:bg-white focus-within:ring-1 focus-within:ring-brand-primary focus-within:border-brand-primary transition-all text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      value={localStartDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalStartDate(val);
                        const d = parseFromDateInput(val);
                        if (d && !isNaN(d.getTime())) {
                          setLeftCalendarDate(d);
                        }
                      }}
                      className="w-full text-xs font-bold font-mono text-slate-800 bg-transparent border-0 outline-hidden focus:outline-hidden p-0 focus:ring-0 min-h-[22px] min-w-0"
                    />
                  </div>
                  <span className="text-slate-300 font-bold shrink-0 text-xs">até</span>
                  {/* Right Input Display */}
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-1 px-2.5 flex items-center gap-1.5 focus-within:bg-white focus-within:ring-1 focus-within:ring-brand-primary focus-within:border-brand-primary transition-all text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      value={localEndDate}
                      onChange={(e) => {
                        setLocalEndDate(e.target.value);
                      }}
                      className="w-full text-xs font-bold font-mono text-slate-800 bg-transparent border-0 outline-hidden focus:outline-hidden p-0 focus:ring-0 min-h-[22px] min-w-0"
                    />
                  </div>
                </div>
              </div>

              {/* Calendars side-by-side */}
              <div className="flex gap-6 grow relative" onMouseLeave={() => setHoveredDate(null)}>
                
                {/* Month 1 (Left) */}
                <div className="flex-1 select-none">
                  <div className="flex justify-between items-center mb-3">
                    <button 
                      onClick={() => navigateMonth("prev")} 
                      className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest font-sans">
                      {getPortugueseMonthYear(leftCal)}
                    </span>
                    <div className="w-6 shrink-0" /> {/* Spacer to align */}
                  </div>

                  <div className="grid grid-cols-7 gap-y-1 justify-items-center mb-1">
                    {weekDays.map((day) => (
                      <span key={day} className="text-[10px] font-bold text-slate-400 w-8 text-center uppercase tracking-wider">
                        {day}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                    {generateMonthDays(leftCal).map((day, idx) => (
                      <div
                        key={`left-${idx}`}
                        onClick={() => handleDayClick(day.date)}
                        onMouseEnter={() => {
                          const d = new Date(day.date);
                          d.setHours(12, 0, 0, 0);
                          setHoveredDate(d);
                        }}
                        className={getDayClasses(day.date, day.isCurrentMonth)}
                      >
                        {day.date.getDate()}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Month 2 (Right) */}
                <div className="flex-1 select-none">
                  <div className="flex justify-between items-center mb-3">
                    <div className="w-6 shrink-0" /> {/* Spacer to align */}
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest font-sans animate-none">
                      {getPortugueseMonthYear(rightCal)}
                    </span>
                    <button 
                      onClick={() => navigateMonth("next")} 
                      className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 cursor-pointer shrink-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-y-1 justify-items-center mb-1">
                    {weekDays.map((day) => (
                      <span key={day} className="text-[10px] font-bold text-slate-400 w-8 text-center uppercase tracking-wider">
                        {day}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                    {generateMonthDays(rightCal).map((day, idx) => (
                      <div
                        key={`right-${idx}`}
                        onClick={() => handleDayClick(day.date)}
                        onMouseEnter={() => {
                          const d = new Date(day.date);
                          d.setHours(12, 0, 0, 0);
                          setHoveredDate(d);
                        }}
                        className={getDayClasses(day.date, day.isCurrentMonth)}
                      >
                        {day.date.getDate()}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* New Footer Panel containing Clear and Apply Buttons */}
          <div className="flex justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100 shrink-0">
            <button
              onClick={() => {
                setLocalStartDate("");
                setLocalEndDate("");
              }}
              className="px-3.5 py-1.5 text-xs font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer bg-white"
            >
              Limpar Seleção
            </button>
            <button
              onClick={() => {
                onChange(localStartDate, localEndDate);
                setIsOpen(false);
              }}
              className="px-4 py-1.5 text-xs font-bold bg-brand-primary text-white rounded-lg hover:bg-brand-primary/95 transition-colors cursor-pointer"
            >
              Aplicar Filtro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
