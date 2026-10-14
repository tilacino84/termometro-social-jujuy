"""
Actualizador Integral — Termómetro Social de Jujuy.

Ejecuta en 1 solo comando todo el ciclo:
1. Scrapea noticias frescas de portales y RSS de Jujuy.
2. Extrae y analiza opiniones ciudadanas y sentimientos.
3. Exporta los datos a frontend/data.json.
4. Compila frontend/index.html en modo autónomo.
5. Genera el paquete termometro_deploy.zip para Netlify.
"""

import sys
import os
import time

# Configurar encoding UTF-8 en Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base_dir)

print("\n" + "═" * 65)
print("  🔥 TERMÓMETRO SOCIAL DE JUJUY — ACTUALIZACIÓN EN VIVO")
print("═" * 65)

# 1. Pipeline de Noticias y Análisis
from backend.database import init_db
from backend.scheduler import ejecutar_pipeline_completo

init_db()
print("\n📡 [1/4] Buscando noticias y opiniones ciudadanas en medios de Jujuy...")
resumen = ejecutar_pipeline_completo()

# 2. Exportar datos estáticos
print("\n📊 [2/4] Generando frontend/data.json...")
import export_static
import json
output_json = export_static.exportar_dashboard_json(dias=30)
with open(output_json, "r", encoding="utf-8") as f:
    data = json.load(f)

# 3. Compilar Standalone
print("\n📦 [3/4] Compilando frontend/index.html autónomo...")
import subprocess
ret_build = subprocess.run([sys.executable, os.path.join(base_dir, "build_standalone.py")], capture_output=True, text=True, encoding="utf-8")
print(ret_build.stdout.strip())

# 4. Empaquetar ZIP para Netlify
print("\n🚀 [4/4] Creando paquete actualizado termometro_deploy.zip...")
import zipfile
frontend_dir = os.path.join(base_dir, "frontend")
zip_path = os.path.join(base_dir, "termometro_deploy.zip")

if os.path.exists(zip_path):
    try:
        os.remove(zip_path)
    except Exception:
        pass

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for root, dirs, files in os.walk(frontend_dir):
        dirs[:] = [d for d in dirs if d not in ["node_modules", ".git"]]
        for file in files:
            filepath = os.path.join(root, file)
            arcname = os.path.relpath(filepath, frontend_dir)
            zf.write(filepath, arcname)

size_kb = os.path.getsize(zip_path) / 1024
print(f"✅ Paquete creado: termometro_deploy.zip ({size_kb:.1f} KB)")

print("\n" + "═" * 65)
print("🎉 ACTUALIZACIÓN COMPLETADA CON ÉXITO")
print(f"   • Noticias registradas: {len(data.get('noticias_recientes', []))}")
print(f"   • Citas y opiniones:    {len(data.get('comentarios_destacados', []))}")
print(f"   • Índice de tensión:    {data.get('termometro', {}).get('indice_descontento', 0)}%")
print(f"   • Fecha/Hora de corte:  {data.get('actualizado', '')}")
print("═" * 65)
print("💡 Para publicarlo en Netlify, solo arrastra la carpeta 'frontend' (o el ZIP) a app.netlify.com\n")
