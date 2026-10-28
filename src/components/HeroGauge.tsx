import React from 'react';
import { SentimientosStats } from '../types';
import { Newspaper, MessageSquareQuote, Radio, ThumbsUp, HelpCircle, AlertTriangle } from 'lucide-react';

interface HeroGaugeProps {
  indice: number;
  totalNotas: number;
  totalComentarios: number;
  sentimientos: SentimientosStats;
}

export const HeroGauge: React.FC<HeroGaugeProps> = ({
  indice,
  totalNotas,
  totalComentarios,
  sentimientos,
}) => {
  const rawVal = Math.min(Math.max(indice, 0), 100);

  let nivel = 'Calmo';
  let badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  let barGradient = 'from-emerald-500 to-teal-500';
  let emoji = '🟢';
  let desc = '';

  if (totalNotas === 0) {
    nivel = 'Sin registros';
    emoji = '⚪';
    desc = 'No se hallaron noticias registradas en los últimos 7 días.';
    badgeColor = 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  } else if (rawVal <= 15) {
    nivel = 'Calmo / Favorable';
    emoji = '🟢';
    desc = 'Clima social con estabilidad general y baja conflictividad en Jujuy durante los últimos 7 días.';
    badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    barGradient = 'from-emerald-500 to-teal-500';
  } else if (rawVal <= 35) {
    nivel = 'Moderado';
    emoji = '🟡';
    desc = 'Clima social moderado con debates y reclamos sectoriales puntuales en la provincia esta semana.';
    badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    barGradient = 'from-amber-500 to-yellow-500';
  } else if (rawVal <= 65) {
    nivel = 'Tensión Media';
    emoji = '🟠';
    desc = 'Tensión social en alza con presencia de reclamos ciudadanos y conflictividad en los últimos 7 días.';
    badgeColor = 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    barGradient = 'from-orange-500 to-amber-600';
  } else {
    nivel = 'Alerta / Conflicto';
    emoji = '🔴';
    desc = 'Clima de alta conflictividad y preocupación ciudadana predominante en Jujuy.';
    badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    barGradient = 'from-rose-500 to-red-600';
  }

  // Needle angle: -90deg to +90deg
  const angle = -90 + (rawVal / 100) * 180;

  // Arc length is 267px for radius 85 across half-circle: (PI * 85 = 267)
  const totalLen = 267;
  const offset = totalLen - (totalLen * (rawVal / 100));

  const pos = sentimientos.POS || 0;
  const neu = sentimientos.NEU || 0;
  const neg = sentimientos.NEG || 0;
  const totalSent = pos + neu + neg || 1;

  const pPos = Math.round((pos / totalSent) * 100);
  const pNeu = Math.round((neu / totalSent) * 100);
  const pNeg = Math.round((neg / totalSent) * 100);

  return (
    <section className="gauge-hero-card relative overflow-hidden" id="hero-gauge-section">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* LEFT: SPEEDOMETER GAUGE */}
      <div className="hero-left flex flex-col items-center justify-center p-6 bg-white/[0.02] border-r border-white/[0.06] rounded-2xl">
        <div className="gauge-meter-wrapper relative flex flex-col items-center">
          <svg className="radial-gauge w-[280px] h-[165px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" viewBox="0 0 240 145" id="gauge-svg">
            <defs>
              <linearGradient id="meter-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="35%" stopColor="#3b82f6" />
                <stop offset="70%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="needle-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.8" />
              </filter>
            </defs>

            {/* Background track */}
            <path
              d="M 30 125 A 90 90 0 0 1 210 125"
              fill="none"
              stroke="rgba(255, 255, 255, 0.07)"
              strokeWidth="18"
              strokeLinecap="round"
            />

            {/* Colored Active track with glow */}
            <path
              d="M 30 125 A 90 90 0 0 1 210 125"
              fill="none"
              stroke="url(#meter-gradient)"
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * (rawVal / 100))}
              filter="url(#gauge-glow)"
              style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />

            {/* Scale ticks */}
            <g className="gauge-ticks opacity-60 text-[9px] fill-slate-400 font-mono font-medium">
              <circle cx="30" cy="125" r="2" fill="#10b981" />
              <text x="32" y="140" textAnchor="middle">0%</text>

              <circle cx="56" cy="61" r="2" fill="#3b82f6" />
              <text x="50" y="52" textAnchor="middle">25%</text>

              <circle cx="120" cy="35" r="2.5" fill="#f59e0b" />
              <text x="120" y="26" textAnchor="middle">50%</text>

              <circle cx="184" cy="61" r="2" fill="#f97316" />
              <text x="190" y="52" textAnchor="middle">75%</text>

              <circle cx="210" cy="125" r="2" fill="#ef4444" />
              <text x="208" y="140" textAnchor="middle">100%</text>
            </g>

            {/* Needle */}
            <line
              x1="120"
              y1="125"
              x2="120"
              y2="45"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              filter="url(#needle-shadow)"
              transform={`rotate(${angle}, 120, 125)`}
              style={{ transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
            {/* Center Pivot */}
            <circle cx="120" cy="125" r="8" fill="#ffffff" filter="url(#needle-shadow)" />
            <circle cx="120" cy="125" r="4" fill="#0b0f19" />
          </svg>

          {/* Readout Underneath Needle */}
          <div className="gauge-readout text-center -mt-2">
            <div className="readout-number text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white flex items-center justify-center gap-1">
              <span>{totalNotas === 0 ? '0.0' : rawVal.toFixed(1)}</span>
              <span className="text-xl text-slate-400 font-semibold">%</span>
            </div>
            <div className="readout-caption text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Tensión Social Calculada
            </div>
          </div>
        </div>
      </div>

      {/* CENTER: SUMMARY & METADATA */}
      <div className="hero-center flex-1 flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
              <span>{emoji}</span>
              <span>Nivel: {nivel}</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Ventana de cálculo: últimos 7 días
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-100 leading-snug">
            {desc}
          </h2>

          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            El índice sintetiza el balance entre reclamos ciudadanos (cortes, paros, tarifas, servicios) y opiniones favorables o actividades comunitarias relevadas de los principales medios y redes de Jujuy.
          </p>
        </div>

        {/* METADATA CHIPS ROW */}
        <div className="status-meta-row flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-white/[0.06]">
          <div className="meta-pill inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-slate-300">
            <Newspaper className="w-3.5 h-3.5 text-blue-400" />
            <span><strong className="text-white font-mono">{totalNotas}</strong> noticias relevadas</span>
          </div>
          <div className="meta-pill inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-slate-300">
            <MessageSquareQuote className="w-3.5 h-3.5 text-purple-400" />
            <span><strong className="text-white font-mono">{totalComentarios}</strong> opiniones y citas vecinales</span>
          </div>
          <div className="meta-pill inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-slate-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google News, El Tribuno, Somos Jujuy, Pregón</span>
          </div>
        </div>
      </div>

      {/* RIGHT: SENTIMENT DISTRIBUTION STAT CARDS */}
      <div className="hero-right flex flex-col justify-center p-6 bg-white/[0.015] border-l border-white/[0.06] min-w-[280px]">
        <span className="text-[0.7rem] uppercase tracking-wider text-slate-400 font-bold mb-3 block">
          Distribución de Sentimiento Ciudadano
        </span>

        {/* 3 STAT BOXES */}
        <div className="grid grid-cols-3 gap-2.5 mb-3.5">
          {/* POSITIVE */}
          <div className="stat-card pos bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[0.7rem] text-emerald-300 font-semibold mb-0.5">
              <ThumbsUp className="w-3 h-3" />
              <span>Favorable</span>
            </div>
            <div className="stat-number text-lg font-mono font-bold text-emerald-400 tabular-nums">
              {pPos}%
            </div>
            <div className="text-[0.68rem] text-slate-400 font-mono mt-0.5">{pos} menciones</div>
          </div>

          {/* NEUTRAL */}
          <div className="stat-card neu bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[0.7rem] text-indigo-300 font-semibold mb-0.5">
              <HelpCircle className="w-3 h-3" />
              <span>Informativo</span>
            </div>
            <div className="stat-number text-lg font-mono font-bold text-indigo-400 tabular-nums">
              {pNeu}%
            </div>
            <div className="text-[0.68rem] text-slate-400 font-mono mt-0.5">{neu} menciones</div>
          </div>

          {/* NEGATIVE */}
          <div className="stat-card neg bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-center">
            <div className="flex items-center justify-center gap-1 text-[0.7rem] text-rose-300 font-semibold mb-0.5">
              <AlertTriangle className="w-3 h-3" />
              <span>Reclamos</span>
            </div>
            <div className="stat-number text-lg font-mono font-bold text-rose-400 tabular-nums">
              {pNeg}%
            </div>
            <div className="text-[0.68rem] text-slate-400 font-mono mt-0.5">{neg} menciones</div>
          </div>
        </div>

        {/* MULTI-SEGMENT STACKED PROGRESS BAR */}
        <div className="w-full bg-slate-800/60 rounded-full h-2.5 overflow-hidden flex shadow-inner">
          <div
            className="bg-emerald-500 transition-all duration-700"
            style={{ width: `${pPos}%` }}
            title={`Favorable: ${pPos}%`}
          />
          <div
            className="bg-indigo-400 transition-all duration-700"
            style={{ width: `${pNeu}%` }}
            title={`Informativo: ${pNeu}%`}
          />
          <div
            className="bg-rose-500 transition-all duration-700"
            style={{ width: `${pNeg}%` }}
            title={`Reclamos: ${pNeg}%`}
          />
        </div>

        <div className="flex justify-between items-center text-[0.68rem] text-slate-400 mt-2 font-mono">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span> Positivo</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"></span> Neutro</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block"></span> Tensión</span>
        </div>
      </div>
    </section>
  );
};
