/**
 * Netlify Serverless Function — Ingesta y Consulta de Feed de Redes Sociales
 * Endpoint: /.netlify/functions/social-feed
 */

const { handler: sentimentHandler } = require('./sentiment');

exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // 1. POST: Recibir y enriquecer un evento de red social
  if (event.httpMethod === "POST") {
    try {
      const entrada = JSON.parse(event.body || "{}");
      if (!entrada.text || entrada.text.trim().length < 2) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "El campo 'text' es obligatorio" })
        };
      }

      // Procesar mediante la función de análisis de IA regional
      const fakeEvent = {
        httpMethod: "POST",
        body: JSON.stringify({ text: entrada.text, location_tag: entrada.location_tag || "" })
      };
      const resAnalisis = await sentimentHandler(fakeEvent, context);
      const dataAnalisis = JSON.parse(resAnalisis.body || "{}").data || {};

      const eventoEnriquecido = {
        id: entrada.id || `soc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        platform: entrada.platform || "instagram_reels",
        author: entrada.author || "usuario_jujuy",
        text: entrada.text,
        timestamp: entrada.timestamp || new Date().toISOString(),
        location_tag: entrada.location_tag || dataAnalisis.departamento_asignado || "Jujuy",
        departamento: dataAnalisis.departamento_asignado || "Dr. Manuel Belgrano",
        emocion: dataAnalisis.emocion_predominante || "Frustración",
        severidad: dataAnalisis.nivel_severidad || 2,
        sentimiento: dataAnalisis.sentimiento || "NEU",
        score: dataAnalisis.score || 0.0,
        motor: dataAnalisis.motor || "ia_regional"
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: "success",
          message: "Evento de red social enriquecido con IA Jujuy",
          data: eventoEnriquecido
        })
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Error procesando evento: " + e.message })
      };
    }
  }

  // 2. GET: Devolver eventos de ejemplo o consulta
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: "online",
      message: "Worker Serverless de Redes Sociales activo para Jujuy"
    })
  };
};
