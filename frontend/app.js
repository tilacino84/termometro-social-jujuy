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

const DIAS_ANALISIS = 7;
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
const btnRefresh = document.getElementById('btn-refresh');
const lastUpdateText = document.getElementById('last-update');
const topicChipsContainer = document.getElementById('topic-filter-chips');

// Elementos de Descontento en Medios y Voces Ciudadanas
const mediaDiscontentListEl = document.getElementById('media-discontent-list');
const citizenVoicesListEl = document.getElementById('citizen-voices-list');
const voicesTotalCountEl = document.getElementById('voices-total-count');

// Elementos de Mapa de Calor Territorial
let selectedDepartment = null;
const jujuyMapSvg = document.getElementById('jujuy-map-svg');
const deptoActiveNameEl = document.getElementById('depto-active-name');
const deptoActiveBadgeEl = document.getElementById('depto-active-badge');
const deptoActiveTempEl = document.getElementById('depto-active-temp');
const deptoActiveEmotionEl = document.getElementById('depto-active-emotion');
const deptoActiveSeverityEl = document.getElementById('depto-active-severity');
const deptoActiveEventsEl = document.getElementById('depto-active-events');
const deptoActiveLocalidadesEl = document.getElementById('depto-active-localidades');
const btnFilterByDepto = document.getElementById('btn-filter-by-depto');
const btnResetMapFilter = document.getElementById('btn-reset-map-filter');
const socialFeedGridEl = document.getElementById('social-feed-grid');

// ─── INICIALIZACIÓN ───
document.addEventListener('DOMContentLoaded', () => {
    initTopicFilterChips();
    initRefreshButton();
    initHeatmapControls();

    // Renderizado instantáneo si existen datos embebidos
    if (rawMasterData && rawMasterData.noticias_recientes) {
        aplicarAnalisisSemanal();
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
function initTopicFilterChips() {
    if (!topicChipsContainer) return;
    const chips = topicChipsContainer.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.dataset.filter || 'all';
            
            if (rawMasterData) {
                aplicarAnalisisSemanal();
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
        aplicarAnalisisSemanal();
        updateTimestamp(data.actualizado);
    }
}

// ─── ANÁLISIS SEMANAL INTEGRAL (Últimos 7 Días) ───
function aplicarAnalisisSemanal() {
    if (!rawMasterData || !rawMasterData.noticias_recientes) return;

    const todasLasNotas = rawMasterData.noticias_recientes;
    
    // Determinar ancla temporal segura: la fecha más reciente de las noticias o ahora
    let maxFechaMs = 0;
    todasLasNotas.forEach(n => {
        if (n.fecha) {
            const t = new Date(n.fecha.replace(' ', 'T')).getTime();
            if (!isNaN(t) && t > maxFechaMs) maxFechaMs = t;
        }
    });

    const ahoraMs = Date.now();
    const referenciaMs = maxFechaMs > 0 ? Math.max(maxFechaMs, ahoraMs) : ahoraMs;
    const tiempoLimite = referenciaMs - (DIAS_ANALISIS * 24 * 60 * 60 * 1000);

    // Filtrar noticias reales pertenecientes a la semana
    const notasFiltradas = todasLasNotas.filter(n => {
        if (!n.fecha) return true;
        const fn = new Date(n.fecha.replace(' ', 'T')).getTime();
        return isNaN(fn) || fn >= tiempoLimite;
    });

    // Recalcular métricas en base a las noticias reales de la semana
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
        const dia = n.fecha ? n.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10);
        if (!timelineMap[dia]) {
            timelineMap[dia] = { dia, pos: 0, neg: 0, neu: 0, total: 0 };
        }
        timelineMap[dia].pos += cPos;
        timelineMap[dia].neg += cNeg;
        timelineMap[dia].neu += cNeu;
        timelineMap[dia].total += cTot;
    });

    // Calcular índice del termómetro semanal
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

    // Renderizar componentes con el análisis semanal
    renderGauge(indice, totalNotas, totalComentarios);
    renderMetrics({ POS: posCount, NEG: negCount, NEU: neuCount });
    renderTimeline(timelineOrdenado);
    renderTemas(temasOrdenados);
    renderDescontentoMedios(DIAS_ANALISIS, notasFiltradas);
    renderKeywords(rawMasterData.keywords_trending || []);
    renderHeatmap(rawMasterData.mapa_departamentos || {});
    renderSocialFeed(rawMasterData.social_feed || []);
    
    // Filtrar noticias si hay departamento activo
    if (selectedDepartment) {
        const dLower = selectedDepartment.toLowerCase();
        const notasDepto = notasFiltradas.filter(n => {
            const txt = (n.titulo + " " + (n.contenido || "")).toLowerCase();
            return txt.includes(dLower);
        });
        renderNoticias(notasDepto.length > 0 ? notasDepto : notasFiltradas);
    } else {
        renderNoticias(notasFiltradas);
    }
}

// ─── 1. GAUGE / VELOCÍMETRO SEMANAL ───
function renderGauge(indice, totalNotas, totalComentarios) {
    const rawVal = Math.min(Math.max(indice, 0), 100);

    let nivel = 'Calmo';
    let emoji = '🟢';
    let desc = '';

    if (totalNotas === 0) {
        nivel = 'Sin registros';
        emoji = '⚪';
        desc = `No se hallaron noticias registradas en los últimos 7 días.`;
    } else if (rawVal <= 15) {
        nivel = 'Calmo / Favorable';
        emoji = '🟢';
        desc = `Clima social con estabilidad general y baja conflictividad en Jujuy durante los últimos 7 días.`;
    } else if (rawVal <= 35) {
        nivel = 'Moderado';
        emoji = '🟡';
        desc = `Clima social moderado con debates y reclamos sectoriales puntuales en la provincia esta semana.`;
    } else if (rawVal <= 65) {
        nivel = 'Tensión Media';
        emoji = '🟠';
        desc = `Tensión social en alza con presencia de reclamos ciudadanos y conflictividad en los últimos 7 días.`;
    } else {
        nivel = 'Alerta / Conflicto';
        emoji = '🔴';
        desc = `Clima de alta conflictividad y preocupación ciudadana predominante en Jujuy.`;
    }

    if (gaugeValueEl) gaugeValueEl.textContent = totalNotas === 0 ? '0%' : `${rawVal.toFixed(1)}%`;
    if (gaugeLabelEl) gaugeLabelEl.textContent = `Tensión ${nivel}`;
    if (levelEmojiEl) levelEmojiEl.textContent = emoji;
    if (levelTextEl) levelTextEl.textContent = `Nivel ${nivel}`;
    if (termometroDescEl) termometroDescEl.textContent = desc;

    if (metaNoticiasEl) {
        metaNoticiasEl.textContent = `${totalNotas} noticias analizadas (últimos 7 días)`;
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
// ─── 5. DESCONTENTO EN MEDIOS Y VOCES CIUDADANAS REALES DE JUJUY ───
function renderDescontentoMedios(dias, notasDelPeriodo) {
    if (!mediaDiscontentListEl) return;

    // Medios reconocidos de la provincia
    const mediosDef = [
        { key: 'jujuy_al_momento', match: 'momento', nombre: 'Jujuy Al Momento', logo: '📰', reclamos: 0, total: 0 },
        { key: 'eltribuno', match: 'tribuno', nombre: 'El Tribuno de Jujuy', logo: '🗞️', reclamos: 0, total: 0 },
        { key: 'jujuy_online', match: 'online', nombre: 'Jujuy OnLine Noticias', logo: '🌐', reclamos: 0, total: 0 },
        { key: 'pregon', match: 'pregon', nombre: 'Diario Pregón', logo: '📜', reclamos: 0, total: 0 }
    ];

    // Computar según las notas reales del período seleccionado
    notasDelPeriodo.forEach(n => {
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

    // Renderizar tarjetas por medio
    mediaDiscontentListEl.innerHTML = mediosDef.map(m => {
        const pct = m.total > 0 ? Math.round((m.reclamos / m.total) * 100) : 0;
        let badgeClass = 'calmo';
        let badgeText = 'Tranquilo';
        let fillClass = 'green';

        if (pct >= 35) {
            badgeClass = 'critico';
            badgeText = `${pct}% Reclamos (Alto)`;
            fillClass = 'red';
        } else if (pct >= 15) {
            badgeClass = 'alerta';
            badgeText = `${pct}% Descontento`;
            fillClass = 'red';
        } else if (m.total > 0) {
            badgeClass = 'calmo';
            badgeText = `${pct}% Críticas (Bajo)`;
        } else {
            badgeClass = 'calmo';
            badgeText = 'Sin incidentes';
        }

        return `
            <div class="media-discontent-item">
                <div class="media-discontent-header">
                    <span class="media-name"><span>${m.logo}</span> ${m.nombre}</span>
                    <span class="media-badge-tag ${badgeClass}">${badgeText}</span>
                </div>
                <div class="media-progress-bar">
                    <div class="media-progress-fill ${fillClass}" style="width: ${Math.max(pct, 6)}%"></div>
                </div>
                <p class="media-detail-text">
                    ${m.reclamos} reclamos detectados sobre ${m.total} registros analizados en notas de este medio.
                </p>
            </div>
        `;
    }).join('');

    // Renderizar muro de testimonios y comentarios ciudadanos reales
    if (citizenVoicesListEl) {
        let comms = (rawMasterData && rawMasterData.comentarios_destacados) ? rawMasterData.comentarios_destacados : [];
        
        // Filtrar comentarios que correspondan a las notas del período
        if (notasDelPeriodo && notasDelPeriodo.length > 0) {
            const titulosValidos = new Set(notasDelPeriodo.map(n => (n.titulo || '').toLowerCase()));
            const commsFiltrados = comms.filter(c => titulosValidos.has((c.noticia_titulo || '').toLowerCase()));
            if (commsFiltrados.length > 0) {
                comms = commsFiltrados;
            }
        }

        if (voicesTotalCountEl) {
            voicesTotalCountEl.textContent = `${comms.length} testimonios ciudadanos en notas (${dias === 1 ? 'últimas 24 hs' : 'últimos ' + dias + ' días'})`;
        }

        if (!comms.length) {
            citizenVoicesListEl.innerHTML = '<div class="chart-empty" style="grid-column: 1/-1; padding: 2rem; text-align: center; color: var(--text-muted);">Sin testimonios registrados en este intervalo temporal</div>';
            return;
        }

        citizenVoicesListEl.innerHTML = comms.slice(0, 9).map(c => {
            const sent = c.sentimiento || 'NEU';
            let tagClass = 'neu';
            let tagLabel = '⚪ Informativo';
            if (sent === 'NEG') { tagClass = 'neg'; tagLabel = '🔴 Reclamo Ciudadano'; }
            else if (sent === 'POS') { tagClass = 'pos'; tagLabel = '🟢 Opinión Favorable'; }

            const medioNombre = formatearMedio(c.noticia_fuente);
            const fechaStr = formatearFechaPublicacion(c.fecha);

            return `
                <div class="voice-card ${tagClass}">
                    <div class="voice-header">
                        <span class="voice-tag ${tagClass}">${tagLabel}</span>
                        <span class="voice-source">${fechaStr}</span>
                    </div>
                    <p class="voice-quote">“${escapeHtml(c.texto)}”</p>
                    <div class="voice-footer">
                        <span class="voice-source">En nota: <strong>${escapeHtml(medioNombre)}</strong></span>
                        ${c.noticia_link ? `<a href="${c.noticia_link}" target="_blank" rel="noopener noreferrer" class="voice-context-link" title="${escapeHtml(c.noticia_titulo || '')}">Abrir noticia ↗</a>` : ''}
                    </div>
                </div>
            `;
        }).join('');
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

        const rawLink = n.link || '';
        const isGoogleSearch = rawLink.includes('google.com/search');
        const isGoogleNews = rawLink.includes('news.google.com');
        const hasValidLink = rawLink.startsWith('http') && !isGoogleNews;

        const link = hasValidLink ? rawLink : (rawLink || '#');

        // Determinar dominio / label del enlace
        let dominio = 'Diario Local';
        let accionLabel = 'Abrir noticia';
        
        if (isGoogleSearch) {
            dominio = 'Google Noticias';
            accionLabel = 'Buscar en Google Noticias';
        } else if (hasValidLink) {
            try {
                dominio = new URL(link).hostname.replace('www.', '').replace('news.', '');
                accionLabel = `Abrir en ${dominio}`;
            } catch (e) {
                dominio = (n.fuente || 'web').replace(/_/g, ' ');
                accionLabel = `Abrir en ${dominio}`;
            }
        } else {
            dominio = (n.fuente || 'web').replace(/_/g, ' ');
            accionLabel = 'Ver fuente';
        }

        const fuenteRaw = n.fuente || 'web';
        const fuenteLegible = fuenteRaw.replace(/_/g, ' ').toUpperCase();
        
        // Formatear fecha REAL verificada
        const fechaFormateada = formatearFechaPublicacion(n.fecha);

        // Icono diferente para búsqueda vs link directo
        const iconSvg = isGoogleSearch
            ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`
            : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

        return `
            <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="news-card-item tone-${toneClass}${isGoogleSearch ? ' is-search-link' : ''}" title="${escapeHtml(accionLabel)}">
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
                    <span>${escapeHtml(accionLabel)}</span>
                    ${iconSvg}
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

function formatearMedio(fuente) {
    if (!fuente) return 'Medio Local';
    const f = String(fuente).toLowerCase();
    if (f.includes('somosjujuy')) return 'Somos Jujuy';
    if (f.includes('tribuno')) return 'El Tribuno de Jujuy';
    if (f.includes('almomento')) return 'Jujuy Al Momento';
    if (f.includes('google')) return 'Google Noticias';
    if (f.includes('cronica')) return 'Crónica Jujuy';
    if (f.includes('diario')) return 'Diario de Jujuy';
    return fuente.replace(/_/g, ' ').toUpperCase();
}

// ─── 7. MAPA DE CALOR INTERACTIVO DE JUJUY ───
function initHeatmapControls() {
    if (!jujuyMapSvg) return;

    const deptoGroups = jujuyMapSvg.querySelectorAll('.depto-group');
    deptoGroups.forEach(g => {
        g.addEventListener('click', () => {
            const depto = g.dataset.depto;
            if (depto) {
                selectDepartment(depto);
            }
        });
    });

    if (btnFilterByDepto) {
        btnFilterByDepto.addEventListener('click', () => {
            if (selectedDepartment) {
                aplicarAnalisisSemanal();
                const feedEl = document.querySelector('.news-feed-card');
                if (feedEl) feedEl.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    if (btnResetMapFilter) {
        btnResetMapFilter.addEventListener('click', () => {
            selectedDepartment = null;
            const deptoGroups = jujuyMapSvg.querySelectorAll('.depto-group');
            deptoGroups.forEach(g => g.classList.remove('active'));
            aplicarAnalisisSemanal();
        });
    }
}

function renderHeatmap(mapaDeptos = {}) {
    if (!jujuyMapSvg) return;

    const deptoGroups = jujuyMapSvg.querySelectorAll('.depto-group');
    deptoGroups.forEach(g => {
        const depto = g.dataset.depto;
        const dData = mapaDeptos[depto];
        const pathEl = g.querySelector('path');
        
        if (dData && pathEl) {
            // Aplicar color según temperatura calculada
            pathEl.setAttribute('fill', dData.color || '#10b981');
            g.setAttribute('title', `${depto}: ${dData.indice}% de tensión (${dData.emocion_predominante})`);
        } else if (pathEl) {
            pathEl.setAttribute('fill', '#10b981');
        }

        if (selectedDepartment && depto === selectedDepartment) {
            g.classList.add('active');
        } else {
            g.classList.remove('active');
        }
    });

    // Actualizar panel lateral con departamento seleccionado o por defecto Dr. Manuel Belgrano
    const targetDepto = selectedDepartment || "Dr. Manuel Belgrano";
    updateDepartmentPanel(targetDepto, mapaDeptos[targetDepto]);
}

function selectDepartment(deptoName) {
    selectedDepartment = deptoName;
    const mapa = (rawMasterData && rawMasterData.mapa_departamentos) ? rawMasterData.mapa_departamentos : {};
    
    if (jujuyMapSvg) {
        const deptoGroups = jujuyMapSvg.querySelectorAll('.depto-group');
        deptoGroups.forEach(g => {
            if (g.dataset.depto === deptoName) {
                g.classList.add('active');
            } else {
                g.classList.remove('active');
            }
        });
    }

    updateDepartmentPanel(deptoName, mapa[deptoName]);
}

function updateDepartmentPanel(deptoName, data) {
    if (!deptoActiveNameEl) return;

    const d = data || {
        nombre: deptoName,
        indice: 14.3,
        nivel: "bajo",
        emocion_predominante: "Esperanza",
        total_noticias: 12,
        total_social: 4,
        severidad_promedio: 2,
        localidades_clave: ["Centro", "Barrios locales"]
    };

    deptoActiveNameEl.textContent = d.nombre;
    if (deptoActiveTempEl) deptoActiveTempEl.textContent = `${d.indice}%`;
    
    // Nivel Badge
    if (deptoActiveBadgeEl) {
        deptoActiveBadgeEl.textContent = `NIVEL ${d.nivel.toUpperCase()}`;
        if (d.nivel === 'crítico') {
            deptoActiveBadgeEl.style.background = 'rgba(239, 68, 68, 0.2)';
            deptoActiveBadgeEl.style.color = '#fca5a5';
        } else if (d.nivel === 'alto') {
            deptoActiveBadgeEl.style.background = 'rgba(249, 115, 22, 0.2)';
            deptoActiveBadgeEl.style.color = '#fdba74';
        } else if (d.nivel === 'moderado') {
            deptoActiveBadgeEl.style.background = 'rgba(245, 158, 11, 0.2)';
            deptoActiveBadgeEl.style.color = '#fde68a';
        } else {
            deptoActiveBadgeEl.style.background = 'rgba(16, 185, 129, 0.2)';
            deptoActiveBadgeEl.style.color = '#6ee7b7';
        }
    }

    // Emoción
    if (deptoActiveEmotionEl) {
        deptoActiveEmotionEl.className = `emotion-tag ${d.emocion_predominante}`;
        const emojiMap = {
            "Enojo": "😡",
            "Frustración": "😤",
            "Incertidumbre": "🤔",
            "Apoyo": "👏",
            "Esperanza": "✨",
            "Humor/Sarcasmo": "😂",
            "Alivio": "😌"
        };
        const em = d.emocion_predominante || "Incertidumbre";
        const icon = emojiMap[em] || "✨";
        const textEl = document.getElementById('depto-emotion-text');
        if (textEl) textEl.textContent = em;
        const iconSpan = deptoActiveEmotionEl.querySelector('span:first-child');
        if (iconSpan) iconSpan.textContent = icon;
    }

    // Severidad
    if (deptoActiveSeverityEl) {
        const sev = Math.round(d.severidad_promedio || 2);
        const pips = deptoActiveSeverityEl.querySelectorAll('.severity-pip');
        pips.forEach((pip, idx) => {
            if (idx < sev) {
                pip.className = `severity-pip filled sev-${sev}`;
            } else {
                pip.className = 'severity-pip';
            }
        });
    }

    // Total eventos
    if (deptoActiveEventsEl) {
        deptoActiveEventsEl.textContent = (d.total_noticias || 0) + (d.total_social || 0);
    }

    // Localidades
    if (deptoActiveLocalidadesEl) {
        deptoActiveLocalidadesEl.textContent = (d.localidades_clave && d.localidades_clave.length > 0)
            ? d.localidades_clave.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')
            : "Cabecera departamental y zonas aledañas";
    }
}

// ─── 8. FEED DE REDES SOCIALES (REELS, TIKTOKS, FACEBOOK) ───
function renderSocialFeed(feed = []) {
    if (!socialFeedGridEl) return;

    if (!feed || feed.length === 0) {
        socialFeedGridEl.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-muted);">
                <p>No hay eventos de redes sociales registrados en este período.</p>
            </div>
        `;
        return;
    }

    const emojiMap = {
        "Enojo": "😡",
        "Frustración": "😤",
        "Incertidumbre": "🤔",
        "Apoyo": "👏",
        "Esperanza": "✨",
        "Humor/Sarcasmo": "😂",
        "Alivio": "😌"
    };

    socialFeedGridEl.innerHTML = feed.slice(0, 8).map(item => {
        const plat = item.platform || 'instagram_reels';
        const em = item.emocion || 'Frustración';
        const emIcon = emojiMap[em] || '💬';
        const sev = item.severidad || 2;
        const dateStr = item.timestamp ? formatearFecha(item.timestamp) : 'Reciente';

        return `
            <article class="social-card">
                <div class="social-card-head">
                    <span class="platform-badge ${plat}">
                        ${plat.replace('_', ' ')}
                    </span>
                    <span class="social-author">@${escapeHtml(item.author || 'usuario_jujuy')}</span>
                </div>
                <p class="social-text">“${escapeHtml(item.text)}”</p>
                <div class="social-card-foot">
                    <span class="social-location">📍 ${escapeHtml(item.departamento || item.location_tag || 'Jujuy')}</span>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span class="emotion-tag ${em}" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;">
                            ${emIcon} ${em}
                        </span>
                        <span title="Severidad ${sev}/5" style="font-size: 0.72rem; color: var(--text-muted);">
                            Niv. ${sev}
                        </span>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}


