import React, { useState } from 'react';
import { Sliders, RotateCcw, TrendingUp, AlertOctagon, CheckCircle2, Zap, ArrowRight, ShieldAlert } from 'lucide-react';

interface ScenarioSimulatorProps {
  baseIndice: number;
  onApplySimulatedDelta: (deltaIndice: number, affectedDept?: string, description?: string) => void;
  onResetSimulation: () => void;
  isSimulating: boolean;
  currentSimulatedDelta: number;
}

interface PrebuiltScenario {
  id: string;
  titulo: string;
  categoria: string;
  depto: string;
  impacto: number; // percentage change in index
  descripcion: string;
  tipo: 'crisis' | 'calma' | 'alerta';
}

const PREBUILT_SCENARIOS: PrebuiltScenario[] = [
  {
    id: 'transporte',
    titulo: 'Paro de Colectivos de 48hs y Suba de Boleto',
    categoria: 'Transporte & Economía',
    depto: 'Dr. Manuel Belgrano',
    impacto: +28.5,
    descripcion: 'Suspensión total del servicio urbano en San Salvador y Palpalá con fuerte malestar en usuarios.',
    tipo: 'crisis'
  },
  {
    id: 'docentes',
    titulo: 'Rechazo de Paritaria Salarial Docente / Marcha',
    categoria: 'Educación & Gremial',
    depto: 'Dr. Manuel Belgrano',
    impacto: +19.4,
    descripcion: 'Gremios convocan a movilización provincial hacia Casa de Gobierno por recomposición salarial.',
    tipo: 'crisis'
  },
  {
    id: 'corte_ruta',
    titulo: 'Corte Total en Ruta 9 a la altura de Purmamarca',
    categoria: 'Vialidad & Conflicto',
    depto: 'Tumbaya',
    impacto: +34.2,
    descripcion: 'Interrupción del tránsito turístico y comercial en Quebrada con varados de larga distancia.',
    tipo: 'crisis'
  },
  {
    id: 'turismo_record',
    titulo: 'Feriado de Carnaval con Ocupación al 100%',
    categoria: 'Turismo & Empleo',
    depto: 'Tilcara',
    impacto: -18.2,
    descripcion: 'Impacto económico favorable en hotelería, gastronomía y comercio de la Quebrada y Valles.',
    tipo: 'calma'
  },
  {
    id: 'bono_empleados',
    titulo: 'Anuncio de Pago de Bono Extraordinario y Aguinaldo',
    categoria: 'Economía & Gestión',
    depto: 'Dr. Manuel Belgrano',
    impacto: -14.6,
    descripcion: 'Inyección de liquidez en comercios y distensión con los gremios estatales provinciales.',
    tipo: 'calma'
  }
];

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  baseIndice,
  onApplySimulatedDelta,
  onResetSimulation,
  isSimulating,
  currentSimulatedDelta
}) => {
  const [customDelta, setCustomDelta] = useState<number>(0);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const finalIndice = Math.min(100, Math.max(0, Number((baseIndice + currentSimulatedDelta).toFixed(1))));

  const handleSelectScenario = (sc: PrebuiltScenario) => {
    setSelectedScenarioId(sc.id);
    setCustomDelta(sc.impacto);
    onApplySimulatedDelta(sc.impacto, sc.depto, sc.titulo);
  };

  const handleCustomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCustomDelta(val);
    setSelectedScenarioId(null);
    onApplySimulatedDelta(val, undefined, 'Ajuste manual de tensión social');
  };

  const handleReset = () => {
    setSelectedScenarioId(null);
    setCustomDelta(0);
    onResetSimulation();
  };

  const getSimulatedLevel = (val: number) => {
    if (val < 25) return { label: 'Bajo / Calma Social', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
    if (val < 50) return { label: 'Moderado / Observación', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' };
    if (val < 75) return { label: 'Tensión Significativa', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { label: 'Crítico / Alerta Máxima', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };
  };

  const currentLevel = getSimulatedLevel(finalIndice);

  return (
    <section className="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Herramienta Predictiva & Stress-Test</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Simulador de Impacto Social en Jujuy
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Proyecta cómo variaría el termómetro provincial y el mapa territorial ante posibles eventos gremiales, económicos o viales.
          </p>
        </div>

        {isSimulating && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Volver a Datos Reales</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-center">
        {/* Visualizador del Índice Simulado */}
        <div className="lg:col-span-4 bg-slate-950/60 border border-white/10 rounded-xl p-5 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Índice de Tensión Proyectado
          </span>

          <div className="my-3 flex items-baseline gap-2">
            <span className="text-5xl font-black text-white tracking-tighter">
              {finalIndice}%
            </span>
            {isSimulating && (
              <span
                className={`text-sm font-bold flex items-center ${
                  currentSimulatedDelta > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {currentSimulatedDelta > 0 ? `+${currentSimulatedDelta}%` : `${currentSimulatedDelta}%`}
              </span>
            )}
          </div>

          <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${currentLevel.bg} ${currentLevel.color}`}>
            {currentLevel.label}
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                finalIndice < 25
                  ? 'bg-emerald-500'
                  : finalIndice < 50
                  ? 'bg-sky-500'
                  : finalIndice < 75
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, finalIndice))}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 mt-3">
            Base real actual: <strong className="text-slate-200">{baseIndice}%</strong>
          </p>
        </div>

        {/* Escenarios Preconfigurados */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Escenarios Críticos para Testear:</span>
            <span className="text-[11px] text-slate-400">Clic para simular impacto</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PREBUILT_SCENARIOS.map((sc) => {
              const isSelected = selectedScenarioId === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'bg-indigo-950/70 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400'
                      : 'bg-slate-950/40 border-white/5 hover:border-white/15 text-slate-300 hover:bg-slate-950/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold leading-tight group-hover:text-indigo-300">
                      {sc.titulo}
                    </span>
                    <span
                      className={`text-[11px] font-bold shrink-0 px-1.5 py-0.5 rounded ${
                        sc.impacto > 0
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {sc.impacto > 0 ? `+${sc.impacto}%` : `${sc.impacto}%`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {sc.descripcion}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-indigo-400 font-medium">
                    <span>{sc.depto}</span>
                    <span>•</span>
                    <span>{sc.categoria}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Slider manual */}
          <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3.5 mt-1 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Ajuste fino manual del índice social:
              </span>
              <span className="font-mono font-bold text-indigo-300">
                {customDelta > 0 ? `+${customDelta.toFixed(1)}%` : `${customDelta.toFixed(1)}%`}
              </span>
            </div>
            <input
              type="range"
              min="-40"
              max="50"
              step="0.5"
              value={customDelta}
              onChange={handleCustomSliderChange}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>-40% (Distensión total)</span>
              <span>0% (Estado real)</span>
              <span>+50% (Pico de conflictividad)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
