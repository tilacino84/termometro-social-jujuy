"""
Compilador Standalone — Termómetro Social de Jujuy.
Incrusta styles.css y app.js directamente dentro de frontend/index.html
para que el archivo sea 100% autónomo y funcione en cualquier hosting
(Netlify, Vercel, GitHub Pages, archivo local, etc.) sin problemas de 404.
"""

import os

base_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(base_dir, "frontend")

html_path = os.path.join(frontend_dir, "index.html")
css_path = os.path.join(frontend_dir, "styles.css")
js_path = os.path.join(frontend_dir, "app.js")

with open(css_path, "r", encoding="utf-8") as f:
    css_content = f.read()

with open(js_path, "r", encoding="utf-8") as f:
    js_content = f.read()

# Leemos el index actual y reemplazamos los links externos por tags inline
with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

# Reemplazar <link rel="stylesheet" href="styles.css"> por <style>...</style>
style_tag = f"<style>\n{css_content}\n</style>"
if '<link rel="stylesheet" href="styles.css">' in html_content:
    html_content = html_content.replace('<link rel="stylesheet" href="styles.css">', style_tag)

# Reemplazar <script src="app.js"></script> por <script>...</script>
script_tag = f"<script>\n{js_content}\n</script>"
if '<script src="app.js"></script>' in html_content:
    html_content = html_content.replace('<script src="app.js"></script>', script_tag)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print("✅ frontend/index.html compilado como STANDALONE autónomo con éxito.")
print(f"   Tamaño total: {len(html_content)} bytes")
