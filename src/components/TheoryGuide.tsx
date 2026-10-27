import React from 'react';
import { BookOpen, Layers, Droplets, GitFork, Cpu } from 'lucide-react';

export const TheoryGuide: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6 text-slate-300 text-sm leading-relaxed">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-100 text-base">
            EPA SWMM 5.2 Technical Reference & Governing Equations
          </h3>
          <p className="text-xs text-slate-400">
            Official US EPA Water Infrastructure Division Computational Formulation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Surface Runoff Formulation */}
        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wide">
            <Droplets className="w-4 h-4" />
            <span>1. Overland Surface Runoff (Nonlinear Reservoir)</span>
          </div>
          <p className="text-xs text-slate-400">
            Each subcatchment is conceptualized as a rectangular nonlinear reservoir with uniform slope $S$ and width $W$. Inflow is net precipitation ($i - f - e$) and outflow is overland runoff ($q$).
          </p>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded font-mono text-xs text-cyan-200">
            q = (1.49 / n) · W · (d - ds)^(5/3) · S^(1/2)
          </div>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li><strong className="text-slate-300">W:</strong> Subcatchment overland drainage width (ft)</li>
            <li><strong className="text-slate-300">d:</strong> Water depth over subcatchment surface (ft)</li>
            <li><strong className="text-slate-300">ds:</strong> Depression storage capacity (ft)</li>
            <li><strong className="text-slate-300">n:</strong> Surface Manning roughness coefficient</li>
          </ul>
        </div>

        {/* Section 2: Infiltration Models */}
        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs uppercase tracking-wide">
            <Layers className="w-4 h-4" />
            <span>2. Infiltration (Horton & Green-Ampt)</span>
          </div>
          <p className="text-xs text-slate-400">
            Horton's model assumes soil infiltration capacity decays exponentially from initial maximum $f_0$ to equilibrium minimum $f_c$ over storm duration:
          </p>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded font-mono text-xs text-sky-200">
            f(t) = fc + (f0 - fc) · exp(-k · t)
          </div>
          <p className="text-xs text-slate-400">
            Green-Ampt infiltration treats the soil as a saturated wetting front driven by capillary suction $\psi$ and hydraulic conductivity $K_s$:
          </p>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded font-mono text-xs text-sky-200">
            f = Ks · (1 + (d + ψ · Δθ) / F)
          </div>
        </div>

        {/* Section 3: 1D Conduit Hydraulic Routing */}
        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wide">
            <GitFork className="w-4 h-4" />
            <span>3. Saint-Venant 1D Flow Routing</span>
          </div>
          <p className="text-xs text-slate-400">
            SWMM solves the 1D Saint-Venant shallow water momentum and continuity equations along conduit links:
          </p>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded font-mono text-xs text-emerald-200">
            ∂A/∂t + ∂Q/∂x = 0  (Continuity)<br />
            ∂Q/∂t + ∂(Q²/A)/∂x + g·A·(∂H/∂x + Sf) = 0
          </div>
          <p className="text-xs text-slate-400">
            Under Kinematic Wave, friction slope balances bed slope ($S_f = S_0$). Under Dynamic Wave, full backwater effects, conduit pressurization, junction surcharge, and reverse flow are resolved.
          </p>
        </div>

        {/* Section 4: Low Impact Development (LID) */}
        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wide">
            <Cpu className="w-4 h-4" />
            <span>4. Low Impact Development (LID) Process</span>
          </div>
          <p className="text-xs text-slate-400">
            SWMM represents green infrastructure as multi-layered vertical soil-water control columns:
          </p>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li><strong className="text-slate-300">Surface Layer:</strong> Ponding depth, vegetation coverage, surface spill overflow.</li>
            <li><strong className="text-slate-300">Soil Layer:</strong> Porosity, field capacity, wilting point, unsaturated Darcy percolation.</li>
            <li><strong className="text-slate-300">Storage / Gravel Bed:</strong> Porous gravel void matrix retaining runoff for native subgrade exfiltration.</li>
            <li><strong className="text-slate-300">Perforated Underdrain:</strong> Flow rate $Q = C_d \cdot h^\eta$ conveying filtered water to storm sewer.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
