"""
Termómetro Social de Jujuy — Punto de entrada unificado.

Uso:
    python run.py --server            Inicia la API y el Dashboard en http://localhost:8000
    python run.py --scrape            Ejecuta 1 pasada completa (noticias -> comentarios -> análisis)
    python run.py --daemon            Modo automático continuo (cada N minutos)
    python run.py --seed              Carga datos de demostración para probar el dashboard inmediatamente
"""

import sys
import os
import argparse
from datetime import datetime, timedelta
import random

# Asegurar que el directorio raíz esté en sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configurar encoding UTF-8 en stdout/stderr para Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from backend.database import (
    init_db,
    insertar_noticia,
    insertar_comentario,
)
from backend.analyzer import analizar_sentimiento, analizar_comentarios_pendientes


def sembrar_datos_demo():
    """Puebla la base de datos con un conjunto representativo de noticias locales para probar el visualizador."""
    print("🌱 Sembrando datos de demostración para Jujuy...")
    init_db()

    noticias_ejemplo = [
        {
            "titulo": "Reclamo vecinal por mayor presencia policial en Alto Comedero",
            "link": "https://demo.eltribuno.com/jujuy/nota/alto-comedero-seguridad",
            "fuente": "el_tribuno",
            "tema": "Seguridad",
            "contenido": "Vecinos autoconvocados exigieron luminarias y patrullajes ante la ola de robos.",
            "comentarios": [
                "Ya no se puede salir ni a la esquina, tierra de nadie!",
                "Una vergüenza la comisaría nunca atiende el teléfono",
                "Totalmente de acuerdo, necesitamos más móviles ya",
                "Excelente iniciativa de los vecinos por unirse"
            ]
        },
        {
            "titulo": "Avanzan las obras del nuevo Hospital Regional de Libertador General San Martín",
            "link": "https://demo.pregon.com.ar/obras-hospital-libertador",
            "fuente": "pregon",
            "tema": "Salud",
            "contenido": "El ministerio de salud recorrió las instalaciones que beneficiarán a las Yungas.",
            "comentarios": [
                "Excelente avance para todo el ramal jujeño!",
                "Por fin una buena noticia para los hospitales públicos",
                "Ojalá pongan médicos especialistas y no quede en la nada",
                "Muy linda la obra felicitaciones a los trabajadores"
            ]
        },
        {
            "titulo": "Inversiones mineras en el salar de Olaroz impulsan el empleo en la Puna",
            "link": "https://demo.jujuyalmomento.com/litio-olaroz-empleo",
            "fuente": "jujuy_al_momento",
            "tema": "Litio",
            "contenido": "Empresas del sector litio acordaron cupos laborales con comunidades originarias.",
            "comentarios": [
                "Queremos saber el impacto en el agua y el medio ambiente",
                "Gran oportunidad de trabajo para los jóvenes de la zona",
                "Las regalías deberían quedar en los pueblos de la Puna",
                "Basta de contaminación y saqueo de recursos"
            ]
        },
        {
            "titulo": "Docentes universitarios de la UNJu anuncian paro de 48 horas",
            "link": "https://demo.jujuyonlinenoticias.com.ar/paro-unju-docentes",
            "fuente": "jujuy_online",
            "tema": "Educación",
            "contenido": "El gremio exige recomposición salarial urgente ante la inflación acumulada.",
            "comentarios": [
                "Fuerza a los profesores sin presupuesto no hay futuro",
                "Los alumnos pierden clases otra vez siempre lo mismo",
                "Es una miseria lo que cobran los docentes universitarios",
                "Todo mal con el ajuste a las universidades"
            ]
        },
        {
            "titulo": "Presentan el calendario oficial del Carnaval de Humahuaca y Tilcara 2025",
            "link": "https://demo.pregon.com.ar/carnaval-humahuaca-quebrada",
            "fuente": "pregon",
            "tema": "Carnaval y Cultura",
            "contenido": "Las comparsas tradicionales preparan el desentierro en toda la Quebrada.",
            "comentarios": [
                "Hermoso Jujuy el mejor carnaval del país!",
                "Orgullo de nuestras tradiciones y la pachamama",
                "Espectacular fiesta cultural única en el mundo",
                "Cuiden los precios del transporte y alojamiento por favor"
            ]
        },
        {
            "titulo": "Aumento del boleto de colectivo urbano en San Salvador de Jujuy",
            "link": "https://demo.eltribuno.com/jujuy/transporte-aumento-boleto",
            "fuente": "el_tribuno",
            "tema": "Transporte",
            "contenido": "El Concejo Deliberante aprobó la nueva tarifa tras el recorte de subsidios.",
            "comentarios": [
                "Un robo a mano armada el servicio es un desastre",
                "Pésima frecuencia y colectivos rotos una vergüenza",
                "El sueldo no alcanza para viajar a trabajar todos los días",
                "Basta de aumentar el boleto a los trabajadores"
            ]
        }
    ]

    base_time = datetime.now()

    for idx, noti in enumerate(noticias_ejemplo):
        fecha_nota = (base_time - timedelta(days=idx % 3, hours=idx * 2)).strftime("%Y-%m-%d %H:%M:%S")
        noticia_id = insertar_noticia(
            titulo=noti["titulo"],
            link=noti["link"],
            fecha=fecha_nota,
            fuente=noti["fuente"],
            contenido=noti["contenido"],
            tema=noti["tema"]
        )

        if not noticia_id:
            from backend.database import obtener_noticia_por_link
            n = obtener_noticia_por_link(noti["link"])
            noticia_id = n["id"] if n else None

        if noticia_id:
            for com_texto in noti["comentarios"]:
                analysis = analizar_sentimiento(com_texto)
                fecha_com = (base_time - timedelta(hours=random.randint(1, 48))).strftime("%Y-%m-%d %H:%M:%S")
    # Sembrar eventos de redes sociales con IA Regional
    from backend.ai_regional import procesar_evento_red_social
    from backend.database import insertar_evento_social

    eventos_redes_demo = [
        {
            "id": "reel_jujuy_01",
            "platform": "instagram_reels",
            "author": "vecino_capitalino",
            "text": "Tremendo el aumento del boleto en San Salvador, no se aguanta más viajar como ganado en el Xibi Xibi",
            "timestamp": (base_time - timedelta(hours=3)).isoformat(),
            "location_tag": "San Salvador de Jujuy"
        },
        {
            "id": "tiktok_tilcara_02",
            "platform": "tiktok",
            "author": "quebradeño_viajero",
            "text": "Qué churo se pone Tilcara y Humahuaca cuando arranca la comparsa, orgullo de nuestra Pachamama",
            "timestamp": (base_time - timedelta(hours=6)).isoformat(),
            "location_tag": "Tilcara"
        },
        {
            "id": "fb_palpala_03",
            "platform": "facebook_groups",
            "author": "vecinos_palpala_alerta",
            "text": "En Palpalá otra vez cortes de agua y la Muni de San Salvador ni se entera, un abandono total",
            "timestamp": (base_time - timedelta(hours=10)).isoformat(),
            "location_tag": "Palpalá"
        },
        {
            "id": "fb_purma_04",
            "platform": "facebook_groups",
            "author": "comunidades_puna",
            "text": "Corte en Purmamarca y asamblea en Tumbaya por el agua y las regalías del litio",
            "timestamp": (base_time - timedelta(hours=14)).isoformat(),
            "location_tag": "Purmamarca, Tumbaya"
        },
        {
            "id": "tiktok_laquiaca_05",
            "platform": "tiktok",
            "author": "fronterizo_quiaca",
            "text": "Por las nubes el precio para coquear en La Quiaca y Yavi, hasta la hoja de coca se fue al diablo",
            "timestamp": (base_time - timedelta(hours=18)).isoformat(),
            "location_tag": "La Quiaca, Yavi"
        },
        {
            "id": "x_ledesma_06",
            "platform": "x_twitter",
            "author": "trabajador_yungas",
            "text": "Avanza la producción en Ledesma y Calilegua, generando laburo para la gente de Libertador",
            "timestamp": (base_time - timedelta(hours=22)).isoformat(),
            "location_tag": "Libertador General San Martín"
        },
        {
            "id": "reel_sanpedro_07",
            "platform": "instagram_reels",
            "author": "ramaleño_activo",
            "text": "Alerta por el dengue en San Pedro y La Esperanza, necesitamos más fumigaciones y médicos en el hospital",
            "timestamp": (base_time - timedelta(hours=26)).isoformat(),
            "location_tag": "San Pedro"
        },
        {
            "id": "fb_susques_08",
            "platform": "facebook_groups",
            "author": "camioneros_puna",
            "text": "Ruta intransitable en Susques y salar de Olaroz, los camiones rompen todo y no hay mantenimiento",
            "timestamp": (base_time - timedelta(hours=30)).isoformat(),
            "location_tag": "Susques"
        }
    ]

    for ev in eventos_redes_demo:
        proc = procesar_evento_red_social(ev)
        insertar_evento_social(proc)

    print("✅ Datos sembrados con éxito (noticias, comentarios y redes sociales de Jujuy).")


def main():
    parser = argparse.ArgumentParser(description="Termómetro Social de Jujuy")
    parser.add_argument("--server", action="store_true", help="Inicia la API y el Dashboard web")
    parser.add_argument("--port", type=int, default=8000, help="Puerto del servidor (default: 8000)")
    parser.add_argument("--scrape", action="store_true", help="Ejecuta 1 ciclo de scraping y análisis")
    parser.add_argument("--daemon", action="store_true", help="Ejecuta el ciclo continuamente")
    parser.add_argument("--seed", action="store_true", help="Carga datos de demostración")

    args = parser.parse_args()

    init_db()

    if args.seed:
        sembrar_datos_demo()
        return

    if args.scrape:
        from backend.scheduler import ejecutar_pipeline_completo
        ejecutar_pipeline_completo()
        return

    if args.daemon:
        from backend.scheduler import modo_daemon
        modo_daemon()
        return

    if args.server or len(sys.argv) == 1:
        import uvicorn
        print("=" * 60)
        print(f"🔥 TERMÓMETRO SOCIAL DE JUJUY")
        print(f"🌐 Dashboard disponible en: http://localhost:{args.port}")
        print(f"📡 API docs disponible en:  http://localhost:{args.port}/docs")
        print("=" * 60)
        uvicorn.run("backend.api:app", host="0.0.0.0", port=args.port, reload=True)


if __name__ == "__main__":
    main()
