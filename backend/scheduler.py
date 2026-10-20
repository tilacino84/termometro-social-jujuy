"""
Scheduler — Termómetro Social de Jujuy.

Orquesta la ejecución periódica del pipeline completo:
1. Scrapeo de noticias (RSS + portales)
2. Scrapeo de comentarios
3. Análisis de sentimiento

Se puede ejecutar como cron job o como daemon con loop interno.
"""

import sys
import os
import time
import logging
import argparse
from datetime import datetime

# Asegurar que el paquete backend sea importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from backend.config import SCRAPER_INTERVAL_MINUTES
from backend.database import init_db
from backend.scraper_news import ejecutar_scraper_noticias
from backend.scraper_comments import ejecutar_scraper_comentarios
from backend.analyzer import analizar_comentarios_pendientes
from backend.scraper_social import ejecutar_scraper_social

logger = logging.getLogger(__name__)


def ejecutar_pipeline_completo() -> dict:
    """
    Ejecuta el pipeline completo de scraping y análisis.
    Retorna un resumen consolidado.
    """
    inicio = time.time()

    logger.info("╔" + "═" * 58 + "╗")
    logger.info("║  🌡️  TERMÓMETRO SOCIAL DE JUJUY — PIPELINE COMPLETO     ║")
    logger.info("║  %s                                  ║", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    logger.info("╚" + "═" * 58 + "╝")

    # Paso 1: Scrapear noticias
    logger.info("\n📡 PASO 1/3: Scrapeando noticias...")
    try:
        resumen_noticias = ejecutar_scraper_noticias()
    except Exception as e:
        logger.error("Error en scraper de noticias: %s", e)
        resumen_noticias = {"error": str(e), "total_nuevas": 0}

    # Paso 2: Scrapear comentarios
    logger.info("\n💬 PASO 2/3: Scrapeando comentarios...")
    try:
        resumen_comentarios = ejecutar_scraper_comentarios(dias=3)
    except Exception as e:
        logger.error("Error en scraper de comentarios: %s", e)
        resumen_comentarios = {"error": str(e), "total": 0}

    # Paso 3: Analizar sentimiento
    logger.info("\n🧠 PASO 3/4: Analizando sentimiento de comentarios...")
    try:
        resumen_analisis = analizar_comentarios_pendientes()
    except Exception as e:
        logger.error("Error en análisis de sentimiento: %s", e)
        resumen_analisis = {"error": str(e), "analizados": 0}

    # Paso 4: Redes Sociales e IA Regional
    logger.info("\n📱 PASO 4/4: Recolectando redes sociales (Reels, TikTok, Facebook)...")
    try:
        resumen_social = ejecutar_scraper_social()
    except Exception as e:
        logger.error("Error en colector de redes sociales: %s", e)
        resumen_social = {"error": str(e), "total": 0}

    duracion = round(time.time() - inicio, 1)

    resumen = {
        "noticias": resumen_noticias,
        "comentarios": resumen_comentarios,
        "analisis": resumen_analisis,
        "social": resumen_social,
        "duracion_total_segundos": duracion,
        "timestamp": datetime.now().isoformat(),
    }

    logger.info("\n" + "═" * 60)
    logger.info("📊 RESUMEN COMPLETO DEL PIPELINE:")
    logger.info("   Noticias nuevas: %s", resumen_noticias.get("total_nuevas", 0))
    logger.info("   Comentarios nuevos: %s", resumen_comentarios.get("total", 0))
    logger.info("   Comentarios analizados: %s", resumen_analisis.get("analizados", 0))
    logger.info("   Eventos de redes sociales: %s", resumen_social.get("guardados_con_ia", 0))
    logger.info("   Duración total: %s segundos", duracion)
    logger.info("═" * 60)

    return resumen


def modo_daemon(intervalo_minutos: int = None):
    """
    Ejecuta el pipeline en modo daemon (loop infinito).
    Útil cuando no se dispone de cron.
    """
    intervalo = intervalo_minutos or SCRAPER_INTERVAL_MINUTES
    logger.info(
        "🔄 Modo DAEMON iniciado — Intervalo: %d minutos",
        intervalo,
    )

    while True:
        try:
            ejecutar_pipeline_completo()
        except KeyboardInterrupt:
            logger.info("⏹️  Daemon detenido por el usuario.")
            break
        except Exception as e:
            logger.error("Error inesperado en el daemon: %s", e)

        logger.info(
            "⏳ Próxima ejecución en %d minutos...\n",
            intervalo,
        )
        try:
            time.sleep(intervalo * 60)
        except KeyboardInterrupt:
            logger.info("⏹️  Daemon detenido por el usuario.")
            break


def main():
    """Punto de entrada con argumentos de CLI."""
    parser = argparse.ArgumentParser(
        description="Termómetro Social de Jujuy — Scheduler",
    )
    parser.add_argument(
        "--modo",
        choices=["once", "daemon", "api"],
        default="once",
        help="once: ejecuta una vez. daemon: loop continuo. api: inicia el servidor.",
    )
    parser.add_argument(
        "--intervalo",
        type=int,
        default=None,
        help="Intervalo en minutos para el modo daemon (default: %d)" % SCRAPER_INTERVAL_MINUTES,
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Puerto para el servidor API (default: 8000)",
    )

    args = parser.parse_args()

    # Inicializar la BD
    init_db()

    if args.modo == "once":
        ejecutar_pipeline_completo()

    elif args.modo == "daemon":
        modo_daemon(args.intervalo)

    elif args.modo == "api":
        import uvicorn
        logger.info("🚀 Iniciando servidor API en puerto %d...", args.port)
        uvicorn.run(
            "backend.api:app",
            host="0.0.0.0",
            port=args.port,
            reload=False,
        )


if __name__ == "__main__":
    main()
