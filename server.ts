import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeFreeJujuyFeeds, mergeAndRecalculateDashboard } from './server/scraper.js';
import { DashboardPayload } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE_PATH = fs.existsSync(path.resolve(__dirname, 'public/data.json'))
  ? path.resolve(__dirname, 'public/data.json')
  : path.resolve(__dirname, 'dist/data.json');

// In-memory master state initialized from public/data.json
let currentDashboardData: DashboardPayload;

try {
  const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
  currentDashboardData = JSON.parse(fileContent);
} catch (err) {
  console.error('Error cargando public/data.json inicial:', err);
  currentDashboardData = {
    termometro: { indice: 10.8, nivel: 'bajo', emoji: '🟢', descripcion: 'Clima social tranquilo en Jujuy' },
    estadisticas: { total_noticias: 0, total_comentarios: 0, sentimientos: { POS: 0, NEG: 0, NEU: 0 }, periodo_dias: 30 },
    temas_frecuentes: [],
    timeline_sentimiento: [],
    noticias_recientes: [],
    keywords_trending: [],
    sentimiento_por_tema: [],
    descontento_por_fuente: [],
    comentarios_destacados: [],
    mapa_departamentos: {},
    social_feed: []
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // 1. Endpoint para obtener datos actuales del dashboard
  app.get('/api/dashboard', (_req: Request, res: Response) => {
    res.json(currentDashboardData);
  });

  app.get('/api/data', (_req: Request, res: Response) => {
    res.json(currentDashboardData);
  });

  // 2. Endpoint de Scraping Gratuito (0 Créditos / 0 API Keys)
  // Consulta Google News RSS de Jujuy y portales locales directamente
  const handleScrape = async (_req: Request, res: Response) => {
    try {
      console.log('🔄 Iniciando ciclo de scraping gratuito de Jujuy (RSS)...');
      const { noticiasNuevas, totalScraped, errores } = await scrapeFreeJujuyFeeds();

      const { updatedPayload, newCount } = mergeAndRecalculateDashboard(
        currentDashboardData,
        noticiasNuevas
      );

      currentDashboardData = updatedPayload;

      // Guardar en disco para persistencia estática
      try {
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(currentDashboardData, null, 2), 'utf-8');
      } catch (writeErr) {
        console.warn('No se pudo escribir en public/data.json:', writeErr);
      }

      console.log(`✅ Scraping finalizado con éxito: ${newCount} notas nuevas incorporadas (de ${totalScraped} encontradas en RSS).`);

      res.json({
        status: 'success',
        mensaje: `Scraping gratuito completado sin gastar créditos. ${newCount} noticias nuevas agregadas.`,
        nuevasNoticias: newCount,
        totalEncontradas: totalScraped,
        errores: errores.length > 0 ? errores : undefined,
        data: currentDashboardData
      });
    } catch (err: any) {
      console.error('Error durante scraping:', err);
      res.status(500).json({
        status: 'error',
        mensaje: `Error al procesar feeds gratuitos: ${err?.message || String(err)}`,
        data: currentDashboardData
      });
    }
  };

  app.post('/api/scrape', handleScrape);
  app.get('/api/scrape', handleScrape);

  // 3. Endpoint para agregar publicaciones simuladas de redes sociales
  app.post('/api/social-feed', (req: Request, res: Response) => {
    try {
      const nuevoEvento = req.body;
      if (!nuevoEvento || !nuevoEvento.text) {
        return res.status(400).json({ error: "El campo 'text' es obligatorio" });
      }

      currentDashboardData.social_feed = [
        nuevoEvento,
        ...(currentDashboardData.social_feed || [])
      ].slice(0, 50);

      try {
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(currentDashboardData, null, 2), 'utf-8');
      } catch (wErr) {
        // ignore
      }

      res.json({ status: 'success', evento: nuevoEvento });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Error interno' });
    }
  });

  // Configurar Vite middleware en desarrollo o servir dist en producción
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Termómetro Social Jujuy corriendo en http://0.0.0.0:${PORT} (modo: ${process.env.NODE_ENV || 'development'})`);
  });

  // Scraping automático periódico en segundo plano (cada 15 minutos, 100% gratuito)
  setInterval(async () => {
    try {
      const { noticiasNuevas } = await scrapeFreeJujuyFeeds();
      const { updatedPayload, newCount } = mergeAndRecalculateDashboard(currentDashboardData, noticiasNuevas);
      currentDashboardData = updatedPayload;
      if (newCount > 0) {
        console.log(`[Auto-Scraper] ${newCount} noticias nuevas de Jujuy integradas automáticamente.`);
        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(currentDashboardData, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn('[Auto-Scraper] Error en ciclo:', e);
    }
  }, 15 * 60 * 1000);
}

startServer().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
