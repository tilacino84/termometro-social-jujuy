export interface TermometroSummary {
  indice: number;
  nivel: string;
  emoji: string;
  descripcion: string;
}

export interface SentimientosStats {
  POS: number;
  NEG: number;
  NEU: number;
}

export interface Estadisticas {
  total_noticias: number;
  total_comentarios: number;
  sentimientos: SentimientosStats;
  periodo_dias: number;
}

export interface TemaFrecuente {
  tema: string;
  total: number;
}

export interface TimelineDia {
  dia: string;
  pos: number;
  neg: number;
  neu: number;
  total: number;
}

export interface Noticia {
  id: number;
  titulo: string;
  link: string;
  fecha: string;
  fuente: string;
  keywords?: string;
  tema?: string;
  total_comentarios?: number;
  pos?: number;
  neg?: number;
  neu?: number;
  contenido?: string;
  sentimiento?: 'POS' | 'NEG' | 'NEU';
}

export interface KeywordTrending {
  palabra: string;
  total: number;
  en_negativos: number;
  en_positivos: number;
}

export interface SentimientoPorTema {
  tema: string;
  total_comentarios: number;
  score_promedio: number;
  positivos: number;
  negativos: number;
  neutros: number;
}

export interface DescontentoFuente {
  fuente: string;
  total_opiniones: number;
  reclamos: number;
  favorables: number;
  neutrales: number;
  porcentaje_descontento: number;
}

export interface ComentarioDestacado {
  id: number;
  texto: string;
  sentimiento: 'POS' | 'NEG' | 'NEU';
  score: number;
  fecha: string;
  noticia_titulo?: string;
  noticia_fuente?: string;
  noticia_link?: string;
  noticia_tema?: string;
}

export interface DepartamentoInfo {
  nombre: string;
  indice: number;
  nivel: 'bajo' | 'moderado' | 'alto' | 'crítico';
  color: string;
  emocion_predominante: string;
  total_noticias: number;
  total_social: number;
  severidad_promedio: number;
  localidades_clave: string[];
}

export interface SocialFeedItem {
  id: string;
  platform: 'instagram_reels' | 'tiktok' | 'facebook_groups' | 'x_twitter';
  author: string;
  text: string;
  timestamp: string;
  location_tag: string;
  departamento: string;
  emocion: string;
  severidad: number;
  sentimiento: 'POS' | 'NEG' | 'NEU';
  score: number;
  motor?: string;
}

export interface LexicoRegional {
  expresiones: string[];
  total_departamentos: number;
}

export interface DashboardPayload {
  termometro: TermometroSummary;
  estadisticas: Estadisticas;
  temas_frecuentes: TemaFrecuente[];
  timeline_sentimiento: TimelineDia[];
  noticias_recientes: Noticia[];
  keywords_trending: KeywordTrending[];
  sentimiento_por_tema: SentimientoPorTema[];
  descontento_por_fuente: DescontentoFuente[];
  comentarios_destacados: ComentarioDestacado[];
  mapa_departamentos: Record<string, DepartamentoInfo>;
  social_feed: SocialFeedItem[];
  lexico_regional?: LexicoRegional;
  actualizado?: string;
  fuente?: string;
}
