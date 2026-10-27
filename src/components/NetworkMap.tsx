import React, { useState, useRef } from 'react';
import { SWMMModel, TimeStepResult, SWMMNode, SWMMLink, Subcatchment } from '../types/swmm';
import { ZoomIn, ZoomOut, RotateCcw, Droplets, AlertTriangle, Layers, Info } from 'lucide-react';

interface NetworkMapProps {
  model: SWMMModel;
  currentStep?: TimeStepResult;
  selectedElement: { type: 'NODE' | 'LINK' | 'SUBCATCHMENT'; id: string } | null;
  onSelectElement: (element: { type: 'NODE' | 'LINK' | 'SUBCATCHMENT'; id: string } | null) => void;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  model,
  currentStep,
  selectedElement,
  onSelectElement,
}) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showSubcatchments, setShowSubcatchments] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'map-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-[520px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col select-none">
      {/* Top Map Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300 shadow-lg">
        <button
          onClick={() => setScale(s => Math.min(s + 0.2, 2.5))}
          className="p-1 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}
          className="p-1 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-3 w-px bg-slate-700 mx-1" />
        <button
          onClick={() => setShowSubcatchments(!showSubcatchments)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded transition ${
            showSubcatchments ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Catchments</span>
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`px-2 py-1 rounded transition ${
            showLabels ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          Labels
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 shadow-lg flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
          <span>Junction</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rotate-45 bg-emerald-400 inline-block shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          <span>Outfall</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 bg-amber-400/80 rounded-sm inline-block" />
          <span>Storage Pond</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
          <span>Surcharge / Flooded</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg
          id="map-bg"
          viewBox="0 0 1000 520"
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '50% 50%',
          }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.25)" strokeWidth="0.8" />
            </pattern>
            {/* Arrow marker for flow direction */}
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker
              id="arrow-full"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />
            </marker>
          </defs>

          {/* Background Grid */}
          <rect width="1000" height="520" fill="url(#grid)" />

          {/* Subcatchment Polygons */}
          {showSubcatchments &&
            model.subcatchments.map(sub => {
              const isSelected = selectedElement?.type === 'SUBCATCHMENT' && selectedElement.id === sub.id;
              const subRes = currentStep?.subcatchmentResults[sub.id];
              const runoff = subRes?.runoff || 0;
              const polyPoints = sub.polygon
                ? sub.polygon.map(pt => `${pt[0]},${pt[1]}`).join(' ')
                : '';

              return (
                <g key={`sub-${sub.id}`}>
                  {polyPoints && (
                    <polygon
                      points={polyPoints}
                      fill={
                        isSelected
                          ? 'rgba(6, 182, 212, 0.28)'
                          : runoff > 0.5
                          ? 'rgba(14, 165, 233, 0.18)'
                          : 'rgba(51, 65, 85, 0.12)'
                      }
                      stroke={isSelected ? '#22d3ee' : runoff > 0.5 ? '#38bdf8' : 'rgba(71, 85, 105, 0.4)'}
                      strokeWidth={isSelected ? '2' : '1'}
                      strokeDasharray="4 3"
                      className="transition-colors duration-300 cursor-pointer"
                      onClick={() => onSelectElement({ type: 'SUBCATCHMENT', id: sub.id })}
                    />
                  )}
                  {/* Drainage line from Subcatchment Center to Outlet Node */}
                  {(() => {
                    const outlet = model.nodes.find(n => n.id === sub.outletNodeId);
                    if (!outlet) return null;
                    return (
                      <line
                        x1={sub.center[0]}
                        y1={sub.center[1]}
                        x2={outlet.x}
                        y2={outlet.y}
                        stroke="rgba(148, 163, 184, 0.25)"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    );
                  })()}
                  {showLabels && (
                    <text
                      x={sub.center[0] - 15}
                      y={sub.center[1] - 8}
                      fill="#94a3b8"
                      fontSize="10"
                      fontWeight="600"
                      className="pointer-events-none"
                    >
                      {sub.id} ({sub.area} ac)
                    </text>
                  )}
                </g>
              );
            })}

          {/* Links (Conduits, Orifices, Weirs) */}
          {model.links.map(link => {
            const fromNode = model.nodes.find(n => n.id === link.fromNode);
            const toNode = model.nodes.find(n => n.id === link.toNode);
            if (!fromNode || !toNode) return null;

            const isSelected = selectedElement?.type === 'LINK' && selectedElement.id === link.id;
            const linkRes = currentStep?.linkResults[link.id];
            const capRatio = linkRes?.capacityRatio || 0;
            const flow = linkRes?.flow || 0;

            // Color coding based on capacity fullness
            let strokeColor = '#38bdf8';
            let strokeWidth = Math.max(3, Math.min(8, 3 + flow * 0.4));
            let marker = 'url(#arrow)';

            if (capRatio >= 1.0) {
              strokeColor = '#f43f5e'; // Surcharged red
              marker = 'url(#arrow-full)';
            } else if (capRatio >= 0.75) {
              strokeColor = '#fbbf24'; // Warning yellow
            } else if (flow <= 0.05) {
              strokeColor = '#475569'; // Dry/low flow
              strokeWidth = 2.5;
            }

            return (
              <g
                key={`link-${link.id}`}
                className="cursor-pointer group"
                onClick={() => onSelectElement({ type: 'LINK', id: link.id })}
              >
                {/* Glow hit area */}
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="transparent"
                  strokeWidth="20"
                />
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
                  markerEnd={marker}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
                {/* Midpoint link label */}
                {showLabels && (
                  <text
                    x={(fromNode.x + toNode.x) / 2}
                    y={(fromNode.y + toNode.y) / 2 - 8}
                    fill={isSelected ? '#38bdf8' : '#cbd5e1'}
                    fontSize="9.5"
                    fontWeight="600"
                    textAnchor="middle"
                    className="bg-slate-900 px-1"
                  >
                    {link.id} ({flow.toFixed(1)} cfs)
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes (Junctions, Outfalls, Storages) */}
          {model.nodes.map(node => {
            const isSelected = selectedElement?.type === 'NODE' && selectedElement.id === node.id;
            const nodeRes = currentStep?.nodeResults[node.id];
            const depth = nodeRes?.depth || 0;
            const flooding = nodeRes?.flooding || 0;
            const isFlooded = flooding > 0.1 || (node.type === 'JUNCTION' && depth >= node.maxDepth);

            return (
              <g
                key={`node-${node.id}`}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer transition-transform duration-200 hover:scale-125"
                onClick={() => onSelectElement({ type: 'NODE', id: node.id })}
              >
                {/* Surcharge pulsing alert aura */}
                {isFlooded && (
                  <circle
                    r="18"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    className="animate-ping opacity-75"
                  />
                )}

                {node.type === 'JUNCTION' && (
                  <circle
                    r={isSelected ? 9 : 7}
                    fill={isFlooded ? '#f43f5e' : isSelected ? '#38bdf8' : '#0284c7'}
                    stroke={isSelected ? '#ffffff' : '#0f172a'}
                    strokeWidth="2"
                    className="shadow-lg"
                  />
                )}

                {node.type === 'OUTFALL' && (
                  <polygon
                    points="0,-9 9,0 0,9 -9,0"
                    fill={isSelected ? '#34d399' : '#059669'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}

                {node.type === 'STORAGE' && (
                  <rect
                    x="-9"
                    y="-9"
                    width="18"
                    height="18"
                    rx="3"
                    fill={isSelected ? '#fbbf24' : '#d97706'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}

                {showLabels && (
                  <text
                    y="18"
                    fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                    className="pointer-events-none drop-shadow-md"
                  >
                    {node.id}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Element Quick Info Floating Box */}
      {selectedElement && (
        <div className="absolute top-14 right-3 z-20 w-64 bg-slate-900/95 backdrop-blur-md p-3.5 rounded-xl border border-cyan-500/30 text-xs shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              {selectedElement.type}: {selectedElement.id}
            </span>
            <button
              onClick={() => onSelectElement(null)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="mt-2 space-y-1.5 text-slate-300">
            {selectedElement.type === 'NODE' && (() => {
              const node = model.nodes.find(n => n.id === selectedElement.id);
              const res = currentStep?.nodeResults[selectedElement.id];
              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type:</span>
                    <span className="font-semibold text-slate-200">{node?.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Invert Elevation:</span>
                    <span>{node?.invertElev.toFixed(2)} ft</span>
                  </div>
                  {node?.type === 'JUNCTION' && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Depth:</span>
                      <span>{node.maxDepth.toFixed(2)} ft</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Depth:</span>
                    <span className="font-bold text-cyan-300">{res?.depth.toFixed(2) || '0.00'} ft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Inflow:</span>
                    <span className="font-bold text-sky-400">{res?.inflow.toFixed(2) || '0.00'} cfs</span>
                  </div>
                  {res && res.flooding > 0.05 && (
                    <div className="flex justify-between text-rose-400 font-bold bg-rose-950/40 p-1 rounded">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Surcharge Flooding:
                      </span>
                      <span>{res.flooding.toFixed(2)} cfs</span>
                    </div>
                  )}
                </>
              );
            })()}

            {selectedElement.type === 'LINK' && (() => {
              const link = model.links.find(l => l.id === selectedElement.id);
              const res = currentStep?.linkResults[selectedElement.id];
              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nodes:</span>
                    <span>{link?.fromNode} → {link?.toNode}</span>
                  </div>
                  {link?.type === 'CONDUIT' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Diameter / Geom:</span>
                        <span>{link.geom1.toFixed(2)} ft ({link.shape})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Length & Roughness:</span>
                        <span>{link.length} ft (n={link.roughness})</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Discharge Flow:</span>
                    <span className="font-bold text-cyan-300">{res?.flow.toFixed(2) || '0.00'} cfs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Flow Velocity:</span>
                    <span>{res?.velocity.toFixed(2) || '0.00'} fps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fullness Ratio (y/D):</span>
                    <span className={`font-semibold ${
                      (res?.capacityRatio || 0) >= 1.0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {((res?.capacityRatio || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </>
              );
            })()}

            {selectedElement.type === 'SUBCATCHMENT' && (() => {
              const sub = model.subcatchments.find(s => s.id === selectedElement.id);
              const res = currentStep?.subcatchmentResults[selectedElement.id];
              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Drainage Outlet:</span>
                    <span className="text-cyan-300 font-semibold">{sub?.outletNodeId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Area:</span>
                    <span>{sub?.area} acres ({sub?.percentImperv}% Imperv)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rainfall Rate:</span>
                    <span>{res?.rainfall.toFixed(2) || '0.00'} in/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Runoff Flow:</span>
                    <span className="font-bold text-sky-400">{res?.runoff.toFixed(2) || '0.00'} cfs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Infil Loss:</span>
                    <span>{res?.losses.toFixed(2) || '0.00'} in/hr</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
