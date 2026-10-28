import React from 'react';
import { ComentarioDestacado } from '../types';
import { formatearMedio, formatearFechaPublicacion } from '../utils/dateFormatter';
import { ExternalLink, Quote } from 'lucide-react';

interface CitizenVoicesProps {
  comentarios: ComentarioDestacado[];
  dias: number;
}

export const CitizenVoices: React.FC<CitizenVoicesProps> = ({ comentarios, dias }) => {
  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-6 py-4 border-b border-white/[0.04]">
        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <span>Voces y Reclamos Ciudadanos Recientes</span>
        </h4>
        <span className="text-xs text-slate-400 font-medium">
          {comentarios.length} testimonios en notas ({dias === 1 ? 'últimas 24 hs' : `últimos ${dias} días`})
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="citizen-voices-list">
        {comentarios.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            Sin testimonios registrados en este intervalo temporal
          </div>
        ) : (
          comentarios.slice(0, 9).map((c) => {
            const sent = c.sentimiento || 'NEU';
            let tagColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20';
            let tagLabel = 'Informativo';

            if (sent === 'NEG') {
              tagColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
              tagLabel = 'Reclamo Vecinal';
            } else if (sent === 'POS') {
              tagColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
              tagLabel = 'Opinión Favorable';
            }

            const medioNombre = formatearMedio(c.noticia_fuente);
            const fechaStr = formatearFechaPublicacion(c.fecha);

            return (
              <div
                key={c.id}
                className="bg-[#070b16]/70 border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-4 flex flex-col justify-between gap-3.5 transition-all"
              >
                <div className="flex justify-between items-center gap-2 text-xs">
                  <span className={`text-[0.68rem] font-bold px-2 py-0.5 rounded border ${tagColor}`}>
                    {tagLabel}
                  </span>
                  <span className="text-[0.7rem] text-slate-500 font-mono">
                    {fechaStr}
                  </span>
                </div>

                <div className="relative my-1">
                  <Quote className="w-5 h-5 text-white/10 absolute -top-1 -left-1 pointer-events-none" />
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic pl-4 font-normal">
                    “{c.texto}”
                  </p>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 border-t border-white/[0.04] pt-2.5 mt-auto">
                  <span className="text-[0.72rem] text-slate-400 truncate max-w-[65%]">
                    Fuente: <strong className="text-slate-200 font-medium">{medioNombre}</strong>
                  </span>
                  {c.noticia_link && (
                    <a
                      href={c.noticia_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.72rem] text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 transition-colors shrink-0"
                      title={c.noticia_titulo || ''}
                    >
                      <span>Abrir</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};
