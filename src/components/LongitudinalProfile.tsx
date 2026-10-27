import React from 'react';
import { SWMMModel, TimeStepResult, ConduitLink, JunctionNode } from '../types/swmm';
import { Activity, AlertCircle } from 'lucide-react';

interface LongitudinalProfileProps {
  model: SWMMModel;
  currentStep?: TimeStepResult;
}

export const LongitudinalProfile: React.FC<LongitudinalProfileProps> = ({ model, currentStep }) => {
  // Find a continuous profile path through conduits from an upstream node to an outfall
  const outfall = model.nodes.find(n => n.type === 'OUTFALL');
  if (!outfall) return null;

  // Trace upstream from outfall
  const pathNodes: string[] = [outfall.id];
  let curr = outfall.id;
  while (true) {
    const incomingLink = model.links.find(l => l.toNode === curr && l.type === 'CONDUIT');
    if (!incomingLink) break;
    pathNodes.unshift(incomingLink.fromNode);
    curr = incomingLink.fromNode;
  }

  // Get nodes and links along path
  const nodesOnPath = pathNodes.map(id => model.nodes.find(n => n.id === id)!).filter(Boolean);
  const linksOnPath: ConduitLink[] = [];
  for (let i = 0; i < nodesOnPath.length - 1; i++) {
    const link = model.links.find(
      l => l.fromNode === nodesOnPath[i].id && l.toNode === nodesOnPath[i + 1].id
    ) as ConduitLink;
    if (link) linksOnPath.push(link);
  }

  if (nodesOnPath.length < 2) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center text-slate-400">
        No continuous conduit profile path identified for longitudinal plotting.
      </div>
    );
  }

  // Calculate cumulative stationing along profile
  const stations: number[] = [0];
  for (let i = 0; i < linksOnPath.length; i++) {
    stations.push(stations[i] + (linksOnPath[i]?.length || 400));
  }
  const totalLength = stations[stations.length - 1] || 1000;

  // Find min and max elevations
  let minElev = Infinity;
  let maxElev = -Infinity;
  nodesOnPath.forEach(n => {
    const maxD = (n as JunctionNode).maxDepth || 6.0;
    const invert = n.invertElev;
    const rim = invert + maxD;
    if (invert < minElev) minElev = invert;
    if (rim > maxElev) maxElev = rim;
  });
  minElev = Math.floor(minElev - 2);
  maxElev = Math.ceil(maxElev + 4);
  const elevRange = Math.max(10, maxElev - minElev);

  // SVG dimensions
  const svgWidth = 850;
  const svgHeight = 260;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const getX = (station: number) => padLeft + (station / totalLength) * plotWidth;
  const getY = (elev: number) => padTop + plotHeight - ((elev - minElev) / elevRange) * plotHeight;

  // Generate ground surface path
  const groundPoints = nodesOnPath.map((n, i) => {
    const rim = n.invertElev + ((n as JunctionNode).maxDepth || 6.0);
    return `${getX(stations[i])},${getY(rim)}`;
  }).join(' ');

  // Generate water surface path (HGL)
  const hglPoints = nodesOnPath.map((n, i) => {
    const depth = currentStep?.nodeResults[n.id]?.depth || 0;
    const waterElev = n.invertElev + depth;
    return `${getX(stations[i])},${getY(waterElev)}`;
  }).join(' ');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-slate-100 text-sm">
            Longitudinal Hydraulic Grade Line (HGL) Profile
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {nodesOnPath[0].id} → {nodesOnPath[nodesOnPath.length - 1].id} (Total: {totalLength.toFixed(0)} ft)
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-amber-500 inline-block" />
            <span>Ground Rim</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-cyan-400 inline-block shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            <span className="text-cyan-300 font-semibold">Water Surface (HGL)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 bg-slate-600 inline-block" />
            <span>Conduit Invert/Crown</span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[700px] h-[260px]">
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const elev = minElev + frac * elevRange;
            const y = getY(elev);
            return (
              <g key={`y-grid-${idx}`}>
                <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="rgba(51, 65, 85, 0.3)" strokeDasharray="3 3" />
                <text x={padLeft - 8} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end" className="font-mono">
                  {elev.toFixed(1)}'
                </text>
              </g>
            );
          })}

          {/* Conduit Bodies (Invert & Crown) */}
          {linksOnPath.map((link, i) => {
            const nFrom = nodesOnPath[i];
            const nTo = nodesOnPath[i + 1];
            const x1 = getX(stations[i]);
            const x2 = getX(stations[i + 1]);

            const invert1 = nFrom.invertElev + link.inletOffset;
            const invert2 = nTo.invertElev + link.outletOffset;
            const crown1 = invert1 + link.geom1;
            const crown2 = invert2 + link.geom1;

            const yInv1 = getY(invert1);
            const yInv2 = getY(invert2);
            const yCr1 = getY(crown1);
            const yCr2 = getY(crown2);

            return (
              <g key={`cond-profile-${link.id}`}>
                {/* Pipe Fill */}
                <polygon
                  points={`${x1},${yInv1} ${x2},${yInv2} ${x2},${yCr2} ${x1},${yCr1}`}
                  fill="rgba(30, 41, 59, 0.65)"
                  stroke="rgba(100, 116, 139, 0.5)"
                  strokeWidth="1.5"
                />
                {/* Conduit Label */}
                <text
                  x={(x1 + x2) / 2}
                  y={(yInv1 + yInv2) / 2 - 4}
                  fill="#94a3b8"
                  fontSize="9"
                  textAnchor="middle"
                  className="font-mono"
                >
                  {link.id} (Ø{link.geom1}')
                </text>
              </g>
            );
          })}

          {/* Ground Surface Line */}
          <polyline
            points={groundPoints}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="4 2"
          />

          {/* Dynamic Water Surface (HGL) */}
          <polyline
            points={hglPoints}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Junction Vertical Wells */}
          {nodesOnPath.map((n, i) => {
            const x = getX(stations[i]);
            const invert = n.invertElev;
            const rim = invert + ((n as JunctionNode).maxDepth || 6.0);
            const depth = currentStep?.nodeResults[n.id]?.depth || 0;
            const waterY = getY(invert + depth);
            const isSurcharged = depth >= ((n as JunctionNode).maxDepth || 6.0);

            return (
              <g key={`node-well-${n.id}`}>
                {/* Well Shaft */}
                <line
                  x1={x}
                  y1={getY(rim)}
                  x2={x}
                  y2={getY(invert)}
                  stroke="#475569"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Water Column in Well */}
                <line
                  x1={x}
                  y1={waterY}
                  x2={x}
                  y2={getY(invert)}
                  stroke={isSurcharged ? '#f43f5e' : '#38bdf8'}
                  strokeWidth="5"
                  className="transition-all duration-200"
                />
                {/* Node Top Rim Mark */}
                <line x1={x - 6} y1={getY(rim)} x2={x + 6} y2={getY(rim)} stroke="#f59e0b" strokeWidth="2.5" />
                {/* Label */}
                <text x={x} y={svgHeight - 12} fill="#cbd5e1" fontSize="10" textAnchor="middle" fontWeight="bold">
                  {n.id}
                </text>
                <text x={x} y={svgHeight - 2} fill="#64748b" fontSize="8.5" textAnchor="middle" className="font-mono">
                  {stations[i].toFixed(0)}'
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
