/**
 * Termómetro Social de Jujuy — Frontend Logic
 * Conexión con la API FastAPI, renderizado de gauge SVG,
 * canvas chart de evolución temporal, temas, keywords y noticias.
 */

const API_BASE = window.location.origin.includes(':8000') 
    ? `${window.location.origin}/api` 
    : 'http://localhost:8000/api';

let currentDias = 7;
let dashboardData = null;

// Elementos del DOM
const statusIndicator = document.getElementById('status-indicator');
const statusDot = statusIndicator?.querySelector('.status-dot');
const statusText = statusIndicator?.querySelector('.status-text');
const lastUpdateText = document.getElementById('last-update');

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

// ─── INICIALIZACIÓN ───
document.addEventListener('DOMContentLoaded', () => {
    initPeriodSelector();
    fetchDashboard(currentDias);

    // Auto-refresco cada 60 segundos
    setInterval(() => {
        fetchDashboard(currentDias, false);
    }, 60000);
});

function initPeriodSelector() {
    if (!periodSelector) return;
    const buttons = periodSelector.querySelectorAll('.period-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDias = parseInt(btn.dataset.dias, 10) || 7;
            fetchDashboard(currentDias);
        });
    });
}

// ─── CARGA DE DATOS (Híbrida: API local o data.json estático en Netlify) ───
async function fetchDashboard(dias, showLoadingState = true) {
    if (showLoadingState && statusText) {
        statusText.textContent = 'Actualizando...';
        if (statusDot) statusDot.className = 'status-dot';
    }

    let data = null;

    // 1. Intentar API en vivo (si estamos en entorno local con FastAPI)
    try {
        const res = await fetch(`${API_BASE}/dashboard?dias=${dias}`, { cache: 'no-cache' });
        if (res.ok) {
            data = await res.json();
        }
    } catch (e) {
        // En Netlify o sin API local, ignorar y pasar al fallback estático
    }

    // 2. Si no hubo respuesta de la API, cargar data.json generado para Netlify
    if (!data) {
        try {
            const res = await fetch(`./data.json?v=${Date.now()}`);
            if (res.ok) {
                data = await res.json();
            }
        } catch (e) {
            console.warn('No se pudo cargar data.json estático:', e);
        }
    }

    if (data) {
        dashboardData = data;
        renderDashboard(data);

        if (statusText) statusText.textContent = 'En vivo (Netlify)';
        if (statusDot) statusDot.className = 'status-dot online';
        if (lastUpdateText) {
            const date = new Date(data.actualizado || Date.now());
            lastUpdateText.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + date.toLocaleDateString() + ')';
        }
    } else {
        if (statusText) statusText.textContent = 'Sin conexión';
        if (statusDot) statusDot.className = 'status-dot';
        if (!dashboardData) {
            renderFallbackState();
        }
    }
}

// ─── RENDERIZADO GENERAL ───
function renderDashboard(data) {
    renderTermometro(data.termometro, data.estadisticas);
    renderStats(data.estadisticas?.sentimientos || {});
    renderTimeline(data.timeline_sentimiento || []);
    renderTemas(data.temas_frecuentes || []);
    renderSentimentTopics(data.sentimiento_por_tema || []);
    renderKeywords(data.keywords_trending || []);
    renderNoticias(data.noticias_recientes || []);
}

// ─── 1. TERMÓMETRO GAUGE ───
function renderTermometro(termometro, stats) {
    const indice = termometro?.indice ?? 0;
    const nivel = termometro?.nivel ?? 'moderado';
    const emoji = termometro?.emoji ?? '🟡';
    const descripcion = termometro?.descripcion ?? 'Clima social analizado en Jujuy';

    if (gaugeValueEl) gaugeValueEl.textContent = `${indice}%`;
    if (gaugeLabelEl) gaugeLabelEl.textContent = `Tensión ${nivel}`;
    if (levelEmojiEl) levelEmojiEl.textContent = emoji;
    if (levelTextEl) levelTextEl.textContent = `Nivel ${nivel}`;
    if (termometroDescEl) termometroDescEl.textContent = descripcion;

    if (metaNoticiasEl) {
        const totalNoticias = stats?.total_noticias ?? 0;
        metaNoticiasEl.textContent = `${totalNoticias} noticias analizadas`;
    }
    if (metaComentariosEl) {
        const totalComentarios = stats?.total_comentarios ?? 0;
        metaComentariosEl.textContent = `${totalComentarios} comentarios evaluados`;
    }

    // Animación SVG Gauge (arco de 180 grados, longitud ~251.3)
    // indice: 0% -> rotación -90deg, 100% -> rotación +90deg
    const angle = -90 + (indice / 100) * 180;
    if (gaugeNeedle) {
        gaugeNeedle.style.transition = 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
        gaugeNeedle.setAttribute('transform', `rotate(${angle}, 100, 100)`);
    }

    if (gaugeProgress) {
        const totalLength = 251.3;
        const offset = totalLength - (totalLength * (indice / 100));
        gaugeProgress.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)';
        gaugeProgress.setAttribute('stroke-dashoffset', offset);
    }
}

// ─── 2. TARJETAS DE SENTIMIENTO ───
function renderStats(sentimientos) {
    const pos = sentimientos.POS || 0;
    const neg = sentimientos.NEG || 0;
    const neu = sentimientos.NEU || 0;
    const total = pos + neg + neu || 1;

    const pctPos = Math.round((pos / total) * 100);
    const pctNeg = Math.round((neg / total) * 100);
    const pctNeu = Math.round((neu / total) * 100);

    if (valPosEl) valPosEl.textContent = pos;
    if (valNegEl) valNegEl.textContent = neg;
    if (valNeuEl) valNeuEl.textContent = neu;

    if (barPosEl) barPosEl.style.width = `${pctPos}%`;
    if (barNegEl) barNegEl.style.width = `${pctNeg}%`;
    if (barNeuEl) barNeuEl.style.width = `${pctNeu}%`;
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

    // Ajuste de DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = timelineCanvas.getBoundingClientRect();
    timelineCanvas.width = rect.width * dpr;
    timelineCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 30, bottom: 40, left: 40 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Calcular valores máximos
    const maxVal = Math.max(...timeline.map(d => Math.max(d.pos, d.neg, d.neu, 1)), 5);
    const n = timeline.length;
    const stepX = n > 1 ? chartW / (n - 1) : chartW / 2;

    // Dibujar líneas de guía
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartW, y);
        ctx.stroke();
    }

    // Dibujar series: Positivo (Verde), Negativo (Rojo), Neutro (Índigo)
    drawLineSeries(ctx, timeline, 'neg', '#ef4444', 'rgba(239, 68, 68, 0.1)', padding, stepX, chartH, maxVal);
    drawLineSeries(ctx, timeline, 'pos', '#10b981', 'rgba(16, 185, 129, 0.1)', padding, stepX, chartH, maxVal);
    drawLineSeries(ctx, timeline, 'neu', '#6366f1', 'rgba(99, 102, 241, 0.05)', padding, stepX, chartH, maxVal);

    // Eje X: Etiquetas de fechas
    ctx.fillStyle = '#64748b';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';

    timeline.forEach((item, idx) => {
        const x = padding.left + (n === 1 ? chartW / 2 : idx * stepX);
        const diaLabel = item.dia ? item.dia.slice(5) : `D${idx+1}`; // MM-DD
        ctx.fillText(diaLabel, x, height - 12);
    });
}

function drawLineSeries(ctx, data, key, strokeColor, fillColor, pad, stepX, chartH, maxVal) {
    if (!data.length) return;
    const points = data.map((d, i) => {
        const x = pad.left + (data.length === 1 ? stepX : i * stepX);
        const y = pad.top + chartH - ((d[key] || 0) / maxVal) * chartH;
        return { x, y };
    });

    // Relleno suave con gradiente
    ctx.beginPath();
    ctx.moveTo(points[0].x, pad.top + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Línea principal
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Puntos
    points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    });
}

// ─── 4. TEMAS EN AGENDA ───
function renderTemas(temas) {
    if (!temasListEl) return;
    if (!temas.length) {
        temasListEl.innerHTML = '<div class="chart-empty">No hay temas clasificados en este período</div>';
        return;
    }

    temasListEl.innerHTML = temas.slice(0, 8).map((t, index) => `
        <div class="tema-item animate-in">
            <span class="tema-item__rank">${index + 1}</span>
            <span class="tema-item__name">${escapeHtml(t.tema || 'General')}</span>
            <span class="tema-item__count">${t.total} notas</span>
        </div>
    `).join('');
}

// ─── 5. TEMPERATURA POR TEMA ───
function renderSentimentTopics(topics) {
    if (!sentimentTopicsBody) return;
    if (!topics.length) {
        sentimentTopicsBody.innerHTML = '<div class="chart-empty">Sin datos de opiniones por tema</div>';
        return;
    }

    sentimentTopicsBody.innerHTML = topics.slice(0, 7).map(t => {
        const total = t.total_comentarios || (t.positivos + t.negativos + t.neutros) || 1;
        const pctPos = Math.round((t.positivos / total) * 100);
        const pctNeg = Math.round((t.negativos / total) * 100);
        const pctNeu = Math.round((t.neutros / total) * 100);

        return `
            <div class="topic-row">
                <span class="topic-row__name">${escapeHtml(t.tema)}</span>
                <div class="topic-row__bars">
                    ${pctNeg > 0 ? `<div class="topic-row__bar topic-row__bar--neg" style="width: ${pctNeg}%" title="Negativos: ${pctNeg}%">${pctNeg > 15 ? pctNeg + '%' : ''}</div>` : ''}
                    ${pctNeu > 0 ? `<div class="topic-row__bar topic-row__bar--neu" style="width: ${pctNeu}%" title="Neutros: ${pctNeu}%"></div>` : ''}
                    ${pctPos > 0 ? `<div class="topic-row__bar topic-row__bar--pos" style="width: ${pctPos}%" title="Positivos: ${pctPos}%">${pctPos > 15 ? pctPos + '%' : ''}</div>` : ''}
                </div>
                <span class="topic-row__total">${t.total_comentarios} ops</span>
            </div>
        `;
    }).join('');
}

// ─── 6. KEYWORDS TRENDING ───
function renderKeywords(keywords) {
    if (!keywordsCloudEl) return;
    if (!keywords.length) {
        keywordsCloudEl.innerHTML = '<div class="chart-empty">Sin términos frecuentes aún</div>';
        return;
    }

    const maxCount = Math.max(...keywords.map(k => k.total), 1);

    keywordsCloudEl.innerHTML = keywords.map(k => {
        let toneClass = 'keyword-tag--neutral';
        if (k.en_negativos > k.en_positivos * 1.5) toneClass = 'keyword-tag--hot';
        else if (k.en_positivos > k.en_negativos * 1.5) toneClass = 'keyword-tag--cool';
        else if (k.en_negativos > 0) toneClass = 'keyword-tag--warm';

        let sizeClass = '';
        const ratio = k.total / maxCount;
        if (ratio > 0.6) sizeClass = 'keyword-tag--lg';
        else if (ratio > 0.3) sizeClass = 'keyword-tag--md';

        return `
            <span class="keyword-tag ${toneClass} ${sizeClass}">
                #${escapeHtml(k.palabra)}
                <span class="keyword-tag__count">${k.total}</span>
            </span>
        `;
    }).join('');
}

// ─── 7. NOTICIAS RECIENTES ───
function renderNoticias(noticias) {
    if (!noticiasListEl) return;
    if (!noticias.length) {
        noticiasListEl.innerHTML = '<div class="chart-empty">No se registraron noticias para este rango</div>';
        return;
    }

    noticiasListEl.innerHTML = noticias.map(n => {
        const total = n.total_comentarios || 0;
        let badgeType = 'neu';
        let badgeText = 'Equilibrado';

        if (n.neg > n.pos && n.neg > 0) {
            badgeType = 'neg';
            badgeText = `😠 ${n.neg} críticos`;
        } else if (n.pos > n.neg && n.pos > 0) {
            badgeType = 'pos';
            badgeText = `😊 ${n.pos} positivos`;
        } else if (total > 0) {
            badgeText = `💬 ${total} coments`;
        } else {
            badgeText = 'Sin comentarios';
        }

        const fechaCorta = n.fecha ? n.fecha.slice(0, 16) : '';
        const fuenteLimpia = (n.fuente || 'web').replace('_', ' ').toUpperCase();

        return `
            <a href="${escapeHtml(n.link || '#')}" target="_blank" rel="noopener noreferrer" class="noticia-item">
                <div class="noticia-item__indicator noticia-item__indicator--${badgeType}"></div>
                <div class="noticia-item__body">
                    <h3 class="noticia-item__title">${escapeHtml(n.titulo)}</h3>
                    <div class="noticia-item__meta">
                        <span>${fuenteLimpia}</span>
                        <span>·</span>
                        <span>${fechaCorta}</span>
                    </div>
                </div>
                <div class="noticia-item__stats">
                    ${n.tema ? `<span class="noticia-item__tema">${escapeHtml(n.tema)}</span>` : ''}
                    <span class="noticia-item__badge noticia-item__badge--${badgeType}">
                        ${badgeText}
                    </span>
                </div>
            </a>
        `;
    }).join('');
}

// ─── ESTADO FALLBACK (DEMO / PREVIA) ───
function renderFallbackState() {
    renderTermometro({
        indice: 42,
        nivel: 'moderado',
        emoji: '🟡',
        descripcion: 'Conectando con el servidor backend en http://localhost:8000...'
    }, {
        total_noticias: 0,
        total_comentarios: 0
    });

    renderStats({ POS: 15, NEG: 35, NEU: 50 });
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
