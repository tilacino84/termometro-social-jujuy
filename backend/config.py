"""
Configuración central del Termómetro Social de Jujuy.

Define fuentes de noticias, temas de interés, selectores CSS por portal
y constantes operativas para scraping y análisis.
"""

import os
import logging

# ─────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)

# ─────────────────────────────────────────────
# RUTAS
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "termometro.db")

# ─────────────────────────────────────────────
# FEEDS RSS
# ─────────────────────────────────────────────
RSS_FEEDS = [
    {
        "nombre": "Google News - Jujuy",
        "url": "https://news.google.com/rss/search?q=Jujuy&hl=es-419&gl=AR&ceid=AR:es-419",
        "fuente": "google_news",
    },
    {
        "nombre": "El Tribuno Jujuy",
        "url": "https://www.eltribuno.com/jujuy/rss",
        "fuente": "el_tribuno",
    },
    {
        "nombre": "Jujuy al Momento",
        "url": "https://www.jujuyalmomento.com/rss/todos-los-contenidos.xml",
        "fuente": "jujuy_al_momento",
    },
]

# ─────────────────────────────────────────────
# PORTALES WEB (scraping directo)
# ─────────────────────────────────────────────
PORTALES_WEB = [
    {
        "nombre": "El Tribuno Jujuy",
        "base_url": "https://www.eltribuno.com/jujuy",
        "fuente": "el_tribuno",
        "selectores": {
            "articulo_body": "div.article-body, div.entry-content, div.nota-cuerpo",
            "titulo": "h1.article-title, h1.entry-title, h1.titulo-nota",
            "fecha": "time, span.date, span.fecha",
            "links_noticias": "a.article-link, h2 a, h3 a",
        },
    },
    {
        "nombre": "Pregón",
        "base_url": "https://www.pregon.com.ar",
        "fuente": "pregon",
        "selectores": {
            "articulo_body": "div.entry-content, div.td-post-content, div.article-body",
            "titulo": "h1.entry-title, h1.tdb-title-text",
            "fecha": "time, span.td-post-date",
            "links_noticias": "h3.entry-title a, h2 a, a.td-image-wrap",
        },
    },
    {
        "nombre": "Jujuy al Momento",
        "base_url": "https://www.jujuyalmomento.com",
        "fuente": "jujuy_al_momento",
        "selectores": {
            "articulo_body": "div.field-item, div.body, div.node-content",
            "titulo": "h1.page-header, h1.title, h1",
            "fecha": "span.date-display-single, time",
            "links_noticias": "h2 a, h3 a, div.views-row a",
        },
    },
    {
        "nombre": "Jujuy Online",
        "base_url": "https://www.jujuyonlinenoticias.com.ar",
        "fuente": "jujuy_online",
        "selectores": {
            "articulo_body": "div.entry-content, div.td-post-content",
            "titulo": "h1.entry-title, h1.tdb-title-text",
            "fecha": "time, span.td-post-date",
            "links_noticias": "h3.entry-title a, h2 a",
        },
    },
]

# ─────────────────────────────────────────────
# SELECTORES DE COMENTARIOS POR PORTAL
# ─────────────────────────────────────────────
SELECTORES_COMENTARIOS = {
    "el_tribuno": {
        "contenedor": "div#comments, div.comments-area, div#disqus_thread, section.comments",
        "item": "div.comment, li.comment, div.post-comment",
        "texto": "p, div.comment-text, div.comment-body",
    },
    "pregon": {
        "contenedor": "div#comments, div.comments-area, div#disqus_thread, ol.comment-list",
        "item": "div.comment-body, li.comment, article.comment",
        "texto": "p, div.comment-content, div.comment-text",
    },
    "jujuy_al_momento": {
        "contenedor": "div#comments, div.comment-wrapper, section.comments",
        "item": "div.comment, article.comment",
        "texto": "p, div.comment-text, div.field-item",
    },
    "jujuy_online": {
        "contenedor": "div#comments, div.comments-area, ol.comment-list",
        "item": "li.comment, div.comment-body",
        "texto": "p, div.comment-content",
    },
    # Facebook Comments Plugin (embebido via iframe o div)
    "facebook_plugin": {
        "contenedor": "div.fb-comments, div[data-href], div._3-8y",
        "item": "div._3-8x, div._30o4, div.UFIComment",
        "texto": "span._3-8_, span.UFICommentBody, div._3-8z",
    },
}

# ─────────────────────────────────────────────
# TEMAS DE INTERÉS HIPERLOCALES
# ─────────────────────────────────────────────
TEMAS_INTERES = {
    "Seguridad": [
        "seguridad", "robo", "asalto", "policía", "inseguridad",
        "delito", "violencia", "crimen", "femicidio", "narco",
        "detenido", "preso", "operativo", "comisaría",
    ],
    "Política": [
        "gobierno", "gobernador", "legislatura", "intendente",
        "elecciones", "diputado", "senador", "municipio",
        "gerardo morales", "carlos sadir", "concejo deliberante",
    ],
    "Litio": [
        "litio", "minería", "minera", "salar", "puna",
        "exar", "sales de jujuy", "cauchari", "olaroz",
        "recurso natural", "regalías",
    ],
    "Economía": [
        "economía", "empleo", "desempleo", "trabajo", "sueldo",
        "inflación", "precio", "comercio", "pyme", "turismo",
        "producción", "azúcar", "tabaco", "ingenio",
    ],
    "Transporte": [
        "transporte", "colectivo", "micro", "ruta",
        "accidente vial", "tránsito", "vialidad", "autopista",
        "vuelo", "aeropuerto",
    ],
    "Educación": [
        "educación", "escuela", "universidad", "unju",
        "docente", "maestro", "alumnos", "clases",
        "paro docente", "becas",
    ],
    "Salud": [
        "salud", "hospital", "médico", "vacuna",
        "dengue", "covid", "atención", "guardia",
        "ambulancia", "medicamento",
    ],
    "Carnaval y Cultura": [
        "carnaval", "comparsa", "diablo", "corso",
        "festival", "cultura", "patrimonio", "quebrada",
        "humahuaca", "tilcara", "purmamarca",
    ],
    "Medio Ambiente": [
        "medio ambiente", "incendio forestal", "contaminación",
        "basura", "agua", "sequía", "inundación",
        "yungas", "parque nacional",
    ],
}

# ─────────────────────────────────────────────
# CONSTANTES DE OPERACIÓN
# ─────────────────────────────────────────────
SCRAPER_CONFIG = {
    "timeout": 15,                   # Timeout HTTP en segundos
    "max_retries": 3,                # Reintentos por request
    "delay_between_requests": 2.0,   # Pausa entre requests (cortesía)
    "max_noticias_por_feed": 30,     # Noticias máximas por feed RSS
    "max_noticias_por_portal": 20,   # Noticias máximas por portal web
    "user_agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
}

# Headers HTTP para evitar bloqueos
HTTP_HEADERS = {
    "User-Agent": SCRAPER_CONFIG["user_agent"],
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

# ─────────────────────────────────────────────
# INTERVALO DE EJECUCIÓN DEL SCRAPER (minutos)
# ─────────────────────────────────────────────
SCRAPER_INTERVAL_MINUTES = int(os.getenv("SCRAPER_INTERVAL", "60"))

# ─────────────────────────────────────────────
# CONFIGURACIÓN DE IA Y MODELO REGIONAL JUJUY
# ─────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
META_GRAPH_ACCESS_TOKEN = os.getenv("META_GRAPH_ACCESS_TOKEN", "")
TIKTOK_CLIENT_KEY = os.getenv("TIKTOK_CLIENT_KEY", "")

# 16 Departamentos oficiales de Jujuy y sus localidades representativas
DEPARTAMENTOS_JUJUY = {
    "Dr. Manuel Belgrano": ["san salvador", "san salvador de jujuy", "alto comedero", "reyes", "villa jardín de reyes", "yala", "capital", "xibi xibi", "chijra", "cuyaya", "gorriti", "los perales", "la viña"],
    "Palpalá": ["palpalá", "palpala", "río blanco", "rio blanco", "centro forestal", "carahunco"],
    "San Pedro": ["san pedro", "san pedro de jujuy", "la esperanza", "la mendieta", "arrayanal", "rodeito"],
    "Ledesma": ["ledesma", "libertador", "libertador general san martín", "calilegua", "fraile pintado", "caimancito", "chalicán"],
    "El Carmen": ["el carmen", "perico", "ciudad perico", "monterrico", "pampa blanca", "aguas calientes"],
    "San Antonio": ["san antonio", "los alisos", "el ceibal", "la toma"],
    "Tilcara": ["tilcara", "maimará", "maimara", "huacalera", "juella", "pucará"],
    "Humahuaca": ["humahuaca", "uquía", "uquia", "coctaca", "tres cruces", "el aguilar", "mina el aguilar"],
    "Tumbaya": ["tumbaya", "purmamarca", "volcán", "volcan", "bárcena", "barcena"],
    "Cochinoca": ["cochinoca", "abra pampa", "puesto del marqués", "casabindo", "abdón castro tolay", "barrancas"],
    "Yavi": ["yavi", "la quiaca", "cangrejillos", "el cóndor", "pumahuasi"],
    "Santa Catalina": ["santa catalina", "cieneguillas", "la ciénaga", "el angosto"],
    "Rinconada": ["rinconada", "mina pirquitas", "nuevo pirquitas", "coyaguayma"],
    "Susques": ["susques", "catua", "coranzulí", "coranzuli", "olacapato", "olaroz", "salar de olaroz", "cauchari"],
    "Valle Grande": ["valle grande", "santa ana", "caspalá", "caspala", "san francisco", "pampichuela"],
    "Santa Bárbara": ["santa bárbara", "santa clara", "palma sola", "el piquete", "vinalito", "el fuerte"]
}

# Modismos, instituciones y referencias locales para enriquecer el contexto del LLM
LÉXICO_REGIONAL_JUJUY = {
    "expresiones": ["churo", "chura", "coquear", "coqueo", "acullico", "chango", "changa", "coya", "pacha", "pachamama", "tucura", "yuto", "chaya", "comparsa", "cascotazo", "chulengo"],
    "lugares_e_hitos": ["el xibi xibi", "alto comedero", "corte en purmamarca", "la muni", "casa de gobierno", "puente san martín", "plaza belgrano", "parque lineal", "la viña", "la tupac"],
    "servicios_y_entidades": ["ejesa", "agua potable", "secheep", "unju", "colectivo xibi xibi", "san jorge", "unión bus", "santa ana", "el urbano", "isj", "tribunales", "cedems", "adep", "seom"]
}

# Emociones catalogadas para el Termómetro Social
EMOCIONES_CATALOGO = [
    "Enojo",
    "Incertidumbre",
    "Frustración",
    "Apoyo",
    "Esperanza",
    "Humor/Sarcasmo",
    "Alivio"
]
