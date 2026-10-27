import React from 'react';
import { Sliders, RotateCcw } from 'lucide-react';

interface ParameterAdjusterProps {
  rainMultiplier: number;
  impervMultiplier: number;
  manningMultiplier: number;
  diameterMultiplier: number;
  onChangeParams: (params: {
    rainMultiplier: number;
    impervMultiplier: number;
    manningMultiplier: number;
    diameterMultiplier: number;
  }) => void;
}

export const ParameterAdjuster: React.FC<ParameterAdjusterProps> = ({
  rainMultiplier,
  impervMultiplier,
  manningMultiplier,
  diameterMultiplier,
  onChangeParams,
}) => {
  const handleReset = () => {
    onChangeParams({
      rainMultiplier: 1.0,
      impervMultiplier: 1.0,
      manningMultiplier: 1.0,
      diameterMultiplier: 1.0,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-slate-100 text-sm">
            What-If Scenario Sensitivity & Climate Stress Testing
          </h3>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Rainfall Intensity Multiplier */}
        <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400">Rainfall Multiplier</span>
            <span className="font-mono font-bold text-cyan-300">{rainMultiplier.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={rainMultiplier}
            onChange={e =>
              onChangeParams({
                rainMultiplier: parseFloat(e.target.value),
                impervMultiplier,
                manningMultiplier,
                diameterMultiplier,
              })
            }
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0.5x (Drizzle)</span>
            <span>1.0x</span>
            <span>3.0x (Extreme 100yr)</span>
          </div>
        </div>

        {/* Imperviousness Modifier */}
        <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400">Catchment Imperviousness</span>
            <span className="font-mono font-bold text-sky-300">{impervMultiplier.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.5"
            step="0.05"
            value={impervMultiplier}
            onChange={e =>
              onChangeParams({
                rainMultiplier,
                impervMultiplier: parseFloat(e.target.value),
                manningMultiplier,
                diameterMultiplier,
              })
            }
            className="w-full accent-sky-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>-80% (Greened)</span>
            <span>1.0x</span>
            <span>+50% (Paved)</span>
          </div>
        </div>

        {/* Pipe Diameter Scale */}
        <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400">Conduit Diameter Sizing</span>
            <span className="font-mono font-bold text-emerald-300">{diameterMultiplier.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="2.0"
            step="0.05"
            value={diameterMultiplier}
            onChange={e =>
              onChangeParams({
                rainMultiplier,
                impervMultiplier,
                manningMultiplier,
                diameterMultiplier: parseFloat(e.target.value),
              })
            }
            className="w-full accent-emerald-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>-25% (Constricted)</span>
            <span>1.0x</span>
            <span>2.0x (Upsized)</span>
          </div>
        </div>

        {/* Manning Roughness Multiplier */}
        <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400">Manning's Roughness (n)</span>
            <span className="font-mono font-bold text-amber-300">{manningMultiplier.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={manningMultiplier}
            onChange={e =>
              onChangeParams({
                rainMultiplier,
                impervMultiplier,
                manningMultiplier: parseFloat(e.target.value),
                diameterMultiplier,
              })
            }
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>Smooth (0.5x)</span>
            <span>1.0x</span>
            <span>Rough/Sediment (2.0x)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
