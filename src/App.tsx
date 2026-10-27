import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PRESET_MODELS } from './data/preset-models';
import { SWMMModel, SimulationResult } from './types/swmm';
import { runSWMMSimulation } from './engine/swmm-solver';
import { NetworkMap } from './components/NetworkMap';
import { LongitudinalProfile } from './components/LongitudinalProfile';
import { HydrographChart } from './components/HydrographChart';
import { LidDashboard } from './components/LidDashboard';
import { SummaryReport } from './components/SummaryReport';
import { ParameterAdjuster } from './components/ParameterAdjuster';
import { TheoryGuide } from './components/TheoryGuide';
import { InpViewerModal } from './components/InpViewerModal';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FileCode,
  Droplets,
  Layers,
  TrendingUp,
  Activity,
  Leaf,
  Sliders,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export function App() {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('epaExample1');
  const [currentModel, setCurrentModel] = useState<SWMMModel>(PRESET_MODELS.epaExample1);
  const [lidEnabled, setLidEnabled] = useState<boolean>(true);

  // Scenario parameter overrides
  const [params, setParams] = useState({
    rainMultiplier: 1.0,
    impervMultiplier: 1.0,
    manningMultiplier: 1.0,
    diameterMultiplier: 1.0,
  });

  // Active view tab
  const [activeTab, setActiveTab] = useState<
    'network' | 'hydrograph' | 'lid' | 'report' | 'sensitivity' | 'theory'
  >('network');

  // Selected element for inspection
  const [selectedElement, setSelectedElement] = useState<{
    type: 'NODE' | 'LINK' | 'SUBCATCHMENT';
    id: string;
  } | null>(null);

  // INP viewer modal
  const [showInpModal, setShowInpModal] = useState<boolean>(false);

  // Playback state
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);

  // Run simulation whenever model, LID toggle, or params change
  const simulationResult: SimulationResult = useMemo(() => {
    // If LID is disabled by user toggle, temporarily zero out the usage
    let modelToRun = currentModel;
    if (!lidEnabled && currentModel.lidUsages && currentModel.lidUsages.length > 0) {
      modelToRun = {
        ...currentModel,
        lidUsages: [],
      };
    }
    return runSWMMSimulation(modelToRun, params);
  }, [currentModel, lidEnabled, params]);

  const steps = simulationResult.steps;
  const currentStep = steps[currentStepIndex] || steps[0];

  // Playback timer loop
  const timerRef = useRef<any>(null);
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, Math.max(20, 120 / playSpeed));
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, steps.length, playSpeed]);

  const handleSelectPreset = (key: string) => {
    setSelectedPresetKey(key);
    const preset = PRESET_MODELS[key];
    if (preset) {
      setCurrentModel(JSON.parse(JSON.stringify(preset)));
      setCurrentStepIndex(0);
      setIsPlaying(false);
      setSelectedElement(null);
    }
  };

  const handleApplyINP = (newModel: SWMMModel) => {
    setCurrentModel(newModel);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setSelectedElement(null);
  };

  // Quick total area calculation
  const totalCatchmentArea = currentModel.subcatchments.reduce((sum, s) => sum + s.area, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30">
      {/* Top Main Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-white shadow-lg shadow-cyan-500/20">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                  EPA SWMM <span className="text-cyan-400 font-mono">5.2</span>
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] bg-slate-800 border border-slate-700 text-slate-300 rounded font-medium">
                  Stormwater Management Model
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                Dynamic Hydrology & Hydraulic Flow Routing Engine
              </p>
            </div>
          </div>

          {/* Preset Selector & Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-400 text-[11px]">Preset Model:</span>
              <select
                value={selectedPresetKey}
                onChange={e => handleSelectPreset(e.target.value)}
                className="bg-transparent text-cyan-300 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                <option value="epaExample1" className="bg-slate-900 text-slate-200">
                  EPA Example 1 (Urban Basin)
                </option>
                <option value="lidRetrofit" className="bg-slate-900 text-slate-200">
                  LID Green Retrofit (Bioretention/Pave)
                </option>
                <option value="detentionPond" className="bg-slate-900 text-slate-200">
                  Detention Pond & Orifice/Weir
                </option>
              </select>
            </div>

            <button
              onClick={() => setShowInpModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs rounded-lg transition font-medium shadow-sm"
              title="View, edit, or export standard SWMM .INP file"
            >
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>.INP File Editor</span>
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Bar */}
        <div className="border-t border-slate-800/80 bg-slate-950/60 px-4 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-slate-500">Catchment Area:</span>{' '}
                <span className="font-mono font-semibold text-slate-200">
                  {totalCatchmentArea.toFixed(1)} acres
                </span>
              </div>
              <div>
                <span className="text-slate-500">Peak Runoff:</span>{' '}
                <span className="font-mono font-bold text-cyan-400">
                  {simulationResult.summary.peakRunoffRate.toFixed(2)} cfs
                </span>{' '}
                <span className="text-[10px] text-slate-500 font-mono">
                  (@ {simulationResult.summary.peakRunoffTime})
                </span>
              </div>
              <div>
                <span className="text-slate-500">Peak Outfall:</span>{' '}
                <span className="font-mono font-bold text-emerald-400">
                  {simulationResult.summary.peakOutflowRate.toFixed(2)} cfs
                </span>
              </div>
              <div>
                <span className="text-slate-500">Continuity Error:</span>{' '}
                <span
                  className={`font-mono font-semibold ${
                    Math.abs(simulationResult.summary.continuity.routingContinuityError) < 1.0
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {simulationResult.summary.continuity.routingContinuityError.toFixed(2)}%
                </span>
              </div>
              {simulationResult.summary.floodedNodesCount > 0 && (
                <div className="flex items-center gap-1 text-rose-400 font-bold bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/50">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{simulationResult.summary.floodedNodesCount} Node(s) Surcharged</span>
                </div>
              )}
            </div>

            {/* Current Step Readout */}
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-slate-400">Elapsed Time:</span>
              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-cyan-300 font-bold">
                {currentStep?.timeStr || '00:00'} / {String(simulationResult.durationHours).padStart(2, '0')}:00
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
        {/* Playback & Timeline Scrubber Bar */}
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition shadow-md shadow-cyan-500/20"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-slate-950" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
              <span>{isPlaying ? 'Pause' : 'Play Simulation'}</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(0);
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              title="Reset to 00:00"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentStepIndex(p => Math.max(0, p - 5))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              title="Step Back -10m"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentStepIndex(p => Math.min(steps.length - 1, p + 5))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              title="Step Forward +10m"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1 ml-2 text-xs">
              <span className="text-slate-400 text-[11px]">Speed:</span>
              {[1, 2, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setPlaySpeed(s)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition ${
                    playSpeed === s ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Scrubber Range Slider */}
          <div className="flex-1 min-w-[200px] flex items-center gap-3">
            <span className="text-slate-500 text-xs font-mono">00:00</span>
            <input
              type="range"
              min={0}
              max={steps.length - 1}
              value={currentStepIndex}
              onChange={e => {
                setIsPlaying(false);
                setCurrentStepIndex(parseInt(e.target.value));
              }}
              className="flex-1 accent-cyan-400 cursor-pointer"
            />
            <span className="text-slate-500 text-xs font-mono">
              {String(simulationResult.durationHours).padStart(2, '0')}:00
            </span>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 ${
              activeTab === 'network'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Network Map & Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('hydrograph')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 ${
              activeTab === 'hydrograph'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Hydrograph Curves</span>
          </button>
          <button
            onClick={() => setActiveTab('lid')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 ${
              activeTab === 'lid'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Leaf className="w-4 h-4" />
            <span>LID Green Infrastructure</span>
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 ${
              activeTab === 'report'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Status Summary Report</span>
          </button>
          <button
            onClick={() => setActiveTab('sensitivity')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 ${
              activeTab === 'sensitivity'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>What-If Stress Testing</span>
          </button>
          <button
            onClick={() => setActiveTab('theory')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 ${
              activeTab === 'theory'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900/60 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Theory & Formulation</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="space-y-4">
          {activeTab === 'network' && (
            <>
              <NetworkMap
                model={currentModel}
                currentStep={currentStep}
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
              />
              <LongitudinalProfile model={currentModel} currentStep={currentStep} />
            </>
          )}

          {activeTab === 'hydrograph' && (
            <div className="space-y-4">
              <HydrographChart
                result={simulationResult}
                model={currentModel}
                currentStepIndex={currentStepIndex}
                onSeekStep={setCurrentStepIndex}
                selectedElement={selectedElement}
              />
              {/* Longitudinal profile also available under hydrograph for cross-reference */}
              <LongitudinalProfile model={currentModel} currentStep={currentStep} />
            </div>
          )}

          {activeTab === 'lid' && (
            <div className="space-y-4">
              <LidDashboard
                model={currentModel}
                result={simulationResult}
                lidEnabled={lidEnabled}
                onToggleLid={setLidEnabled}
              />
              <HydrographChart
                result={simulationResult}
                model={currentModel}
                currentStepIndex={currentStepIndex}
                onSeekStep={setCurrentStepIndex}
                selectedElement={selectedElement}
              />
            </div>
          )}

          {activeTab === 'report' && (
            <SummaryReport result={simulationResult} model={currentModel} />
          )}

          {activeTab === 'sensitivity' && (
            <div className="space-y-4">
              <ParameterAdjuster
                rainMultiplier={params.rainMultiplier}
                impervMultiplier={params.impervMultiplier}
                manningMultiplier={params.manningMultiplier}
                diameterMultiplier={params.diameterMultiplier}
                onChangeParams={setParams}
              />
              <HydrographChart
                result={simulationResult}
                model={currentModel}
                currentStepIndex={currentStepIndex}
                onSeekStep={setCurrentStepIndex}
                selectedElement={selectedElement}
              />
            </div>
          )}

          {activeTab === 'theory' && <TheoryGuide />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          EPA Stormwater Management Model (SWMM 5.2) — Dynamic Hydrology & Hydraulic Water Quality Simulation Model.
        </p>
      </footer>

      {/* INP Viewer & Editor Modal */}
      <InpViewerModal
        model={currentModel}
        isOpen={showInpModal}
        onClose={() => setShowInpModal(false)}
        onApplyINP={handleApplyINP}
      />
    </div>
  );
}

export default App;
