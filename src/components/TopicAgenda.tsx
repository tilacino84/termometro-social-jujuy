import React from 'react';
import { TemaFrecuente } from '../types';

interface TopicAgendaProps {
  temas: TemaFrecuente[];
  selectedTopic: string;
  onSelectTopic: (topic: string) => void;
}

export const TopicAgenda: React.FC<TopicAgendaProps> = ({
  temas,
  selectedTopic,
  onSelectTopic,
}) => {
  const maxTotal = Math.max(...temas.map((t) => t.total), 1);

  return (
    <div className="rounded-2xl bg-[#0c1222] border border-white/[0.08] p-6 shadow-2xl flex flex-col justify-between">
      <div className="pb-4 border-b border-white/[0.06]">
        <h3 className="text-base font-bold text-white tracking-tight">Agenda Temática</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Volumen de cobertura periodística en Jujuy
        </p>
      </div>

      <div className="pt-4 flex-1">
        {temas.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">Sin temas en este intervalo</div>
        ) : (
          <div className="flex flex-col gap-2.5" id="temas-list">
            {temas.slice(0, 6).map((t, idx) => {
              const isSelected = selectedTopic.toLowerCase() === (t.tema || '').toLowerCase();
              const pct = Math.round((t.total / maxTotal) * 100);

              return (
                <div
                  key={t.tema}
                  onClick={() => onSelectTopic(isSelected ? 'all' : t.tema)}
                  className={`group relative overflow-hidden p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-white'
                      : 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.12] text-slate-300'
                  }`}
                  title="Click para filtrar noticias por este tema"
                >
                  {/* Subtle progress fill backdrop */}
                  <div
                    className="absolute inset-y-0 left-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors pointer-events-none"
                    style={{ width: `${pct}%` }}
                  />

                  <div className="relative flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 font-mono text-[0.72rem] text-slate-500 font-bold">
                        0{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-100 group-hover:text-white transition-colors">
                        {t.tema || 'General'}
                      </span>
                    </div>

                    <span className="font-mono text-[0.72rem] text-slate-400 group-hover:text-slate-200 tabular-nums font-semibold">
                      {t.total} notas
                    </span>
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
