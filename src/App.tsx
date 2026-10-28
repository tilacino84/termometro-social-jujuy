import React, { useState, useMemo, useCallback } from 'react';
import { DashboardPayload, Noticia, SocialFeedItem, TimelineDia, TemaFrecuente } from './types';
import rawData from './data/initialData.json';
import { TopNav } from './components/TopNav';
import { FreeScraperPanel } from './components/FreeScraperPanel';
import { HeroGauge } from './components/HeroGauge';
import { HeatmapJujuy } from './components/HeatmapJujuy';
import { SocialRadar } from './components/SocialRadar';
import { PolarityTimeline } from './components/PolarityTimeline';
import { TopicAgenda } from './components/TopicAgenda';
import { SectorBreakdown } from './components/SectorBreakdown';
import { KeywordsCloud } from './components/KeywordsCloud';
import { MediaDiscontent } from './components/MediaDiscontent';
import { CitizenVoices } from './components/CitizenVoices';
import { NewsFeed } from './components/NewsFeed';
import { Footer } from './components/Footer';
import { CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

const DIAS_ANALISIS = 7;

export const App: React.FC = () => {
  const [masterData, setMasterData] = useState<DashboardPayload>(rawData as unknown as DashboardPayload);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [lastScrapedCount, setLastScrapedCount] = useState<number>(196);
  const [activeTopic, setActiveTopic] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Live added social feed items
  const [socialFeed, setSocialFeed] = useState<SocialFeedItem[]>(
    (rawData as unknown as DashboardPayload).social_feed || []
  );

  // Fetch updated data from API or public data.json
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setMasterData(json);
        if (json.social_feed) {
          setSocialFeed((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const newItems = json.social_feed.filter((i: SocialFeedItem) => !existingIds.has(i.id));
            return [...prev, ...newItems];
          });
        }
        setNotification({
          type: 'info',
          text: 'Datos del monitor sincronizados correctamente.'
        });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      console.warn('Usando dataset integrado en memoria:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, []);

  // Free Scraping via Server without spending credits
  const handleScrape = useCallback(async (_category?: string) => {
    setIsScraping(true);
    setNotification({
      type: 'info',
      text: 'Scrapeando feeds RSS públicos de Jujuy (Google News & medios provinciales) sin gastar créditos...'
    });

    try {
      const res = await fetch('/api/scrape', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        if (result.data) {
          setMasterData(result.data);
        }
        if (typeof result.nuevasNoticias === 'number') {
          setLastScrapedCount(result.nuevasNoticias);
        }
        setNotification({
          type: 'success',
          text: `✅ ${result.mensaje || 'Scraping gratuito finalizado con éxito.'}`
        });
      } else {
        const errJson = await res.json().catch(() => ({}));
        setNotification({
          type: 'error',
          text: errJson.mensaje || 'Error al conectar con los feeds públicos de noticias.'
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: `Error al scrapear: ${err?.message || 'Servicio no disponible'}`
      });
    } finally {
      setIsScraping(false);
      setTimeout(() => setNotification(null), 6000);
    }
  }, []);

  // Recalculate 7-day weekly analysis (matching aplicarAnalisisSemanal)
  const weeklyAnalysis = useMemo(() => {
    const todasLasNotas: Noticia[] = masterData.noticias_recientes || [];

    // Find most recent timestamp as anchor
    let maxFechaMs = 0;
    todasLasNotas.forEach((n) => {
      if (n.fecha) {
        const t = new Date(n.fecha.replace(' ', 'T')).getTime();
        if (!isNaN(t) && t > maxFechaMs) maxFechaMs = t;
      }
    });

    const ahoraMs = Date.now();
    const referenciaMs = maxFechaMs > 0 ? Math.max(maxFechaMs, ahoraMs) : ahoraMs;
    const tiempoLimite = referenciaMs - DIAS_ANALISIS * 24 * 60 * 60 * 1000;

    // Filter notes for the week
    const notasFiltradas = todasLasNotas.filter((n) => {
      if (!n.fecha) return true;
      const fn = new Date(n.fecha.replace(' ', 'T')).getTime();
      return isNaN(fn) || fn >= tiempoLimite;
    });

    let totalComentarios = 0;
    let posCount = 0;
    let negCount = 0;
    let neuCount = 0;

    const temasMap: Record<string, number> = {};
    const timelineMap: Record<string, TimelineDia> = {};

    notasFiltradas.forEach((n) => {
      const cPos = n.pos || 0;
      const cNeg = n.neg || 0;
      const cNeu = n.neu || 0;
      const cTot = n.total_comentarios || (cPos + cNeg + cNeu) || 1;

      totalComentarios += cTot;
      posCount += cPos;
      negCount += cNeg;
      neuCount += cNeu;

      const tema = n.tema || 'General';
      temasMap[tema] = (temasMap[tema] || 0) + 1;

      const dia = n.fecha ? n.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10);
      if (!timelineMap[dia]) {
        timelineMap[dia] = { dia, pos: 0, neg: 0, neu: 0, total: 0 };
      }
      timelineMap[dia].pos += cPos;
      timelineMap[dia].neg += cNeg;
      timelineMap[dia].neu += cNeu;
      timelineMap[dia].total += cTot;
    });

    let indice = 0;
    if (totalComentarios > 0) {
      indice = Math.round((negCount / totalComentarios) * 1000) / 10;
    }

    const temasOrdenados: TemaFrecuente[] = Object.keys(temasMap)
      .map((t) => ({ tema: t, total: temasMap[t] }))
      .sort((a, b) => b.total - a.total);

    const timelineOrdenado = Object.values(timelineMap).sort((a, b) => a.dia.localeCompare(b.dia));

    // Filter comments for the active notes
    let comms = masterData.comentarios_destacados || [];
    if (notasFiltradas.length > 0) {
      const titulosValidos = new Set(notasFiltradas.map((n) => (n.titulo || '').toLowerCase()));
      const commsFiltrados = comms.filter((c) => titulosValidos.has((c.noticia_titulo || '').toLowerCase()));
      if (commsFiltrados.length > 0) {
        comms = commsFiltrados;
      }
    }

    return {
      notasFiltradas,
      totalNotas: notasFiltradas.length,
      totalComentarios,
      indice,
      sentimientos: { POS: posCount, NEG: negCount, NEU: neuCount },
      temasOrdenados,
      timelineOrdenado,
      comentariosSemana: comms,
    };
  }, [masterData]);

  const handleFilterNewsByDepartment = useCallback((depto: string) => {
    setSelectedDepartment(depto);
    const feedEl = document.getElementById('news-feed-card');
    if (feedEl) {
      feedEl.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleAddSocialPost = useCallback(async (post: SocialFeedItem) => {
    setSocialFeed((prev) => [post, ...prev]);

    // Send to backend store
    try {
      await fetch('/api/social-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });
    } catch (e) {
      // local memory already updated
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#070a12] text-[#f8fafc] font-sans antialiased selection:bg-indigo-500/30 selection:text-white">
      {/* TOP NAVIGATION BAR */}
      <TopNav
        onRefresh={fetchData}
        onScrape={() => handleScrape()}
        isRefreshing={isRefreshing}
        isScraping={isScraping}
        currentIndice={weeklyAnalysis.indice}
      />

      {/* NOTIFICACIÓN FLOTANTE / TOAST */}
      {notification && (
        <aside
          aria-label="Notificación del sistema"
          className="fixed bottom-6 right-6 z-50 max-w-md animate-fade-in"
        >
          <div
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-xl ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-spin" />
            )}
            <div className="flex-1 text-xs leading-relaxed font-medium">
              {notification.text}
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white shrink-0"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* DASHBOARD SHELL */}
      <main className="dashboard-shell max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-8">
        {/* PANEL DE SCRAPING GRATUITO EN VIVO (0 CRÉDITOS / SIN COSTOS) */}
        <FreeScraperPanel
          isScraping={isScraping}
          onTriggerScrape={handleScrape}
          lastScrapedCount={lastScrapedCount}
          lastScrapedTime={masterData.actualizado}
          recentScrapedNews={masterData.noticias_recientes || []}
        />

        {/* HERO GAUGE SECTION */}
        <HeroGauge
          indice={weeklyAnalysis.indice}
          totalNotas={weeklyAnalysis.totalNotas}
          totalComentarios={weeklyAnalysis.totalComentarios}
          sentimientos={weeklyAnalysis.sentimientos}
        />

        {/* MAPA DE CALOR TERRITORIAL DE JUJUY (16 DEPARTAMENTOS) */}
        <HeatmapJujuy
          departamentos={masterData.mapa_departamentos || {}}
          selectedDepartment={selectedDepartment}
          onSelectDepartment={setSelectedDepartment}
          onFilterNewsByDepartment={handleFilterNewsByDepartment}
        />

        {/* PULSO EN REDES SOCIALES (INSTAGRAM REELS, TIKTOKS, FACEBOOK) */}
        <SocialRadar feed={socialFeed} onAddPost={handleAddSocialPost} />

        {/* GRID DE ANALÍTICA */}
        <div className="analytics-grid" id="analytics-section">
          <PolarityTimeline timeline={weeklyAnalysis.timelineOrdenado} />
          <TopicAgenda
            temas={weeklyAnalysis.temasOrdenados}
            selectedTopic={activeTopic}
            onSelectTopic={setActiveTopic}
          />
        </div>

        {/* TEMPERATURA POR TEMA Y CONCEPTOS EN FOCO */}
        <div className="analytics-grid sub-grid">
          <SectorBreakdown
            sectores={masterData.sentimiento_por_tema || []}
            onSelectTopic={setActiveTopic}
          />
          <KeywordsCloud
            keywords={masterData.keywords_trending || []}
            selectedKeyword={selectedKeyword}
            onSelectKeyword={setSelectedKeyword}
          />
        </div>

        {/* PULSO CIUDADANO: DESCONTENTO EN MEDIOS Y VOCES CIUDADANAS REALES */}
        <section className="social-monitor-card" id="media-discontent-section">
          <div className="card-head">
            <div className="head-text">
              <h3 className="card-title">Pulso Ciudadano: Descontento en Redes y Medios de Jujuy</h3>
              <p className="card-desc">
                Nivel real de reclamos vecinales, gremiales y sociales registrados en publicaciones de la provincia
              </p>
            </div>
          </div>

          <MediaDiscontent noticias={weeklyAnalysis.notasFiltradas} />

          <CitizenVoices
            comentarios={weeklyAnalysis.comentariosSemana}
            dias={DIAS_ANALISIS}
          />
        </section>

        {/* FEED DE NOTICIAS REALES */}
        <NewsFeed
          noticias={weeklyAnalysis.notasFiltradas}
          activeTopic={activeTopic}
          onSelectTopic={setActiveTopic}
          selectedDepartment={selectedDepartment}
          onClearDepartment={() => setSelectedDepartment(null)}
          selectedKeyword={selectedKeyword}
          onClearKeyword={() => setSelectedKeyword(null)}
        />
      </main>

      {/* FOOTER */}
      <Footer actualizado={masterData.actualizado} />
    </div>
  );
};

export default App;
