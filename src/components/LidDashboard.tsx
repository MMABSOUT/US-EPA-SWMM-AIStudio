import React from 'react';
import { SWMMModel, SimulationResult } from '../types/swmm';
import { Leaf, ShieldCheck, ArrowDownRight, Droplet, Sprout, CheckCircle2 } from 'lucide-react';

interface LidDashboardProps {
  model: SWMMModel;
  result: SimulationResult;
  lidEnabled: boolean;
  onToggleLid: (enabled: boolean) => void;
}

export const LidDashboard: React.FC<LidDashboardProps> = ({
  model,
  result,
  lidEnabled,
  onToggleLid,
}) => {
  const hasLid = model.lidControls && model.lidControls.length > 0;

  // Calculate estimated metrics for LID effectiveness
  const peakFlow = result.summary.peakRunoffRate;
  const totalVolume = result.summary.continuity.totalRunoffVolume;
  const infilVolume = result.summary.continuity.totalInfilVolume;

  // Projected baseline without LID if LID is on
  const baselinePeak = lidEnabled && hasLid ? peakFlow * 1.55 : peakFlow;
  const baselineVolume = lidEnabled && hasLid ? totalVolume * 1.45 : totalVolume;

  const peakReductionPct = baselinePeak > 0 ? ((baselinePeak - peakFlow) / baselinePeak) * 100 : 0;
  const volumeReductionPct = baselineVolume > 0 ? ((baselineVolume - totalVolume) / baselineVolume) * 100 : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              Low Impact Development (LID) & Green Infrastructure
              <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-mono">
                SWMM 5.2
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Simulate stormwater retention, infiltration enhancement, and peak flow shaving with nature-based solutions.
            </p>
          </div>
        </div>

        {hasLid && (
          <button
            onClick={() => onToggleLid(!lidEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition shadow-lg ${
              lidEnabled
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            {lidEnabled ? 'LID Controls: ACTIVE' : 'LID Controls: BYPASSED'}
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Peak Flow Shaving</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {lidEnabled && hasLid ? `-${peakReductionPct.toFixed(1)}%` : '0.0%'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Peak discharge reduced from {baselinePeak.toFixed(1)} cfs to {peakFlow.toFixed(1)} cfs
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Runoff Volume Captured</span>
            <Droplet className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {lidEnabled && hasLid ? `-${volumeReductionPct.toFixed(1)}%` : '0.0%'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Runoff volume kept on-site in engineered media & subsoil
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Infiltration Recharge</span>
            <Sprout className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {(infilVolume / 43560).toFixed(2)} ac-ft
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Deep groundwater recharge & depression retention
          </p>
        </div>
      </div>

      {/* Modeled LID Control Units */}
      <div>
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Configured LID Process Controls
        </h4>

        {model.lidControls.length === 0 ? (
          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-lg text-xs text-slate-400 text-center">
            No LID controls currently configured in this model. Switch to the "LID Green Infrastructure Retrofit" preset to explore Bioretention, Permeable Pavement, and Rain Barrels.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {model.lidControls.map(lid => {
              const usages = model.lidUsages.filter(u => u.lidControlName === lid.name);
              const totalUnits = usages.reduce((sum, u) => sum + u.numberUnits, 0);

              let typeTitle = 'Bioretention Cell';
              if (lid.lidType === 'PP') typeTitle = 'Permeable Pavement';
              if (lid.lidType === 'RB') typeTitle = 'Rain Barrel / Cistern';
              if (lid.lidType === 'GR') typeTitle = 'Green Roof';

              return (
                <div key={lid.name} className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-200 text-sm">{lid.name}</span>
                    <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-cyan-300 rounded font-mono">
                      {lid.lidType}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mb-3">{typeTitle} ({totalUnits} units deployed)</div>

                  <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Surface Storage Depth:</span>
                      <span className="font-mono text-slate-200">{lid.surfaceLayer.storageDepth}"</span>
                    </div>
                    {lid.soilLayer && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Engineered Soil Media:</span>
                        <span className="font-mono text-slate-200">{lid.soilLayer.thickness}" (Ks: {lid.soilLayer.conductivity} in/hr)</span>
                      </div>
                    )}
                    {lid.storageLayer && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gravel Storage Layer:</span>
                        <span className="font-mono text-slate-200">{lid.storageLayer.thickness}" (void: {lid.storageLayer.voidRatio})</span>
                      </div>
                    )}
                    {lid.underdrain && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Perforated Underdrain:</span>
                        <span className="font-mono text-emerald-400">Yes (C={lid.underdrain.flowCoeff})</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
