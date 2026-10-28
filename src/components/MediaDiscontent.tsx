import React from 'react';
import { Noticia } from '../types';

interface MediaDiscontentProps {
  noticias: Noticia[];
}

export const MediaDiscontent: React.FC<MediaDiscontentProps> = ({ noticias }) => {
  const mediosDef = [
    { key: 'jujuy_al_momento', match: 'momento', nombre: 'Jujuy Al Momento', reclamos: 0, total: 0 },
    { key: 'eltribuno', match: 'tribuno', nombre: 'El Tribuno de Jujuy', reclamos: 0, total: 0 },
    { key: 'jujuy_online', match: 'online', nombre: 'Jujuy OnLine Noticias', reclamos: 0, total: 0 },
    { key: 'pregon', match: 'pregon', nombre: 'Diario Pregón', reclamos: 0, total: 0 }
  ];

  noticias.forEach((n) => {
    const fuenteStr = (n.fuente || '').toLowerCase();
    for (const m of mediosDef) {
      if (fuenteStr.includes(m.match)) {
        const tot = n.total_comentarios || 1;
        const neg = n.neg || (n.sentimiento === 'NEG' ? 1 : 0);
        m.total += tot;
        m.reclamos += neg;
        break;
      }
    }
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-b border-white/[0.06]" id="media-discontent-list">
      {mediosDef.map((m) => {
        const pct = m.total > 0 ? Math.round((m.reclamos / m.total) * 100) : 0;
        let badgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
        let badgeText = 'Tranquilo';
        let barColor = 'bg-emerald-500';

        if (pct >= 35) {
          badgeColor = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
          badgeText = `${pct}% Reclamos`;
          barColor = 'bg-rose-500';
        } else if (pct >= 15) {
          badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
          badgeText = `${pct}% Descontento`;
          barColor = 'bg-amber-500';
        } else if (m.total > 0) {
          badgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
          badgeText = `${pct}% Críticas`;
          barColor = 'bg-emerald-500';
        } else {
          badgeColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
          badgeText = 'Sin incidentes';
          barColor = 'bg-slate-600';
        }

        return (
          <div
            key={m.key}
            className="bg-[#070b16]/70 border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-white/[0.12] transition-colors"
          >
            <div className="flex justify-between items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                {m.nombre}
              </span>
              <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded border font-mono tabular-nums ${badgeColor}`}>
                {badgeText}
              </span>
            </div>

            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden my-1">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${Math.max(pct, 4)}%` }}
              />
            </div>

            <p className="text-[0.72rem] text-slate-400 leading-relaxed font-mono tabular-nums">
              <strong className="text-slate-200">{m.reclamos}</strong> reclamos de <strong className="text-slate-200">{m.total}</strong> registros analizados.
            </p>
          </div>
        );
      })}
    </div>
  );
};
