"""
API REST — Termómetro Social de Jujuy.

Endpoints para servir datos al dashboard frontend:
- Índice del termómetro
- Noticias recientes con estadísticas
- Timeline de sentimiento
- Temas trending
- Palabras clave
- Resumen por tema
"""

import os
import logging
from datetime import datetime

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from backend.database import (
    init_db,
    contar_noticias,
    contar_comentarios_por_sentimiento,
    obtener_temas_frecuentes,
    obtener_indice_termometro,
    obtener_noticias_con_stats,
    obtener_timeline_sentimiento,
    obtener_noticias_recientes,
    obtener_comentarios_por_noticia,
    obtener_descontento_por_fuente,
    obtener_comentarios_destacados,
    insertar_evento_social,
    obtener_feed_social,
    obtener_mapa_departamentos,
)
from backend.analyzer import (
    obtener_palabras_clave_trending,
    obtener_resumen_sentimiento_por_tema,
    analizar_sentimiento,
)
from backend.ai_regional import (
    procesar_evento_red_social,
    analizar_con_gemini_api,
    estimar_emocion_y_severidad_heuristica,
    detectar_departamento_heuristico,
)
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# INICIALIZACIÓN
# ─────────────────────────────────────────────

app = FastAPI(
    title="Termómetro Social de Jujuy",
    description="API para el monitoreo del sentimiento social en la provincia de Jujuy",
    version="1.0.0",
)

# CORS para el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Inicializa la base de datos al arrancar."""
    init_db()
    logger.info("🚀 API del Termómetro Social iniciada")


# ─────────────────────────────────────────────
# ENDPOINT PRINCIPAL: DASHBOARD
# ─────────────────────────────────────────────

@app.get("/api/dashboard")
async def get_dashboard(dias: int = Query(7, ge=1, le=90)):
    """
    Retorna todos los datos necesarios para renderizar el dashboard
    en una sola llamada. Ideal para el frontend.
    """
    try:
        indice = obtener_indice_termometro(dias)
        sentimientos = contar_comentarios_por_sentimiento(dias)
        total_noticias = contar_noticias(dias)
        temas = obtener_temas_frecuentes(dias, limite=10)
        timeline = obtener_timeline_sentimiento(dias)
        noticias = obtener_noticias_con_stats(limite=20, dias=dias)
        keywords = obtener_palabras_clave_trending(dias, limite=15)
        sentimiento_por_tema = obtener_resumen_sentimiento_por_tema(dias)
        descontento_fuentes = obtener_descontento_por_fuente(dias)
        comentarios_destacados = obtener_comentarios_destacados(limite=20, dias=dias)

        # Determinar el nivel del termómetro
        if indice <= 25:
            nivel = "bajo"
            emoji = "🟢"
            descripcion = "Clima social tranquilo"
        elif indice <= 50:
            nivel = "moderado"
            emoji = "🟡"
            descripcion = "Clima social con tensiones puntuales"
        elif indice <= 75:
            nivel = "alto"
            emoji = "🟠"
            descripcion = "Clima social tenso"
        else:
            nivel = "crítico"
            emoji = "🔴"
            descripcion = "Clima social muy caliente"

        total_comentarios = sum(sentimientos.values())
        mapa_deptos = obtener_mapa_departamentos(dias)
        social_feed = obtener_feed_social(limite=30)

        return {
            "termometro": {
                "indice": indice,
                "nivel": nivel,
                "emoji": emoji,
                "descripcion": descripcion,
            },
            "estadisticas": {
                "total_noticias": total_noticias,
                "total_comentarios": total_comentarios,
                "sentimientos": sentimientos,
                "periodo_dias": dias,
            },
            "temas_frecuentes": temas,
            "timeline_sentimiento": timeline,
            "noticias_recientes": noticias,
            "keywords_trending": keywords,
            "sentimiento_por_tema": sentimiento_por_tema,
            "descontento_por_fuente": descontento_fuentes,
            "comentarios_destacados": comentarios_destacados,
            "mapa_departamentos": mapa_deptos,
            "social_feed": social_feed,
            "actualizado": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error("Error generando dashboard: %s", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Error interno al generar el dashboard"},
        )


# ─────────────────────────────────────────────
# ENDPOINTS INDIVIDUALES
# ─────────────────────────────────────────────

@app.get("/api/termometro")
async def get_termometro(dias: int = Query(7, ge=1, le=90)):
    """Retorna solo el índice del termómetro."""
    indice = obtener_indice_termometro(dias)

    if indice <= 25:
        nivel, emoji = "bajo", "🟢"
    elif indice <= 50:
        nivel, emoji = "moderado", "🟡"
    elif indice <= 75:
        nivel, emoji = "alto", "🟠"
    else:
        nivel, emoji = "crítico", "🔴"

    return {
        "indice": indice,
        "nivel": nivel,
        "emoji": emoji,
        "periodo_dias": dias,
    }


@app.get("/api/noticias")
async def get_noticias(
    dias: int = Query(7, ge=1, le=90),
    limite: int = Query(30, ge=1, le=100),
):
    """Retorna noticias recientes con estadísticas de comentarios."""
    return obtener_noticias_con_stats(limite=limite, dias=dias)


@app.get("/api/noticias/{noticia_id}/comentarios")
async def get_comentarios(noticia_id: int):
    """Retorna los comentarios de una noticia específica."""
    comentarios = obtener_comentarios_por_noticia(noticia_id)
    return {
        "noticia_id": noticia_id,
        "total": len(comentarios),
        "comentarios": comentarios,
    }


@app.get("/api/sentimientos")
async def get_sentimientos(dias: int = Query(7, ge=1, le=90)):
    """Retorna el conteo de sentimientos."""
    return contar_comentarios_por_sentimiento(dias)


@app.get("/api/timeline")
async def get_timeline(dias: int = Query(7, ge=1, le=90)):
    """Retorna la evolución del sentimiento por día."""
    return obtener_timeline_sentimiento(dias)


@app.get("/api/temas")
async def get_temas(
    dias: int = Query(7, ge=1, le=90),
    limite: int = Query(10, ge=1, le=50),
):
    """Retorna los temas más frecuentes."""
    return obtener_temas_frecuentes(dias, limite)


@app.get("/api/keywords")
async def get_keywords(
    dias: int = Query(7, ge=1, le=90),
    limite: int = Query(20, ge=1, le=50),
):
    """Retorna las palabras clave trending."""
    return obtener_palabras_clave_trending(dias, limite)


@app.get("/api/sentimiento-por-tema")
async def get_sentimiento_por_tema(dias: int = Query(7, ge=1, le=90)):
    """Retorna el sentimiento promedio desglosado por tema."""
    return obtener_resumen_sentimiento_por_tema(dias)


@app.get("/api/analizar")
async def analizar_texto(texto: str = Query(..., min_length=5)):
    """Analiza el sentimiento de un texto dado (herramienta de prueba)."""
    return analizar_sentimiento(texto)


@app.get("/api/salud")
async def health_check():
    """Health check para monitoreo."""
    return {
        "status": "ok",
        "servicio": "Termómetro Social de Jujuy",
        "timestamp": datetime.now().isoformat(),
    }


# ─────────────────────────────────────────────
# ENDPOINTS: REDES SOCIALES & IA REGIONAL JUJUY
# ─────────────────────────────────────────────

class SocialEventInput(BaseModel):
    id: Optional[str] = None
    platform: str = Field(default="instagram_reels", description="instagram_reels, tiktok, facebook_groups, x_twitter, etc.")
    author: Optional[str] = "anónimo"
    text: str = Field(..., min_length=3, description="Texto del comentario o transcripción")
    timestamp: Optional[str] = None
    location_tag: Optional[str] = ""


class SentimentInput(BaseModel):
    text: str = Field(..., min_length=3, description="Texto a clasificar con IA regional")
    location_tag: Optional[str] = ""


@app.post("/api/social-feed")
async def ingest_social_event(evento: SocialEventInput):
    """
    Ingesta un evento de redes sociales, lo procesa con el modelo regional de Jujuy
    (detectando emoción, departamento, severidad y polaridad) y lo almacena.
    """
    try:
        evento_dict = evento.model_dump()
        procesado = procesar_evento_red_social(evento_dict)
        insertar_evento_social(procesado)
        return {
            "status": "success",
            "message": "Evento procesado con IA Regional de Jujuy",
            "data": procesado
        }
    except Exception as e:
        logger.error("Error procesando evento social: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/social-feed")
async def get_social_feed(
    limite: int = Query(50, ge=1, le=100),
    departamento: Optional[str] = Query(None, description="Filtro opcional por departamento de Jujuy")
):
    """Retorna los eventos procesados de redes sociales."""
    return obtener_feed_social(limite=limite, departamento=departamento)


@app.post("/api/sentiment")
async def post_sentiment_regional(input_data: SentimentInput):
    """
    Clasifica un texto con el contexto sociocultural de Jujuy:
    devuelve emoción predominante, departamento asignado, severidad (1-5) y sentimiento.
    """
    evento = {
        "text": input_data.text,
        "location_tag": input_data.location_tag
    }
    return procesar_evento_red_social(evento)


@app.get("/api/sentiment")
async def get_sentiment_regional(
    text: str = Query(..., min_length=3),
    location_tag: Optional[str] = Query("")
):
    """Versión GET rápida para testing del modelo regional Jujuy."""
    evento = {
        "text": text,
        "location_tag": location_tag
    }
    return procesar_evento_red_social(evento)


@app.get("/api/mapa-departamentos")
async def get_mapa_departamentos(dias: int = Query(30, ge=1, le=90)):
    """Retorna el índice de tensión social y datos consolidados de los 16 departamentos de Jujuy."""
    return obtener_mapa_departamentos(dias=dias)


# ─────────────────────────────────────────────
# SERVIR FRONTEND ESTÁTICO
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

if os.path.exists(FRONTEND_DIR):
    @app.get("/", include_in_schema=False)
    async def index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

