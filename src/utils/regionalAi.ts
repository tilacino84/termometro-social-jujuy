import { SocialFeedItem } from '../types';

export const DEPARTAMENTOS_JUJUY: Record<string, string[]> = {
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

export const EMOJI_MAP: Record<string, string> = {
  "Enojo": "😡",
  "Frustración": "😤",
  "Incertidumbre": "🤔",
  "Apoyo": "👏",
  "Esperanza": "✨",
  "Humor/Sarcasmo": "😂",
  "Alivio": "😌"
};

export function analizarTextoJujuy(texto: string, ubicacionTag = ""): {
  departamento: string;
  severidad: number;
  emocion: string;
  sentimiento: 'POS' | 'NEG' | 'NEU';
  score: number;
} {
  const t = `${ubicacionTag} ${texto}`.toLowerCase();

  // 1. Detección territorial de departamento
  let deptoAsignado = "Dr. Manuel Belgrano";
  for (const [depto, locs] of Object.entries(DEPARTAMENTOS_JUJUY)) {
    if (t.includes(depto.toLowerCase()) || locs.some(loc => new RegExp(`\\b${loc}\\b`, 'i').test(t))) {
      deptoAsignado = depto;
      break;
    }
  }

  // 2. Nivel de severidad (1 a 5)
  let severidad = 2;
  if (/corte de ruta|represión|femicidio|colapso|paro por tiempo indeterminado|saqueo|tragedia|muerte/i.test(t)) {
    severidad = 5;
  } else if (/paro|huelga|tarifazo|aumento del boleto|inseguridad|sin agua|corte de luz|despido|peligro/i.test(t)) {
    severidad = 4;
  } else if (/vergüenza|bronca|desastre|harto|reclamo|muni|colectivo|no alcanza|bache/i.test(t)) {
    severidad = 3;
  } else if (/lindo|hermoso|gracias|carnaval|churo|festival|avance|felicitaciones|orgullo/i.test(t)) {
    severidad = 1;
  }

  // 3. Emoción predominante y polaridad
  let emocion = "Incertidumbre";
  let sentimiento: 'POS' | 'NEG' | 'NEU' = "NEU";
  let score = 0.0;

  if (/jaj|jeje|meme|chiste|payaso|circo|ironía/i.test(t)) {
    emocion = "Humor/Sarcasmo";
    sentimiento = severidad >= 3 ? "NEG" : "NEU";
    score = severidad >= 3 ? -0.3 : 0.0;
  } else if (/bronca|hdp|ladrones|corruptos|inútiles|vergüenza|renuncien|basta|inoperantes/i.test(t)) {
    emocion = "Enojo";
    sentimiento = "NEG";
    score = -0.8;
  } else if (/no alcanza|cansado|harto|hasta cuando|siempre lo mismo|otra vez|desastre|esperamos una hora/i.test(t)) {
    emocion = "Frustración";
    sentimiento = "NEG";
    score = -0.6;
  } else if (/miedo|qué va a pasar|incertidumbre|preocupante|alerta|sin agua/i.test(t)) {
    emocion = "Incertidumbre";
    sentimiento = "NEG";
    score = -0.4;
  } else if (/felicitaciones|orgullo|apoyo|vamos|excelente|bravo|fuerza/i.test(t)) {
    emocion = "Apoyo";
    sentimiento = "POS";
    score = 0.7;
  } else if (/churo|chura|hermoso|carnaval|tradiciones|progreso|buena noticia|lindo|esperanza/i.test(t)) {
    emocion = "Esperanza";
    sentimiento = "POS";
    score = 0.6;
  } else if (/se resolvió|por fin|solución|alivio/i.test(t)) {
    emocion = "Alivio";
    sentimiento = "POS";
    score = 0.5;
  }

  return {
    departamento: deptoAsignado,
    severidad,
    emocion,
    sentimiento,
    score
  };
}

export function crearEventoSocial(
  text: string,
  platform: SocialFeedItem['platform'] = 'instagram_reels',
  author = 'vecino_jujeño',
  locationTag = ''
): SocialFeedItem {
  const analysis = analizarTextoJujuy(text, locationTag);
  return {
    id: `soc_live_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    platform,
    author,
    text,
    timestamp: new Date().toISOString(),
    location_tag: locationTag || analysis.departamento,
    departamento: analysis.departamento,
    emocion: analysis.emocion,
    severidad: analysis.severidad,
    sentimiento: analysis.sentimiento,
    score: analysis.score,
    motor: 'ia_regional_jujuy'
  };
}
