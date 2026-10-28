# 🌡️ Termómetro Social de Jujuy

Monitor en tiempo real del clima social, tensión ciudadana y conversación pública en la provincia de Jujuy, Argentina. Desarrollado con **React**, **TypeScript**, **Vite** y **Tailwind CSS**.

---

## 🏛️ Características Principales

1. **Velocímetro de Tensión Social (SVG Hero Gauge):**
   - Aguja interactiva con defs dinámicos y arco de progreso graduado (0% a 100%).
   - Clasificación de nivel: *Calmo / Favorable*, *Moderado*, *Tensión Media*, *Alerta / Conflicto*.
   - Desglose porcentual en tiempo real: Tono Favorable (🟢), Tono Informativo / Neutro (⚪), Tono Crítico / Reclamo (🔴).

2. **Mapa de Calor Territorial Interactivo (16 Departamentos):**
   - Georreferenciación vectorial de los 16 departamentos de Jujuy (Dr. Manuel Belgrano, Palpalá, San Pedro, Ledesma, El Carmen, San Antonio, Tilcara, Humahuaca, Tumbaya, Cochinoca, Yavi, Santa Catalina, Rinconada, Susques, Valle Grande, Santa Bárbara).
   - Panel de detalle departamental con índice de tensión, emoción predominante, medidor de severidad social (1 a 5 pips) y localidades e hitos clave.
   - Filtro reactivo en un click para enfocar las noticias y testimonios de la región seleccionada.

3. **Pulso en Redes Sociales (Social Radar):**
   - Monitoreo de Instagram Reels, TikTok, Facebook Groups y X/Twitter.
   - Clasificación de emociones según contexto regional jujeño (*Enojo*, *Frustración*, *Incertidumbre*, *Apoyo*, *Esperanza*, *Humor/Sarcasmo*, *Alivio*).
   - Simulador integrado en la interfaz para evaluar textos y expresiones populares jujeñas y añadirlos al feed en vivo.

4. **Analítica y Métricas:**
   - **Evolución de Polaridad:** Gráfico dinámico de tendencia temporal de polaridad (Crítico, Favorable, Neutro).
   - **Agenda Temática:** Ranking de cobertura por tema (Política, Seguridad, Economía, Salud, Transporte, Litio, Cultura, etc.).
   - **Termómetro por Sector:** Barras segmentadas proporcionales por sector.
   - **Conceptos en Foco:** Nube de palabras clave trending con indicadores de ánimo (*hot* / *cool*).

5. **Pulso Ciudadano y Medios:**
   - **Descontento en Medios:** Métricas de reclamos en portales locales (*Jujuy Al Momento*, *El Tribuno de Jujuy*, *Jujuy OnLine Noticias*, *Diario Pregón*).
   - **Muro de Voces Ciudadanas:** Testimonios y citas textuales de notas con enlaces a la fuente original.
   - **Radar de Noticias:** Feed de titulares con chips temáticos, búsqueda en vivo y enlace a fuentes originales.

---

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar el servidor de desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

### 3. Compilar para producción
```bash
npm run build
```
