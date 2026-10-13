"""
Analizador de Sentimiento — Termómetro Social de Jujuy.

Clasifica comentarios como POS, NEG o NEU usando un léxico propio
adaptado al castellano rioplatense / NOA. No requiere dependencias
de NLP pesadas: funciona con diccionarios de palabras + heurísticas.

Además extrae keywords relevantes de cada comentario.
"""

import re
import logging
from collections import Counter
from datetime import datetime
from typing import Optional

from backend.database import (
    obtener_noticias_recientes,
    obtener_comentarios_por_noticia,
    insertar_comentario,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# LÉXICO DE SENTIMIENTO (Español NOA / Jujuy)
# ─────────────────────────────────────────────

LEXICO_POSITIVO = {
    # Emociones positivas
    "bien": 1, "bueno": 1, "buena": 1, "excelente": 2, "genial": 2,
    "maravilloso": 2, "fantástico": 2, "increíble": 1.5, "hermoso": 1.5,
    "hermosa": 1.5, "lindo": 1, "linda": 1, "feliz": 1.5, "alegría": 1.5,
    "contento": 1, "contenta": 1, "orgulloso": 1.5, "orgullosa": 1.5,
    "esperanza": 1.5, "progreso": 1.5, "avance": 1.5,
    # Acciones positivas
    "mejorar": 1, "solucionar": 1.5, "resolver": 1.5, "ayudar": 1,
    "construir": 1, "inaugurar": 1.5, "invertir": 1, "crecer": 1,
    "lograr": 1.5, "conseguir": 1, "celebrar": 1.5, "festejar": 1.5,
    "aplaudir": 1.5, "apoyar": 1, "colaborar": 1, "beneficiar": 1.5,
    # Sociedad
    "seguro": 1, "segura": 1, "tranquilo": 1, "tranquila": 1,
    "pacífico": 1.5, "solidario": 1.5, "solidaria": 1.5,
    "trabajo": 0.5, "empleo": 0.5, "oportunidad": 1,
    # Jujuy específico
    "patrimonio": 1, "turismo": 0.5, "festival": 1, "carnaval": 1,
    "tradición": 1, "cultura": 0.5, "pachamama": 1,
    # Aprobación
    "gracias": 1, "bravo": 1.5, "perfecto": 2, "correcto": 1,
    "acuerdo": 1, "apruebo": 1.5, "aplaudo": 1.5,
    "me gusta": 1.5, "está bien": 1, "muy bien": 2,
    "por fin": 1.5, "al fin": 1.5, "era hora": 1,
}

LEXICO_NEGATIVO = {
    # Emociones negativas
    "mal": -1, "malo": -1, "mala": -1, "pésimo": -2, "pésima": -2,
    "terrible": -2, "horrible": -2, "espantoso": -2, "desastre": -2,
    "vergüenza": -1.5, "vergonzoso": -2, "vergonzosa": -2,
    "indignante": -2, "indignación": -2, "bronca": -1.5, "rabia": -1.5,
    "miedo": -1, "temor": -1, "preocupación": -0.5, "tristeza": -1,
    "triste": -1, "dolor": -1, "sufrimiento": -1.5,
    # Insultos y desprecio (comunes en comentarios de portales)
    "corrupto": -2, "corrupta": -2, "corrupción": -2, "ladrón": -2,
    "ladrona": -2, "inútil": -2, "incapaz": -1.5, "mentiroso": -2,
    "mentirosa": -2, "sinvergüenza": -2, "chorro": -2, "delincuente": -1.5,
    "hdp": -2, "basura": -2, "payaso": -1.5, "payasa": -1.5,
    "vago": -1.5, "vaga": -1.5,
    # Problemas sociales
    "inseguridad": -1.5, "robo": -1.5, "asalto": -1.5, "crimen": -1.5,
    "violencia": -1.5, "femicidio": -2, "asesinato": -2, "narco": -1.5,
    "narcotráfico": -2, "droga": -1.5, "pobreza": -1.5, "hambre": -2,
    "desempleo": -1.5, "inflación": -1, "carestía": -1.5,
    # Servicios públicos
    "abandono": -1.5, "dejadez": -1.5, "destrucción": -2, "deterioro": -1.5,
    "corte": -1, "falta": -1, "escasez": -1.5, "colapso": -2,
    # Acciones negativas
    "empeorar": -1.5, "destruir": -2, "robar": -2, "mentir": -2,
    "engañar": -2, "estafar": -2, "despedir": -1, "cerrar": -0.5,
    "recortar": -1, "reclamar": -0.5, "protestar": -0.5, "denunciar": -0.5,
    # Desaprobación
    "no sirve": -1.5, "no funciona": -1.5, "no alcanza": -1,
    "cansado": -1, "cansada": -1, "harto": -1.5, "harta": -1.5,
    "basta": -1.5, "nunca": -0.5, "nadie": -0.5, "nada": -0.5,
    "peor": -1.5, "siempre lo mismo": -1.5,
}

# Modificadores de intensidad
INTENSIFICADORES = {
    "muy": 1.5, "mucho": 1.3, "bastante": 1.3, "demasiado": 1.5,
    "extremadamente": 2.0, "totalmente": 1.5, "completamente": 1.5,
    "absolutamente": 1.5, "realmente": 1.3, "verdaderamente": 1.3,
    "super": 1.5, "súper": 1.5, "re": 1.5, "recontra": 2.0,
    "mega": 1.5, "ultra": 1.5, "tremendamente": 1.5,
}

# Negadores que invierten el sentimiento
NEGADORES = {
    "no", "ni", "nunca", "jamás", "tampoco", "ningún",
    "ninguno", "ninguna", "sin", "nadie", "nada",
}

# Stopwords en español para filtrar al extraer keywords
STOPWORDS_ES = {
    "el", "la", "los", "las", "un", "una", "unos", "unas",
    "de", "del", "al", "a", "en", "con", "por", "para",
    "que", "se", "es", "no", "su", "lo", "le", "ya",
    "más", "pero", "muy", "este", "esta", "estos", "estas",
    "ese", "esa", "esos", "esas", "como", "sobre", "entre",
    "sin", "hasta", "desde", "también", "hay", "fue", "son",
    "ser", "estar", "ir", "tener", "hacer", "poder", "deber",
    "decir", "todo", "toda", "todos", "todas", "otro", "otra",
    "otros", "otras", "cada", "mismo", "misma", "donde",
    "cuando", "si", "porque", "aunque", "mientras", "según",
    "tras", "ante", "hacia", "bajo", "durante", "mediante",
    "tiene", "tiene", "puede", "han", "era", "sido", "dio",
    "y", "o", "e", "u", "ni", "que", "me", "te", "nos",
}


# ─────────────────────────────────────────────
# ANÁLISIS DE SENTIMIENTO
# ─────────────────────────────────────────────

def analizar_sentimiento(texto: str) -> dict:
    """
    Analiza el sentimiento de un texto y retorna:
    {
        "sentimiento": "POS" | "NEG" | "NEU",
        "score": float (-1.0 a 1.0),
        "keywords": "palabra1, palabra2, ..."
    }
    """
    if not texto or len(texto.strip()) < 5:
        return {"sentimiento": "NEU", "score": 0.0, "keywords": ""}

    texto_lower = texto.lower()
    palabras = re.findall(r'\b[a-záéíóúñü]+\b', texto_lower)

    if not palabras:
        return {"sentimiento": "NEU", "score": 0.0, "keywords": ""}

    score_total = 0.0
    palabras_sentimiento = []

    for i, palabra in enumerate(palabras):
        score_palabra = 0.0

        # Buscar en léxicos
        if palabra in LEXICO_POSITIVO:
            score_palabra = LEXICO_POSITIVO[palabra]
        elif palabra in LEXICO_NEGATIVO:
            score_palabra = LEXICO_NEGATIVO[palabra]
        else:
            continue

        # Verificar negador previo (invierte sentimiento)
        if i > 0 and palabras[i - 1] in NEGADORES:
            score_palabra *= -0.8  # Inversión parcial
        if i > 1 and palabras[i - 2] in NEGADORES:
            score_palabra *= -0.5

        # Verificar intensificador previo
        if i > 0 and palabras[i - 1] in INTENSIFICADORES:
            score_palabra *= INTENSIFICADORES[palabras[i - 1]]
        if i > 1 and palabras[i - 2] in INTENSIFICADORES:
            score_palabra *= INTENSIFICADORES[palabras[i - 2]] * 0.8

        score_total += score_palabra
        palabras_sentimiento.append(palabra)

    # Buscar expresiones multi-palabra
    for expresion, valor in {**LEXICO_POSITIVO, **LEXICO_NEGATIVO}.items():
        if " " in expresion and expresion in texto_lower:
            score_total += valor
            palabras_sentimiento.append(expresion)

    # Heurísticas adicionales

    # ¿Muchos signos de exclamación? Intensifica el sentimiento
    exclamaciones = texto.count("!")
    if exclamaciones >= 2:
        score_total *= 1.0 + (exclamaciones * 0.1)

    # ¿Todo en mayúsculas? Intensifica (el usuario grita)
    if texto == texto.upper() and len(texto) > 10:
        score_total *= 1.3

    # ¿Contiene signos de pregunta retórica con tono negativo?
    if "?" in texto and any(w in texto_lower for w in ["cuándo", "hasta cuándo", "por qué"]):
        score_total -= 0.3

    # Normalizar score entre -1.0 y 1.0
    if palabras_sentimiento:
        score_normalizado = max(-1.0, min(1.0, score_total / len(palabras_sentimiento)))
    else:
        score_normalizado = 0.0

    # Clasificar
    if score_normalizado > 0.15:
        sentimiento = "POS"
    elif score_normalizado < -0.15:
        sentimiento = "NEG"
    else:
        sentimiento = "NEU"

    # Extraer keywords
    keywords = _extraer_keywords(texto_lower, palabras)

    return {
        "sentimiento": sentimiento,
        "score": round(score_normalizado, 3),
        "keywords": ", ".join(keywords[:8]),
    }


def _extraer_keywords(texto: str, palabras: list[str]) -> list[str]:
    """
    Extrae las palabras clave más relevantes del texto.
    Filtra stopwords y retorna las más frecuentes/importantes.
    """
    # Filtrar stopwords y palabras muy cortas
    palabras_filtradas = [
        p for p in palabras
        if p not in STOPWORDS_ES and len(p) > 3
    ]

    # Contar frecuencia
    frecuencia = Counter(palabras_filtradas)

    # Priorizar palabras que estén en los léxicos de sentimiento
    keywords_priorizadas = []
    for palabra, count in frecuencia.most_common(20):
        if palabra in LEXICO_POSITIVO or palabra in LEXICO_NEGATIVO:
            keywords_priorizadas.insert(0, palabra)
        else:
            keywords_priorizadas.append(palabra)

    return keywords_priorizadas[:8]


# ─────────────────────────────────────────────
# PIPELINE DE ANÁLISIS MASIVO
# ─────────────────────────────────────────────

def analizar_comentarios_pendientes(dias: int = 7) -> dict:
    """
    Busca todos los comentarios con sentimiento = 'NEU' y score = 0.0
    (los recién insertados) y los analiza.
    Retorna un resumen de la ejecución.
    """
    import sqlite3
    import os
    from backend.config import DB_PATH

    logger.info("=" * 60)
    logger.info("🧠 INICIANDO ANÁLISIS DE SENTIMIENTO")
    logger.info("=" * 60)

    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row

    try:
        # Obtener comentarios pendientes de análisis
        rows = conn.execute(
            """
            SELECT id, noticia_id, texto
            FROM comentarios
            WHERE sentimiento = 'NEU' AND score = 0.0
            ORDER BY id DESC
            LIMIT 500
            """
        ).fetchall()

        if not rows:
            logger.info("No hay comentarios pendientes de análisis.")
            return {
                "analizados": 0,
                "positivos": 0,
                "negativos": 0,
                "neutros": 0,
            }

        logger.info("📊 Analizando %d comentarios...", len(rows))

        stats = {"POS": 0, "NEG": 0, "NEU": 0}

        for row in rows:
            resultado = analizar_sentimiento(row["texto"])

            conn.execute(
                """
                UPDATE comentarios
                SET sentimiento = ?, score = ?, keywords = ?
                WHERE id = ?
                """,
                (
                    resultado["sentimiento"],
                    resultado["score"],
                    resultado["keywords"],
                    row["id"],
                ),
            )
            stats[resultado["sentimiento"]] += 1

        conn.commit()

        resumen = {
            "analizados": len(rows),
            "positivos": stats["POS"],
            "negativos": stats["NEG"],
            "neutros": stats["NEU"],
            "timestamp": datetime.now().isoformat(),
        }

        logger.info("✅ Análisis completado: %s", resumen)
        return resumen

    except sqlite3.Error as e:
        logger.error("Error durante el análisis: %s", e)
        return {"error": str(e)}
    finally:
        conn.close()


# ─────────────────────────────────────────────
# ANÁLISIS AGREGADO PARA DASHBOARD
# ─────────────────────────────────────────────

def obtener_palabras_clave_trending(dias: int = 7, limite: int = 20) -> list[dict]:
    """
    Extrae las palabras clave más frecuentes en los comentarios
    recientes, separadas por sentimiento.
    """
    import sqlite3
    import os
    from backend.config import DB_PATH
    from datetime import timedelta

    fecha_limite = (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%d")

    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row

    try:
        rows = conn.execute(
            """
            SELECT keywords, sentimiento
            FROM comentarios
            WHERE fecha >= ? AND keywords != ''
            """,
            (fecha_limite,),
        ).fetchall()

        todas_keywords = Counter()
        keywords_neg = Counter()
        keywords_pos = Counter()

        for row in rows:
            kws = [k.strip() for k in row["keywords"].split(",") if k.strip()]
            todas_keywords.update(kws)
            if row["sentimiento"] == "NEG":
                keywords_neg.update(kws)
            elif row["sentimiento"] == "POS":
                keywords_pos.update(kws)

        resultado = []
        for palabra, total in todas_keywords.most_common(limite):
            resultado.append({
                "palabra": palabra,
                "total": total,
                "en_negativos": keywords_neg.get(palabra, 0),
                "en_positivos": keywords_pos.get(palabra, 0),
            })

        return resultado

    finally:
        conn.close()


def obtener_resumen_sentimiento_por_tema(dias: int = 7) -> list[dict]:
    """
    Calcula el sentimiento promedio por tema de noticia.
    Útil para el dashboard: "¿Qué temas generan más bronca?"
    """
    import sqlite3
    import os
    from backend.config import DB_PATH
    from datetime import timedelta

    fecha_limite = (datetime.now() - timedelta(days=dias)).strftime("%Y-%m-%d")

    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row

    try:
        rows = conn.execute(
            """
            SELECT
                n.tema,
                COUNT(c.id) as total_comentarios,
                AVG(c.score) as score_promedio,
                SUM(CASE WHEN c.sentimiento = 'POS' THEN 1 ELSE 0 END) as positivos,
                SUM(CASE WHEN c.sentimiento = 'NEG' THEN 1 ELSE 0 END) as negativos,
                SUM(CASE WHEN c.sentimiento = 'NEU' THEN 1 ELSE 0 END) as neutros
            FROM noticias n
            JOIN comentarios c ON n.id = c.noticia_id
            WHERE n.fecha >= ? AND n.tema != ''
            GROUP BY n.tema
            ORDER BY total_comentarios DESC
            """,
            (fecha_limite,),
        ).fetchall()

        return [dict(r) for r in rows]

    finally:
        conn.close()


if __name__ == "__main__":
    # Test rápido
    tests = [
        "Esto es una vergüenza, los políticos son todos corruptos",
        "Excelente noticia, por fin inauguran la escuela nueva",
        "Se realizó la reunión del consejo",
        "BASTA DE INSEGURIDAD!!! Ya no se puede vivir tranquilo",
        "Muy buena la obra del hospital, felicitaciones",
        "No sirve para nada este gobierno, todo mal",
        "El carnaval estuvo hermoso este año, viva Jujuy",
    ]

    for texto in tests:
        resultado = analizar_sentimiento(texto)
        print(f"\n📝 {texto[:60]}...")
        print(f"   → {resultado['sentimiento']} (score: {resultado['score']})")
        print(f"   → Keywords: {resultado['keywords']}")
