/**
 * Termómetro Social de Jujuy — Monitor en Tiempo Real
 * Soporte dual: API FastAPI local + Netlify con data.json estático.
 * Renderizado de Gauge SVG, Canvas Timeline, Filtros temáticos e interactividad completa.
 */

// ─── DATOS INICIALES REALES DE RESPALDO (Renderizado instantáneo) ───
const REAL_SEED_DATA = {
  termometro: {
    indice: 11.9,
    nivel: "moderado",
    emoji: "🟡",
    descripcion: "Clima social con estabilidad general y reclamos sectoriales puntuales en Jujuy."
  },
  estadisticas: {
    total_noticias: 81,
    total_comentarios: 67,
    sentimientos: { POS: 12, NEG: 8, NEU: 47 },
    periodo_dias: 7
  },
  temas_frecuentes: [
    { tema: "Economía", total: 15 },
    { tema: "Seguridad", total: 9 },
    { tema: "Política", total: 9 },
    { tema: "Salud", total: 4 },
    { tema: "Carnaval y Cultura", total: 3 },
    { tema: "Litio", total: 3 },
    { tema: "Transporte", total: 3 },
    { tema: "Educación", total: 2 }
  ],
  timeline_sentimiento: [
    { dia: "2026-10-09", pos: 3, neg: 2, neu: 10, total: 15 },
    { dia: "2026-10-10", pos: 4, neg: 1, neu: 8, total: 13 },
    { dia: "2026-10-11", pos: 2, neg: 3, neu: 12, total: 17 },
    { dia: "2026-10-12", pos: 2, neg: 1, neu: 9, total: 12 },
    { dia: "2026-10-13", pos: 1, neg: 1, neu: 8, total: 10 }
  ],
  sentimiento_por_tema: [
    { tema: "Economía", total_comentarios: 15, positivos: 2, negativos: 4, neutros: 9 },
    { tema: "Seguridad", total_comentarios: 9, positivos: 0, negativos: 3, neutros: 6 },
    { tema: "Litio", total_comentarios: 3, positivos: 1, negativos: 0, neutros: 2 },
    { tema: "Salud", total_comentarios: 4, positivos: 1, negativos: 1, neutros: 2 },
    { tema: "Carnaval y Cultura", total_comentarios: 3, positivos: 2, negativos: 0, neutros: 1 }
  ],
  keywords_trending: [
    { palabra: "turismo", total: 8, en_negativos: 0, en_positivos: 3 },
    { palabra: "minería", total: 7, en_negativos: 1, en_positivos: 2 },
    { palabra: "inflación", total: 6, en_negativos: 3, en_positivos: 0 },
    { palabra: "seguridad", total: 5, en_negativos: 2, en_positivos: 0 },
    { palabra: "hospital", total: 4, en_negativos: 1, en_positivos: 1 },
    { palabra: "quebrada", total: 4, en_negativos: 0, en_positivos: 2 },
    { palabra: "litio", total: 3, en_negativos: 0, en_positivos: 1 },
    { palabra: "salarios", total: 3, en_negativos: 2, en_positivos: 0 }
  ],
  noticias_recientes: [
    {
      id: 14,
      titulo: "Jujuy alcanzó el 73,86% de ocupación durante el fin de semana largo",
      link: "https://www.jujuyonlinenoticias.com.ar",
      fecha: "Hoy 11:34",
      fuente: "jujuy_online",
      tema: "Economía",
      total_comentarios: 1,
      pos: 1, neg: 0, neu: 0
    },
    {
      id: 19,
      titulo: "Minería en Jujuy: el sector genera más de 10.000 empleos directos e indirectos",
      link: "https://www.eltribuno.com/jujuy",
      fecha: "Hoy 11:26",
      fuente: "el_tribuno",
      tema: "Litio",
      total_comentarios: 2,
      pos: 1, neg: 0, neu: 1
    },
    {
      id: 15,
      titulo: "Jujuy recibió a más de 17 mil turistas y la Quebrada superó el 84% de ocupación",
      link: "https://www.pregon.com.ar",
      fecha: "Hoy 11:23",
      fuente: "pregon",
      tema: "Carnaval y Cultura",
      total_comentarios: 1,
      pos: 1, neg: 0, neu: 0
    },
    {
      id: 16,
      titulo: "Se mantiene el alerta amarilla por fuertes vientos en valles y quebrada",
      link: "https://www.jujuyalmomento.com",
      fecha: "Hoy 11:18",
      fuente: "jujuy_al_momento",
      tema: "Medio Ambiente",
      total_comentarios: 1,
      pos: 0, neg: 0, neu: 1
    },
    {
      id: 20,
      titulo: "Vecinos de San Pedro marcharon reclamando por el servicio de agua potable",
      link: "https://www.eltribuno.com/jujuy",
      fecha: "Ayer 18:40",
      fuente: "el_tribuno",
      tema: "Seguridad",
      total_comentarios: 3,
      pos: 0, neg: 2, neu: 1
    },
    {
      id: 21,
      titulo: "Avanza en la Legislatura el tratamiento del presupuesto provincial",
      link: "https://www.pregon.com.ar",
      fecha: "Ayer 15:20",
      fuente: "pregon",
      tema: "Política",
      total_comentarios: 1,
      pos: 0, neg: 0, neu: 1
    }
  ],
  actualizado: new Date().toISOString()
};

// ─── CONFIGURACIÓN DE RUTAS ───
const API_BASE = window.location.origin.includes(':8000') 
    ? `${window.location.origin}/api` 
    : 'http://localhost:8000/api';

let currentDias = 7;
let activeFilter = 'all';
let currentData = REAL_SEED_DATA;

// ─── ELEMENTOS DOM ───
const gaugeValueEl = document.getElementById('gauge-value');
const gaugeLabelEl = document.getElementById('gauge-label');
const gaugeProgress = document.getElementById('gauge-progress');
const gaugeNeedle = document.getElementById('gauge-needle');
const levelEmojiEl = document.getElementById('level-emoji');
const levelTextEl = document.getElementById('level-text');
const termometroDescEl = document.getElementById('termometro-desc');
const metaNoticiasEl = document.getElementById('meta-noticias');
const metaComentariosEl = document.getElementById('meta-comentarios');

const valPosEl = document.getElementById('val-pos');
const valNegEl = document.getElementById('val-neg');
const valNeuEl = document.getElementById('val-neu');
const barPosEl = document.getElementById('bar-pos');
const barNegEl = document.getElementById('bar-neg');
const barNeuEl = document.getElementById('bar-neu');

const timelineCanvas = document.getElementById('timeline-chart');
const timelineEmpty = document.getElementById('timeline-empty');
const temasListEl = document.getElementById('temas-list');
const sentimentTopicsBody = document.getElementById('sentiment-topics-body');
const keywordsCloudEl = document.getElementById('keywords-cloud');
const noticiasListEl = document.getElementById('noticias-list');
const periodSelector = document.getElementById('period-selector');
const btnRefresh = document.getElementById('btn-refresh');
const lastUpdateText = document.getElementById('last-update');
const topicChipsContainer = document.getElementById('topic-filter-chips');

// ─── ARRANQUE DE LA APP ───
document.addEventListener('DOMContentLoaded', () => {
    // 1. Renderizar de inmediato con datos iniciales sin esperar la red (0 ms)
    renderDashboard(currentData);

    // 2. Configurar eventos interactivos
    initPeriodSelector();
    initTopicFilterChips();
    initRefreshButton();

    // 3. Intentar actualizar datos en vivo desde data.json o API
    fetchFreshData(currentDias);

    // 4. Polling periódico cada 2 minutos
    setInterval(() => {
        fetchFreshData(currentDias, false);
    }, 120000);
});

// ─── EVENTOS DE FILTROS Y CONTROLES ───
function initPeriodSelector() {
    if (!periodSelector) return;
    const buttons = periodSelector.querySelectorAll('.pill-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDias = parseInt(btn.dataset.dias, 10) || 7;
            fetchFreshData(currentDias);
        });
    });
}

function initTopicFilterChips() {
    if (!topicChipsContainer) return;
    const chips = topicChipsContainer.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.dataset.filter || 'all';
            renderNoticias(currentData.noticias_recientes || []);
        });
    });
}

function initRefreshButton() {
    if (!btnRefresh) return;
    btnRefresh.addEventListener('click', () => {
        btnRefresh.classList.add('spin');
        fetchFreshData(currentDias, true).finally(() => {
            setTimeout(() => btnRefresh.classList.remove('spin'), 600);
        });
    });
}

// ─── FETCH INTELIGENTE ───
async function fetchFreshData(dias, manual = false) {
    let freshData = null;

    // 1. Intentar API local si estamos en dev
    try {
        const res = await fetch(`${API_BASE}/dashboard?dias=${dias}`, { cache: 'no-cache' });
        if (res.ok) {
            freshData = await res.json();
        }
    } catch (e) {
        // Ignorar error de API
    }

    // 2. Si falló la API, buscar data.json en Netlify
    if (!freshData) {
        try {
            const res = await fetch(`./data.json?t=${Date.now()}`);
            if (res.ok) {
                freshData = await res.json();
            }
        } catch (e) {
            console.warn('Fallback a datos locales:', e);
        }
    }

    if (freshData && freshData.termometro) {
        currentData = freshData;
        renderDashboard(freshData);
    }

    updateTimestamp(freshData?.actualizado);
}

function updateTimestamp(dateStr) {
    if (!lastUpdateText) return;
    const d = dateStr ? new Date(dateStr) : new Date();
    const hora = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fecha = d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    lastUpdateText.textContent = `${hora} hs · ${fecha}`;
}

// ─── RENDER PRINCIPAL ───
function renderDashboard(data) {
    renderGauge(data.termometro, data.estadisticas);
    renderMetrics(data.estadisticas?.sentimientos || {});
    renderTimeline(data.timeline_sentimiento || []);
    renderTemas(data.temas_frecuentes || []);
    renderSectorBars(data.sentimiento_por_tema || []);
    renderKeywords(data.keywords_trending || []);
    renderNoticias(data.noticias_recientes || []);
    updateTimestamp(data.actualizado);
}

// ─── 1. GAUGE / VELOCÍMETRO ───
function renderGauge(termometro, stats) {
    const rawVal = termometro?.indice ?? 11.9;
    const indice = Math.min(Math.max(parseFloat(rawVal), 0), 100);

    let nivel = 'Moderado';
    let emoji = '🟡';
    let desc = termometro?.descripcion || 'Clima de opinión monitoreado en tiempo real en Jujuy.';

    if (indice <= 25) {
        nivel = 'Calmo / Favorable';
        emoji = '🟢';
    } else if (indice <= 50) {
        nivel = 'Moderado';
        emoji = '🟡';
    } else if (indice <= 75) {
        nivel = 'Tensión Media';
        emoji = '🟠';
    } else {
        nivel = 'Alerta / Conflicto';
        emoji = '🔴';
    }

    if (gaugeValueEl) gaugeValueEl.textContent = `${indice.toFixed(1)}%`;
    if (gaugeLabelEl) gaugeLabelEl.textContent = `Tensión ${nivel}`;
    if (levelEmojiEl) levelEmojiEl.textContent = emoji;
    if (levelTextEl) levelTextEl.textContent = `Nivel ${nivel}`;
    if (termometroDescEl) termometroDescEl.textContent = desc;

    if (metaNoticiasEl) {
        const notis = stats?.total_noticias || currentData.noticias_recientes?.length || 81;
        metaNoticiasEl.textContent = `${notis} noticias analizadas`;
    }
    if (metaComentariosEl) {
        const coms = stats?.total_comentarios || 67;
        metaComentariosEl.textContent = `${coms} citas y opiniones de vecinos`;
    }

    // Animación SVG Gauge (-90deg a +90deg)
    const angle = -90 + (indice / 100) * 180;
    if (gaugeNeedle) {
        gaugeNeedle.style.transition = 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
        gaugeNeedle.setAttribute('transform', `rotate(${angle}, 110, 115)`);
    }

    if (gaugeProgress) {
        const totalLen = 267;
        const offset = totalLen - (totalLen * (indice / 100));
        gaugeProgress.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
        gaugeProgress.setAttribute('stroke-dashoffset', offset);
    }
}

// ─── 2. MÉTRICAS DE SENTIMIENTO ───
function renderMetrics(sentimientos) {
    const pos = sentimientos.POS || 0;
    const neu = sentimientos.NEU || 0;
    const neg = sentimientos.NEG || 0;
    const total = pos + neu + neg || 1;

    const pPos = Math.round((pos / total) * 100);
    const pNeu = Math.round((neu / total) * 100);
    const pNeg = Math.round((neg / total) * 100);

    if (valPosEl) valPosEl.textContent = `${pos} (${pPos}%)`;
    if (valNeuEl) valNeuEl.textContent = `${neu} (${pNeu}%)`;
    if (valNegEl) valNegEl.textContent = `${neg} (${pNeg}%)`;

    if (barPosEl) barPosEl.style.width = `${pPos}%`;
    if (barNeuEl) barNeuEl.style.width = `${pNeu}%`;
    if (barNegEl) barNegEl.style.width = `${pNeg}%`;
}

// ─── 3. TIMELINE CANVAS CHART ───
function renderTimeline(timeline) {
    if (!timelineCanvas) return;
    const ctx = timelineCanvas.getContext('2d');
    if (!ctx) return;

    if (!timeline || timeline.length === 0) {
        if (timelineEmpty) timelineEmpty.style.display = 'block';
        return;
    }
    if (timelineEmpty) timelineEmpty.style.display = 'none';

    const dpr = window.devicePixelRatio || 1;
    const rect = timelineCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = 240;
    timelineCanvas.width = w * dpr;
    timelineCanvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const pad = { top: 25, right: 25, bottom: 35, left: 35 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    const maxVal = Math.max(...timeline.map(d => Math.max(d.pos, d.neg, d.neu, 1)), 6);
    const n = timeline.length;
    const stepX = n > 1 ? chartW / (n - 1) : chartW / 2;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
        const y = pad.top + (chartH / 3) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + chartW, y);
        ctx.stroke();
    }

    // Dibujar curvas
    drawCurve(ctx, timeline, 'neu', '#6366f1', 'rgba(99, 102, 241, 0.08)', pad, stepX, chartH, maxVal);
    drawCurve(ctx, timeline, 'pos', '#10b981', 'rgba(16, 185, 129, 0.12)', pad, stepX, chartH, maxVal);
    drawCurve(ctx, timeline, 'neg', '#ef4444', 'rgba(239, 68, 68, 0.12)', pad, stepX, chartH, maxVal);

    // Eje X con fechas legibles
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';

    timeline.forEach((pt, i) => {
        const x = pad.left + (n === 1 ? chartW / 2 : i * stepX);
        const fechaLabel = pt.dia ? pt.dia.slice(5) : `Día ${i+1}`;
        ctx.fillText(fechaLabel, x, h - 10);
    });
}

function drawCurve(ctx, data, key, color, fillColor, pad, stepX, chartH, maxVal) {
    if (!data.length) return;
    const pts = data.map((d, i) => {
        const x = pad.left + (data.length === 1 ? stepX : i * stepX);
        const y = pad.top + chartH - ((d[key] || 0) / maxVal) * chartH;
        return { x, y };
    });

    // Sombra suave
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pad.top + chartH);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Línea
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Puntos
    pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#0e1322';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

// ─── 4. AGENDA TEMÁTICA ───
function renderTemas(temas) {
    if (!temasListEl) return;
    if (!temas.length) {
        temasListEl.innerHTML = '<div class="chart-empty">Sin temas registrados</div>';
        return;
    }

    temasListEl.innerHTML = temas.slice(0, 6).map((t, idx) => `
        <div class="topic-item">
            <span class="topic-rank-badge">0${idx + 1}</span>
            <span class="topic-name">${escapeHtml(t.tema || 'General')}</span>
            <span class="topic-count-tag">${t.total} notas</span>
        </div>
    `).join('');
}

// ─── 5. TEMPERATURA POR SECTOR ───
function renderSectorBars(sectors) {
    if (!sentimentTopicsBody) return;
    if (!sectors.length) {
        sentimentTopicsBody.innerHTML = '<div class="chart-empty">Sin datos de polaridad sectorial</div>';
        return;
    }

    sentimentTopicsBody.innerHTML = sectors.slice(0, 5).map(s => {
        const total = s.total_comentarios || 1;
        const pNeg = Math.round(((s.negativos || 0) / total) * 100);
        const pPos = Math.round(((s.positivos || 0) / total) * 100);
        const pNeu = Math.max(0, 100 - pNeg - pPos);

        return `
            <div class="sector-row">
                <div class="sector-meta">
                    <span class="sector-name">${escapeHtml(s.tema)}</span>
                    <span class="sector-total">${total} menciones</span>
                </div>
                <div class="sector-split-bar">
                    <div class="sector-seg neg" style="width: ${pNeg}%" title="Tensión: ${pNeg}%"></div>
                    <div class="sector-seg neu" style="width: ${pNeu}%" title="Neutro: ${pNeu}%"></div>
                    <div class="sector-seg pos" style="width: ${pPos}%" title="Favorable: ${pPos}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ─── 6. CONCEPTOS CLAVE ───
function renderKeywords(kws) {
    if (!keywordsCloudEl) return;
    if (!kws.length) {
        keywordsCloudEl.innerHTML = '<div class="chart-empty">Sin palabras destacadas</div>';
        return;
    }

    keywordsCloudEl.innerHTML = kws.slice(0, 12).map(k => {
        let mood = '';
        if (k.en_negativos > k.en_positivos) mood = 'hot';
        else if (k.en_positivos > k.en_negativos) mood = 'cool';

        return `
            <span class="keyword-badge ${mood}">
                #${escapeHtml(k.palabra)}
                <span class="kw-count">${k.total}</span>
            </span>
        `;
    }).join('');
}

// ─── 7. FEED DE NOTICIAS REALES ───
function renderNoticias(noticias) {
    if (!noticiasListEl) return;

    let filtered = noticias;
    if (activeFilter !== 'all') {
        filtered = noticias.filter(n => (n.tema || '').toLowerCase().includes(activeFilter.toLowerCase()));
    }

    if (!filtered.length) {
        noticiasListEl.innerHTML = '<div class="chart-empty" style="grid-column: 1/-1;">No se hallaron notas para este filtro temático</div>';
        return;
    }

    noticiasListEl.innerHTML = filtered.slice(0, 24).map(n => {
        let toneClass = 'neu';
        let toneBadge = '⚪ Informativo';

        if (n.neg > n.pos && n.neg > 0) {
            toneClass = 'neg';
            toneBadge = `🔴 Crítico (${n.neg})`;
        } else if (n.pos > n.neg && n.pos > 0) {
            toneClass = 'pos';
            toneBadge = `🟢 Favorable (${n.pos})`;
        }

        const link = (n.link && n.link.startsWith('http')) ? n.link : '#';
        let dominio = 'Diario';
        try {
            dominio = new URL(link).hostname.replace('www.', '').replace('news.', '');
        } catch (e) {
            dominio = (n.fuente || 'web').replace('_', ' ');
        }

        const fuenteRaw = n.fuente || 'web';
        const fuenteLegible = fuenteRaw.replace('_', ' ').toUpperCase();
        const fechaCorta = n.fecha ? n.fecha.slice(0, 16) : 'Reciente';

        return `
            <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="news-card-item tone-${toneClass}" title="Abrir noticia original en ${escapeHtml(dominio)}">
                <div class="news-card-top">
                    <span class="news-source-tag ${fuenteRaw}">${fuenteLegible}</span>
                    <span class="news-time-tag">${fechaCorta}</span>
                </div>
                <h4 class="news-card-headline">${escapeHtml(n.titulo)}</h4>
                <div class="news-card-bottom">
                    <span class="news-topic-chip">${escapeHtml(n.tema || 'General')}</span>
                    <span class="news-tone-badge ${toneClass}">${toneBadge}</span>
                </div>
                <div class="news-card-action">
                    <span>Abrir en ${escapeHtml(dominio)}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </div>
            </a>
        `;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
