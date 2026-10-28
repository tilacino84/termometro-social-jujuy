import React, { useRef, useEffect, useState } from 'react';
import { TimelineDia } from '../types';
import { TrendingUp } from 'lucide-react';

interface PolarityTimelineProps {
  timeline: TimelineDia[];
}

export const PolarityTimeline: React.FC<PolarityTimelineProps> = ({ timeline }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!timeline || timeline.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 600;
    const h = 240;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const pad = { top: 30, right: 30, bottom: 40, left: 40 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    const maxVal = Math.max(...timeline.map((d) => Math.max(d.pos, d.neg, d.neu, 1)), 6);
    const n = timeline.length;
    const stepX = n > 1 ? chartW / (n - 1) : chartW / 2;

    // Horizontal guide lines with subtle dashed stroke
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let i = 0; i <= 3; i++) {
      const y = pad.top + (chartH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      ctx.stroke();

      // Axis Y label
      const val = Math.round(maxVal - (maxVal / 3) * i);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Space Grotesk, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${val}`, pad.left - 8, y + 3);
    }
    ctx.setLineDash([]); // Reset dash

    // Helper for smooth bezier curve
    function drawSmoothCurve(
      data: TimelineDia[],
      key: 'neu' | 'pos' | 'neg',
      strokeColor: string,
      fillGradient: CanvasGradient
    ) {
      if (!data.length) return;
      const pts = data.map((d, i) => {
        const x = pad.left + (data.length === 1 ? stepX : i * stepX);
        const y = pad.top + chartH - ((d[key] || 0) / maxVal) * chartH;
        return { x, y };
      });

      // Area fill
      ctx!.beginPath();
      ctx!.moveTo(pts[0].x, pad.top + chartH);
      ctx!.lineTo(pts[0].x, pts[0].y);

      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const cpX = (p0.x + p1.x) / 2;
        ctx!.bezierCurveTo(cpX, p0.y, cpX, p1.y, p1.x, p1.y);
      }

      ctx!.lineTo(pts[pts.length - 1].x, pad.top + chartH);
      ctx!.closePath();
      ctx!.fillStyle = fillGradient;
      ctx!.fill();

      // Line stroke
      ctx!.beginPath();
      ctx!.moveTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const cpX = (p0.x + p1.x) / 2;
        ctx!.bezierCurveTo(cpX, p0.y, cpX, p1.y, p1.x, p1.y);
      }
      ctx!.strokeStyle = strokeColor;
      ctx!.lineWidth = 2.5;
      ctx!.lineCap = 'round';
      ctx!.stroke();

      // Data point nodes
      pts.forEach((p, i) => {
        const isHovered = hoverIndex === i;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, isHovered ? 5.5 : 3.5, 0, Math.PI * 2);
        ctx!.fillStyle = strokeColor;
        ctx!.fill();
        ctx!.strokeStyle = '#070a12';
        ctx!.lineWidth = 2;
        ctx!.stroke();
      });
    }

    // Gradient fills
    const neuGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    neuGrad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    neuGrad.addColorStop(1, 'rgba(99, 102, 241, 0.01)');

    const posGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    posGrad.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
    posGrad.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

    const negGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    negGrad.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
    negGrad.addColorStop(1, 'rgba(239, 68, 68, 0.01)');

    // Draw lines
    drawSmoothCurve(timeline, 'neu', '#6366f1', neuGrad);
    drawSmoothCurve(timeline, 'pos', '#10b981', posGrad);
    drawSmoothCurve(timeline, 'neg', '#ef4444', negGrad);

    // Active vertical cursor line if hovered
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < n) {
      const hX = pad.left + (n === 1 ? chartW / 2 : hoverIndex * stepX);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hX, pad.top);
      ctx.lineTo(hX, pad.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // X-axis real dates in Spanish format
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';

    timeline.forEach((pt, i) => {
      const x = pad.left + (n === 1 ? chartW / 2 : i * stepX);
      let fechaLabel = pt.dia ? pt.dia.slice(5) : `Día ${i + 1}`;
      if (pt.dia && pt.dia.length === 10) {
        const parts = pt.dia.split('-');
        fechaLabel = `${parts[2]}/${parts[1]}`;
      }
      ctx.fillText(fechaLabel, x, h - 12);
    });
  }, [timeline, hoverIndex]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !timeline || timeline.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pad = { top: 30, right: 30, bottom: 40, left: 40 };
    const chartW = rect.width - pad.left - pad.right;
    const n = timeline.length;
    const stepX = n > 1 ? chartW / (n - 1) : chartW / 2;

    const relX = x - pad.left;
    const idx = Math.min(Math.max(Math.round(relX / stepX), 0), n - 1);

    setHoverIndex(idx);
    setTooltipPos({ x, y });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setTooltipPos(null);
  };

  const hoveredDay = hoverIndex !== null && timeline[hoverIndex] ? timeline[hoverIndex] : null;

  return (
    <div className="grid-card timeline-col bg-[#0b101e] border border-white/[0.08] rounded-2xl p-5 shadow-xl relative overflow-hidden">
      <div className="card-head flex justify-between items-start gap-4 mb-3">
        <div className="head-text">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-text bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full text-[0.68rem] font-bold uppercase tracking-wider">
              TENDENCIA DIARIA
            </span>
          </div>
          <h3 className="card-title text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Evolución de Polaridad (Últimos 7 Días)</span>
          </h3>
          <p className="card-desc text-xs text-slate-400 mt-0.5">
            Volumen diario de noticias y opiniones críticas, favorables e informativas
          </p>
        </div>

        {/* LEGEND PILLS */}
        <div className="chart-legend flex items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
            <span>Crítico</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            <span>Favorable</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_6px_#6366f1]" />
            <span>Neutro</span>
          </span>
        </div>
      </div>

      <div className="card-body relative min-h-[240px]">
        {timeline.length === 0 ? (
          <div className="chart-empty flex items-center justify-center h-[240px] text-xs text-slate-500">
            <span>Sin registros en este intervalo temporal</span>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              id="timeline-chart"
              height={240}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="w-full h-[240px] cursor-crosshair block"
            />

            {/* INTERACTIVE FLOATING TOOLTIP */}
            {hoveredDay && tooltipPos && (
              <div
                className="absolute z-20 pointer-events-none bg-[#0e1424] border border-white/20 rounded-xl p-3 shadow-2xl text-xs backdrop-blur-xl transition-all"
                style={{
                  left: Math.min(Math.max(tooltipPos.x - 70, 10), 380),
                  top: Math.max(tooltipPos.y - 110, 10),
                }}
              >
                <div className="font-bold text-slate-200 border-b border-white/10 pb-1 mb-1.5 flex items-center justify-between gap-3">
                  <span>📅 {hoveredDay.dia}</span>
                  <span className="text-[0.68rem] text-slate-400 font-mono">Total: {hoveredDay.total}</span>
                </div>
                <div className="flex flex-col gap-1 font-mono text-[0.72rem]">
                  <div className="flex items-center justify-between text-rose-400 gap-4">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Reclamos:</span>
                    <strong className="font-bold">{hoveredDay.neg}</strong>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400 gap-4">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Favorable:</span>
                    <strong className="font-bold">{hoveredDay.pos}</strong>
                  </div>
                  <div className="flex items-center justify-between text-indigo-400 gap-4">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Informativo:</span>
                    <strong className="font-bold">{hoveredDay.neu}</strong>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
