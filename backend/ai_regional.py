"""
Pipeline de IA Regional Jujuy y Análisis de Emociones.

Procesa comentarios, posts y transcripciones de redes sociales
con contexto sociocultural de la provincia de Jujuy.
Soporta Google Gemini LLM API con fallback heurístico local.
"""

import os
import re
import json
import logging
import requests
from typing import Dict, Any, Optional

from backend.config import (
    GEMINI_API_KEY,
    DEPARTAMENTOS_JUJUY,
    LÉXICO_REGIONAL_JUJUY,
    EMOCIONES_CATALOGO,
)

logger = logging.getLogger(__name__)

# Prompt de Sistema para el LLM Regional
PROMPT_SISTEMA_JUJUY = f"""
Eres un analista sociocultural y de opinión pública especializado en la provincia de Jujuy, Argentina.
Tu labor es clasificar comentarios y opiniones de redes sociales (Instagram Reels, TikTok, Facebook Groups, etc.).

Debes entender los modismos, referencias y geografía de Jujuy:
- Departamentos válidos: {list(DEPARTAMENTOS_JUJUY.keys())}
- Expresiones locales: {LÉXICO_REGIONAL_JUJUY['expresiones']}
- Lugares e hitos: {LÉXICO_REGIONAL_JUJUY['lugares_e_hitos']}
- Empresas/servicios jujeños: {LÉXICO_REGIONAL_JUJUY['servicios_y_entidades']}

Para cada texto recibido, devuelve ÚNICAMENTE un objeto JSON válido con los siguientes campos:
{{
  "emocion_predominante": "Enojo" | "Incertidumbre" | "Frustración" | "Apoyo" | "Esperanza" | "Humor/Sarcasmo" | "Alivio",
  "departamento_asignado": "<Nombre exacto de uno de los 16 departamentos de Jujuy, o 'Dr. Manuel Belgrano' por defecto si es general/capital>",
  "nivel_severidad": <entero del 1 al 5, donde 1 es comentario leve y 5 es conflicto/paro/corte de ruta/crisis grave>,
  "sentimiento": "POS" | "NEG" | "NEU",
  "score": <número decimal entre -1.0 y 1.0>,
  "resumen_clave": "<frase corta explicativa del tema>"
}}
No incluyas markdown adicional, solo el JSON puro.
"""


def detectar_departamento_heuristico(texto: str, ubicacion_tag: str = "") -> str:
    """Identifica el departamento jujeño basado en menciones territoriales en el texto."""
    combined = f"{ubicacion_tag} {texto}".lower()
    
    # 1. Buscar coincidencias en diccionario de departamentos
    for depto, localidades in DEPARTAMENTOS_JUJUY.items():
        if depto.lower() in combined:
            return depto
        for loc in localidades:
            # Buscar la localidad como palabra completa
            if re.search(r'\b' + re.escape(loc) + r'\b', combined):
                return depto
                
    # 2. Por defecto si es de la provincia en general o capital
    return "Dr. Manuel Belgrano"


def estimar_emocion_y_severidad_heuristica(texto: str) -> Dict[str, Any]:
    """Fallback heurístico local de alta precisión para Jujuy cuando no hay API key."""
    t = texto.lower()
    
    # Marcadores de severidad y conflicto
    severidad = 2
    if any(k in t for k in ["corte de ruta", "represión", "femicidio", "urgente", "colapso", "muerte", "paro por tiempo indeterminado", "saqueo"]):
        severidad = 5
    elif any(k in t for k in ["paro", "huelga", "aumento del boleto", "tarifazo", "inseguridad", "sin agua", "corte de luz", "despido", "bache"]):
        severidad = 4
    elif any(k in t for k in ["vergüenza", "bronca", "desastre", "harto", "reclamo", "muni", "colectivo", "no alcanza"]):
        severidad = 3
    elif any(k in t for k in ["lindo", "hermoso", "gracias", "carnaval", "churo", "festival", "avance"]):
        severidad = 1
        
    # Marcadores de emoción
    if any(k in t for k in ["jaj", "jeje", "meme", "chiste", "payaso", "circo", "ironía"]):
        emocion = "Humor/Sarcasmo"
        sentimiento = "NEG" if severidad >= 3 else "NEU"
        score = -0.3 if severidad >= 3 else 0.0
    elif any(k in t for k in ["bronca", "hdp", "ladrones", "corruptos", "inútiles", "vergüenza", "renuncien", "basta"]):
        emocion = "Enojo"
        sentimiento = "NEG"
        score = -0.8
    elif any(k in t for k in ["no alcanza", "cansado", "harto", "hasta cuando", "siempre lo mismo", "otra vez", "desastre"]):
        emocion = "Frustración"
        sentimiento = "NEG"
        score = -0.6
    elif any(k in t for k in ["miedo", "qué va a pasar", "incertidumbre", "preocupante", "peligro", "alerta"]):
        emocion = "Incertidumbre"
        sentimiento = "NEG"
        score = -0.4
    elif any(k in t for k in ["felicitaciones", "orgullo", "apoyo", "vamos", "excelente", "bravo", "fuerza"]):
        emocion = "Apoyo"
        sentimiento = "POS"
        score = 0.7
    elif any(k in t for k in ["esperanza", "ojalá", "progreso", "mejora", "bien por jujuy", "churo", "hermoso"]):
        emocion = "Esperanza"
        sentimiento = "POS"
        score = 0.6
    else:
        emocion = "Incertidumbre" if severidad >= 3 else "Frustración" if "no" in t else "Esperanza"
        sentimiento = "NEG" if severidad >= 3 else "NEU"
        score = -0.2 if severidad >= 3 else 0.0

    return {
        "emocion_predominante": emocion,
        "nivel_severidad": severidad,
        "sentimiento": sentimiento,
        "score": score
    }


def analizar_con_gemini_api(texto: str, ubicacion_tag: str = "") -> Optional[Dict[str, Any]]:
    """Consulta la API de Google Gemini para análisis de lenguaje natural regional."""
    api_key = os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
    if not api_key:
        return None

    # Endpoint oficial de Gemini
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    prompt_usuario = f"""
Analiza este comentario de redes de Jujuy:
Texto: "{texto}"
Ubicación reportada: "{ubicacion_tag}"
Responde estrictamente con el JSON especificado.
"""
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": PROMPT_SISTEMA_JUJUY + "\n" + prompt_usuario}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }

    try:
        res = requests.post(url, json=payload, timeout=8)
        if res.status_code == 200:
            data = res.json()
            candidates = data.get("candidates", [])
            if candidates:
                raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                parsed = json.loads(raw_text)
                # Validar departamento
                if parsed.get("departamento_asignado") not in DEPARTAMENTOS_JUJUY:
                    parsed["departamento_asignado"] = detectar_departamento_heuristico(texto, ubicacion_tag)
                return parsed
    except Exception as e:
        logger.warning("Fallo al conectar con Gemini API (%s). Usando fallback regional.", e)

    return None


def procesar_evento_red_social(evento: Dict[str, Any]) -> Dict[str, Any]:
    """
    Toma un evento estándar de red social y lo enriquece con el modelo regional:
    Input:
    {
      "id": "comment_123",
      "platform": "instagram_reels",
      "author": "user_jujuy",
      "text": "Tremendo el aumento del boleto en San Salvador, no se aguanta más",
      "timestamp": "2026-10-19T14:30:00Z",
      "location_tag": "San Salvador de Jujuy"
    }
    """
    texto = evento.get("text", "")
    ubicacion = evento.get("location_tag", "")

    # 1. Intentar con Gemini si hay API Key
    analisis = analizar_con_gemini_api(texto, ubicacion)

    # 2. Si no hay API Key o falló, usar motor heurístico jujeño
    if not analisis:
        heur = estimar_emocion_y_severidad_heuristica(texto)
        depto = detectar_departamento_heuristico(texto, ubicacion)
        analisis = {
            "emocion_predominante": heur["emocion_predominante"],
            "departamento_asignado": depto,
            "nivel_severidad": heur["nivel_severidad"],
            "sentimiento": heur["sentimiento"],
            "score": heur["score"],
            "resumen_clave": texto[:80] + ("..." if len(texto) > 80 else "")
        }

    resultado = {
        "id": evento.get("id", f"soc_{abs(hash(texto))}"),
        "platform": evento.get("platform", "general"),
        "author": evento.get("author", "anónimo"),
        "text": texto,
        "timestamp": evento.get("timestamp") or evento.get("fecha") or "2026-10-19T12:00:00Z",
        "location_tag": ubicacion or analisis.get("departamento_asignado", "Jujuy"),
        "departamento": analisis.get("departamento_asignado", "Dr. Manuel Belgrano"),
        "emocion": analisis.get("emocion_predominante", "Frustración"),
        "severidad": analisis.get("nivel_severidad", 2),
        "sentimiento": analisis.get("sentimiento", "NEU"),
        "score": analisis.get("score", 0.0),
        "resumen": analisis.get("resumen_clave", "")
    }

    return resultado
