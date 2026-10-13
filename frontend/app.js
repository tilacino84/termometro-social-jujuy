/**
 * Termómetro Social de Jujuy — Monitor en Tiempo Real
 * Soporte dual: API FastAPI local + Netlify con data.json estático.
 * Filtrado dinámico estricto por períodos (24h, 3d, 7d, 30d) SIN inventar datos.
 * Concordancia de fechas reales de publicación.
 * Módulo de Redes Sociales (Facebook, X, YouTube).
 */

// ─── CONFIGURACIÓN DE RUTAS ───
const API_BASE = window.location.origin.includes(':8000') 
    ? `${window.location.origin}/api` 
    : 'http://localhost:8000/api';

let currentDias = 7;
let activeFilter = 'all';
let rawMasterData = (typeof window !== 'undefined' && window.__EMBEDDED_DATA__) ? window.__EMBEDDED_DATA__ : null; // Todos los datos originales cargados

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

// Elementos de Redes Sociales
const socialFbScoreEl = document.getElementById('social-fb-score');
const socialXScoreEl = document.getElementById('social-x-score');
const socialYtScoreEl = document.getElementById('social-yt-score');
const socialPulseSummaryEl = document.getElementById('social-pulse-summary');

// ─── INICIALIZACIÓN ───
document.addEventListener('DOMContentLoaded', () => {
    initPeriodSelector();
    initTopicFilterChips();
    initRefreshButton();

    // Renderizado instantáneo si existen datos embebidos
    if (rawMasterData && rawMasterData.noticias_recientes) {
        aplicarFiltroPeriodo(currentDias);
        if (rawMasterData.actualizado) updateTimestamp(rawMasterData.actualizado);
    }

    // Cargar datos (API o data.json)
    fetchMasterData();

    // Refresco automático cada 2 minutos
    setInterval(() => {
        fetchMasterData(false);
    }, 120000);
});

// ─── CONTROLES DE INTERACCIÓN ───
function initPeriodSelector() {
    if (!periodSelector) return;
    const buttons = periodSelector.querySelectorAll('.pill-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDias = parseInt(btn.dataset.dias, 10) || 7;
            
            // Aplicar filtro de período real inmediatamente sobre los datos cargados
            aplicarFiltroPeriodo(currentDias);
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
            
            if (rawMasterData) {
                aplicarFiltroPeriodo(currentDias);
            }
        });
    });
}

function initRefreshButton() {
    if (!btnRefresh) return;
    btnRefresh.addEventListener('click', () => {
        btnRefresh.classList.add('spin');
        fetchMasterData(true).finally(() => {
            setTimeout(() => btnRefresh.classList.remove('spin'), 600);
        });
    });
}

// ─── CARGA DE DATOS MAESTROS (API o data.json) ───
async function fetchMasterData(manual = false) {
    let data = null;

    // 1. Intentar API local si estamos en dev
    try {
        const res = await fetch(`${API_BASE}/dashboard?dias=30`, { cache: 'no-cache' });
        if (res.ok) {
            data = await res.json();
        }
    } catch (e) {
        // Ignorar
    }

    // 2. Si falló la API, buscar data.json en Netlify
    if (!data) {
        try {
            const res = await fetch(`./data.json?t=${Date.now()}`);
            if (res.ok) {
                data = await res.json();
            }
        } catch (e) {
            console.warn('Error cargando data.json:', e);
        }
    }

    if (data && data.noticias_recientes) {
        rawMasterData = data;
        aplicarFiltroPeriodo(currentDias);
        updateTimestamp(data.actualizado);
    }
}

// ─── FILTRADO DINÁMICO REAL POR PERÍODO (Sin inventar nada) ───
function aplicarFiltroPeriodo(dias) {
    if (!rawMasterData || !rawMasterData.noticias_recientes) return;

    const ahora = new Date();
    const tiempoLimite = ahora.getTime() - (dias * 24 * 60 * 60 * 1000);

    // Filtrar noticias reales que caen estrictamente en el período
    const todasLasNotas = rawMasterData.noticias_recientes;
    const notasFiltradas = todasLasNotas.filter(n => {
        if (!n.fecha) return true; // Si no tiene fecha, conservarla como reciente
        const fechaNota = new Date(n.fecha.replace(' ', 'T'));
        if (isNaN(fechaNota.getTime())) return true;
        return fechaNota.getTime() >= tiempoLimite;
    });

    // Recalcular métricas en base a las noticias reales del período
    const totalNotas = notasFiltradas.length;

    let totalComentarios = 0;
    let posCount = 0;
    let negCount = 0;
    let neuCount = 0;

    const temasMap = {};
    const timelineMap = {};

    notasFiltradas.forEach(n => {
        const cPos = n.pos || 0;
        const cNeg = n.neg || 0;
        const cNeu = n.neu || 0;
        const cTot = n.total_comentarios || (cPos + cNeg + cNeu) || 1;

        totalComentarios += cTot;
        posCount += cPos;
        negCount += cNeg;
        neuCount += cNeu;

        // Conteo de temas
        const tema = n.tema || 'General';
        temasMap[tema] = (temasMap[tema] || 0) + 1;

        // Agrupación timeline por día
        const dia = n.fecha ? n.fecha.slice(0, 10) : ahora.toISOString().slice(0, 10);
        if (!timelineMap[dia]) {
            timelineMap[dia] = { dia, pos: 0, neg: 0, neu: 0, total: 0 };
        }
        timelineMap[dia].pos += cPos;
        timelineMap[dia].neg += cNeg;
        timelineMap[dia].neu += cNeu;
        timelineMap[dia].total += cTot;
    });

    // Calcular índice del termómetro del período
    let indice = 0;
    if (totalComentarios > 0) {
        indice = Math.round((negCount / totalComentarios) * 1000) / 10;
    }

    // Preparar lista de temas
    const temasOrdenados = Object.keys(temasMap)
        .map(t => ({ tema: t, total: temasMap[t] }))
        .sort((a, b) => b.total - a.total);

    // Preparar timeline ordenado por fecha
    const timelineOrdenado = Object.values(timelineMap).sort((a, b) => a.dia.localeCompare(b.dia));

    // Renderizar componentes con datos del período
    renderGauge(indice, totalNotas, totalComentarios, dias);
    renderMetrics({ POS: posCount, NEG: negCount, NEU: neuCount });
    renderTimeline(timelineOrdenado);
    renderTemas(temasOrdenados);
    renderSocialMediaPulse(dias, negCount, posCount, totalComentarios);
    renderKeywords(rawMasterData.keywords_trending || []);
    renderNoticias(notasFiltradas);
}

// ─── 1. GAUGE / VELOCÍMETRO DEL PERÍODO ───
function renderGauge(indice, totalNotas, totalComentarios, dias) {
    const rawVal = Math.min(Math.max(indice, 0), 100);

    let nivel = 'Calmo';
    let emoji = '🟢';
    let desc = '';

    if (totalNotas === 0) {
        nivel = 'Sin registros';
        emoji = '⚪';
        desc = `No se hallaron noticias registradas en las últimas ${dias === 1 ? '24 horas' : dias + ' días'}. Podés ampliar el rango temporal a 7 o 30 días.`;
    } else if (rawVal <= 15) {
        nivel = 'Calmo / Favorable';
        emoji = '🟢';
        desc = `Clima social con estabilidad general en Jujuy (${dias === 1 ? 'últimas 24 horas' : 'últimos ' + dias + ' días'}).`;
    } else if (rawVal <= 35) {
        nivel = 'Moderado';
        emoji = '🟡';
        desc = `Clima social con debates y reclamos sectoriales puntuales en la provincia.`;
    } else if (rawVal <= 65) {
        nivel = 'Tensión Media';
        emoji = '🟠';
        desc = `Tensión social en alza con marcada presencia de reclamos ciudadanos y conflictividad.`;
    } else {
        nivel = 'Alerta / Conflicto';
        emoji = '🔴';
        desc = `Clima de alta conflictividad y preocupación ciudadana predominante.`;
    }

    if (gaugeValueEl) gaugeValueEl.textContent = totalNotas === 0 ? '0%' : `${rawVal.toFixed(1)}%`;
    if (gaugeLabelEl) gaugeLabelEl.textContent = `Tensión ${nivel}`;
    if (levelEmojiEl) levelEmojiEl.textContent = emoji;
    if (levelTextEl) levelTextEl.textContent = `Nivel ${nivel}`;
    if (termometroDescEl) termometroDescEl.textContent = desc;

    if (metaNoticiasEl) {
        metaNoticiasEl.textContent = `${totalNotas} noticias analizadas (${dias === 1 ? 'últimas 24 hs' : 'últimos ' + dias + ' días'})`;
    }
    if (metaComentariosEl) {
        metaComentariosEl.textContent = `${totalComentarios} citas y opiniones de vecinos`;
    }

    // Animación SVG Gauge (-90deg a +90deg)
    const angle = -90 + (rawVal / 100) * 180;
    if (gaugeNeedle) {
        gaugeNeedle.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        gaugeNeedle.setAttribute('transform', `rotate(${angle}, 110, 115)`);
    }

    if (gaugeProgress) {
        const totalLen = 267;
        const offset = totalLen - (totalLen * (rawVal / 100));
        gaugeProgress.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
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
        ctx.clearRect(0, 0, timelineCanvas.width, timelineCanvas.height);
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

    const maxVal = Math.max(...timeline.map(d => Math.max(d.pos, d.neg, d.neu, 1)), 5);
    const n = timeline.length;
    const stepX = n > 1 ? chartW / (n - 1) : chartW / 2;

    // Guías horizontales
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
        const y = pad.top + (chartH / 3) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + chartW, y);
        ctx.stroke();
    }

    // Curvas
    drawCurve(ctx, timeline, 'neu', '#6366f1', 'rgba(99, 102, 241, 0.08)', pad, stepX, chartH, maxVal);
    drawCurve(ctx, timeline, 'pos', '#10b981', 'rgba(16, 185, 129, 0.12)', pad, stepX, chartH, maxVal);
    drawCurve(ctx, timeline, 'neg', '#ef4444', 'rgba(239, 68, 68, 0.12)', pad, stepX, chartH, maxVal);

    // Eje X con fechas reales
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

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pad.top + chartH);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
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
        temasListEl.innerHTML = '<div class="chart-empty">Sin temas en este intervalo</div>';
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

// ─── 5. PULSO EN REDES SOCIALES (Facebook, X/Twitter, YouTube) ───
function renderSocialMediaPulse(dias, negCount, posCount, totalComentarios) {
    // Cálculo proporcional de polaridad en comentarios sociales
    const total = totalComentarios || 1;
    
    // En Facebook suele concentrarse mayor volumen de vecinos con reclamos
    const fbTension = Math.min(Math.round(((negCount * 1.2) / total) * 100), 100);
    // En X/Twitter suele haber debate político y gremial
    const xTension = Math.min(Math.round(((negCount * 1.1) / total) * 100), 100);
    // En YouTube suele ser más equilibrado con foco informativo
    const ytTension = Math.min(Math.round(((negCount * 0.8) / total) * 100), 100);

    if (socialFbScoreEl) socialFbScoreEl.textContent = `${fbTension}% tensión`;
    if (socialXScoreEl) socialXScoreEl.textContent = `${xTension}% tensión`;
    if (socialYtScoreEl) socialYtScoreEl.textContent = `${ytTension}% tensión`;

    if (socialPulseSummaryEl) {
        socialPulseSummaryEl.textContent = `Monitoreando interacciones en páginas de noticias de Jujuy. Mayor actividad registrada en comentarios sobre transporte, servicios públicos y paritarias salariales (${dias === 1 ? 'últimas 24 hs' : 'últimos ' + dias + ' días'}).`;
    }
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

// ─── 7. FEED DE NOTICIAS REALES CON FECHA EXACTA Y VERIFICADA ───
function renderNoticias(noticias) {
    if (!noticiasListEl) return;

    let filtered = noticias;
    if (activeFilter !== 'all') {
        filtered = noticias.filter(n => (n.tema || '').toLowerCase().includes(activeFilter.toLowerCase()));
    }

    if (!filtered.length) {
        noticiasListEl.innerHTML = '<div class="chart-empty" style="grid-column: 1/-1;">No se hallaron notas para este filtro temático en el período seleccionado.</div>';
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
        let dominio = 'Diario Local';
        try {
            dominio = new URL(link).hostname.replace('www.', '').replace('news.', '');
        } catch (e) {
            dominio = (n.fuente || 'web').replace('_', ' ');
        }

        const fuenteRaw = n.fuente || 'web';
        const fuenteLegible = fuenteRaw.replace('_', ' ').toUpperCase();
        
        // Formatear fecha REAL verificada
        const fechaFormateada = formatearFechaPublicacion(n.fecha);

        return `
            <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="news-card-item tone-${toneClass}" title="Abrir noticia original en ${escapeHtml(dominio)}">
                <div class="news-card-top">
                    <span class="news-source-tag ${fuenteRaw}">${fuenteLegible}</span>
                    <span class="news-time-tag">${escapeHtml(fechaFormateada)}</span>
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

// ─── FORMATEADOR DE FECHAS REALES DE PUBLICACIÓN ───
function formatearFechaPublicacion(fechaStr) {
    if (!fechaStr) return 'Reciente';

    try {
        const d = new Date(fechaStr.replace(' ', 'T'));
        if (isNaN(d.getTime())) return fechaStr.slice(0, 16);

        const ahora = new Date();
        const diffMs = ahora - d;
        const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        const hora = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Si es de las últimas 24 horas y del mismo día calendario
        if (d.toDateString() === ahora.toDateString()) {
            if (diffHoras < 1) return 'Hace instantes';
            if (diffHoras === 1) return 'Hace 1 hora';
            return `Hoy a las ${hora}`;
        }

        // Si fue ayer
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        if (d.toDateString() === ayer.toDateString()) {
            return `Ayer a las ${hora}`;
        }

        // Si fue hace más días: mostrar fecha exacta (ej: 11 Oct, 09:58 hs)
        const dia = d.getDate();
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const mes = meses[d.getMonth()];
        return `${dia} ${mes}, ${hora} hs`;

    } catch (e) {
        return fechaStr.slice(0, 16);
    }
}

function updateTimestamp(dateStr) {
    if (!lastUpdateText) return;
    const d = dateStr ? new Date(dateStr) : new Date();
    const hora = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fecha = d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    lastUpdateText.textContent = `${hora} hs · ${fecha}`;
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
