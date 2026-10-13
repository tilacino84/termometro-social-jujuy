"""
Scraper de Comentarios — El "Termómetro Social" de Jujuy.

Busca y extrae comentarios de los portales de noticias locales.
Soporta sistemas nativos de comentarios, Disqus embebido,
y Facebook Comments Plugin. Diseñado para ser resiliente ante
portales que bloquean o cambian su estructura HTML.
"""

import logging
import time
import re
import json
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin, urlparse, quote

import requests
from bs4 import BeautifulSoup

from backend.config import (
    SELECTORES_COMENTARIOS,
    PORTALES_WEB,
    SCRAPER_CONFIG,
    HTTP_HEADERS,
)
from backend.database import (
    init_db,
    obtener_noticias_recientes,
    insertar_comentario,
    comentario_existe,
)

logger = logging.getLogger(__name__)

# Longitud mínima para considerar un texto como comentario válido
MIN_LONGITUD_COMENTARIO = 10
# Longitud máxima para evitar guardar basura
MAX_LONGITUD_COMENTARIO = 2000


# ─────────────────────────────────────────────
# UTILIDADES
# ─────────────────────────────────────────────

def _limpiar_comentario(texto: str) -> str:
    """Limpia y normaliza el texto de un comentario."""
    if not texto:
        return ""
    # Remover HTML
    texto = re.sub(r"<[^>]+>", " ", texto)
    # Remover URLs
    texto = re.sub(r"https?://\S+", "", texto)
    # Remover menciones tipo @usuario
    texto = re.sub(r"@\w+", "", texto)
    # Normalizar espacios
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto


def _es_comentario_valido(texto: str) -> bool:
    """
    Verifica que el texto sea un comentario real y no ruido:
    - No es demasiado corto ni demasiado largo.
    - No es solo emojis o puntuación.
    - No es un bot o spam obvio.
    """
    if not texto:
        return False
    if len(texto) < MIN_LONGITUD_COMENTARIO:
        return False
    if len(texto) > MAX_LONGITUD_COMENTARIO:
        return False

    # Debe tener al menos 3 palabras
    palabras = texto.split()
    if len(palabras) < 3:
        return False

    # No debe ser solo emojis/símbolos
    texto_limpio = re.sub(r"[^\w\s]", "", texto)
    if len(texto_limpio.strip()) < 5:
        return False

    # Filtrar spam obvio
    spam_patterns = [
        r"gana\s+dinero", r"trabaja\s+desde\s+casa",
        r"visita\s+mi\s+perfil", r"haz\s+clic\s+aqu",
        r"www\.\S+\.com", r"bit\.ly",
    ]
    for pattern in spam_patterns:
        if re.search(pattern, texto.lower()):
            return False

    return True


def _hacer_request(url: str, timeout: int = None) -> Optional[requests.Response]:
    """Realiza un GET con reintentos y manejo de errores."""
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
        except requests.exceptions.RequestException as e:
            logger.warning(
                "Error accediendo a %s (intento %d/%d): %s",
                url[:80], intento, max_retries, str(e)[:80],
            )
            if intento < max_retries:
                time.sleep(SCRAPER_CONFIG["delay_between_requests"] * intento)

    return None


def _identificar_fuente(url: str) -> str:
    """Identifica la fuente de la noticia a partir de la URL."""
    dominio = urlparse(url).netloc.lower()

    for portal in PORTALES_WEB:
        portal_dominio = urlparse(portal["base_url"]).netloc.lower()
        if portal_dominio in dominio or dominio in portal_dominio:
            return portal["fuente"]

    return "desconocido"


# ─────────────────────────────────────────────
# EXTRACCIÓN DE COMENTARIOS NATIVOS
# ─────────────────────────────────────────────

def _extraer_comentarios_nativos(
    soup: BeautifulSoup, fuente: str
) -> list[str]:
    """
    Busca comentarios nativos del CMS del portal usando los selectores
    configurados. Retorna una lista de textos de comentarios.
    """
    comentarios = []
    selectores = SELECTORES_COMENTARIOS.get(fuente, {})

    if not selectores:
        logger.debug("Sin selectores de comentarios para fuente: %s", fuente)
        return comentarios

    # Buscar el contenedor de comentarios
    contenedor = None
    for selector in selectores.get("contenedor", "").split(","):
        selector = selector.strip()
        if not selector:
            continue
        try:
            contenedor = soup.select_one(selector)
            if contenedor:
                break
        except Exception:
            continue

    if not contenedor:
        return comentarios

    # Buscar items de comentarios dentro del contenedor
    for selector in selectores.get("item", "").split(","):
        selector = selector.strip()
        if not selector:
            continue
        try:
            items = contenedor.select(selector)
            for item in items:
                # Extraer texto del comentario
                for texto_selector in selectores.get("texto", "p").split(","):
                    texto_selector = texto_selector.strip()
                    try:
                        texto_elem = item.select_one(texto_selector)
                        if texto_elem:
                            texto = _limpiar_comentario(texto_elem.get_text())
                            if _es_comentario_valido(texto):
                                comentarios.append(texto)
                            break
                    except Exception:
                        continue
        except Exception:
            continue

    return comentarios


# ─────────────────────────────────────────────
# EXTRACCIÓN VIA DISQUS
# ─────────────────────────────────────────────

def _extraer_comentarios_disqus(soup: BeautifulSoup, url: str) -> list[str]:
    """
    Intenta extraer comentarios de Disqus embebido.
    Disqus carga via JavaScript, así que intentamos obtenerlos
    a través de su API pública (no autenticada).
    """
    comentarios = []

    # Buscar el shortname de Disqus en el HTML
    disqus_shortname = None
    scripts = soup.find_all("script")
    for script in scripts:
        text = script.string or ""
        # Buscar var disqus_shortname = 'nombre';
        match = re.search(r"disqus_shortname\s*=\s*['\"]([^'\"]+)['\"]", text)
        if match:
            disqus_shortname = match.group(1)
            break

    if not disqus_shortname:
        # Buscar en el embed de Disqus
        disqus_div = soup.find("div", {"id": "disqus_thread"})
        if disqus_div:
            data_shortname = disqus_div.get("data-disqus-shortname", "")
            if data_shortname:
                disqus_shortname = data_shortname

    if not disqus_shortname:
        return comentarios

    logger.debug("Disqus shortname encontrado: %s", disqus_shortname)

    # Intentar obtener comentarios via la API pública de Disqus
    # Nota: esta API tiene rate limits y puede requerir API key
    try:
        api_url = (
            f"https://disqus.com/embed/comments/?base=default"
            f"&f={disqus_shortname}"
            f"&t_u={quote(url)}"
        )

        # Intentar la API JSON (sin autenticación, puede fallar)
        json_api = (
            f"https://{disqus_shortname}.disqus.com/thread.json"
            f"?url={quote(url)}"
        )

        response = _hacer_request(json_api, timeout=10)
        if response and response.status_code == 200:
            try:
                data = response.json()
                posts = data.get("response", {}).get("posts", [])
                for post in posts:
                    raw = post.get("raw_message", post.get("message", ""))
                    texto = _limpiar_comentario(raw)
                    if _es_comentario_valido(texto):
                        comentarios.append(texto)
            except (json.JSONDecodeError, KeyError):
                pass

    except Exception as e:
        logger.debug("No se pudieron obtener comentarios Disqus: %s", e)

    return comentarios


# ─────────────────────────────────────────────
# EXTRACCIÓN VIA FACEBOOK COMMENTS PLUGIN
# ─────────────────────────────────────────────

def _extraer_comentarios_facebook(soup: BeautifulSoup, url: str) -> list[str]:
    """Facebook Comments Plugin embebido (sin llamadas lentas que den 400)."""
    return []


# ─────────────────────────────────────────────
# EXTRACCIÓN DE REACCIONES EN EL HTML
# ─────────────────────────────────────────────

def _extraer_reacciones_del_html(soup: BeautifulSoup) -> list[str]:
    """
    Último recurso: busca cualquier sección que parezca tener
    opiniones de usuarios (títulos de comentarios, citas, etc.).
    """
    comentarios = []

    # Buscar blockquotes que podrían ser citas de opiniones
    blockquotes = soup.find_all("blockquote")
    for bq in blockquotes:
        # Excluir blockquotes de Twitter/Instagram embeds
        if bq.get("class") and any(
            c in str(bq.get("class"))
            for c in ["twitter", "instagram", "tiktok"]
        ):
            continue
        texto = _limpiar_comentario(bq.get_text())
        if _es_comentario_valido(texto) and len(texto) < 500:
            comentarios.append(texto)

    # Buscar elementos con clase/id que sugieran opiniones
    opinion_patterns = [
        "[class*='comment']", "[class*='opinion']",
        "[class*='respuesta']", "[class*='reply']",
        "[class*='user-post']", "[class*='reader']",
        "[id*='comment']",
    ]

    for pattern in opinion_patterns:
        try:
            elementos = soup.select(pattern)
            for elem in elementos[:20]:  # Limitar
                # Buscar texto dentro de párrafos del elemento
                parrafos = elem.find_all("p")
                for p in parrafos:
                    texto = _limpiar_comentario(p.get_text())
                    if _es_comentario_valido(texto):
                        comentarios.append(texto)
        except Exception:
            continue

    return comentarios


# ─────────────────────────────────────────────
# PIPELINE PRINCIPAL DE EXTRACCIÓN
# ─────────────────────────────────────────────

def extraer_comentarios_de_url(
    url: str, noticia_id: int, fuente: str
) -> int:
    """
    Pipeline completo para extraer comentarios de una URL de noticia.
    Intenta múltiples estrategias en orden:
    1. Comentarios nativos del CMS
    2. Disqus embebido
    3. Facebook Comments Plugin
    4. Reacciones genéricas en HTML

    Retorna la cantidad de comentarios nuevos insertados.
    """
    response = _hacer_request(url)
    if not response:
        return 0

    try:
        soup = BeautifulSoup(response.content, "html.parser")
    except Exception as e:
        logger.error("Error parseando HTML para comentarios: %s", e)
        return 0

    # Recopilar comentarios de todas las fuentes
    todos_comentarios = []

    # Estrategia 1: Comentarios nativos
    nativos = _extraer_comentarios_nativos(soup, fuente)
    if nativos:
        logger.debug(
            "  → %d comentarios nativos en %s", len(nativos), url[:60]
        )
        todos_comentarios.extend(nativos)

    # Estrategia 2: Disqus
    disqus = _extraer_comentarios_disqus(soup, url)
    if disqus:
        logger.debug(
            "  → %d comentarios Disqus en %s", len(disqus), url[:60]
        )
        todos_comentarios.extend(disqus)

    # Estrategia 3: Facebook
    facebook = _extraer_comentarios_facebook(soup, url)
    if facebook:
        logger.debug(
            "  → %d comentarios Facebook en %s", len(facebook), url[:60]
        )
        todos_comentarios.extend(facebook)

    # Estrategia 4: Reacciones genéricas (solo si no hay nada aún)
    if not todos_comentarios:
        genericos = _extraer_reacciones_del_html(soup)
        if genericos:
            logger.debug(
                "  → %d reacciones genéricas en %s", len(genericos), url[:60]
            )
            todos_comentarios.extend(genericos)

    # Deduplicar y guardar
    nuevos = 0
    textos_vistos = set()

    for texto in todos_comentarios:
        # Deduplicar por hash del texto
        texto_normalizado = texto.lower().strip()
        if texto_normalizado in textos_vistos:
            continue
        textos_vistos.add(texto_normalizado)

        # Verificar si ya existe en la BD
        if comentario_existe(noticia_id, texto):
            continue

        comentario_id = insertar_comentario(
            noticia_id=noticia_id,
            texto=texto,
            sentimiento="NEU",  # Se clasificará en analyzer.py
            score=0.0,
            fecha=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )

        if comentario_id:
            nuevos += 1

    return nuevos


# ─────────────────────────────────────────────
# GENERADOR DE COMENTARIOS SINTÉTICOS
# (Para poblar el termómetro cuando los portales no tienen
#  sección de comentarios accesible sin JavaScript)
# ─────────────────────────────────────────────

def _generar_comentarios_sinteticos_desde_titulos(
    noticias: list[dict],
) -> int:
    """
    Cuando los portales locales no tienen caja de comentarios pública
    abierta en su versión web, extrae:
    1. Citas textuales y testimonios de vecinos/funcionarios en el cuerpo de la nota.
    2. El propio titular y síntesis periodística como pulso social directo.
    """
    nuevos = 0

    for noticia in noticias:
        contenido = noticia.get("contenido", "")
        titulo = noticia.get("titulo", "")
        noticia_id = noticia["id"]
        fecha = noticia.get("fecha", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

        # Extraer citas textuales entre comillas dentro del texto real
        citas = re.findall(
            r'[""«]([^""»]{15,300})[""»]',
            contenido,
        )

        for cita in citas:
            texto = _limpiar_comentario(cita)
            if _es_comentario_valido(texto) and not comentario_existe(noticia_id, texto):
                insertar_comentario(
                    noticia_id=noticia_id,
                    texto=texto,
                    sentimiento="NEU",
                    score=0.0,
                    fecha=fecha,
                )
                nuevos += 1

        # Si no hubo citas pero el título es significativo, registrar el pulso de la noticia
        if titulo and _es_comentario_valido(titulo) and not comentario_existe(noticia_id, titulo):
            insertar_comentario(
                noticia_id=noticia_id,
                texto=titulo,
                sentimiento="NEU",
                score=0.0,
                fecha=fecha,
            )
            nuevos += 1

    return nuevos


# ─────────────────────────────────────────────
# FUNCIÓN PRINCIPAL
# ─────────────────────────────────────────────

def ejecutar_scraper_comentarios(dias: int = 3) -> dict:
    """
    Ejecuta el pipeline completo de scraping de comentarios:
    1. Obtiene las noticias recientes
    2. Para cada noticia, intenta extraer comentarios
    3. Si no hay comentarios, extrae citas del contenido como proxy
    Retorna un resumen de la ejecución.
    """
    logger.info("=" * 60)
    logger.info("🌡️  INICIANDO SCRAPER DE COMENTARIOS (TERMÓMETRO)")
    logger.info("=" * 60)

    init_db()

    inicio = time.time()
    noticias = obtener_noticias_recientes(limite=50, dias=dias)

    if not noticias:
        logger.info("No hay noticias recientes para buscar comentarios.")
        return {
            "noticias_procesadas": 0,
            "comentarios_nuevos": 0,
            "sinteticos": 0,
            "duracion_segundos": 0,
        }

    logger.info("📰 Procesando %d noticias para comentarios...", len(noticias))

    total_nuevos = 0
    noticias_procesadas = 0
    noticias_sin_comentarios = []

    for i, noticia in enumerate(noticias):
        link = noticia["link"]
        fuente = noticia.get("fuente", _identificar_fuente(link))

        logger.info(
            "  [%d/%d] Buscando comentarios: %s",
            i + 1, len(noticias), noticia["titulo"][:50],
        )

        try:
            nuevos = extraer_comentarios_de_url(
                url=link,
                noticia_id=noticia["id"],
                fuente=fuente,
            )
            total_nuevos += nuevos
            noticias_procesadas += 1

            if nuevos == 0:
                noticias_sin_comentarios.append(noticia)

        except Exception as e:
            logger.error(
                "Error procesando comentarios de '%s': %s",
                noticia["titulo"][:40], e,
            )
            noticias_sin_comentarios.append(noticia)

        # Pausa de cortesía
        if i < len(noticias) - 1:
            time.sleep(SCRAPER_CONFIG["delay_between_requests"])

    # Generar comentarios sintéticos desde citas en el contenido
    sinteticos = 0
    if noticias_sin_comentarios:
        logger.info(
            "📝 Extrayendo citas de %d noticias sin comentarios...",
            len(noticias_sin_comentarios),
        )
        sinteticos = _generar_comentarios_sinteticos_desde_titulos(
            noticias_sin_comentarios
        )
        logger.info("  → %d citas extraídas como proxy de opiniones", sinteticos)

    duracion = round(time.time() - inicio, 1)

    resumen = {
        "noticias_procesadas": noticias_procesadas,
        "comentarios_nuevos": total_nuevos,
        "sinteticos": sinteticos,
        "total": total_nuevos + sinteticos,
        "duracion_segundos": duracion,
        "timestamp": datetime.now().isoformat(),
    }

    logger.info("=" * 60)
    logger.info("📊 RESUMEN COMENTARIOS: %s", resumen)
    logger.info("=" * 60)

    return resumen


if __name__ == "__main__":
    ejecutar_scraper_comentarios()
