import { Noticia, DashboardPayload, DepartamentoInfo } from '../src/types';
import fs from 'fs';
import path from 'path';

// URLs de feeds RSS gratuitos sin API key ni consumo de créditos
const FREE_RSS_FEEDS = [
  'https://news.google.com/rss/search?q=Jujuy&hl=es-419&gl=AR&ceid=AR:es-419',
  'https://news.google.com/rss/search?q=Jujuy+paro+OR+reclamo+OR+salud+OR+inseguridad+OR+transporte&hl=es-419&gl=AR&ceid=AR:es-419',
  'https://news.google.com/rss/search?q=San+Salvador+de+Jujuy+OR+Palpalá+OR+Perico+OR+San+Pedro+de+Jujuy+OR+Tilcara&hl=es-419&gl=AR&ceid=AR:es-419'
];

const DEPARTAMENTOS_MAP: Record<string, string[]> = {
  "Dr. Manuel Belgrano": ["san salvador", "san salvador de jujuy", "alto comedero", "reyes", "villa jardín de reyes", "yala", "capital", "xibi xibi", "cuyaya", "gorriti", "los perales", "la viña"],
  "Palpalá": ["palpalá", "palpala", "río blanco", "rio blanco", "centro forestal"],
  "San Pedro": ["san pedro", "san pedro de jujuy", "la esperanza", "la mendieta"],
  "Ledesma": ["ledesma", "libertador", "libertador general san martín", "calilegua", "fraile pintado", "caimancito"],
  "El Carmen": ["el carmen", "perico", "ciudad perico", "monterrico", "pampa blanca", "aguas calientes"],
  "San Antonio": ["san antonio", "los alisos", "el ceibal"],
  "Tilcara": ["tilcara", "maimará", "maimara", "huacalera", "juella"],
  "Humahuaca": ["humahuaca", "uquía", "uquia", "tres cruces", "el aguilar", "mina el aguilar"],
  "Tumbaya": ["tumbaya", "purmamarca", "volcán", "volcan", "bárcena"],
  "Cochinoca": ["cochinoca", "abra pampa", "puesto del marqués", "casabindo"],
  "Yavi": ["yavi", "la quiaca", "cangrejillos", "el cóndor"],
  "Santa Catalina": ["santa catalina", "cieneguillas", "la ciénaga"],
  "Rinconada": ["rinconada", "mina pirquitas", "nuevo pirquitas"],
  "Susques": ["susques", "catua", "coranzulí", "olacapato", "olaroz", "cauchari"],
  "Valle Grande": ["valle grande", "santa ana", "caspalá", "san francisco"],
  "Santa Bárbara": ["santa bárbara", "santa clara", "palma sola", "el piquete"]
};

function decodeHtml(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .trim();
}

function classifyTopic(title: string): string {
  const t = title.toLowerCase();
  if (/litio|minera|minería|salar|olaroz|cauchari|borax|metal huasi/i.test(t)) return 'Litio';
  if (/robo|detenido|policía|droga|cocaína|narcotráfico|seguridad|estafa|comisaría|prisión|homicidio|choque|accidente|femicidio|crimen|armas/i.test(t)) return 'Seguridad';
  if (/gobierno|sadir|milei|legislatura|diputados|senado|intendente|concejo|elecciones|politica|política|justicia|guzmán|coparticipación|ajuste/i.test(t)) return 'Política';
  if (/colectivo|uta|transporte|boleto|ruta|choferes|puente|desvío|tránsito|vialidad|bache|tren/i.test(t)) return 'Transporte';
  if (/precio|sueldo|salario|inflación|economía|dólar|comercio|banco|aguinaldo|paritarias|ingenio|afip|arca/i.test(t)) return 'Economía';
  if (/salud|hospital|médico|soria|zabala|pami|guardia|dengue|enfermedad|paciente|vacuna|clínica|acv/i.test(t)) return 'Salud';
  if (/escuela|docente|adep|cedems|colegio|clases|universidad|unju|estudiantes|alumnos|educación/i.test(t)) return 'Educación';
  if (/carnaval|cultura|peña|festival|churo|folclore|música|pachamama|turismo|artesanos/i.test(t)) return 'Carnaval y Cultura';
  return 'General';
}

function classifySentiment(title: string): { pos: number; neg: number; neu: number; score: number } {
  const t = title.toLowerCase();

  const negWords = [
    'paro', 'corte', 'reclamo', 'bronca', 'indignación', 'robo', 'accidente', 'tragedia',
    'muerte', 'crisis', 'desastre', 'grave', 'tarifazo', 'aumento del boleto', 'suba',
    'despido', 'alerta', 'bache', 'inseguridad', 'sin agua', 'corte de luz', 'contaminación',
    'conflicto', 'denuncia', 'colapso', 'impunidad', 'huelga', 'femicidio'
  ];

  const posWords = [
    'inauguran', 'nuevo', 'avance', 'éxito', 'felicitaciones', 'churo', 'premio',
    'reconocimiento', 'esperanza', 'apoyo', 'récord', 'festividad', 'alivio',
    'obras', 'turismo', 'acuerdo', 'solución', 'carnaval', 'mejoras', 'asueto'
  ];

  let hasNeg = negWords.some((w) => t.includes(w));
  let hasPos = posWords.some((w) => t.includes(w));

  if (hasNeg && !hasPos) {
    return { pos: 0, neg: 1, neu: 0, score: -0.7 };
  }
  if (hasPos && !hasNeg) {
    return { pos: 1, neg: 0, neu: 0, score: 0.7 };
  }
  return { pos: 0, neg: 0, neu: 1, score: 0.0 };
}

function detectDepartment(text: string): string {
  const t = text.toLowerCase();
  for (const [depto, localities] of Object.entries(DEPARTAMENTOS_MAP)) {
    if (t.includes(depto.toLowerCase())) return depto;
    for (const loc of localities) {
      if (new RegExp(`\\b${loc}\\b`, 'i').test(t)) {
        return depto;
      }
    }
  }
  return 'Dr. Manuel Belgrano';
}

function parseRssXml(xml: string): Noticia[] {
  const items: Noticia[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemBlock = match[1];

    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemBlock);
    const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemBlock);
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemBlock);
    const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/.exec(itemBlock);

    if (!titleMatch) continue;

    let fullTitle = decodeHtml(titleMatch[1]);
    let fuente = 'Google News';

    // Google News titles format: "Title - Outlet Name"
    if (sourceMatch) {
      fuente = decodeHtml(sourceMatch[1]);
    } else if (fullTitle.includes(' - ')) {
      const parts = fullTitle.split(' - ');
      if (parts.length > 1) {
        fuente = parts.pop()!.trim();
        fullTitle = parts.join(' - ').trim();
      }
    }

    const rawLink = linkMatch ? decodeHtml(linkMatch[1]) : '';
    let fechaStr = new Date().toISOString();

    if (pubDateMatch) {
      try {
        const d = new Date(pubDateMatch[1]);
        if (!isNaN(d.getTime())) {
          // Format as YYYY-MM-DD HH:MM:SS
          fechaStr = d.toISOString().replace('T', ' ').slice(0, 19);
        }
      } catch {
        // fallback
      }
    }

    const tema = classifyTopic(fullTitle);
    const sent = classifySentiment(fullTitle);
    const depto = detectDepartment(fullTitle);

    // Fuente key
    const fuenteKey = fuente.toLowerCase().replace(/[^a-z0-9]/g, '_');

    items.push({
      id: Math.abs(hashCode(rawLink || fullTitle)),
      titulo: fullTitle,
      link: rawLink,
      fecha: fechaStr,
      fuente: fuenteKey,
      keywords: depto,
      tema,
      total_comentarios: 1,
      pos: sent.pos,
      neg: sent.neg,
      neu: sent.neu,
      sentimiento: sent.neg > 0 ? 'NEG' : sent.pos > 0 ? 'POS' : 'NEU'
    });
  }

  return items;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export async function scrapeFreeJujuyFeeds(): Promise<{
  noticiasNuevas: Noticia[];
  totalScraped: number;
  errores: string[];
}> {
  const allScraped: Noticia[] = [];
  const errores: string[] = [];

  for (const url of FREE_RSS_FEEDS) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
        }
      });

      if (res.ok) {
        const xml = await res.text();
        const parsed = parseRssXml(xml);
        allScraped.push(...parsed);
      } else {
        errores.push(`HTTP ${res.status} al consultar feed: ${url}`);
      }
    } catch (e: any) {
      errores.push(`Fallo al consultar feed: ${e?.message || String(e)}`);
    }
  }

  // Deduplicate by title or link
  const seen = new Set<string>();
  const noticiasNuevas: Noticia[] = [];

  for (const item of allScraped) {
    const key = item.titulo.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      noticiasNuevas.push(item);
    }
  }

  return {
    noticiasNuevas,
    totalScraped: noticiasNuevas.length,
    errores
  };
}

export function mergeAndRecalculateDashboard(
  current: DashboardPayload,
  scraped: Noticia[]
): { updatedPayload: DashboardPayload; newCount: number } {
  const existingTitles = new Set(current.noticias_recientes.map((n) => n.titulo.toLowerCase().trim()));
  const brandNew: Noticia[] = [];

  for (const item of scraped) {
    if (!existingTitles.has(item.titulo.toLowerCase().trim())) {
      brandNew.push(item);
      existingTitles.add(item.titulo.toLowerCase().trim());
    }
  }

  // Prepend brand new items
  const mergedNoticias = [...brandNew, ...current.noticias_recientes];

  // Recalculate global statistics
  let totalComentarios = 0;
  let posCount = 0;
  let negCount = 0;
  let neuCount = 0;

  const temasMap: Record<string, number> = {};
  const timelineMap: Record<string, { dia: string; pos: number; neg: number; neu: number; total: number }> = {};
  const deptoCountMap: Record<string, { pos: number; neg: number; total: number }> = {};

  mergedNoticias.forEach((n) => {
    const cPos = n.pos || 0;
    const cNeg = n.neg || 0;
    const cNeu = n.neu || 0;
    const cTot = n.total_comentarios || cPos + cNeg + cNeu || 1;

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

    const depto = detectDepartment(n.titulo);
    if (!deptoCountMap[depto]) {
      deptoCountMap[depto] = { pos: 0, neg: 0, total: 0 };
    }
    deptoCountMap[depto].pos += cPos;
    deptoCountMap[depto].neg += cNeg;
    deptoCountMap[depto].total += cTot;
  });

  const indice = totalComentarios > 0 ? Math.round((negCount / totalComentarios) * 1000) / 10 : 10.8;

  let nivel = 'bajo';
  let emoji = '🟢';
  let descripcion = 'Clima social tranquilo en Jujuy';

  if (indice > 65) {
    nivel = 'crítico';
    emoji = '🔴';
    descripcion = 'Alta conflictividad y preocupación ciudadana en Jujuy';
  } else if (indice > 45) {
    nivel = 'alto';
    emoji = '🟠';
    descripcion = 'Tensión social en alza con presencia de reclamos vecinales y gremiales';
  } else if (indice > 25) {
    nivel = 'moderado';
    emoji = '🟡';
    descripcion = 'Clima social moderado con debates puntuales en la provincia';
  }

  // Update mapa departamentos
  const updatedMapa: Record<string, DepartamentoInfo> = { ...current.mapa_departamentos };
  for (const [dName, stats] of Object.entries(deptoCountMap)) {
    if (updatedMapa[dName]) {
      const dIndice = stats.total > 0 ? Math.round((stats.neg / stats.total) * 1000) / 10 : updatedMapa[dName].indice;
      let dColor = '#10b981';
      let dNivel: DepartamentoInfo['nivel'] = 'bajo';
      if (dIndice >= 65) {
        dColor = '#ef4444';
        dNivel = 'crítico';
      } else if (dIndice >= 45) {
        dColor = '#f97316';
        dNivel = 'alto';
      } else if (dIndice >= 25) {
        dColor = '#f59e0b';
        dNivel = 'moderado';
      }

      updatedMapa[dName] = {
        ...updatedMapa[dName],
        indice: dIndice,
        nivel: dNivel,
        color: dColor,
        total_noticias: Math.max(stats.total, updatedMapa[dName].total_noticias)
      };
    }
  }

  const updatedPayload: DashboardPayload = {
    ...current,
    termometro: {
      indice,
      nivel,
      emoji,
      descripcion
    },
    estadisticas: {
      total_noticias: mergedNoticias.length,
      total_comentarios: totalComentarios,
      sentimientos: {
        POS: posCount,
        NEG: negCount,
        NEU: neuCount
      },
      periodo_dias: 30
    },
    temas_frecuentes: Object.keys(temasMap)
      .map((t) => ({ tema: t, total: temasMap[t] }))
      .sort((a, b) => b.total - a.total),
    timeline_sentimiento: Object.values(timelineMap).sort((a, b) => a.dia.localeCompare(b.dia)),
    noticias_recientes: mergedNoticias,
    mapa_departamentos: updatedMapa,
    actualizado: new Date().toISOString()
  };

  return {
    updatedPayload,
    newCount: brandNew.length
  };
}
