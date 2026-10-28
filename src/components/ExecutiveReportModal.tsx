import React, { useState } from 'react';
import { FileText, Copy, Check, Download, Printer, X, ShieldAlert, Sparkles, Building2, MapPin } from 'lucide-react';
import { DashboardPayload } from '../types';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DashboardPayload;
  indiceActual: number;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  data,
  indiceActual
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totalNotas = data.noticias_recientes?.length || 0;
  const totalComms = data.estadisticas?.total_comentarios || 0;
  const deptoTop = Object.entries(data.mapa_departamentos || {}).sort(
    (a, b) => (b[1].severidad_promedio || 0) - (a[1].severidad_promedio || 0)
  )[0];

  const getRiskLabel = (val: number) => {
    if (val < 25) return { nivel: 'BAJO / CLIMA ESTABLE', accion: 'Monitoreo de rutina y fortalecimiento de canales de atención.' };
    if (val < 50) return { nivel: 'MODERADO / ATENCIÓN PREVENTIVA', accion: 'Seguimiento de demandas vecinales en transporte y servicios antes de escalamiento.' };
    if (val < 75) return { nivel: 'ALTO / TENSIÓN SOCIAL EN CURSO', accion: 'Apertura inmediata de mesas de diálogo gremial y refuerzo informativo oficial.' };
    return { nivel: 'CRÍTICO / ALERTA MÁXIMA DE CONFLICTIVIDAD', accion: 'Activación de comité de contingencia y mediación territorial urgente.' };
  };

  const risk = getRiskLabel(indiceActual);

  const reportText = `=================================================================
REPORTE EJECUTIVO DE CLIMA Y TENSIÓN SOCIAL · PROVINCIA DE JUJUY
=================================================================
Fecha de emisión: ${fechaHoy}
Sistema: Termómetro Social de Jujuy (Inteligencia Territorial Continua)

1. SÍNTESIS DE SITUACIÓN PROVINCIAL
-----------------------------------------------------------------
• Índice de Tensión Social: ${indiceActual}%
• Clasificación de Riesgo: ${risk.nivel}
• Universo monitoreado: ${totalNotas} artículos periodísticos y ${totalComms.toLocaleString('es-AR')} opiniones ciudadanas analizadas.
• Período de referencia: Últimos 7 días.

2. FOCO TERRITORIAL PRINCIPAL
-----------------------------------------------------------------
• Departamento con mayor atención: ${deptoTop ? deptoTop[0] : 'Dr. Manuel Belgrano'}
• Nivel de severidad asignado: ${deptoTop ? `${deptoTop[1].severidad_promedio}/5 (${deptoTop[1].nivel})` : '2/5 (moderado)'}
• Localidades clave: San Salvador de Jujuy, Palpalá, Perico, Humahuaca.

3. TEMAS DOMINANTES DE LA AGENDA PÚBLICA
-----------------------------------------------------------------
${(data.temas_frecuentes || []).slice(0, 5).map((t, i) => `${i + 1}. ${t.tema}: ${t.total} publicaciones registradas`).join('\n')}

4. RECOMENDACIÓN OPERATIVA SUGERIDA
-----------------------------------------------------------------
${risk.accion}

5. FUENTES DE DATOS MONITOREADAS
-----------------------------------------------------------------
• Portales provinciales: El Tribuno de Jujuy, Somos Jujuy, Jujuy al Momento, Pregón, TodoJujuy.
• Redes y canales de debate: Opinión ciudadana y foros públicos de Jujuy.
• Método de scraping: Feeds abiertos RSS provinciales de coste cero.
=================================================================`;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Clima_Social_Jujuy_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Reporte Ejecutivo de Situación Social
              </h2>
              <p className="text-xs text-slate-400">
                Resumen para toma de decisiones, ministros, directores y analistas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm">
          {/* Key metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Tensión Social</span>
              <div className="text-3xl font-black text-white mt-1">{indiceActual}%</div>
              <span className="text-[11px] text-indigo-400 font-medium">{risk.nivel.split('/')[0]}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Foco Departamental</span>
              <div className="text-lg font-bold text-white mt-2 truncate">
                {deptoTop ? deptoTop[0] : 'Dr. Manuel Belgrano'}
              </div>
              <span className="text-[11px] text-amber-400 font-medium">Severidad {deptoTop ? deptoTop[1].severidad_promedio : 2}/5 ({deptoTop ? deptoTop[1].nivel : 'moderado'})</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Artículos & Voces</span>
              <div className="text-3xl font-black text-white mt-1">{totalNotas}</div>
              <span className="text-[11px] text-slate-400">{totalComms} comentarios indexados</span>
            </div>
          </div>

          {/* Actionable recommendation */}
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                Diagnóstico y Acción Sugerida
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {risk.accion}
              </p>
            </div>
          </div>

          {/* Raw report preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Contenido del Informe Oficial
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Formato TXT / Markdown</span>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
              {reportText}
            </pre>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Generado automáticamente en tiempo real
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado al portapapeles' : 'Copiar Texto'}</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Reporte (.txt)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
