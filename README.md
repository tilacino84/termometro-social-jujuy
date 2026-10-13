# 🌡️ Termómetro Social de Jujuy

Herramienta de monitoreo en tiempo real del clima social y la conversación pública en la provincia de Jujuy, Argentina. Analiza portales de noticias locales y la polaridad de las opiniones ciudadanas.

---

## 🏛️ Estructura del Proyecto

```
TERMOMETRO SOCIAL/
├── backend/
│   ├── __init__.py
│   ├── config.py             # Fuentes RSS, selectores CSS de portales y temas NOA
│   ├── database.py           # SQLite con WAL mode, gestión de noticias y comentarios
│   ├── scraper_news.py       # Extracción de noticias (Google News, El Tribuno, Pregón, etc.)
│   ├── scraper_comments.py   # Extracción de comentarios (nativos, Disqus, Facebook)
│   ├── analyzer.py           # Léxico jujeño/NOA y clasificación POS / NEG / NEU
│   ├── api.py                # FastAPI REST y servidor de la SPA
│   └── scheduler.py          # Orquestador del pipeline y modo daemon periódico
├── frontend/
│   ├── index.html            # Dashboard SPA accesible e interactivo
│   ├── styles.css            # Design system con tema oscuro, glassmorphism y responsive
│   └── app.js                # Lógica del frontend, velocímetro SVG y gráfico canvas
├── data/
│   └── termometro.db         # Base de datos SQLite
├── requirements.txt          # Dependencias Python
└── run.py                    # Punto de entrada unificado
```

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 2. Sembrar datos de prueba (Opcional para ver el Dashboard de inmediato)
```bash
python run.py --seed
```

### 3. Iniciar el Dashboard y la API
```bash
python run.py --server
```
Abrí tu navegador en:
- **Dashboard Web:** [http://localhost:8000](http://localhost:8000)
- **Documentación Swagger API:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## ⚙️ Modos de Ejecución

| Comando | Descripción |
|---|---|
| `python run.py --server` | Inicia la API FastAPI y sirve el Dashboard en el puerto 8000 |
| `python run.py --scrape` | Ejecuta un ciclo manual del pipeline (noticias → comentarios → análisis) |
| `python run.py --daemon` | Deja el recolector corriendo automáticamente en segundo plano cada 60 min |
| `python run.py --seed` | Carga noticias y comentarios demo para pruebas inmediatas |

---

## 📊 Métricas del Termómetro
- **Índice de Tensión Social:** Porcentaje ponderado de comentarios negativos sobre el total de reacciones ciudadanas.
- **Nivel de Clima Social:**
  - 🟢 **0% - 25%:** Clima social calmo / positivo
  - 🟡 **26% - 50%:** Tensión moderada / reclamos aislados
  - 🟠 **51% - 75%:** Clima social tenso / alertas ciudadanas
  - 🔴 **76% - 100%:** Clima social crítico / conflictividad alta
