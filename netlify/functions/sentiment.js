/**
 * Netlify Serverless Function — Analizador de Sentimiento con IA Regional Jujuy
 * Endpoint: /.netlify/functions/sentiment (o /api/sentiment si hay redirect)
 * 
 * Recibe texto de redes sociales, lo procesa con Google Gemini (usando el prompt de
 * contexto regional y modismos de Jujuy) y devuelve la emoción predominante,
 * severidad (1-5), polaridad y departamento asignado.
 */

const DEPARTAMENTOS_JUJUY = {
  "Dr. Manuel Belgrano": ["san salvador", "san salvador de jujuy", "alto comedero", "reyes", "villa jardín de reyes", "yala", "capital", "xibi xibi", "cuyaya", "gorriti", "los perales", "la viña"],
  "Palpalá": ["palpalá", "palpala", "río blanco", "rio blanco", "centro forestal"],
  "San Pedro": ["san pedro", "san pedro de jujuy", "la esperanza", "la mendieta"],
  "Ledesma": ["ledesma", "libertador", "libertador general san martín", "calilegua", "fraile pintado", "caimancito"],
  "El Carmen": ["el carmen", "perico", "ciudad perico", "monterrico", "pampa blanca", "aguas calientes"],
  "San Antonio": ["san antonio", "los alisos", "el ceibal"],
  "Tilcara": ["tilcara", "maimará", "maimara", "huacalera", "juella"],
  "Humahuaca": ["humahuaca", "uquía", "uquia", "tres cruces", "el aguilar", "mina el aguilar"],
  "Tumbaya": ["tumbaya", "purmamarca", "volcán", "volcan", "bárcena"],
  "Cochinoca": ["cochinoca", "abra pampa", "puesto del marqués", "casabindo"],
  "Yavi": ["yavi", "la quiaca", "cangrejillos", "el cóndor"],
  "Santa Catalina": ["santa catalina", "cieneguillas", "la ciénaga"],
  "Rinconada": ["rinconada", "mina pirquitas", "nuevo pirquitas"],
  "Susques": ["susques", "catua", "coranzulí", "olacapato", "olaroz", "cauchari"],
  "Valle Grande": ["valle grande", "santa ana", "caspalá", "san francisco"],
  "Santa Bárbara": ["santa bárbara", "santa clara", "palma sola", "el piquete"]
};

// Fallback heurístico regional cuando no se dispone de API Key de Gemini
function analizarHeuristicoJujuy(texto, locationTag = "") {
  const t = (texto + " " + locationTag).toLowerCase();
  
  // 1. Detección de departamento
  let deptoAsignado = "Dr. Manuel Belgrano";
  for (const [depto, locs] of Object.entries(DEPARTAMENTOS_JUJUY)) {
    if (t.includes(depto.toLowerCase()) || locs.some(loc => new RegExp(`\\b${loc}\\b`, 'i').test(t))) {
      deptoAsignado = depto;
      break;
    }
  }

  // 2. Severidad (1 a 5)
  let severidad = 2;
  if (/corte de ruta|represión|femicidio|colapso|paro por tiempo indeterminado|saqueo|tragedia/i.test(t)) {
    severidad = 5;
  } else if (/paro|huelga|tarifazo|aumento del boleto|inseguridad|sin agua|corte de luz|despido/i.test(t)) {
    severidad = 4;
  } else if (/vergüenza|bronca|desastre|harto|reclamo|muni|colectivo|no alcanza/i.test(t)) {
    severidad = 3;
  } else if (/lindo|hermoso|gracias|carnaval|churo|festival|avance|felicitaciones/i.test(t)) {
    severidad = 1;
  }

  // 3. Emoción predominante y sentimiento
  let emocion = "Incertidumbre";
  let sentimiento = "NEU";
  let score = 0.0;

  if (/jaj|jeje|meme|chiste|payaso|circo|ironía/i.test(t)) {
    emocion = "Humor/Sarcasmo";
    sentimiento = severidad >= 3 ? "NEG" : "NEU";
    score = severidad >= 3 ? -0.3 : 0.0;
  } else if (/bronca|hdp|ladrones|corruptos|inútiles|vergüenza|renuncien|basta/i.test(t)) {
    emocion = "Enojo";
    sentimiento = "NEG";
    score = -0.8;
  } else if (/no alcanza|cansado|harto|hasta cuando|siempre lo mismo|otra vez|desastre|bache/i.test(t)) {
    emocion = "Frustración";
    sentimiento = "NEG";
    score = -0.6;
  } else if (/miedo|qué va a pasar|incertidumbre|preocupante|peligro|alerta/i.test(t)) {
    emocion = "Incertidumbre";
    sentimiento = "NEG";
    score = -0.4;
  } else if (/felicitaciones|orgullo|apoyo|vamos|excelente|bravo|fuerza/i.test(t)) {
    emocion = "Apoyo";
    sentimiento = "POS";
    score = 0.7;
  } else if (/esperanza|ojalá|progreso|mejora|churo|hermoso/i.test(t)) {
    emocion = "Esperanza";
    sentimiento = "POS";
    score = 0.6;
  } else {
    emocion = severidad >= 3 ? "Frustración" : "Alivio";
    sentimiento = severidad >= 3 ? "NEG" : "NEU";
    score = severidad >= 3 ? -0.3 : 0.0;
  }

  return {
    emocion_predominante: emocion,
    departamento_asignado: deptoAsignado,
    nivel_severidad: severidad,
    sentimiento: sentimiento,
    score: score,
    motor: "heurístico_jujuy"
  };
}

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

  let text = "";
  let locationTag = "";

  if (event.httpMethod === "POST") {
    try {
      const parsed = JSON.parse(event.body || "{}");
      text = parsed.text || parsed.texto || "";
      locationTag = parsed.location_tag || parsed.departamento || "";
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "JSON inválido en el cuerpo de la solicitud" })
      };
    }
  } else {
    text = event.queryStringParameters?.text || "";
    locationTag = event.queryStringParameters?.location_tag || "";
  }

  if (!text || text.trim().length < 2) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "El campo 'text' es requerido (mínimo 2 caracteres)" })
    };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;

  // 1. Intentar con Gemini si la API key está configurada en Netlify
  if (geminiApiKey) {
    try {
      const promptSistema = `
Eres un analista sociocultural de Jujuy, Argentina.
Clasifica este comentario de redes considerando modismos jujeños (churo, coquear, el Xibi Xibi, corte en Purmamarca, Alto Comedero, la Muni, Ejesa, etc.).
Departamentos de Jujuy: ${Object.keys(DEPARTAMENTOS_JUJUY).join(", ")}.
Emociones: Enojo, Incertidumbre, Frustración, Apoyo, Esperanza, Humor/Sarcasmo, Alivio.

Responde estrictamente con un JSON sin markdown:
{
  "emocion_predominante": "...",
  "departamento_asignado": "...",
  "nivel_severidad": <entero de 1 a 5>,
  "sentimiento": "POS" | "NEG" | "NEU",
  "score": <decimal entre -1.0 y 1.0>
}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${promptSistema}\nTexto: "${text}"\nUbicación: "${locationTag}"` }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) {
          const resultadoLLM = JSON.parse(raw);
          resultadoLLM.motor = "gemini_1.5_flash";
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ status: "success", data: resultadoLLM })
          };
        }
      }
    } catch (err) {
      console.warn("Fallo en llamada a Gemini, recurriendo a motor regional:", err.message);
    }
  }

  // 2. Fallback heurístico regional si no hay clave o falló la conexión
  const resultadoHeuristico = analizarHeuristicoJujuy(text, locationTag);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: "success",
      data: resultadoHeuristico
    })
  };
};
