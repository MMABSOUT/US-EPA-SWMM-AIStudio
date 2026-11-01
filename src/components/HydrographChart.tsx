import React, { useState, useMemo } from 'react';
import { SimulationResult, SWMMModel } from '../types/swmm';
import { CloudRain, TrendingUp, Filter } from 'lucide-react';

interface HydrographChartProps {
  result: SimulationResult;
  model: SWMMModel;
  currentStepIndex: number;
  onSeekStep: (stepIndex: number) => void;
  selectedElement: { type: 'NODE' | 'LINK' | 'SUBCATCHMENT'; id: string } | null;
}

// Chart dimensions (fixed)
const SVG_WIDTH = 850;
const SVG_HEIGHT = 270;
const PAD_LEFT = 55;
const PAD_RIGHT = 50;
const PAD_TOP = 30;
const PAD_BOTTOM = 35;
const PLOT_WIDTH = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

export const HydrographChart: React.FC<HydrographChartProps> = ({
  result,
  currentStepIndex,
  onSeekStep,
  selectedElement,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const steps = result.steps;
  if (!steps || steps.length === 0) return null;

  // ⚡ Bolt Optimization: Memoize scale calculations and SVG path generation.
  // During simulation playback (updating currentStepIndex at up to ~50 FPS) or mouse hovering,
  // recomputing maxFlow/maxRain, mapping across hundreds of steps, and building large SVG path
  // strings on every tick creates noticeable GC pressure and frame stutter. Memoizing keyed on
  // [steps, selectedElement?.type, selectedElement?.id] ensures this heavy work runs only when
  // the simulation dataset or inspected element changes.
  const { maxFlow, maxRain, runoffPath, outflowPath, selectedPath } = useMemo(() => {
    let computedMaxFlow = 0;
    let computedMaxRain = 0;

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.totalRunoff > computedMaxFlow) computedMaxFlow = s.totalRunoff;
      if (s.totalOutflow > computedMaxFlow) computedMaxFlow = s.totalOutflow;
      if (s.rainfallRate > computedMaxRain) computedMaxRain = s.rainfallRate;

      if (selectedElement?.type === 'LINK') {
        const lf = s.linkResults[selectedElement.id]?.flow || 0;
        if (lf > computedMaxFlow) computedMaxFlow = lf;
      } else if (selectedElement?.type === 'NODE') {
        const nf = s.nodeResults[selectedElement.id]?.inflow || 0;
        if (nf > computedMaxFlow) computedMaxFlow = nf;
      }
    }

    const flowBound = Math.max(5, Math.ceil(computedMaxFlow * 1.2));
    const rainBound = Math.max(1, Math.ceil(computedMaxRain * 1.5));

    const getXCoord = (idx: number) => PAD_LEFT + (idx / (steps.length - 1)) * PLOT_WIDTH;
    const getYFlowCoord = (flow: number) => PAD_TOP + PLOT_HEIGHT - (flow / flowBound) * PLOT_HEIGHT;

    // Runoff Path
    const computedRunoffPath = steps
      .map((s, idx) => `${idx === 0 ? 'M' : 'L'} ${getXCoord(idx)} ${getYFlowCoord(s.totalRunoff)}`)
      .join(' ');

    // Outflow Path
    const computedOutflowPath = steps
      .map((s, idx) => `${idx === 0 ? 'M' : 'L'} ${getXCoord(idx)} ${getYFlowCoord(s.totalOutflow)}`)
      .join(' ');

    // Selected element path
    let computedSelectedPath = '';
    if (selectedElement?.type === 'LINK') {
      computedSelectedPath = steps
        .map((s, idx) => `${idx === 0 ? 'M' : 'L'} ${getXCoord(idx)} ${getYFlowCoord(s.linkResults[selectedElement.id]?.flow || 0)}`)
        .join(' ');
    } else if (selectedElement?.type === 'NODE') {
      computedSelectedPath = steps
        .map((s, idx) => `${idx === 0 ? 'M' : 'L'} ${getXCoord(idx)} ${getYFlowCoord(s.nodeResults[selectedElement.id]?.inflow || 0)}`)
        .join(' ');
    } else if (selectedElement?.type === 'SUBCATCHMENT') {
      computedSelectedPath = steps
        .map((s, idx) => `${idx === 0 ? 'M' : 'L'} ${getXCoord(idx)} ${getYFlowCoord(s.subcatchmentResults[selectedElement.id]?.runoff || 0)}`)
        .join(' ');
    }

    return {
      maxFlow: flowBound,
      maxRain: rainBound,
      runoffPath: computedRunoffPath,
      outflowPath: computedOutflowPath,
      selectedPath: computedSelectedPath,
    };
  }, [steps, selectedElement?.type, selectedElement?.id]);

  const svgWidth = SVG_WIDTH;
  const svgHeight = SVG_HEIGHT;
  const padLeft = PAD_LEFT;
  const padRight = PAD_RIGHT;
  const padTop = PAD_TOP;
  const padBottom = PAD_BOTTOM;
  const plotWidth = PLOT_WIDTH;
  const plotHeight = PLOT_HEIGHT;

  const getX = (idx: number) => padLeft + (idx / (steps.length - 1)) * plotWidth;
  const getYFlow = (flow: number) => padTop + plotHeight - (flow / maxFlow) * plotHeight;
  const getYRain = (rain: number) => padTop + (rain / maxRain) * (plotHeight * 0.4); // top downward

  // Active step marker position
  const activeX = getX(currentStepIndex);

  const displayStep = hoverIndex !== null ? steps[hoverIndex] : steps[currentStepIndex];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      {/* Chart Header & Live Readout */}
      <div className="flex flex-wrap items-center justify-between mb-3 border-b border-slate-800 pb-2 gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <h3 className="font-semibold text-slate-100 text-sm">
            Hydrology & Hydraulic Routing Hydrograph
          </h3>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-blue-500/60 rounded-xs inline-block" />
            <span className="text-slate-300">Rainfall (in/hr)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-cyan-400 rounded-full inline-block" />
            <span className="text-cyan-300 font-semibold">Total Runoff (cfs)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-emerald-400 rounded-full inline-block" />
            <span className="text-emerald-300 font-semibold">Outfall Discharge (cfs)</span>
          </div>
          {selectedElement && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-amber-400 rounded-full inline-block" />
              <span className="text-amber-300 font-bold">{selectedElement.id} Flow (cfs)</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[700px] h-[270px] select-none cursor-crosshair"
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) * (svgWidth / rect.width);
            const rawIdx = Math.round(((relX - padLeft) / plotWidth) * (steps.length - 1));
            if (rawIdx >= 0 && rawIdx < steps.length) {
              setHoverIndex(rawIdx);
            }
          }}
          onMouseLeave={() => setHoverIndex(null)}
          onClick={() => {
            if (hoverIndex !== null) onSeekStep(hoverIndex);
          }}
        >
          {/* Grid lines (Flow) */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const flow = frac * maxFlow;
            const y = getYFlow(flow);
            return (
              <g key={`flow-grid-${idx}`}>
                <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="rgba(51, 65, 85, 0.3)" strokeDasharray="3 3" />
                <text x={padLeft - 8} y={y + 3.5} fill="#64748b" fontSize="9.5" textAnchor="end" className="font-mono">
                  {flow.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Right Y-Axis: Rainfall rate */}
          {[0, 0.5, 1.0].map((frac, idx) => {
            const rain = frac * maxRain;
            const y = getYRain(rain);
            return (
              <text key={`rain-y-${idx}`} x={svgWidth - padRight + 8} y={y + 3.5} fill="#3b82f6" fontSize="9" className="font-mono">
                {rain.toFixed(1)} in/h
              </text>
            );
          })}

          {/* Rainfall Hyetograph Bars (Inverted from top) */}
          {steps.map((s, idx) => {
            if (s.rainfallRate <= 0.01) return null;
            const x = getX(idx) - 2;
            const h = (s.rainfallRate / maxRain) * (plotHeight * 0.4);
            return (
              <rect
                key={`rain-bar-${idx}`}
                x={x}
                y={padTop}
                width="4"
                height={h}
                fill="rgba(59, 130, 246, 0.45)"
                stroke="rgba(96, 165, 250, 0.7)"
                strokeWidth="0.5"
              />
            );
          })}

          {/* Runoff Hydrograph (Cyan) */}
          <path d={runoffPath} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />

          {/* Outfall Hydrograph (Emerald) */}
          <path d={outflowPath} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />

          {/* Selected element Hydrograph (Amber) */}
          {selectedPath && (
            <path d={selectedPath} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="3 1" strokeLinecap="round" />
          )}

          {/* Time ticks on X-Axis */}
          {steps.map((s, idx) => {
            if (idx % 15 !== 0 && idx !== steps.length - 1) return null;
            const x = getX(idx);
            return (
              <g key={`time-tick-${idx}`}>
                <line x1={x} y1={padTop + plotHeight} x2={x} y2={padTop + plotHeight + 4} stroke="#475569" />
                <text x={x} y={padTop + plotHeight + 16} fill="#94a3b8" fontSize="9.5" textAnchor="middle" className="font-mono">
                  {s.timeStr}
                </text>
              </g>
            );
          })}

          {/* Active Simulation Scrubber Line */}
          <line
            x1={activeX}
            y1={padTop}
            x2={activeX}
            y2={padTop + plotHeight}
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
          <circle cx={activeX} cy={getYFlow(steps[currentStepIndex]?.totalRunoff || 0)} r="4" fill="#22d3ee" stroke="#ffffff" strokeWidth="1.5" />

          {/* Hover Scrubber Line */}
          {hoverIndex !== null && hoverIndex !== currentStepIndex && (
            <line
              x1={getX(hoverIndex)}
              y1={padTop}
              x2={getX(hoverIndex)}
              y2={padTop + plotHeight}
              stroke="rgba(251, 191, 36, 0.6)"
              strokeWidth="1"
            />
          )}
        </svg>

        {/* Hover / Current Tooltip Readout */}
        {displayStep && (
          <div className="absolute top-2 left-16 bg-slate-950/90 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs flex items-center gap-4 text-slate-300 shadow-xl pointer-events-none font-mono">
            <div>
              <span className="text-slate-400">Time:</span> <span className="font-bold text-white">{displayStep.timeStr}</span>
            </div>
            <div>
              <span className="text-blue-400">Rain:</span> <span className="text-white">{displayStep.rainfallRate} in/hr</span>
            </div>
            <div>
              <span className="text-cyan-400">Runoff:</span> <span className="font-bold text-cyan-300">{displayStep.totalRunoff} cfs</span>
            </div>
            <div>
              <span className="text-emerald-400">Outflow:</span> <span className="font-bold text-emerald-300">{displayStep.totalOutflow} cfs</span>
            </div>
            {selectedElement && (
              <div>
                <span className="text-amber-400">{selectedElement.id}:</span>{' '}
                <span className="font-bold text-amber-300">
                  {selectedElement.type === 'LINK'
                    ? displayStep.linkResults[selectedElement.id]?.flow ?? 0
                    : selectedElement.type === 'NODE'
                    ? displayStep.nodeResults[selectedElement.id]?.inflow ?? 0
                    : displayStep.subcatchmentResults[selectedElement.id]?.runoff ?? 0}{' '}
                  cfs
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
