import {
  SWMMModel,
  SimulationResult,
  TimeStepResult,
  SimulationSummary,
  ContinuityReport,
  Subcatchment,
  ConduitLink,
  JunctionNode,
  StorageNode,
  OutfallNode,
  SWMMLink
} from '../types/swmm';

// Circular pipe hydraulic properties lookup approximation (SWMM tables)
function getCircularPipeProperties(depthRatio: number): { aRatio: number; rRatio: number; qRatio: number } {
  const y = Math.max(0, Math.min(1, depthRatio));
  if (y <= 0) return { aRatio: 0, rRatio: 0, qRatio: 0 };
  if (y >= 1) return { aRatio: 1, rRatio: 1, qRatio: 1 };

  // Theta angle from invert to free surface
  const theta = 2 * Math.acos(1 - 2 * y);
  const aRatio = (theta - Math.sin(theta)) / (2 * Math.PI);
  const pRatio = theta / (2 * Math.PI);
  const rRatio = pRatio > 0 ? aRatio / pRatio : 0;
  // Manning discharge ratio (Camp curve)
  const qRatio = aRatio * Math.pow(rRatio, 2 / 3);
  return { aRatio, rRatio, qRatio };
}

export function runSWMMSimulation(
  model: SWMMModel,
  paramOverrides?: {
    rainMultiplier?: number;
    impervMultiplier?: number;
    manningMultiplier?: number;
    diameterMultiplier?: number;
  }
): SimulationResult {
  const rainMult = paramOverrides?.rainMultiplier ?? 1.0;
  const impervMult = paramOverrides?.impervMultiplier ?? 1.0;
  const nMult = paramOverrides?.manningMultiplier ?? 1.0;
  const geomMult = paramOverrides?.diameterMultiplier ?? 1.0;

  // Determine simulation duration from timeseries or options
  const defaultTimeseries = model.timeSeries[0] || { entries: [] };
  const maxSeriesHour = defaultTimeseries.entries.length > 0
    ? defaultTimeseries.entries[defaultTimeseries.entries.length - 1].timeHour + 1
    : 6;
  const durationHours = Math.max(6, Math.ceil(maxSeriesHour));

  const dtMinutes = 2.0; // 2 min simulation step for smooth hydrograph curves
  const dtHours = dtMinutes / 60.0;
  const dtSeconds = dtMinutes * 60.0;
  const totalSteps = Math.floor(durationHours / dtHours);

  // Rain lookup helper
  function getRainRate(timeHr: number, gageId: string): number {
    const gage = model.rainGages.find(g => g.id === gageId) || model.rainGages[0];
    const ts = model.timeSeries.find(t => t.name === (gage?.seriesName || '')) || defaultTimeseries;
    if (!ts || ts.entries.length === 0) return 0;

    // Linear interpolation between entries
    for (let i = 0; i < ts.entries.length; i++) {
      const cur = ts.entries[i];
      const next = ts.entries[i + 1];
      if (timeHr < cur.timeHour) {
        if (i === 0) return cur.value * rainMult;
        const prev = ts.entries[i - 1];
        const frac = (timeHr - prev.timeHour) / (cur.timeHour - prev.timeHour);
        return (prev.value + frac * (cur.value - prev.value)) * rainMult;
      }
      if (next && timeHr >= cur.timeHour && timeHr <= next.timeHour) {
        const frac = (timeHr - cur.timeHour) / (next.timeHour - cur.timeHour);
        return (cur.value + frac * (next.value - cur.value)) * rainMult;
      }
    }
    return 0;
  }

  // State trackers across time
  // Subcatchment depression storage depths (inches)
  const subDepthImperv: { [id: string]: number } = {};
  const subDepthPerv: { [id: string]: number } = {};
  const subInfilCapacity: { [id: string]: number } = {};
  const subPollutantMass: { [id: string]: number } = {}; // mg of TSS

  // Node stored depths (ft) and ponded volumes (cu ft)
  const nodeDepth: { [id: string]: number } = {};
  const nodeFloodedVol: { [id: string]: number } = {};
  const nodeFloodedHours: { [id: string]: number } = {};

  // Link flows (cfs)
  const linkFlowPrev: { [id: string]: number } = {};
  const linkHoursFull: { [id: string]: number } = {};

  // Initialize
  model.subcatchments.forEach(sub => {
    subDepthImperv[sub.id] = 0;
    subDepthPerv[sub.id] = 0;
    subInfilCapacity[sub.id] = sub.maxInfilRate;
    subPollutantMass[sub.id] = 50.0 * sub.area; // initial buildup (50 kg/acre)
  });

  model.nodes.forEach(node => {
    nodeDepth[node.id] = (node.type === 'JUNCTION' || node.type === 'STORAGE') ? node.initDepth : 0;
    nodeFloodedVol[node.id] = 0;
    nodeFloodedHours[node.id] = 0;
  });

  model.links.forEach(link => {
    linkFlowPrev[link.id] = (link.type === 'CONDUIT') ? link.initFlow : 0;
    linkHoursFull[link.id] = 0;
  });

  // Volumes for Continuity Report (in cubic feet)
  let totalPrecipVolCuFt = 0;
  let totalInfilVolCuFt = 0;
  let totalRunoffVolCuFt = 0;
  let totalOutflowVolCuFt = 0;
  let totalFloodedVolCuFt = 0;

  const steps: TimeStepResult[] = [];
  let peakRunoff = 0;
  let peakRunoffTime = "00:00";
  let peakOutflow = 0;
  let peakOutflowTime = "00:00";

  // Pre-calculate conduit full flow capacity using Manning's equation
  const conduitCapacities: { [id: string]: { qFull: number; aFull: number; vFull: number; dFull: number } } = {};
  model.links.forEach(link => {
    if (link.type === 'CONDUIT') {
      const fromNode = model.nodes.find(n => n.id === link.fromNode);
      const toNode = model.nodes.find(n => n.id === link.toNode);
      const fromElev = fromNode ? fromNode.invertElev + link.inletOffset : 0;
      const toElev = toNode ? toNode.invertElev + link.outletOffset : 0;
      const drop = Math.max(0.001, fromElev - toElev);
      const slope = drop / Math.max(10, link.length);

      const d = link.geom1 * geomMult;
      const n = link.roughness * nMult;

      let aFull = 0;
      let rFull = 0;

      if (link.shape === 'CIRCULAR') {
        aFull = (Math.PI * d * d) / 4.0;
        const pFull = Math.PI * d;
        rFull = aFull / pFull;
      } else {
        // Box / Rectangular
        const w = (link.geom2 || link.geom1) * geomMult;
        aFull = d * w;
        const pFull = 2 * (d + w);
        rFull = aFull / pFull;
      }

      // Manning: Q = (1.49 / n) * A * R^(2/3) * S^(1/2)
      const qFull = (1.49 / n) * aFull * Math.pow(rFull, 2 / 3) * Math.sqrt(slope) * (link.barrels || 1);
      const vFull = aFull > 0 ? qFull / aFull : 0;

      conduitCapacities[link.id] = { qFull, aFull, vFull, dFull: d };
    }
  });

  // Time loop
  for (let stepIdx = 0; stepIdx <= totalSteps; stepIdx++) {
    const timeHours = stepIdx * dtHours;
    const hoursInt = Math.floor(timeHours);
    const minsInt = Math.floor((timeHours - hoursInt) * 60);
    const timeStr = `${String(hoursInt).padStart(2, '0')}:${String(minsInt).padStart(2, '0')}`;

    let stepRainRate = 0;
    let stepTotalRunoff = 0;
    let stepTotalInfil = 0;
    let stepTotalOutflow = 0;
    let stepStorageVol = 0;

    const subResults: TimeStepResult['subcatchmentResults'] = {};
    const nodeInflows: { [id: string]: number } = {};
    model.nodes.forEach(n => { nodeInflows[n.id] = 0; });

    // 1. Hydrology Step: Subcatchments
    model.subcatchments.forEach(sub => {
      const rainRate = getRainRate(timeHours, sub.rainGageId);
      stepRainRate = Math.max(stepRainRate, rainRate);

      const adjustedImperv = Math.min(100, Math.max(0, sub.percentImperv * impervMult));
      const fracImperv = adjustedImperv / 100.0;
      const fracPerv = 1.0 - fracImperv;
      const areaSqFt = sub.area * 43560.0; // acres to sq ft

      // Rain volume this step (cubic feet)
      const precipDepthFt = (rainRate / 12.0) * dtHours;
      const precipVolCuFt = precipDepthFt * areaSqFt;
      totalPrecipVolCuFt += precipVolCuFt;

      // Horton Infiltration Decay
      // f(t) = fc + (f0 - fc) * exp(-k * t)
      const f0 = sub.maxInfilRate;
      const fc = sub.minInfilRate;
      const decay = sub.decayRate;
      let infilRate = fc + (f0 - fc) * Math.exp(-decay * timeHours);
      // Infiltration occurs only if rain > 0 or ponded water on pervious area
      infilRate = Math.min(infilRate, rainRate + subDepthPerv[sub.id] * 12.0 / dtHours);
      const infilDepthFt = (infilRate / 12.0) * dtHours;
      const infilVolCuFt = infilDepthFt * (areaSqFt * fracPerv);
      totalInfilVolCuFt += infilVolCuFt;
      stepTotalInfil += infilRate * fracPerv;

      // Update surface depth on Impervious Area (in inches)
      // d_new = d_old + (rainRate - evap) * dt - runoff_depth
      let dImp = subDepthImperv[sub.id] + rainRate * dtHours;
      let excessImpInches = Math.max(0, dImp - sub.sImperv);
      let runoffImpCfs = 0;
      if (excessImpInches > 0) {
        // Manning overland flow: q = (1.49 / n) * W * (d_excess/12)^(5/3) * S^(1/2)
        const dFt = excessImpInches / 12.0;
        const slope = Math.max(0.001, sub.slope / 100.0);
        const wImp = sub.width * fracImperv;
        runoffImpCfs = (1.49 / (sub.nImperv * nMult)) * wImp * Math.pow(dFt, 5 / 3) * Math.sqrt(slope);
        // Constrain so we don't drain more than available excess
        const maxDrainCfs = (excessImpInches / 12.0 * areaSqFt * fracImperv) / dtSeconds;
        runoffImpCfs = Math.min(runoffImpCfs, maxDrainCfs);
        const drainInches = (runoffImpCfs * dtSeconds / (areaSqFt * fracImperv || 1)) * 12.0;
        dImp = Math.max(sub.sImperv, dImp - drainInches);
      }
      subDepthImperv[sub.id] = dImp;

      // Update surface depth on Pervious Area
      let dPerv = subDepthPerv[sub.id] + (rainRate - infilRate) * dtHours;
      let excessPervInches = Math.max(0, dPerv - sub.sPerv);
      let runoffPervCfs = 0;
      if (excessPervInches > 0) {
        const dFt = excessPervInches / 12.0;
        const slope = Math.max(0.001, sub.slope / 100.0);
        const wPerv = sub.width * fracPerv;
        runoffPervCfs = (1.49 / (sub.nPerv * nMult)) * wPerv * Math.pow(dFt, 5 / 3) * Math.sqrt(slope);
        const maxDrainCfs = (excessPervInches / 12.0 * areaSqFt * (fracPerv || 0.01)) / dtSeconds;
        runoffPervCfs = Math.min(runoffPervCfs, maxDrainCfs);
        const drainInches = (runoffPervCfs * dtSeconds / (areaSqFt * (fracPerv || 0.01))) * 12.0;
        dPerv = Math.max(sub.sPerv, dPerv - drainInches);
      }
      subDepthPerv[sub.id] = dPerv;

      let subRunoff = runoffImpCfs + runoffPervCfs;

      // Check for LID Controls applied to this subcatchment
      const lidUsages = model.lidUsages.filter(u => u.subcatchmentId === sub.id);
      let lidRetentionFraction = 0;
      if (lidUsages.length > 0) {
        // LID intercepts and retains a portion of impervious runoff
        lidUsages.forEach(usage => {
          const lidCtrl = model.lidControls.find(c => c.name === usage.lidControlName);
          const lidCapturePct = usage.fromImperv / 100.0;
          // Approximate retention efficiency based on LID type
          let efficiency = 0.65;
          if (lidCtrl?.lidType === 'BC') efficiency = 0.80; // Bioretention
          if (lidCtrl?.lidType === 'PP') efficiency = 0.70; // Permeable Pavement
          if (lidCtrl?.lidType === 'RB') efficiency = 0.50; // Rain Barrel
          if (lidCtrl?.lidType === 'GR') efficiency = 0.60; // Green Roof
          lidRetentionFraction += (fracImperv * lidCapturePct * efficiency);
        });
        subRunoff = Math.max(0, subRunoff * (1.0 - Math.min(0.85, lidRetentionFraction)));
      }

      stepTotalRunoff += subRunoff;
      totalRunoffVolCuFt += subRunoff * dtSeconds;

      // Water quality: TSS Pollutant washoff calculation
      // Exponential washoff: W = Cw * q^Ew * M
      let washoffRate = 0;
      if (subRunoff > 0.01 && subPollutantMass[sub.id] > 0) {
        const washoffCoeff = 0.05;
        const washoffExpon = 1.2;
        washoffRate = washoffCoeff * Math.pow(subRunoff, washoffExpon) * subPollutantMass[sub.id];
        const removedMass = washoffRate * dtHours;
        subPollutantMass[sub.id] = Math.max(0, subPollutantMass[sub.id] - removedMass);
      }

      subResults[sub.id] = {
        rainfall: rainRate,
        losses: infilRate * fracPerv,
        runoff: Math.round(subRunoff * 100) / 100,
        depth: Math.round(((dImp * fracImperv) + (dPerv * fracPerv)) * 100) / 100,
        pollutantWashoff: Math.round(washoffRate * 10) / 10,
      };

      // Direct runoff to outlet node
      if (sub.outletNodeId && nodeInflows[sub.outletNodeId] !== undefined) {
        nodeInflows[sub.outletNodeId] += subRunoff;
      }
    });

    if (stepTotalRunoff > peakRunoff) {
      peakRunoff = stepTotalRunoff;
      peakRunoffTime = timeStr;
    }

    // 2. Hydraulic Network Routing Step
    const linkResults: TimeStepResult['linkResults'] = {};
    const nodeResults: TimeStepResult['nodeResults'] = {};

    // Topological routing order from upstream to downstream
    model.links.forEach(link => {
      const upstreamInflow = nodeInflows[link.fromNode] || 0;
      const prevFlow = linkFlowPrev[link.id];
      const cap = conduitCapacities[link.id];

      let linkFlow = 0;
      let linkDepth = 0;
      let linkVelocity = 0;
      let capacityRatio = 0;

      if (link.type === 'CONDUIT' && cap) {
        // Kinematic wave routing with storage attenuation
        // Target flow aims for upstream inflow with conduit transit delay
        const transitDelay = Math.max(0.1, cap.vFull > 0 ? (link.length / cap.vFull) / dtSeconds : 1.0);
        const alpha = Math.min(1.0, 1.0 / (1.0 + transitDelay));
        linkFlow = prevFlow + alpha * (upstreamInflow - prevFlow);
        linkFlow = Math.max(0, linkFlow);

        capacityRatio = cap.qFull > 0 ? linkFlow / cap.qFull : 0;
        if (capacityRatio >= 0.98) {
          linkHoursFull[link.id] += dtHours;
        }

        // Estimate partial depth from Camp curve
        const flowRatio = Math.min(1.0, capacityRatio);
        const depthRatio = Math.pow(flowRatio, 0.6); // smooth approximation of Manning partial depth
        linkDepth = depthRatio * cap.dFull;

        const prop = getCircularPipeProperties(depthRatio);
        const actualArea = Math.max(0.01, prop.aRatio * cap.aFull);
        linkVelocity = actualArea > 0 ? Math.min(25, linkFlow / actualArea) : 0;

        linkFlowPrev[link.id] = linkFlow;

        // Discharge into downstream node
        if (nodeInflows[link.toNode] !== undefined) {
          nodeInflows[link.toNode] += linkFlow;
        }
      } else if (link.type === 'ORIFICE') {
        // Orifice flow: Q = Cd * A * sqrt(2 * g * h)
        const fromNode = model.nodes.find(n => n.id === link.fromNode);
        const head = fromNode ? Math.max(0, nodeDepth[link.fromNode] - link.offset) : 0;
        const area = (Math.PI * Math.pow(link.geom1 * geomMult, 2)) / 4.0;
        linkFlow = link.dischargeCoeff * area * Math.sqrt(2 * 32.2 * head);
        linkDepth = Math.min(link.geom1 * geomMult, head);
        linkVelocity = area > 0 ? linkFlow / area : 0;
        capacityRatio = Math.min(2.0, head / (link.geom1 || 1));
        if (nodeInflows[link.toNode] !== undefined) {
          nodeInflows[link.toNode] += linkFlow;
        }
      } else if (link.type === 'WEIR') {
        // Weir flow: Q = Cw * L * h^(3/2)
        const fromNode = model.nodes.find(n => n.id === link.fromNode);
        const head = fromNode ? Math.max(0, nodeDepth[link.fromNode] - link.crestHeight) : 0;
        linkFlow = link.dischargeCoeff * (link.geom1 * geomMult) * Math.pow(head, 1.5);
        linkDepth = head;
        linkVelocity = head > 0 ? linkFlow / (link.geom1 * head) : 0;
        capacityRatio = head > 0.5 ? 1.0 : 0.2;
        if (nodeInflows[link.toNode] !== undefined) {
          nodeInflows[link.toNode] += linkFlow;
        }
      }

      linkResults[link.id] = {
        flow: Math.round(linkFlow * 100) / 100,
        depth: Math.round(linkDepth * 100) / 100,
        velocity: Math.round(linkVelocity * 100) / 100,
        capacityRatio: Math.round(capacityRatio * 100) / 100,
      };
    });

    // Node state update
    model.nodes.forEach(node => {
      const inflow = nodeInflows[node.id] || 0;
      let depth = nodeDepth[node.id];
      let flooding = 0;
      let head = node.invertElev + depth;
      let vol = 0;

      if (node.type === 'OUTFALL') {
        // Free outfall discharge
        stepTotalOutflow += inflow;
        totalOutflowVolCuFt += inflow * dtSeconds;
        depth = Math.min(1.5, Math.pow(inflow / 10.0, 0.4));
        head = node.invertElev + depth;
      } else if (node.type === 'STORAGE') {
        // Storage stage routing
        // dV/dt = Inflow - Outflow
        const currentVol = (node.aCoeff || 1000) * depth;
        const newVol = Math.max(0, currentVol + inflow * dtSeconds);
        depth = Math.min(node.maxDepth, newVol / (node.aCoeff || 1000));
        vol = newVol;
        stepStorageVol += vol;
        if (depth >= node.maxDepth) {
          flooding = Math.max(0, inflow - 5.0); // weir/orifice overflow
          nodeFloodedVol[node.id] += flooding * dtSeconds;
          nodeFloodedHours[node.id] += dtHours;
          totalFloodedVolCuFt += flooding * dtSeconds;
        }
      } else if (node.type === 'JUNCTION') {
        // Junction stage & surcharge
        // Inflow drives depth up
        const connectedLinks = model.links.filter(l => l.fromNode === node.id);
        const totalOutletCapacity = connectedLinks.reduce((sum, l) => {
          const cap = conduitCapacities[l.id];
          return sum + (cap ? cap.qFull : 10);
        }, 0);

        if (inflow > totalOutletCapacity && totalOutletCapacity > 0) {
          depth = node.maxDepth + (inflow - totalOutletCapacity) * 0.15;
        } else {
          const depthRatio = totalOutletCapacity > 0 ? inflow / totalOutletCapacity : 0;
          depth = Math.min(node.maxDepth, depthRatio * node.maxDepth * 0.9);
        }

        // Surcharge & flooding check
        if (depth > node.maxDepth) {
          flooding = Math.max(0, inflow - totalOutletCapacity);
          nodeFloodedVol[node.id] += flooding * dtSeconds;
          nodeFloodedHours[node.id] += dtHours;
          totalFloodedVolCuFt += flooding * dtSeconds;
        }
      }

      nodeDepth[node.id] = depth;
      head = node.invertElev + depth;

      nodeResults[node.id] = {
        inflow: Math.round(inflow * 100) / 100,
        head: Math.round(head * 100) / 100,
        depth: Math.round(depth * 100) / 100,
        flooding: Math.round(flooding * 100) / 100,
        volume: Math.round(vol),
      };
    });

    if (stepTotalOutflow > peakOutflow) {
      peakOutflow = stepTotalOutflow;
      peakOutflowTime = timeStr;
    }

    steps.push({
      timeHours: Math.round(timeHours * 100) / 100,
      timeStr,
      rainfallRate: Math.round(stepRainRate * 100) / 100,
      totalRunoff: Math.round(stepTotalRunoff * 100) / 100,
      totalInfiltration: Math.round(stepTotalInfil * 100) / 100,
      totalStorageVolume: Math.round(stepStorageVol),
      totalOutflow: Math.round(stepTotalOutflow * 100) / 100,
      subcatchmentResults: subResults,
      nodeResults,
      linkResults,
    });
  }

  // Continuity Calculations
  const runoffContinuityError = totalPrecipVolCuFt > 0
    ? ((totalPrecipVolCuFt - (totalInfilVolCuFt + totalRunoffVolCuFt)) / totalPrecipVolCuFt) * 100
    : 0;

  const routingTotalInflow = totalRunoffVolCuFt;
  const routingContinuityError = routingTotalInflow > 0
    ? ((routingTotalInflow - (totalOutflowVolCuFt + totalFloodedVolCuFt)) / routingTotalInflow) * 100
    : 0;

  const continuity: ContinuityReport = {
    totalPrecipVolume: Math.round(totalPrecipVolCuFt),
    totalInfilVolume: Math.round(totalInfilVolCuFt),
    totalEvapVolume: 0,
    totalRunoffVolume: Math.round(totalRunoffVolCuFt),
    runoffContinuityError: Math.round(runoffContinuityError * 100) / 100,
    routingInitialStorage: 0,
    routingTotalInflow: Math.round(routingTotalInflow),
    routingTotalOutflow: Math.round(totalOutflowVolCuFt),
    routingFinalStorage: Math.round(steps[steps.length - 1]?.totalStorageVolume || 0),
    routingFloodingLoss: Math.round(totalFloodedVolCuFt),
    routingContinuityError: Math.round(routingContinuityError * 100) / 100,
  };

  // Critical Conduits and Nodes summary
  const criticalConduits = model.links.map(link => {
    let maxFlow = 0;
    let maxDepth = 0;
    let maxVelocity = 0;
    steps.forEach(s => {
      const res = s.linkResults[link.id];
      if (res) {
        if (res.flow > maxFlow) maxFlow = res.flow;
        if (res.depth > maxDepth) maxDepth = res.depth;
        if (res.velocity > maxVelocity) maxVelocity = res.velocity;
      }
    });
    return {
      linkId: link.id,
      maxFlow: Math.round(maxFlow * 100) / 100,
      maxDepth: Math.round(maxDepth * 100) / 100,
      maxVelocity: Math.round(maxVelocity * 100) / 100,
      hoursFull: Math.round((linkHoursFull[link.id] || 0) * 100) / 100,
    };
  });

  const criticalNodes = model.nodes.map(node => {
    let maxDepth = 0;
    steps.forEach(s => {
      const res = s.nodeResults[node.id];
      if (res && res.depth > maxDepth) maxDepth = res.depth;
    });
    return {
      nodeId: node.id,
      maxDepth: Math.round(maxDepth * 100) / 100,
      floodingVolume: Math.round(nodeFloodedVol[node.id] || 0),
      hoursFlooded: Math.round((nodeFloodedHours[node.id] || 0) * 100) / 100,
    };
  });

  const summary: SimulationSummary = {
    peakRunoffRate: Math.round(peakRunoff * 100) / 100,
    peakRunoffTime,
    peakOutflowRate: Math.round(peakOutflow * 100) / 100,
    peakOutflowTime,
    totalFloodedVolume: Math.round(totalFloodedVolCuFt),
    floodedNodesCount: Object.values(nodeFloodedVol).filter(v => v > 10).length,
    maxSurchargeDurationHr: Math.round(Math.max(0, ...Object.values(nodeFloodedHours)) * 100) / 100,
    continuity,
    criticalConduits,
    criticalNodes,
  };

  return {
    steps,
    summary,
    durationHours,
  };
}
