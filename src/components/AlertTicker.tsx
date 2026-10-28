import React, { useState } from 'react';
import { AlertTriangle, Flame, BellRing, ChevronRight, X } from 'lucide-react';

interface AlertTickerProps {
  indice: number;
  onDepartmentSelect?: (dept: string) => void;
}

export const AlertTicker: React.FC<AlertTickerProps> = ({ indice, onDepartmentSelect }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const alertas = [
    {
      tipo: 'alerta',
      departamento: 'Dr. Manuel Belgrano',
      texto: 'Alta concentración de comentarios críticos por frecuencias de colectivos y tarifas.',
      badge: 'Transporte'
    },
    {
      tipo: 'atencion',
      departamento: 'Humahuaca',
      texto: 'Reportes de congestión y asambleas informativas en cercanías de Ruta 9.',
      badge: 'Vialidad'
    },
    {
      tipo: 'monitoreo',
      departamento: 'Ledesma',
      texto: 'Reclamos por cortes preventivos de energía en barrios periféricos de Libertador.',
      badge: 'Servicios'
    }
  ];

  return (
    <div className="w-full bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 border-y border-amber-500/20 backdrop-blur-md px-4 py-2 flex items-center justify-between text-xs text-slate-200">
      <div className="max-w-[1440px] mx-auto w-full flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold tracking-wider text-[11px] uppercase animate-pulse">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Focos Activos</span>
        </div>

        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-6 text-slate-300">
          {alertas.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onDepartmentSelect && onDepartmentSelect(item.departamento)}
              className="inline-flex items-center gap-2 hover:text-white shrink-0 transition-colors group cursor-pointer text-left"
            >
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-semibold text-indigo-300 group-hover:border-indigo-400/40">
                {item.badge}
              </span>
              <span className="font-semibold text-slate-200 group-hover:text-amber-300">
                {item.departamento}:
              </span>
              <span className="text-slate-400 group-hover:text-slate-200">{item.texto}</span>
              <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Ocultar alertas"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
