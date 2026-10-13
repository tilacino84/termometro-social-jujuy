"""
Compilador Standalone — Termómetro Social de Jujuy.
Incrusta styles.css y app.js directamente dentro de frontend/index.html
para que el archivo sea 100% autónomo y funcione en cualquier hosting
sin problemas de 404 ni enlaces bloqueados.
"""

import os
import sys
import re

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

base_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(base_dir, "frontend")

html_path = os.path.join(frontend_dir, "index.html")
css_path = os.path.join(frontend_dir, "styles.css")
js_path = os.path.join(frontend_dir, "app.js")

with open(css_path, "r", encoding="utf-8") as f:
    css_content = f.read()

with open(js_path, "r", encoding="utf-8") as f:
    js_content = f.read()

with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

data_path = os.path.join(frontend_dir, "data.json")
data_content = "{}"
if os.path.exists(data_path):
    with open(data_path, "r", encoding="utf-8") as f:
        data_content = f.read().strip()

# 1. Inyectar o reemplazar <style>
if "<style>" in html_content and "</style>" in html_content:
    html_content = re.sub(r"<style>[\s\S]*?</style>", f"<style>\n{css_content}\n</style>", html_content, count=1)
elif '<link rel="stylesheet" href="styles.css">' in html_content:
    html_content = html_content.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css_content}\n</style>")

# 2. Inyectar o reemplazar <script>
full_script = f"window.__EMBEDDED_DATA__ = {data_content};\n\n{js_content}"
if "<script>" in html_content and "</script>" in html_content:
    html_content = re.sub(r"<script>[\s\S]*?</script>", f"<script>\n{full_script}\n</script>", html_content, count=1)
elif '<script src="app.js"></script>' in html_content:
    html_content = html_content.replace('<script src="app.js"></script>', f"<script>\n{full_script}\n</script>")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"OK: frontend/index.html actualizado ({len(html_content)} bytes)")
