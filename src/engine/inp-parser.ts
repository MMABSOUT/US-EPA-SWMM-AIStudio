import {
  SWMMModel,
  Subcatchment,
  JunctionNode,
  OutfallNode,
  StorageNode,
  ConduitLink,
  TimeSeries,
  RainGage,
  LIDControl,
  LIDUsage,
  Pollutant
} from '../types/swmm';

export function serializeToINP(model: SWMMModel): string {
  let lines: string[] = [];

  lines.push(`[TITLE]`);
  lines.push(`;; ${model.title}`);
  lines.push(`;; ${model.description}`);
  lines.push(``);

  lines.push(`[OPTIONS]`);
  lines.push(`;;Option             Value`);
  lines.push(`FLOW_UNITS           ${model.options.flowUnits}`);
  lines.push(`INFILTRATION         ${model.options.infiltration}`);
  lines.push(`FLOW_ROUTING         ${model.options.routingModel}`);
  lines.push(`START_DATE           ${model.options.startDate}`);
  lines.push(`START_TIME           ${model.options.startTime}`);
  lines.push(`REPORT_START_DATE    ${model.options.startDate}`);
  lines.push(`REPORT_START_TIME    ${model.options.startTime}`);
  lines.push(`END_DATE             ${model.options.endDate}`);
  lines.push(`END_TIME             ${model.options.endTime}`);
  lines.push(`REPORT_STEP          ${model.options.reportStep}`);
  lines.push(`ROUTING_STEP         00:00:${String(model.options.routingStep).padStart(2, '0')}`);
  lines.push(`WET_STEP             00:05:00`);
  lines.push(`DRY_STEP             01:00:00`);
  lines.push(``);

  lines.push(`[EVAPORATION]`);
  lines.push(`;;Data Source    Parameters`);
  lines.push(`;;-------------- ----------------`);
  lines.push(`CONSTANT         0.10`);
  lines.push(`DRY_ONLY         NO`);
  lines.push(``);

  lines.push(`[RAINGAGES]`);
  lines.push(`;;Name           Format    Interval SCF      Source`);
  lines.push(`;;-------------- --------- -------- -------- ----------`);
  model.rainGages.forEach(g => {
    lines.push(`${g.id.padEnd(16)} ${g.format.padEnd(9)} ${g.interval.padEnd(8)} ${g.scf.toFixed(2).padEnd(8)} TIMESERIES ${g.seriesName}`);
  });
  lines.push(``);

  lines.push(`[SUBCATCHMENTS]`);
  lines.push(`;;Name           Rain Gage        Outlet           Area     %Imperv  Width    %Slope   CurbLen  SnowPack`);
  lines.push(`;;-------------- ---------------- ---------------- -------- -------- -------- -------- -------- ----------------`);
  model.subcatchments.forEach(s => {
    lines.push(`${s.id.padEnd(16)} ${s.rainGageId.padEnd(16)} ${s.outletNodeId.padEnd(16)} ${s.area.toFixed(2).padEnd(8)} ${s.percentImperv.toFixed(1).padEnd(8)} ${s.width.toFixed(0).padEnd(8)} ${s.slope.toFixed(2).padEnd(8)} ${s.curbLength.toFixed(0).padEnd(8)}`);
  });
  lines.push(``);

  lines.push(`[SUBAREAS]`);
  lines.push(`;;Subcatchment   N-Imperv   N-Perv     S-Imperv   S-Perv     PctZero    RouteTo    PctRouted`);
  lines.push(`;;-------------- ---------- ---------- ---------- ---------- ---------- ---------- ----------`);
  model.subcatchments.forEach(s => {
    lines.push(`${s.id.padEnd(16)} ${s.nImperv.toFixed(4).padEnd(10)} ${s.nPerv.toFixed(4).padEnd(10)} ${s.sImperv.toFixed(3).padEnd(10)} ${s.sPerv.toFixed(3).padEnd(10)} ${s.pctZero.toFixed(1).padEnd(10)} ${s.routeTo}`);
  });
  lines.push(``);

  lines.push(`[INFILTRATION]`);
  lines.push(`;;Subcatchment   Param1     Param2     Param3     Param4     Param5`);
  lines.push(`;;-------------- ---------- ---------- ---------- ---------- ----------`);
  model.subcatchments.forEach(s => {
    lines.push(`${s.id.padEnd(16)} ${s.maxInfilRate.toFixed(3).padEnd(10)} ${s.minInfilRate.toFixed(3).padEnd(10)} ${s.decayRate.toFixed(2).padEnd(10)} ${s.dryTime.toFixed(1).padEnd(10)} ${s.maxInfilVol.toFixed(1)}`);
  });
  lines.push(``);

  const junctions = model.nodes.filter(n => n.type === 'JUNCTION') as JunctionNode[];
  if (junctions.length > 0) {
    lines.push(`[JUNCTIONS]`);
    lines.push(`;;Name           Elevation  MaxDepth   InitDepth  SurDepth   Aponded`);
    lines.push(`;;-------------- ---------- ---------- ---------- ---------- ----------`);
    junctions.forEach(j => {
      lines.push(`${j.id.padEnd(16)} ${j.invertElev.toFixed(2).padEnd(10)} ${j.maxDepth.toFixed(2).padEnd(10)} ${j.initDepth.toFixed(2).padEnd(10)} ${j.surDepth.toFixed(2).padEnd(10)} ${j.aponded.toFixed(1)}`);
    });
    lines.push(``);
  }

  const outfalls = model.nodes.filter(n => n.type === 'OUTFALL') as OutfallNode[];
  if (outfalls.length > 0) {
    lines.push(`[OUTFALLS]`);
    lines.push(`;;Name           Elevation  Type       Stage Data       Gated    Route To`);
    lines.push(`;;-------------- ---------- ---------- ---------------- -------- ----------------`);
    outfalls.forEach(o => {
      lines.push(`${o.id.padEnd(16)} ${o.invertElev.toFixed(2).padEnd(10)} ${o.outfallType.padEnd(10)} ${''.padEnd(16)} ${o.gated ? 'YES' : 'NO'}`);
    });
    lines.push(``);
  }

  const storages = model.nodes.filter(n => n.type === 'STORAGE') as StorageNode[];
  if (storages.length > 0) {
    lines.push(`[STORAGE]`);
    lines.push(`;;Name           Elev.    MaxDepth InitDepth Shape      Curve Name/Params`);
    lines.push(`;;-------------- -------- -------- --------- ---------- -----------------------------`);
    storages.forEach(st => {
      lines.push(`${st.id.padEnd(16)} ${st.invertElev.toFixed(2).padEnd(8)} ${st.maxDepth.toFixed(2).padEnd(8)} ${st.initDepth.toFixed(2).padEnd(9)} ${st.shape.padEnd(10)} ${st.aCoeff} ${st.bExpon} ${st.cConst}`);
    });
    lines.push(``);
  }

  const conduits = model.links.filter(l => l.type === 'CONDUIT') as ConduitLink[];
  if (conduits.length > 0) {
    lines.push(`[CONDUITS]`);
    lines.push(`;;Name           From Node        To Node          Length     Roughness  InOffset   OutOffset  InitFlow   MaxFlow`);
    lines.push(`;;-------------- ---------------- ---------------- ---------- ---------- ---------- ---------- ---------- ----------`);
    conduits.forEach(c => {
      lines.push(`${c.id.padEnd(16)} ${c.fromNode.padEnd(16)} ${c.toNode.padEnd(16)} ${c.length.toFixed(1).padEnd(10)} ${c.roughness.toFixed(4).padEnd(10)} ${c.inletOffset.toFixed(2).padEnd(10)} ${c.outletOffset.toFixed(2).padEnd(10)} ${c.initFlow.toFixed(2).padEnd(10)} 0`);
    });
    lines.push(``);

    lines.push(`[XSECTIONS]`);
    lines.push(`;;Link           Shape        Geom1      Geom2      Geom3      Geom4      Barrels    Culvert`);
    lines.push(`;;-------------- ------------ ---------- ---------- ---------- ---------- ---------- ----------`);
    conduits.forEach(c => {
      lines.push(`${c.id.padEnd(16)} ${c.shape.padEnd(12)} ${(c.geom1).toFixed(2).padEnd(10)} ${(c.geom2 || 0).toFixed(2).padEnd(10)} ${(c.geom3 || 0).toFixed(2).padEnd(10)} ${(c.geom4 || 0).toFixed(2).padEnd(10)} ${c.barrels || 1}`);
    });
    lines.push(``);
  }

  if (model.lidControls && model.lidControls.length > 0) {
    lines.push(`[LID_CONTROLS]`);
    lines.push(`;;Name           Type/Layer Parameters`);
    lines.push(`;;-------------- ---------- ----------`);
    model.lidControls.forEach(lid => {
      lines.push(`${lid.name.padEnd(16)} ${lid.lidType}`);
      lines.push(`${lid.name.padEnd(16)} SURFACE    ${lid.surfaceLayer.storageDepth} ${lid.surfaceLayer.vegetationRatio} ${lid.surfaceLayer.roughness} ${lid.surfaceLayer.slope} 0`);
      if (lid.soilLayer) {
        lines.push(`${lid.name.padEnd(16)} SOIL       ${lid.soilLayer.thickness} ${lid.soilLayer.porosity} ${lid.soilLayer.wiltingPoint} ${lid.soilLayer.suctionHead} ${lid.soilLayer.conductivity} 10.0`);
      }
      if (lid.storageLayer) {
        lines.push(`${lid.name.padEnd(16)} STORAGE    ${lid.storageLayer.thickness} ${lid.storageLayer.voidRatio} ${lid.storageLayer.seepageRate} 0`);
      }
    });
    lines.push(``);
  }

  if (model.lidUsages && model.lidUsages.length > 0) {
    lines.push(`[LID_USAGE]`);
    lines.push(`;;Subcatchment   LID Process      Number  Area       Width      InitSat  FromImp  ToPerv   RptFile  DrainTo`);
    lines.push(`;;-------------- ---------------- ------- ---------- ---------- -------- -------- -------- -------- --------`);
    model.lidUsages.forEach(u => {
      lines.push(`${u.subcatchmentId.padEnd(16)} ${u.lidControlName.padEnd(16)} ${u.numberUnits.toString().padEnd(7)} ${u.unitArea.toFixed(1).padEnd(10)} ${u.unitWidth.toFixed(1).padEnd(10)} ${u.initSat.toFixed(1).padEnd(8)} ${u.fromImperv.toFixed(1).padEnd(8)} ${u.toPervious}`);
    });
    lines.push(``);
  }

  if (model.timeSeries && model.timeSeries.length > 0) {
    lines.push(`[TIMESERIES]`);
    lines.push(`;;Name           Date       Time       Value`);
    lines.push(`;;-------------- ---------- ---------- ----------`);
    model.timeSeries.forEach(ts => {
      ts.entries.forEach(entry => {
        lines.push(`${ts.name.padEnd(16)}            ${entry.timeStr.padEnd(10)} ${entry.value.toFixed(3)}`);
      });
    });
    lines.push(``);
  }

  lines.push(`[COORDINATES]`);
  lines.push(`;;Node           X-Coord            Y-Coord`);
  lines.push(`;;-------------- ------------------ ------------------`);
  model.nodes.forEach(n => {
    lines.push(`${n.id.padEnd(16)} ${n.x.toFixed(2).padEnd(18)} ${n.y.toFixed(2)}`);
  });
  lines.push(``);

  lines.push(`[POLYGONS]`);
  lines.push(`;;Subcatchment   X-Coord            Y-Coord`);
  lines.push(`;;-------------- ------------------ ------------------`);
  model.subcatchments.forEach(s => {
    if (s.polygon && s.polygon.length > 0) {
      s.polygon.forEach(pt => {
        lines.push(`${s.id.padEnd(16)} ${pt[0].toFixed(2).padEnd(18)} ${pt[1].toFixed(2)}`);
      });
    }
  });
  lines.push(``);

  lines.push(`[REPORT]`);
  lines.push(`INPUT      NO`);
  lines.push(`CONTROLS   NO`);
  lines.push(`SUBCATCHMENTS ALL`);
  lines.push(`NODES ALL`);
  lines.push(`LINKS ALL`);
  lines.push(``);

  lines.push(`[TAGS]`);
  lines.push(``);

  lines.push(`[MAP]`);
  lines.push(`DIMENSIONS 0.0 0.0 1000.0 1000.0`);
  lines.push(`Units      None`);
  lines.push(``);

  lines.push(`[END]`);

  return lines.join('\n');
}

export function parseINPToModel(inpContent: string, currentFallback: SWMMModel): SWMMModel {
  const model: SWMMModel = JSON.parse(JSON.stringify(currentFallback));
  const lines = inpContent.split('\n');

  let currentSection = '';
  const sectionsData: { [sec: string]: string[] } = {};

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';;')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1).toUpperCase();
      sectionsData[currentSection] = [];
      continue;
    }

    if (currentSection && !line.startsWith(';')) {
      sectionsData[currentSection].push(line);
    }
  }

  // Parse Title
  if (sectionsData['TITLE'] && sectionsData['TITLE'].length > 0) {
    model.title = sectionsData['TITLE'][0] || model.title;
    if (sectionsData['TITLE'].length > 1) {
      model.description = sectionsData['TITLE'].slice(1).join(' ');
    }
  }

  // Parse Raingages
  if (sectionsData['RAINGAGES']) {
    model.rainGages = sectionsData['RAINGAGES'].map(l => {
      const parts = l.split(/\s+/);
      return {
        id: parts[0] || 'Gage1',
        format: (parts[1] || 'INTENSITY') as any,
        interval: parts[2] || '1:00',
        scf: parseFloat(parts[3]) || 1.0,
        sourceType: 'TIMESERIES',
        seriesName: parts[5] || parts[4] || 'Storm1',
      };
    });
  }

  // Parse Coordinates
  const coords: { [id: string]: [number, number] } = {};
  if (sectionsData['COORDINATES']) {
    sectionsData['COORDINATES'].forEach(l => {
      const parts = l.split(/\s+/);
      if (parts.length >= 3) {
        coords[parts[0]] = [parseFloat(parts[1]) || 0, parseFloat(parts[2]) || 0];
      }
    });
  }

  // Parse Junctions
  if (sectionsData['JUNCTIONS']) {
    const junctions: JunctionNode[] = sectionsData['JUNCTIONS'].map(l => {
      const p = l.split(/\s+/);
      const id = p[0];
      const pos = coords[id] || [100 + Math.random() * 400, 100 + Math.random() * 400];
      return {
        id,
        type: 'JUNCTION',
        invertElev: parseFloat(p[1]) || 100,
        maxDepth: parseFloat(p[2]) || 5.0,
        initDepth: parseFloat(p[3]) || 0,
        surDepth: parseFloat(p[4]) || 0,
        aponded: parseFloat(p[5]) || 0,
        x: pos[0],
        y: pos[1],
      };
    });
    // merge with outfalls and storage
    const nonJunctions = model.nodes.filter(n => n.type !== 'JUNCTION');
    model.nodes = [...junctions, ...nonJunctions];
  }

  // Parse Conduits
  if (sectionsData['CONDUITS']) {
    const conduits: ConduitLink[] = sectionsData['CONDUITS'].map(l => {
      const p = l.split(/\s+/);
      return {
        id: p[0],
        type: 'CONDUIT',
        fromNode: p[1],
        toNode: p[2],
        length: parseFloat(p[3]) || 400,
        roughness: parseFloat(p[4]) || 0.015,
        inletOffset: parseFloat(p[5]) || 0,
        outletOffset: parseFloat(p[6]) || 0,
        initFlow: parseFloat(p[7]) || 0,
        shape: 'CIRCULAR',
        geom1: 2.5,
        geom2: 0,
        geom3: 0,
        geom4: 0,
        barrels: 1,
      };
    });

    // Parse Xsections
    if (sectionsData['XSECTIONS']) {
      sectionsData['XSECTIONS'].forEach(xl => {
        const xp = xl.split(/\s+/);
        const cond = conduits.find(c => c.id === xp[0]);
        if (cond) {
          cond.shape = (xp[1] || 'CIRCULAR') as any;
          cond.geom1 = parseFloat(xp[2]) || 2.5;
          cond.geom2 = parseFloat(xp[3]) || 0;
          cond.barrels = parseInt(xp[6]) || 1;
        }
      });
    }

    model.links = conduits;
  }

  return model;
}
