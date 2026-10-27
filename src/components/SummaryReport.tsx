import React from 'react';
import { SimulationResult, SWMMModel } from '../types/swmm';
import { FileText, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';

interface SummaryReportProps {
  result: SimulationResult;
  model: SWMMModel;
}

export const SummaryReport: React.FC<SummaryReportProps> = ({ result, model }) => {
  const { summary } = result;
  const cont = summary.continuity;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-100 text-base">
            EPA SWMM 5.2 Simulation Status Report
          </h3>
          <p className="text-xs text-slate-400">
            Official hydraulic and runoff mass balance continuity verification.
          </p>
        </div>
      </div>

      {/* Continuity Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Runoff Quantity Continuity */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Runoff Quantity Continuity
            </h4>
            <span className={`text-xs px-2 py-0.5 rounded font-mono ${
              Math.abs(cont.runoffContinuityError) < 1.0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              Error: {cont.runoffContinuityError.toFixed(2)}%
            </span>
          </div>

          <table className="w-full text-xs text-slate-300">
            <tbody>
              <tr className="border-b border-slate-800/60 py-1.5">
                <td className="py-1 text-slate-400">Total Precipitation</td>
                <td className="py-1 text-right font-mono text-slate-200">{(cont.totalPrecipVolume / 43560).toFixed(2)} ac-ft</td>
                <td className="py-1 text-right font-mono text-slate-400">({cont.totalPrecipVolume.toLocaleString()} ft³)</td>
              </tr>
              <tr className="border-b border-slate-800/60 py-1.5">
                <td className="py-1 text-slate-400">Infiltration Loss</td>
                <td className="py-1 text-right font-mono text-slate-200">{(cont.totalInfilVolume / 43560).toFixed(2)} ac-ft</td>
                <td className="py-1 text-right font-mono text-slate-400">({cont.totalInfilVolume.toLocaleString()} ft³)</td>
              </tr>
              <tr className="border-b border-slate-800/60 py-1.5">
                <td className="py-1 text-slate-400">Surface Runoff</td>
                <td className="py-1 text-right font-mono text-cyan-300 font-bold">{(cont.totalRunoffVolume / 43560).toFixed(2)} ac-ft</td>
                <td className="py-1 text-right font-mono text-cyan-400">({cont.totalRunoffVolume.toLocaleString()} ft³)</td>
              </tr>
              <tr>
                <td className="py-1.5 font-bold text-slate-200">Peak Runoff Rate</td>
                <td colSpan={2} className="py-1.5 text-right font-mono text-cyan-400 font-bold">
                  {summary.peakRunoffRate.toFixed(2)} cfs @ {summary.peakRunoffTime}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Flow Routing Continuity */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Flow Routing Continuity
            </h4>
            <span className={`text-xs px-2 py-0.5 rounded font-mono ${
              Math.abs(cont.routingContinuityError) < 1.0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              Error: {cont.routingContinuityError.toFixed(2)}%
            </span>
          </div>

          <table className="w-full text-xs text-slate-300">
            <tbody>
              <tr className="border-b border-slate-800/60 py-1.5">
                <td className="py-1 text-slate-400">Wet Weather Inflow</td>
                <td className="py-1 text-right font-mono text-slate-200">{(cont.routingTotalInflow / 43560).toFixed(2)} ac-ft</td>
                <td className="py-1 text-right font-mono text-slate-400">({cont.routingTotalInflow.toLocaleString()} ft³)</td>
              </tr>
              <tr className="border-b border-slate-800/60 py-1.5">
                <td className="py-1 text-slate-400">External Outflow</td>
                <td className="py-1 text-right font-mono text-emerald-300 font-bold">{(cont.routingTotalOutflow / 43560).toFixed(2)} ac-ft</td>
                <td className="py-1 text-right font-mono text-emerald-400">({cont.routingTotalOutflow.toLocaleString()} ft³)</td>
              </tr>
              <tr className="border-b border-slate-800/60 py-1.5">
                <td className="py-1 text-slate-400">Internal Storage</td>
                <td className="py-1 text-right font-mono text-slate-200">{(cont.routingFinalStorage / 43560).toFixed(2)} ac-ft</td>
                <td className="py-1 text-right font-mono text-slate-400">({cont.routingFinalStorage.toLocaleString()} ft³)</td>
              </tr>
              <tr>
                <td className="py-1.5 font-bold text-slate-200">Peak System Outflow</td>
                <td colSpan={2} className="py-1.5 text-right font-mono text-emerald-400 font-bold">
                  {summary.peakOutflowRate.toFixed(2)} cfs @ {summary.peakOutflowTime}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical Conduits Table */}
      <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3">
          Conduit Flow & Capacity Summary
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-900 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-2 px-3">Conduit ID</th>
                <th className="py-2 px-3">Peak Flow (cfs)</th>
                <th className="py-2 px-3">Peak Depth (ft)</th>
                <th className="py-2 px-3">Max Velocity (fps)</th>
                <th className="py-2 px-3">Hours Full</th>
                <th className="py-2 px-3">Capacity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {summary.criticalConduits.map(c => {
                const link = model.links.find(l => l.id === c.linkId);
                const isSurcharged = c.hoursFull > 0;
                return (
                  <tr key={c.linkId} className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 font-bold text-white">{c.linkId}</td>
                    <td className="py-2 px-3 text-cyan-300">{c.maxFlow.toFixed(2)}</td>
                    <td className="py-2 px-3">{c.maxDepth.toFixed(2)} / {link?.geom1.toFixed(1)}'</td>
                    <td className="py-2 px-3">{c.maxVelocity.toFixed(2)}</td>
                    <td className="py-2 px-3">{c.hoursFull.toFixed(2)} hr</td>
                    <td className="py-2 px-3">
                      {isSurcharged ? (
                        <span className="text-rose-400 flex items-center gap-1 font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Surcharged
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Adequate
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical Nodes Table */}
      <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3">
          Node Depth & Flooding Summary
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-900 text-slate-400 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-2 px-3">Node ID</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Max Depth (ft)</th>
                <th className="py-2 px-3">Flooded Volume (ft³)</th>
                <th className="py-2 px-3">Hours Flooded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {summary.criticalNodes.map(n => {
                const node = model.nodes.find(no => no.id === n.nodeId);
                const hasFlooding = n.floodingVolume > 0;
                return (
                  <tr key={n.nodeId} className="hover:bg-slate-900/40">
                    <td className="py-2 px-3 font-bold text-white">{n.nodeId}</td>
                    <td className="py-2 px-3 text-slate-400">{node?.type}</td>
                    <td className="py-2 px-3 text-cyan-300">{n.maxDepth.toFixed(2)}</td>
                    <td className={`py-2 px-3 ${hasFlooding ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      {n.floodingVolume > 0 ? n.floodingVolume.toLocaleString() : '0'}
                    </td>
                    <td className={`py-2 px-3 ${hasFlooding ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      {n.hoursFlooded.toFixed(2)} hr
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
