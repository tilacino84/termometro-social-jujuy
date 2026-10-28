import React, { useState } from 'react';
import { Radio, RefreshCw, CheckCircle2, ShieldCheck, Newspaper, Terminal, ChevronDown, ChevronUp, Sparkles, ExternalLink } from 'lucide-react';
import { Noticia } from '../types';

interface FreeScraperPanelProps {
  isScraping: boolean;
  onTriggerScrape: (category?: string) => Promise<void>;
  lastScrapedCount: number;
  lastScrapedTime?: string;
  recentScrapedNews: Noticia[];
}

export const FreeScraperPanel: React.FC<FreeScraperPanelProps> = ({
  isScraping,
  onTriggerScrape,
  lastScrapedCount,
  lastScrapedTime,
  recentScrapedNews,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'terminal' | 'recent'>('info');
  const [logs, setLogs] = useState<string[]>([
    'Sistema de scraping gratuito listo.',
    'Fuentes activas: Google News RSS Jujuy, Todo Jujuy, El Tribuno, Somos Jujuy, UNJu Diario.',
    'Consumo de créditos: 0 (Usa protocolos abiertos RSS y análisis semántico local).'
  ]);

  const handleRunScrape = async (category?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      `[${timestamp}] Iniciando scraping gratuito (${category || 'General'})...`,
      `[${timestamp}] Conectando a feeds RSS públicos de la provincia de Jujuy...`,
      ...prev
    ]);

    await onTriggerScrape(category);

    const finishTime = new Date().toLocaleTimeString();
    setLogs((prev) => [
      `[${finishTime}] Scraping finalizado con éxito. Dataset y velocímetro recalculados.`,
      `[${finishTime}] Se detectaron y procesaron titulares recientes sin gasto de créditos.`,
      ...prev
    ]);
  };

  return (
    <div className="bg-[#0b101e] border border-emerald-500/25 rounded-2xl p-4 sm:p-5 shadow-xl shadow-black/40 relative overflow-hidden transition-all">
      {/* Glow subtle background */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER BAR */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Radio className={`w-5 h-5 text-emerald-400 ${isScraping ? 'animate-spin' : 'animate-pulse'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                Scraper Gratuito en Tiempo Real · Medios de Jujuy
              </h3>
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[0.7rem] font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>0 Créditos · 100% Gratis</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Extracción continua de noticias vía feeds RSS públicos y análisis local de clima social sin costos.
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleRunScrape()}
            disabled={isScraping}
            className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer ${
              isScraping ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
            <span>{isScraping ? 'Extrayendo noticias...' : 'Ejecutar Scraping Ahora'}</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all text-xs font-semibold inline-flex items-center gap-1"
            title={isOpen ? 'Contraer panel' : 'Expandir detalles'}
          >
            <span className="hidden sm:inline">{isOpen ? 'Menos' : 'Detalles y Consola'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* QUICK STATUS CHIPS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-white/[0.06]">
        <div className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-xl">
          <span className="text-[0.7rem] text-slate-400 block font-medium">Estado del Scraper</span>
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Activo y Operativo</span>
          </span>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-xl">
          <span className="text-[0.7rem] text-slate-400 block font-medium">Consumo de Créditos</span>
          <span className="text-xs font-bold text-slate-100 flex items-center gap-1 mt-0.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>$0.00 / Ilimitado</span>
          </span>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-xl">
          <span className="text-[0.7rem] text-slate-400 block font-medium">Últimas Incorporadas</span>
          <span className="text-xs font-bold text-slate-100 mt-0.5 block">
            {lastScrapedCount > 0 ? `+${lastScrapedCount} noticias` : 'En espera de ciclo'}
          </span>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] p-2.5 rounded-xl">
          <span className="text-[0.7rem] text-slate-400 block font-medium">Frecuencia Automática</span>
          <span className="text-xs font-bold text-indigo-300 mt-0.5 block">
            Cada 15 min (Auto)
          </span>
        </div>
      </div>

      {/* EXPANDABLE DETAILS ACCORDION */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] animate-fade-in">
          {/* TABS */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'info'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Cómo funciona gratis
            </button>
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'terminal'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Consola en Vivo</span>
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'recent'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>Últimos Titulares ({recentScrapedNews.slice(0, 5).length})</span>
            </button>
          </div>

          {/* TAB 1: INFO */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex flex-col gap-1.5">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>1. Protocolo RSS Abierto</span>
                </span>
                <p className="text-slate-400 text-[0.76rem]">
                  Consulta directamente los endpoints XML de Google News Argentina filtrados para la provincia de Jujuy. Sin APIs de pago ni proxies comerciales.
                </p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex flex-col gap-1.5">
                <span className="font-bold text-teal-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  <span>2. IA Regional en el Servidor</span>
                </span>
                <p className="text-slate-400 text-[0.76rem]">
                  Analiza modismos jujeños, polaridad de tensión (Crítico/Favorable/Neutro) y detecta departamentos con heurística semántica local sin consumir tokens.
                </p>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex flex-col gap-1.5">
                <span className="font-bold text-sky-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  <span>3. Deduplicación y Persistencia</span>
                </span>
                <p className="text-slate-400 text-[0.76rem]">
                  Compara los titulares extraídos con el histórico almacenado, descarta notas ya existentes e incorpora sólo novedades al velocímetro y mapa.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: TERMINAL LOGS */}
          {activeTab === 'terminal' && (
            <div className="bg-[#05070d] p-3 rounded-xl border border-white/[0.08] font-mono text-[0.72rem] text-slate-300 flex flex-col gap-1 max-h-48 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-400 select-none">&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: RECENT TITLES */}
          {activeTab === 'recent' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {recentScrapedNews.slice(0, 6).map((n) => (
                <div
                  key={n.id}
                  className="p-2.5 bg-white/[0.02] border border-white/[0.05] rounded-xl flex flex-col justify-between gap-1.5 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[0.68rem] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {n.fuente || 'RSS Jujuy'}
                    </span>
                    <span className="text-[0.68rem] text-slate-500">{n.fecha}</span>
                  </div>
                  <h5 className="font-semibold text-slate-200 line-clamp-2">{n.titulo}</h5>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[0.68rem] text-slate-400">🏷️ {n.tema || 'General'}</span>
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[0.7rem] text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-semibold"
                    >
                      <span>Ver fuente</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
