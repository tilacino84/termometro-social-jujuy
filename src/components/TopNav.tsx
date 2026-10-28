import React from 'react';
import { RotateCw, Calendar, Radio, Activity, Compass, MessageSquare, BarChart3, Newspaper, Map } from 'lucide-react';

interface TopNavProps {
  onRefresh: () => void;
  onScrape: () => void;
  isRefreshing: boolean;
  isScraping: boolean;
  currentIndice?: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  onRefresh,
  onScrape,
  isRefreshing,
  isScraping,
  currentIndice = 14.3,
}) => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getTensionBadge = (val: number) => {
    if (val <= 15) return { label: 'Calmo', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 dot-emerald-400' };
    if (val <= 35) return { label: 'Moderado', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30 dot-amber-400' };
    if (val <= 65) return { label: 'Tensión Media', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30 dot-orange-400' };
    return { label: 'Conflicto Alto', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30 dot-rose-400' };
  };

  const tensionInfo = getTensionBadge(currentIndice);

  return (
    <header className="top-nav sticky top-0 z-50 backdrop-blur-2xl bg-[#070a12]/90 border-b border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <div className="nav-container max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* BRAND & STATUS */}
        <div className="brand-group flex items-center gap-3.5">
          <div className="brand-badge inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <span className="pulse-indicator w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></span>
            <span className="badge-text text-[0.7rem] font-black tracking-wider text-emerald-400 uppercase">
              JUJUY EN VIVO
            </span>
          </div>

          <div className="flex flex-col">
            <h1 className="brand-title text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2 m-0 leading-tight">
              Termómetro Social
              <span className="text-[0.72rem] font-semibold text-slate-400 tracking-normal hidden md:inline border-l border-white/10 pl-2">
                Observatorio de Clima Ciudadano
              </span>
            </h1>
          </div>

          {/* QUICK PROVINCIAL KPI PILL */}
          <div className={`hidden xl:inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold ${tensionInfo.color}`}>
            <Activity className="w-3.5 h-3.5" />
            <span>Índice Provincial: <strong className="font-mono tabular-nums">{currentIndice.toFixed(1)}%</strong> ({tensionInfo.label})</span>
          </div>
        </div>

        {/* JUMP NAVIGATION LINKS */}
        <nav className="hidden lg:flex items-center gap-1 text-xs text-slate-300 font-medium bg-white/[0.03] border border-white/[0.06] rounded-full px-2 py-1 shadow-inner">
          <button
            onClick={() => scrollTo('hero-gauge-section')}
            className="px-2.5 py-1 rounded-full hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>Indicador</span>
          </button>
          <button
            onClick={() => scrollTo('heatmap-section')}
            className="px-2.5 py-1 rounded-full hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Map className="w-3 h-3 text-sky-400" />
            <span>Mapa Territorial</span>
          </button>
          <button
            onClick={() => scrollTo('social-radar-section')}
            className="px-2.5 py-1 rounded-full hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <MessageSquare className="w-3 h-3 text-pink-400" />
            <span>Redes Sociales</span>
          </button>
          <button
            onClick={() => scrollTo('analytics-section')}
            className="px-2.5 py-1 rounded-full hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <BarChart3 className="w-3 h-3 text-indigo-400" />
            <span>Analítica</span>
          </button>
          <button
            onClick={() => scrollTo('news-feed-card')}
            className="px-2.5 py-1 rounded-full hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Newspaper className="w-3 h-3 text-amber-400" />
            <span>Titulares</span>
          </button>
        </nav>

        {/* ACTIONS */}
        <div className="nav-actions flex items-center gap-2 flex-wrap">
          <div className="timeframe-badge inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 rounded-full px-3 py-1 text-xs text-slate-200 shadow-sm hidden sm:inline-flex">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[0.75rem]">
              Ventana: <strong className="text-indigo-300 font-bold">7 Días</strong>
            </span>
          </div>

          {/* BOTÓN DE SCRAPING GRATUITO SIN CRÉDITOS */}
          <button
            onClick={onScrape}
            disabled={isScraping || isRefreshing}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-full text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer active:scale-95 ${
              isScraping ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            title="Extrae titulares frescos de Google News Jujuy y medios locales vía RSS gratuito (sin consumo de créditos ni APIs de pago)"
          >
            <Radio className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : 'animate-pulse text-emerald-200'}`} />
            <span>{isScraping ? 'Scrapeando...' : 'Scrappear Gratis'}</span>
            <span className="text-[0.65rem] bg-black/30 border border-white/20 px-1.5 py-0.5 rounded-full font-bold hidden md:inline text-emerald-200">
              0 Créditos
            </span>
          </button>

          {/* BOTÓN REFRESH LOCAL */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing || isScraping}
            className={`refresh-action-btn inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-300 text-xs font-semibold hover:bg-white/10 hover:text-white transition-all cursor-pointer active:scale-95 ${
              isRefreshing ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            title="Recargar datos del dashboard"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Recargar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
