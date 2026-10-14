"""
Exportador Estático — Termómetro Social de Jujuy.

Genera frontend/data.json con las noticias y estadísticas reales
calculadas desde SQLite. Permite que el Dashboard funcione al 100%
en plataformas estáticas como Netlify o GitHub Pages sin requerir
un servidor backend activo.
"""

import os
import sys
import json
import logging
from datetime import datetime

# Asegurar path al paquete backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from backend.database import (
    init_db,
    obtener_indice_termometro,
    contar_comentarios_por_sentimiento,
    contar_noticias,
    obtener_temas_frecuentes,
    obtener_timeline_sentimiento,
    obtener_noticias_con_stats,
    obtener_descontento_por_fuente,
    obtener_comentarios_destacados,
)
from backend.analyzer import (
    obtener_palabras_clave_trending,
    obtener_resumen_sentimiento_por_tema,
)

logger = logging.getLogger(__name__)


def exportar_dashboard_json(dias: int = 30, output_path: str = None) -> str:
    """Genera y guarda el payload completo del dashboard como un archivo JSON estático."""
    init_db()

    if output_path is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        output_path = os.path.join(base_dir, "frontend", "data.json")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    indice = obtener_indice_termometro(dias)
    sentimientos = contar_comentarios_por_sentimiento(dias)
    total_noticias = contar_noticias(dias)
    temas = obtener_temas_frecuentes(dias, limite=10)
    timeline = obtener_timeline_sentimiento(dias)
    noticias = obtener_noticias_con_stats(limite=100, dias=dias)
    keywords = obtener_palabras_clave_trending(dias, limite=20)
    sentimiento_por_tema = obtener_resumen_sentimiento_por_tema(dias)
    descontento_fuentes = obtener_descontento_por_fuente(dias)
    comentarios_destacados = obtener_comentarios_destacados(limite=30, dias=dias)

    # Nivel de tensión
    if indice <= 25:
        nivel, emoji, descripcion = "bajo", "🟢", "Clima social tranquilo en Jujuy"
    elif indice <= 50:
        nivel, emoji, descripcion = "moderado", "🟡", "Clima social con tensiones puntuales"
    elif indice <= 75:
        nivel, emoji, descripcion = "alto", "🟠", "Clima social con alta conflictividad"
    else:
        nivel, emoji, descripcion = "crítico", "🔴", "Alerta: tensión social crítica"

    total_comentarios = sum(sentimientos.values())

    payload = {
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
        "actualizado": datetime.now().isoformat(),
        "fuente": "Datos reales recolectados de medios de Jujuy",
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"✅ Archivo estático generado con éxito en: {output_path}")
    print(f"   Noticias: {total_noticias} | Comentarios: {total_comentarios} | Índice: {indice}%")
    return output_path


if __name__ == "__main__":
    exportar_dashboard_json()
