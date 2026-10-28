import React from 'react';
import { SentimientoPorTema } from '../types';

interface SectorBreakdownProps {
  sectores: SentimientoPorTema[];
  onSelectTopic?: (topic: string) => void;
}

export const SectorBreakdown: React.FC<SectorBreakdownProps> = ({ sectores, onSelectTopic }) => {
  return (
    <div className="rounded-2xl bg-[#0c1222] border border-white/[0.08] p-6 shadow-2xl flex flex-col justify-between">
      <div className="pb-4 border-b border-white/[0.06]">
        <h3 className="text-base font-bold text-white tracking-tight">Termómetro por Sector</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Proporción de tensión vs. aprobación en cada rubro
        </p>
      </div>

      <div className="pt-4 flex-1">
        {sectores.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">Sin datos sectoriales</div>
        ) : (
          <div className="flex flex-col gap-3.5" id="sentiment-topics-body">
            {sectores.slice(0, 6).map((sec) => {
              const total = sec.total_comentarios || (sec.positivos + sec.negativos + sec.neutros) || 1;
              const pNeg = Math.round((sec.negativos / total) * 100);
              const pNeu = Math.round((sec.neutros / total) * 100);
              const pPos = Math.round((sec.positivos / total) * 100);

              return (
                <div
                  key={sec.tema}
                  className="cursor-pointer group flex flex-col gap-1.5"
                  onClick={() => onSelectTopic && onSelectTopic(sec.tema)}
                  title={`Filtrar por ${sec.tema}: ${sec.negativos} negativos, ${sec.neutros} neutros, ${sec.positivos} positivos`}
                >
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-200 group-hover:text-indigo-300 font-semibold transition-colors">
                      {sec.tema}
                    </span>
                    <span className="font-mono text-[0.72rem] text-slate-400 tabular-nums">
                      {total} opiniones
                    </span>
                  </div>

                  <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
                    {pNeg > 0 && (
                      <div
                        className="h-full bg-rose-500 transition-all duration-500"
                        style={{ width: `${pNeg}%` }}
                        title={`Crítico: ${pNeg}% (${sec.negativos})`}
                      />
                    )}
                    {pNeu > 0 && (
                      <div
                        className="h-full bg-slate-500 transition-all duration-500"
                        style={{ width: `${pNeu}%` }}
                        title={`Neutro: ${pNeu}% (${sec.neutros})`}
                      />
                    )}
                    {pPos > 0 && (
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${pPos}%` }}
                        title={`Favorable: ${pPos}% (${sec.positivos})`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
