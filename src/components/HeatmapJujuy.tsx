import React from 'react';
import { DepartamentoInfo } from '../types';
import { EMOJI_MAP } from '../utils/regionalAi';
import { Filter, Globe, MapPin, ChevronRight, Activity, ShieldAlert } from 'lucide-react';

interface HeatmapJujuyProps {
  departamentos: Record<string, DepartamentoInfo>;
  selectedDepartment: string | null;
  onSelectDepartment: (depto: string | null) => void;
  onFilterNewsByDepartment: (depto: string) => void;
}

const DEPTOS_CONFIG: Array<{ id: string; name: string; region: string; path: string; textX: number; textY: number; label: string }> = [
  // PUNA NORTE
  { id: 'santa-catalina', name: 'Santa Catalina', region: 'Puna Norte', path: 'M 160 30 L 220 30 L 230 80 L 170 85 Z', textX: 195, textY: 60, label: 'Sta. Catalina' },
  { id: 'yavi', name: 'Yavi', region: 'Puna Norte', path: 'M 220 30 L 320 40 L 315 115 L 230 80 Z', textX: 270, textY: 80, label: 'Yavi (La Quiaca)' },
  { id: 'rinconada', name: 'Rinconada', region: 'Puna', path: 'M 115 80 L 170 85 L 185 170 L 105 160 Z', textX: 145, textY: 125, label: 'Rinconada' },

  // PUNA CENTRO Y QUEBRADA
  { id: 'cochinoca', name: 'Cochinoca', region: 'Puna Central', path: 'M 170 85 L 230 80 L 250 130 L 265 220 L 190 215 L 185 170 Z', textX: 215, textY: 155, label: 'Cochinoca' },
  { id: 'humahuaca', name: 'Humahuaca', region: 'Quebrada', path: 'M 230 80 L 315 115 L 340 200 L 305 245 L 265 220 L 250 130 Z', textX: 290, textY: 180, label: 'Humahuaca' },
  { id: 'susques', name: 'Susques', region: 'Puna / Salar', path: 'M 50 155 L 115 160 L 190 215 L 175 350 L 75 330 Z', textX: 125, textY: 250, label: 'Susques (Litio)' },
  { id: 'tilcara', name: 'Tilcara', region: 'Quebrada', path: 'M 190 215 L 265 220 L 280 275 L 215 280 Z', textX: 235, textY: 250, label: 'Tilcara' },
  { id: 'valle-grande', name: 'Valle Grande', region: 'Yungas Altas', path: 'M 305 245 L 375 255 L 380 330 L 325 335 L 280 275 Z', textX: 335, textY: 290, label: 'Valle Grande' },
  { id: 'tumbaya', name: 'Tumbaya', region: 'Quebrada', path: 'M 175 280 L 215 280 L 240 350 L 170 355 Z', textX: 200, textY: 315, label: 'Tumbaya' },

  // VALLES CENTRALES (GRAN JUJUY)
  { id: 'dr-manuel-belgrano', name: 'Dr. Manuel Belgrano', region: 'Valles Centrales', path: 'M 210 350 L 275 345 L 285 410 L 215 415 Z', textX: 245, textY: 380, label: 'Manuel Belgrano (Capital)' },
  { id: 'palpala', name: 'Palpalá', region: 'Valles', path: 'M 275 375 L 315 380 L 320 430 L 280 425 Z', textX: 298, textY: 405, label: 'Palpalá' },
  { id: 'san-antonio', name: 'San Antonio', region: 'Valles', path: 'M 200 410 L 250 415 L 245 475 L 185 465 Z', textX: 220, textY: 445, label: 'San Antonio' },
  { id: 'el-carmen', name: 'El Carmen', region: 'Valles', path: 'M 250 415 L 315 430 L 325 495 L 245 480 Z', textX: 285, textY: 460, label: 'El Carmen (Perico)' },

  // RAMAL Y YUNGAS
  { id: 'ledesma', name: 'Ledesma', region: 'Ramal', path: 'M 325 335 L 380 330 L 435 350 L 425 440 L 350 425 L 318 380 Z', textX: 375, textY: 385, label: 'Ledesma (Libertador)' },
  { id: 'san-pedro', name: 'San Pedro', region: 'Ramal', path: 'M 318 380 L 350 425 L 405 445 L 390 520 L 320 485 Z', textX: 360, textY: 460, label: 'San Pedro' },
  { id: 'santa-barbara', name: 'Santa Bárbara', region: 'Ramal / Yungas', path: 'M 405 445 L 475 430 L 485 525 L 390 520 Z', textX: 440, textY: 480, label: 'Santa Bárbara' }
];

export const HeatmapJujuy: React.FC<HeatmapJujuyProps> = ({
  departamentos,
  selectedDepartment,
  onSelectDepartment,
  onFilterNewsByDepartment,
}) => {
  const activeName = selectedDepartment || 'Dr. Manuel Belgrano';
  const activeData: DepartamentoInfo = departamentos[activeName] || {
    nombre: activeName,
    indice: 14.3,
    nivel: 'bajo',
    color: '#10b981',
    emocion_predominante: 'Esperanza',
    total_noticias: 12,
    total_social: 4,
    severidad_promedio: 2,
    localidades_clave: ['San Salvador de Jujuy', 'Alto Comedero', 'Los Perales']
  };

  const emoji = EMOJI_MAP[activeData.emocion_predominante] || '✨';
  const severityVal = Math.round(activeData.severidad_promedio || 2);
  const totalEvents = (activeData.total_noticias || 0) + (activeData.total_social || 0);

  const getBadgeStyle = (nivel: string) => {
    switch (nivel) {
      case 'crítico':
        return { background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.4)' };
      case 'alto':
        return { background: 'rgba(249, 115, 22, 0.2)', color: '#fdba74', border: '1px solid rgba(249, 115, 22, 0.4)' };
      case 'moderado':
        return { background: 'rgba(245, 158, 11, 0.2)', color: '#fde68a', border: '1px solid rgba(245, 158, 11, 0.4)' };
      default:
        return { background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.4)' };
    }
  };

  return (
    <section className="heatmap-card bg-[#0b101e] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden" id="heatmap-section">
      {/* Decorative ambient corner blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER */}
      <div className="card-head mb-5">
        <div className="head-text">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="badge-text bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold uppercase tracking-wider">
              GEORREFERENCIACIÓN TERRITORIAL
            </span>
            <span className="badge-text bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold">
              16 DEPARTAMENTOS
            </span>
            {selectedDepartment && (
              <span className="badge-text bg-sky-500/20 text-sky-300 border border-sky-500/40 px-2.5 py-0.5 rounded-full text-[0.7rem] font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>FILTRADO: {selectedDepartment}</span>
              </span>
            )}
          </div>
          <h3 className="card-title text-xl sm:text-2xl font-bold text-white tracking-tight">
            Mapa de Calor Territorial · Clima Social de Jujuy
          </h3>
          <p className="card-desc text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Nivel de tensión, reclamos vecinales y emociones predominantes geolocalizadas con IA en cada región (Puna, Quebrada, Valles y Ramal).
          </p>
        </div>
      </div>

      {/* QUICK HORIZONTAL DEPARTMENTS SELECTOR BAR */}
      <div className="deptos-quick-bar flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-thin">
        <span className="text-[0.68rem] text-slate-400 uppercase font-bold shrink-0 mr-1 flex items-center gap-1">
          <Globe className="w-3 h-3 text-indigo-400" />
          <span>Acceso rápido:</span>
        </span>
        {DEPTOS_CONFIG.map((d) => {
          const deptoData = departamentos[d.name];
          const isSelected = (selectedDepartment === d.name) || (!selectedDepartment && d.name === 'Dr. Manuel Belgrano');
          const dotColor = deptoData?.color || '#10b981';

          return (
            <button
              key={d.id}
              onClick={() => onSelectDepartment(d.name)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/60 ring-2 ring-indigo-400/50'
                  : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.05]'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
              <span>{d.name}</span>
            </button>
          );
        })}
      </div>

      <div className="heatmap-layout grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SVG INTERACTIVO (7 COLS) */}
        <div className="map-view-container lg:col-span-7 bg-[#070a13] border border-white/[0.06] rounded-2xl p-4 flex flex-col items-center justify-center relative shadow-inner">
          <div className="w-full flex justify-between items-center text-xs text-slate-400 mb-2 px-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              <span>Haz clic en un departamento para inspeccionar</span>
            </span>
            <span className="font-mono text-[0.7rem] text-slate-500">PROVINCIA DE JUJUY</span>
          </div>

          <svg
            className="jujuy-svg-map w-full max-h-[460px] drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)]"
            viewBox="0 0 520 600"
            id="jujuy-map-svg"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="glow-heat" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background subtle grid */}
            <pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
            </pattern>
            <rect width="520" height="600" fill="url(#map-grid)" />

            {DEPTOS_CONFIG.map((d) => {
              const deptoData = departamentos[d.name];
              const fillColor = deptoData?.color || '#10b981';
              const isActive = (selectedDepartment === d.name) || (!selectedDepartment && d.name === 'Dr. Manuel Belgrano');

              return (
                <g
                  key={d.id}
                  className={`depto-group cursor-pointer transition-all duration-300 ${isActive ? 'active' : ''}`}
                  id={`depto-${d.id}`}
                  data-depto={d.name}
                  onClick={() => onSelectDepartment(d.name)}
                >
                  <title>{`${d.name}: ${deptoData?.indice ?? 14}% de tensión (${deptoData?.emocion_predominante ?? 'Esperanza'})`}</title>
                  <path
                    d={d.path}
                    fill={fillColor}
                    stroke={isActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.22)'}
                    strokeWidth={isActive ? '3' : '1.2'}
                    className="transition-all duration-300 hover:brightness-125"
                    filter={isActive ? 'url(#glow-heat)' : undefined}
                  />
                  <text
                    x={d.textX}
                    y={d.textY}
                    className="depto-label text-[11px] font-bold fill-white select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                    textAnchor="middle"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* LEYENDA DEL MAPA */}
          <div className="map-legend-bar w-full mt-4 pt-3 border-t border-white/[0.06]">
            <div className="legend-labels flex justify-between text-[0.7rem] text-slate-300 font-semibold mb-1.5 flex-wrap gap-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Calmo (&lt;20%)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Moderado (20-40%)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span> Tensión (40-65%)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Crítico (&gt;65%)</span>
            </div>
            <div className="legend-gradient-line h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-500 to-rose-500 w-full shadow-inner" />
          </div>
        </div>

        {/* PANEL DETALLE DEL DEPARTAMENTO SELECCIONADO (5 COLS) */}
        <div className="depto-detail-panel lg:col-span-5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-2xl p-5 shadow-xl flex flex-col justify-between" id="depto-detail-panel">
          <div>
            <div className="depto-panel-head flex justify-between items-start gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <span className="depto-stat-label text-[0.68rem] uppercase tracking-wider text-slate-400 font-bold block">
                  EXPEDIENTE REGIONAL
                </span>
                <h4 className="depto-panel-title text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>{activeData.nombre}</span>
                </h4>
              </div>
              <span
                className="depto-panel-badge text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm"
                style={getBadgeStyle(activeData.nivel)}
              >
                NIVEL {activeData.nivel.toUpperCase()}
              </span>
            </div>

            {/* 4 STAT BOXES GRID */}
            <div className="depto-stats-grid grid grid-cols-2 gap-3 my-4">
              <div className="depto-stat-box bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                <span className="depto-stat-label text-[0.7rem] text-slate-400 font-semibold block mb-1">
                  Índice de Tensión
                </span>
                <span className="depto-stat-val text-2xl font-mono font-black text-white tabular-nums flex items-baseline gap-1">
                  {activeData.indice !== undefined ? activeData.indice.toFixed(1) : '--'}
                  <span className="text-sm text-slate-400 font-normal">%</span>
                </span>
              </div>

              <div className="depto-stat-box bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                <span className="depto-stat-label text-[0.7rem] text-slate-400 font-semibold block mb-1">
                  Emoción Predominante
                </span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-xs font-bold text-slate-200">
                  <span className="text-base">{emoji}</span>
                  <span>{activeData.emocion_predominante}</span>
                </div>
              </div>

              <div className="depto-stat-box bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                <span className="depto-stat-label text-[0.7rem] text-slate-400 font-semibold block mb-1">
                  Severidad Social
                </span>
                <div className="severity-meter-wrap flex gap-1.5 mt-2">
                  {[1, 2, 3, 4, 5].map((pip) => (
                    <span
                      key={pip}
                      className={`flex-1 h-2 rounded-full transition-all ${
                        pip <= severityVal
                          ? severityVal >= 4
                            ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                            : severityVal === 3
                            ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                            : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[0.65rem] text-slate-400 font-mono mt-1 block">Nivel {severityVal} de 5</span>
              </div>

              <div className="depto-stat-box bg-white/[0.03] p-3 rounded-xl border border-white/[0.06]">
                <span className="depto-stat-label text-[0.7rem] text-slate-400 font-semibold block mb-1">
                  Eventos Monitoreados
                </span>
                <span className="depto-stat-val text-2xl font-mono font-black text-white tabular-nums">
                  {totalEvents}
                </span>
                <span className="text-[0.65rem] text-slate-400 block mt-0.5">
                  {activeData.total_noticias || 0} notas · {activeData.total_social || 0} redes
                </span>
              </div>
            </div>

            {/* KEY LOCALITIES */}
            <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl mb-4">
              <span className="depto-stat-label text-[0.7rem] text-slate-400 font-bold block mb-1.5 uppercase tracking-wider">
                Localidades e Hitos Geográficos
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(activeData.localidades_clave && activeData.localidades_clave.length > 0
                  ? activeData.localidades_clave
                  : ['Cabecera departamental', 'Zonas aledañas']
                ).map((loc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-md text-[0.72rem] text-slate-300"
                  >
                    <span className="w-1 h-1 rounded-full bg-indigo-400" />
                    <span>{loc.charAt(0).toUpperCase() + loc.slice(1)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-white/[0.06]">
            <button
              onClick={() => onFilterNewsByDepartment(activeData.nombre)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-950/60 transition-all cursor-pointer active:scale-98"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtrar noticias de {activeData.nombre}</span>
            </button>
            {selectedDepartment && (
              <button
                onClick={() => onSelectDepartment(null)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition-all cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Ver toda la provincia</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
