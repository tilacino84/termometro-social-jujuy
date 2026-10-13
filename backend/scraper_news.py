"""
Scraper de Noticias — Termómetro Social de Jujuy.

Recolecta noticias desde feeds RSS y portales web locales.
Extrae título, link, fecha y cuerpo del artículo.
Robusto ante caídas de portales: loggea errores y continúa.
"""

import logging
import time
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin, urlparse

import feedparser
import requests
from bs4 import BeautifulSoup

from backend.config import (
    RSS_FEEDS,
    PORTALES_WEB,
    SCRAPER_CONFIG,
    HTTP_HEADERS,
    TEMAS_INTERES,
)
from backend.database import (
    init_db,
    insertar_noticia,
    obtener_noticia_por_link,
    obtener_noticias_sin_contenido,
    actualizar_contenido_noticia,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# UTILIDADES
# ─────────────────────────────────────────────

def _limpiar_texto(texto: str) -> str:
    """Limpia HTML residual, espacios múltiples y caracteres especiales."""
    if not texto:
        return ""
    # Remover tags HTML restantes
    texto = re.sub(r"<[^>]+>", " ", texto)
    # Remover URLs
    texto = re.sub(r"https?://\S+", "", texto)
    # Normalizar espacios
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto


def _parsear_fecha(fecha_str: str) -> str:
    """
    Intenta parsear múltiples formatos de fecha y retorna YYYY-MM-DD HH:MM:SS.
    Si falla, retorna la fecha/hora actual.
    """
    formatos = [
        "%a, %d %b %Y %H:%M:%S %z",       # RSS estándar
        "%a, %d %b %Y %H:%M:%S %Z",       # RSS con timezone nombre
        "%Y-%m-%dT%H:%M:%S%z",             # ISO 8601
        "%Y-%m-%dT%H:%M:%SZ",             # ISO 8601 UTC
        "%Y-%m-%d %H:%M:%S",              # MySQL/SQLite
        "%d/%m/%Y %H:%M",                 # Formato AR común
        "%d/%m/%Y",                        # Solo fecha AR
        "%Y-%m-%d",                        # Solo fecha ISO
    ]
    for fmt in formatos:
        try:
            dt = datetime.strptime(fecha_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except (ValueError, AttributeError):
            continue

    # Si feedparser provee un struct_time
    if hasattr(fecha_str, "tm_year"):
        try:
            return datetime(*fecha_str[:6]).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            pass

    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _clasificar_tema(texto: str) -> str:
    """Clasifica el texto según los temas de interés definidos en config."""
    texto_lower = texto.lower()
    mejor_tema = ""
    mejor_score = 0

    for tema, palabras in TEMAS_INTERES.items():
        score = sum(1 for palabra in palabras if palabra in texto_lower)
        if score > mejor_score:
            mejor_score = score
            mejor_tema = tema

    return mejor_tema if mejor_score >= 1 else "General"


def _hacer_request(url: str, timeout: int = None) -> Optional[requests.Response]:
    """
    Realiza un GET con reintentos, timeout y manejo de errores.
    Retorna None si falla después de todos los reintentos.
    """
    timeout = timeout or SCRAPER_CONFIG["timeout"]
    max_retries = SCRAPER_CONFIG["max_retries"]

    for intento in range(1, max_retries + 1):
        try:
            response = requests.get(
                url,
                headers=HTTP_HEADERS,
                timeout=timeout,
                allow_redirects=True,
            )
            response.raise_for_status()
            return response
        except requests.exceptions.Timeout:
            logger.warning(
                "Timeout al acceder a %s (intento %d/%d)",
                url[:80], intento, max_retries,
            )
        except requests.exceptions.ConnectionError:
            logger.warning(
                "Error de conexión a %s (intento %d/%d)",
                url[:80], intento, max_retries,
            )
        except requests.exceptions.HTTPError as e:
            logger.warning(
                "HTTP %s para %s (intento %d/%d)",
                e.response.status_code if e.response else "???",
                url[:80], intento, max_retries,
            )
        except requests.exceptions.RequestException as e:
            logger.warning(
                "Error inesperado accediendo a %s: %s",
                url[:80], str(e)[:100],
            )

        if intento < max_retries:
            time.sleep(SCRAPER_CONFIG["delay_between_requests"] * intento)

    logger.error("Falló tras %d intentos: %s", max_retries, url[:80])
    return None


def _es_url_noticia_valida(url: str, fuente_base: str) -> bool:
    """Filtra URLs que no son noticias (imágenes, ads, categorías genéricas)."""
    if not url:
        return False
    parsed = urlparse(url)
    path = parsed.path.lower()

    # Excluir extensiones no deseadas
    extensiones_excluir = (".jpg", ".png", ".gif", ".pdf", ".mp4", ".mp3")
    if any(path.endswith(ext) for ext in extensiones_excluir):
        return False

    # Excluir paths genéricos
    paths_excluir = ("/categoria/", "/tag/", "/autor/", "/page/", "/feed/", "/wp-admin/")
    if any(p in path for p in paths_excluir):
        return False

    # La URL debe tener un path significativo (más de /seccion/)
    segmentos = [s for s in path.split("/") if s]
    return len(segmentos) >= 1


# ─────────────────────────────────────────────
# SCRAPER DE FEEDS RSS
# ─────────────────────────────────────────────

def scrapear_rss() -> int:
    """
    Parsea todos los feeds RSS configurados y guarda las noticias en la BD.
    Retorna la cantidad de noticias nuevas insertadas.
    """
    total_nuevas = 0

    for feed_info in RSS_FEEDS:
        nombre = feed_info["nombre"]
        url = feed_info["url"]
        fuente = feed_info["fuente"]

        logger.info("📡 Parseando RSS: %s", nombre)

        try:
            feed = feedparser.parse(url)
        except Exception as e:
            logger.error("Error al parsear RSS %s: %s", nombre, e)
            continue

        if feed.bozo and not feed.entries:
            logger.warning("Feed RSS mal formado o vacío: %s", nombre)
            continue

        entries = feed.entries[:SCRAPER_CONFIG["max_noticias_por_feed"]]
        logger.info("  → %d entradas encontradas en %s", len(entries), nombre)

        for entry in entries:
            try:
                titulo = _limpiar_texto(entry.get("title", "Sin título"))
                link = entry.get("link", "")

                if not link or not titulo:
                    continue

                # Google News a veces redirige; intentar obtener la URL real
                if "news.google.com" in link:
                    link = _resolver_url_google_news(link) or link

                # Parsear fecha
                fecha_raw = entry.get("published", entry.get("updated", ""))
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    fecha = _parsear_fecha_struct(entry.published_parsed)
                else:
                    fecha = _parsear_fecha(str(fecha_raw))

                # Contenido breve desde el RSS (resumen)
                resumen = _limpiar_texto(
                    entry.get("summary", entry.get("description", ""))
                )

                # Clasificar tema preliminar con el título + resumen
                tema = _clasificar_tema(f"{titulo} {resumen}")

                noticia_id = insertar_noticia(
                    titulo=titulo,
                    link=link,
                    fecha=fecha,
                    fuente=fuente,
                    contenido=resumen,
                    tema=tema,
                )

                if noticia_id:
                    total_nuevas += 1

            except Exception as e:
                logger.error(
                    "Error procesando entrada RSS '%s': %s",
                    entry.get("title", "???")[:40], e,
                )
                continue

        time.sleep(SCRAPER_CONFIG["delay_between_requests"])

    logger.info("✅ RSS: %d noticias nuevas insertadas", total_nuevas)
    return total_nuevas


def _parsear_fecha_struct(struct_time) -> str:
    """Convierte un struct_time de feedparser a string YYYY-MM-DD HH:MM:SS."""
    try:
        return datetime(*struct_time[:6]).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _resolver_url_google_news(google_url: str) -> Optional[str]:
    """
    Intenta resolver la URL de redirección de Google News.
    Google News usa URLs como https://news.google.com/rss/articles/CBMi...
    que redirigen al sitio original.
    """
    try:
        resp = requests.head(
            google_url,
            headers=HTTP_HEADERS,
            timeout=8,
            allow_redirects=True,
        )
        final_url = resp.url
        if "news.google.com" not in final_url:
            return final_url
    except Exception:
        pass

    # Fallback: intentar extraer del parámetro url= si existe
    if "url=" in google_url:
        from urllib.parse import parse_qs, urlparse as up
        parsed = up(google_url)
        urls = parse_qs(parsed.query).get("url", [])
        if urls:
            return urls[0]

    return None


# ─────────────────────────────────────────────
# SCRAPER DE PORTALES WEB
# ─────────────────────────────────────────────

def scrapear_portales() -> int:
    """
    Visita los portales web configurados, extrae links de noticias
    y guarda las nuevas en la BD.
    Retorna cantidad de noticias nuevas.
    """
    total_nuevas = 0

    for portal in PORTALES_WEB:
        nombre = portal["nombre"]
        base_url = portal["base_url"]
        fuente = portal["fuente"]
        selectores = portal["selectores"]

        logger.info("🌐 Scrapeando portal: %s", nombre)

        response = _hacer_request(base_url)
        if not response:
            continue

        try:
            soup = BeautifulSoup(response.content, "html.parser")
        except Exception as e:
            logger.error("Error parseando HTML de %s: %s", nombre, e)
            continue

        # Buscar links de noticias
        links_encontrados = set()
        for selector in selectores["links_noticias"].split(","):
            selector = selector.strip()
            try:
                elementos = soup.select(selector)
                for elem in elementos:
                    href = elem.get("href", "")
                    if href:
                        url_completa = urljoin(base_url, href)
                        if _es_url_noticia_valida(url_completa, base_url):
                            links_encontrados.add(url_completa)
            except Exception:
                continue

        logger.info(
            "  → %d links de noticias encontrados en %s",
            len(links_encontrados), nombre,
        )

        # Procesar cada link (hasta el máximo configurado)
        for i, link in enumerate(
            list(links_encontrados)[:SCRAPER_CONFIG["max_noticias_por_portal"]]
        ):
            # Verificar si ya existe
            if obtener_noticia_por_link(link):
                continue

            # Entrar a la noticia para extraer contenido
            noticia_data = _extraer_noticia_de_url(link, selectores)
            if not noticia_data:
                continue

            tema = _clasificar_tema(
                f"{noticia_data['titulo']} {noticia_data['contenido']}"
            )

            noticia_id = insertar_noticia(
                titulo=noticia_data["titulo"],
                link=link,
                fecha=noticia_data["fecha"],
                fuente=fuente,
                contenido=noticia_data["contenido"],
                tema=tema,
            )

            if noticia_id:
                total_nuevas += 1

            # Pausa de cortesía entre requests
            if i < len(links_encontrados) - 1:
                time.sleep(SCRAPER_CONFIG["delay_between_requests"])

    logger.info("✅ Portales: %d noticias nuevas insertadas", total_nuevas)
    return total_nuevas


def _extraer_noticia_de_url(
    url: str, selectores: dict
) -> Optional[dict]:
    """
    Entra a una URL de noticia y extrae título, fecha y contenido.
    Retorna un dict o None si falla.
    """
    response = _hacer_request(url)
    if not response:
        return None

    try:
        soup = BeautifulSoup(response.content, "html.parser")
    except Exception as e:
        logger.error("Error parseando HTML de noticia %s: %s", url[:60], e)
        return None

    # Extraer título
    titulo = ""
    for selector in selectores.get("titulo", "h1").split(","):
        selector = selector.strip()
        try:
            elem = soup.select_one(selector)
            if elem and elem.get_text(strip=True):
                titulo = _limpiar_texto(elem.get_text(strip=True))
                break
        except Exception:
            continue

    if not titulo:
        # Fallback: usar el <title> de la página
        tag_title = soup.find("title")
        titulo = _limpiar_texto(tag_title.get_text(strip=True)) if tag_title else ""

    if not titulo:
        return None

    # Extraer fecha
    fecha = ""
    for selector in selectores.get("fecha", "time").split(","):
        selector = selector.strip()
        try:
            elem = soup.select_one(selector)
            if elem:
                # Intentar el atributo datetime primero
                fecha_raw = elem.get("datetime", elem.get_text(strip=True))
                fecha = _parsear_fecha(fecha_raw)
                break
        except Exception:
            continue

    if not fecha:
        fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Extraer contenido del artículo
    contenido = ""
    for selector in selectores.get("articulo_body", "article").split(","):
        selector = selector.strip()
        try:
            elem = soup.select_one(selector)
            if elem:
                # Remover scripts, styles, ads dentro del artículo
                for tag in elem.find_all(["script", "style", "iframe", "ins", "aside"]):
                    tag.decompose()

                parrafos = elem.find_all("p")
                if parrafos:
                    contenido = " ".join(
                        _limpiar_texto(p.get_text()) for p in parrafos
                    )
                else:
                    contenido = _limpiar_texto(elem.get_text())

                if len(contenido) > 50:
                    break
        except Exception:
            continue

    if not contenido:
        # Fallback: extraer todos los <p> de la página
        parrafos = soup.find_all("p")
        textos = [_limpiar_texto(p.get_text()) for p in parrafos if len(p.get_text(strip=True)) > 30]
        contenido = " ".join(textos[:10])

    return {
        "titulo": titulo[:500],
        "contenido": contenido[:5000],
        "fecha": fecha,
    }


# ─────────────────────────────────────────────
# ENRIQUECIMIENTO: Descargar contenido de noticias RSS
# ─────────────────────────────────────────────

def enriquecer_noticias_sin_contenido() -> int:
    """
    Busca noticias que solo tienen resumen (del RSS) y descarga
    el contenido completo visitando la URL.
    """
    noticias = obtener_noticias_sin_contenido(limite=30)
    if not noticias:
        logger.info("No hay noticias pendientes de enriquecer.")
        return 0

    logger.info("📝 Enriqueciendo %d noticias sin contenido...", len(noticias))
    enriquecidas = 0

    for noticia in noticias:
        # Buscar los selectores del portal correspondiente
        selectores = _encontrar_selectores_para_url(noticia["link"])

        noticia_data = _extraer_noticia_de_url(noticia["link"], selectores)
        if noticia_data and noticia_data["contenido"]:
            tema = _clasificar_tema(
                f"{noticia['titulo']} {noticia_data['contenido']}"
            )
            actualizar_contenido_noticia(
                noticia_id=noticia["id"],
                contenido=noticia_data["contenido"],
                tema=tema,
            )
            enriquecidas += 1

        time.sleep(SCRAPER_CONFIG["delay_between_requests"])

    logger.info("✅ %d noticias enriquecidas con contenido completo", enriquecidas)
    return enriquecidas


def _encontrar_selectores_para_url(url: str) -> dict:
    """
    Dado una URL, busca en los portales configurados cuál coincide
    y retorna sus selectores. Si no coincide, retorna selectores genéricos.
    """
    parsed = urlparse(url)
    dominio = parsed.netloc.lower()

    for portal in PORTALES_WEB:
        portal_dominio = urlparse(portal["base_url"]).netloc.lower()
        if portal_dominio in dominio or dominio in portal_dominio:
            return portal["selectores"]

    # Selectores genéricos para portales no configurados
    return {
        "articulo_body": "article, div.entry-content, div.post-content, main",
        "titulo": "h1",
        "fecha": "time, span.date",
        "links_noticias": "h2 a, h3 a",
    }


# ─────────────────────────────────────────────
# FUNCIÓN PRINCIPAL
# ─────────────────────────────────────────────

def ejecutar_scraper_noticias() -> dict:
    """
    Ejecuta el pipeline completo de scraping de noticias:
    1. Parsea feeds RSS
    2. Scrapea portales web
    3. Enriquece noticias sin contenido
    Retorna un resumen de la ejecución.
    """
    logger.info("=" * 60)
    logger.info("🚀 INICIANDO SCRAPER DE NOTICIAS DE JUJUY")
    logger.info("=" * 60)

    init_db()

    inicio = time.time()

    nuevas_rss = scrapear_rss()
    nuevas_portales = scrapear_portales()
    enriquecidas = enriquecer_noticias_sin_contenido()

    duracion = round(time.time() - inicio, 1)

    resumen = {
        "nuevas_rss": nuevas_rss,
        "nuevas_portales": nuevas_portales,
        "enriquecidas": enriquecidas,
        "total_nuevas": nuevas_rss + nuevas_portales,
        "duracion_segundos": duracion,
        "timestamp": datetime.now().isoformat(),
    }

    logger.info("=" * 60)
    logger.info("📊 RESUMEN: %s", resumen)
    logger.info("=" * 60)

    return resumen


if __name__ == "__main__":
    ejecutar_scraper_noticias()
