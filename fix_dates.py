import sqlite3
import requests
import re
from bs4 import BeautifulSoup
from backend.scraper_news import _parsear_fecha

conn = sqlite3.connect('data/termometro.db')
cur = conn.cursor()
rows = cur.execute('SELECT id, link, fuente, fecha FROM noticias').fetchall()
actualizadas = 0

for _id, link, fuente, fecha_actual in rows:
    # 1. Probar extraer del slug de la url
    match_url = re.search(r'/(202\d)[-/](\d{1,2})[-/](\d{1,2})', link)
    if match_url:
        nueva_fecha = f'{match_url.group(1)}-{match_url.group(2).zfill(2)}-{match_url.group(3).zfill(2)} 12:00:00'
        cur.execute('UPDATE noticias SET fecha = ? WHERE id = ?', (nueva_fecha, _id))
        actualizadas += 1
        continue
    
    # 2. Consultar HTML rápido si es jujuy al momento
    if 'jujuyalmomento.com' in link:
        try:
            r = requests.get(link, timeout=4, headers={'User-Agent': 'Mozilla/5.0'})
            soup = BeautifulSoup(r.text, 'html.parser')
            time_tag = soup.find('time')
            if time_tag:
                raw = time_tag.get('datetime') or time_tag.get_text()
                if raw:
                    nueva_fecha = _parsear_fecha(raw)
                    cur.execute('UPDATE noticias SET fecha = ? WHERE id = ?', (nueva_fecha, _id))
                    actualizadas += 1
        except Exception:
            pass

conn.commit()
print(f'OK: {actualizadas} noticias actualizadas con sus fechas reales de publicación.')
