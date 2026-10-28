import React from 'react';
import { KeywordTrending } from '../types';

interface KeywordsCloudProps {
  keywords: KeywordTrending[];
  selectedKeyword?: string | null;
  onSelectKeyword?: (keyword: string | null) => void;
}

export const KeywordsCloud: React.FC<KeywordsCloudProps> = ({
  keywords,
  selectedKeyword,
  onSelectKeyword,
}) => {
  return (
    <div className="rounded-2xl bg-[#0c1222] border border-white/[0.08] p-6 shadow-2xl flex flex-col justify-between">
      <div className="pb-4 border-b border-white/[0.06]">
        <h3 className="text-base font-bold text-white tracking-tight">Conceptos en Foco</h3>
        <p className="text-xs text-slate-400 mt-0.5">Términos destacados en las notas del día</p>
      </div>

      <div className="pt-4 flex-1">
        {keywords.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">Sin palabras destacadas</div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center" id="keywords-cloud">
            {keywords.slice(0, 16).map((k) => {
              const isSelected = selectedKeyword === k.palabra;
              const isHot = k.en_negativos > k.en_positivos;
              const isCool = k.en_positivos > k.en_negativos;

              let badgeStyle = 'bg-white/[0.03] text-slate-300 border-white/10 hover:border-white/20 hover:text-white';
              if (isHot) {
                badgeStyle = 'bg-rose-500/10 text-rose-300 border-rose-500/25 hover:bg-rose-500/20';
              } else if (isCool) {
                badgeStyle = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/20';
              }

              if (isSelected) {
                badgeStyle = 'bg-indigo-600 text-white border-indigo-400 shadow-md';
              }

              return (
                <button
                  type="button"
                  key={k.palabra}
                  onClick={() => onSelectKeyword && onSelectKeyword(isSelected ? null : k.palabra)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${badgeStyle}`}
                  title={`#${k.palabra} · ${k.total} menciones (${k.en_negativos} críticas, ${k.en_positivos} favorables)`}
                >
                  <span>#{k.palabra}</span>
                  <span className="text-[0.68rem] font-mono opacity-80 tabular-nums">
                    {k.total}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
