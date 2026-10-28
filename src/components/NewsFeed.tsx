import React, { useState } from 'react';
import { Noticia } from '../types';
import { formatearFechaPublicacion } from '../utils/dateFormatter';
import { ExternalLink, Search, X } from 'lucide-react';

interface NewsFeedProps {
  noticias: Noticia[];
  activeTopic: string;
  onSelectTopic: (topic: string) => void;
  selectedDepartment: string | null;
  onClearDepartment: () => void;
  selectedKeyword?: string | null;
  onClearKeyword?: () => void;
}

const TOPIC_CHIPS = [
  { id: 'all', label: 'Todos los temas' },
  { id: 'Economía', label: 'Economía' },
  { id: 'Seguridad', label: 'Seguridad' },
  { id: 'Política', label: 'Política' },
  { id: 'Litio', label: 'Litio y Minería' },
  { id: 'Salud', label: 'Salud' },
  { id: 'Carnaval y Cultura', label: 'Cultura' },
];

export const NewsFeed: React.FC<NewsFeedProps> = ({
  noticias,
  activeTopic,
  onSelectTopic,
  selectedDepartment,
  onClearDepartment,
  selectedKeyword,
  onClearKeyword,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtering
  const filtered = noticias.filter((n) => {
    // Topic filter
    if (activeTopic !== 'all') {
      const matchTopic = (n.tema || '').toLowerCase().includes(activeTopic.toLowerCase());
      if (!matchTopic) return false;
    }

    // Department filter
    if (selectedDepartment) {
      const dLower = selectedDepartment.toLowerCase();
      const txt = `${n.titulo} ${n.contenido || ''}`.toLowerCase();
      if (!txt.includes(dLower)) return false;
    }

    // Keyword filter
    if (selectedKeyword) {
      const kLower = selectedKeyword.toLowerCase();
      const txt = `${n.titulo} ${n.keywords || ''} ${n.tema || ''}`.toLowerCase();
      if (!txt.includes(kLower)) return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const sLower = searchTerm.toLowerCase();
      const txt = `${n.titulo} ${n.fuente || ''} ${n.tema || ''}`.toLowerCase();
      if (!txt.includes(sLower)) return false;
    }

    return true;
  });

  const getSourceBadgeColor = (fuente: string) => {
    const f = fuente.toLowerCase();
    if (f.includes('tribuno')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (f.includes('momento')) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (f.includes('pregon')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (f.includes('online')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  };

  return (
    <section className="rounded-2xl bg-[#0c1222] border border-white/[0.08] shadow-2xl overflow-hidden" id="news-feed-card">
      {/* SECTION HEADER */}
      <div className="p-6 border-b border-white/[0.06] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Noticias en el Radar</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoreo en vivo de medios periodísticos locales de Jujuy
          </p>
        </div>

        {/* TOPIC SEGMENTED BUTTONS (FUNCTIONAL FILTER BUTTONS) */}
        <div className="flex flex-wrap gap-1.5 items-center p-1 bg-[#070b16] rounded-xl border border-white/[0.06]" id="topic-filter-chips">
          {TOPIC_CHIPS.map((chip) => {
            const isActive = activeTopic.toLowerCase() === chip.id.toLowerCase();
            return (
              <button
                key={chip.id}
                onClick={() => onSelectTopic(chip.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH AND APPLIED FILTERS SUBHEADER */}
      <div className="px-6 py-3.5 bg-white/[0.01] border-b border-white/[0.04] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {selectedDepartment && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded-lg font-semibold">
              <span>📍 {selectedDepartment}</span>
              <button
                onClick={onClearDepartment}
                className="hover:text-white p-0.5"
                title="Quitar filtro de departamento"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedKeyword && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-lg font-semibold">
              <span>#{selectedKeyword}</span>
              <button
                onClick={onClearKeyword}
                className="hover:text-white p-0.5"
                title="Quitar filtro de concepto"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <span className="text-slate-400 font-medium">
            Mostrando <strong className="text-slate-200 font-mono tabular-nums">{filtered.length}</strong> de{' '}
            <span className="font-mono tabular-nums">{noticias.length}</span> notas
          </span>
        </div>

        <div className="relative min-w-[240px] flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por titular o término..."
            className="w-full pl-9 pr-8 py-1.5 bg-[#070b16] border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* STREAM CONTAINER */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="noticias-list">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <p className="text-sm font-medium">No se hallaron notas para los filtros seleccionados.</p>
            <p className="text-xs text-slate-500 mt-1">Prueba seleccionando "Todos los temas" o quitando el filtro de búsqueda.</p>
          </div>
        ) : (
          filtered.slice(0, 24).map((n) => {
            const cNeg = n.neg ?? 0;
            const cPos = n.pos ?? 0;

            let toneBadge = 'Informativo';
            let toneColor = 'text-slate-400';
            if (cNeg > cPos && cNeg > 0) {
              toneBadge = 'Crítico';
              toneColor = 'text-rose-400';
            } else if (cPos > cNeg && cPos > 0) {
              toneBadge = 'Favorable';
              toneColor = 'text-emerald-400';
            }

            const rawLink = n.link || '';
            const isGoogleSearch = rawLink.includes('google.com/search');
            const hasValidLink = rawLink.startsWith('http');
            const link = hasValidLink ? rawLink : '#';

            let accionLabel = 'Abrir noticia';
            if (isGoogleSearch) {
              accionLabel = 'Buscar en Google';
            } else if (hasValidLink) {
              try {
                const hostname = new URL(link).hostname.replace('www.', '').replace('news.', '');
                accionLabel = `Leer en ${hostname}`;
              } catch {
                accionLabel = 'Leer noticia';
              }
            }

            const fuenteRaw = n.fuente || 'web';
            const fuenteLegible = fuenteRaw.replace(/_/g, ' ').toUpperCase();
            const fechaFormateada = formatearFechaPublicacion(n.fecha);
            const badgeColor = getSourceBadgeColor(fuenteRaw);

            return (
              <a
                key={n.id}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-[#070b16]/70 border border-white/[0.06] hover:border-indigo-500/40 rounded-xl p-4 flex flex-col justify-between gap-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/50"
                title={accionLabel}
              >
                {/* TOP METADATA ROW */}
                <div className="flex justify-between items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded text-[0.68rem] font-bold tracking-wider border ${badgeColor}`}>
                    {fuenteLegible}
                  </span>
                  <span className="text-[0.7rem] text-slate-400 font-mono">
                    {fechaFormateada}
                  </span>
                </div>

                {/* HEADLINE */}
                <h4 className="text-sm font-semibold text-slate-100 group-hover:text-white leading-snug line-clamp-3 text-balance">
                  {n.titulo}
                </h4>

                {/* BOTTOM METADATA & ACTION */}
                <div className="flex justify-between items-center text-xs pt-2.5 border-t border-white/[0.04] mt-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.72rem] text-slate-400 font-medium">
                      {n.tema || 'General'}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className={`text-[0.72rem] font-medium ${toneColor}`}>
                      {toneBadge}
                    </span>
                  </div>

                  <span className="text-[0.72rem] text-indigo-400 group-hover:text-indigo-300 font-semibold inline-flex items-center gap-1 transition-colors">
                    <span>{accionLabel}</span>
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </a>
            );
          })
        )}
      </div>
    </section>
  );
};
