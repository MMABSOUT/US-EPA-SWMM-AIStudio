// EPA SWMM 5.2 TypeScript Data Structures and Type Definitions

export type FlowUnits = 'CFS' | 'GPM' | 'MGD' | 'CMS' | 'LPS' | 'MLD';
export type InfiltrationMethod = 'HORTON' | 'MODIFIED_HORTON' | 'GREEN_AMPT' | 'MODIFIED_GREEN_AMPT' | 'CURVE_NUMBER';
export type RoutingMethod = 'STEADY' | 'KINWAVE' | 'DYNWAVE';

export interface ProjectOptions {
  flowUnits: FlowUnits;
  infiltration: InfiltrationMethod;
  routingModel: RoutingMethod;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reportStep: string; // e.g. "00:15:00"
  routingStep: number; // in seconds (e.g. 30)
  wetStep: number; // wet hydrology step in seconds
  dryStep: number; // dry hydrology step in seconds
}

export interface RainGage {
  id: string;
  format: 'INTENSITY' | 'VOLUME' | 'CUMULATIVE';
  interval: string; // "1:00"
  scf: number; // snow catch factor
  sourceType: 'TIMESERIES' | 'FILE';
  seriesName: string;
}

export interface TimeSeriesEntry {
  timeStr: string; // "01:00" or decimal hours
  timeHour: number;
  value: number; // rain in in/hr or mm/hr
}

export interface TimeSeries {
  name: string;
  description?: string;
  entries: TimeSeriesEntry[];
}

export interface Subcatchment {
  id: string;
  rainGageId: string;
  outletNodeId: string;
  area: number; // acres or hectares
  percentImperv: number; // 0 - 100
  width: number; // ft or m
  slope: number; // percent slope
  curbLength: number;
  // Subareas
  nImperv: number; // Manning n for imperv
  nPerv: number; // Manning n for perv
  sImperv: number; // depression storage imperv (in or mm)
  sPerv: number; // depression storage perv (in or mm)
  pctZero: number; // % imperv with zero depression storage
  routeTo: 'OUTLET' | 'IMPERV' | 'PERV';
  // Infiltration parameters (Horton or Green-Ampt)
  maxInfilRate: number; // f0 (in/hr or mm/hr)
  minInfilRate: number; // fc
  decayRate: number; // 1/hr
  dryTime: number; // days
  maxInfilVol: number;
  // Polygon coordinates for visualization
  polygon?: [number, number][];
  center: [number, number];
}

export type NodeType = 'JUNCTION' | 'OUTFALL' | 'STORAGE' | 'DIVIDER';

export interface BaseNode {
  id: string;
  type: NodeType;
  invertElev: number; // ft or m
  x: number;
  y: number;
  description?: string;
}

export interface JunctionNode extends BaseNode {
  type: 'JUNCTION';
  maxDepth: number; // max rim depth
  initDepth: number;
  surDepth: number; // surcharge depth allowance
  aponded: number; // ponded area
}

export interface OutfallNode extends BaseNode {
  type: 'OUTFALL';
  outfallType: 'FREE' | 'NORMAL' | 'FIXED' | 'TIDAL';
  fixedStage?: number;
  gated: boolean;
}

export interface StorageNode extends BaseNode {
  type: 'STORAGE';
  maxDepth: number;
  initDepth: number;
  shape: 'FUNCTIONAL' | 'TABULAR';
  aCoeff: number; // Area = A * depth^B + C
  bExpon: number;
  cConst: number;
}

export type SWMMNode = JunctionNode | OutfallNode | StorageNode;

export type LinkType = 'CONDUIT' | 'ORIFICE' | 'WEIR' | 'PUMP';

export type CrossSectionShape = 'CIRCULAR' | 'RECT_CLOSED' | 'TRAPEZOIDAL' | 'EGG' | 'HORSESHOE';

export interface ConduitLink {
  id: string;
  type: 'CONDUIT';
  fromNode: string;
  toNode: string;
  length: number; // ft or m
  roughness: number; // Manning's n
  inletOffset: number;
  outletOffset: number;
  initFlow: number;
  maxFlow?: number;
  shape: CrossSectionShape;
  geom1: number; // diameter or full height (ft or m)
  geom2: number; // bottom width or width
  geom3: number; // side slope 1
  geom4: number; // side slope 2
  barrels: number;
}

export interface OrificeLink {
  id: string;
  type: 'ORIFICE';
  fromNode: string;
  toNode: string;
  orificeType: 'SIDE' | 'BOTTOM';
  offset: number;
  dischargeCoeff: number;
  shape: 'CIRCULAR' | 'RECT_CLOSED';
  geom1: number;
  geom2: number;
}

export interface WeirLink {
  id: string;
  type: 'WEIR';
  fromNode: string;
  toNode: string;
  weirType: 'TRANSVERSE' | 'SIDEFLOW' | 'V-NOTCH' | 'TRAPEZOIDAL';
  crestHeight: number;
  dischargeCoeff: number;
  geom1: number; // weir length or height
  geom2: number; // notch angle or width
}

export type SWMMLink = ConduitLink | OrificeLink | WeirLink;

export interface LIDControl {
  name: string;
  lidType: 'BC' | 'PP' | 'GR' | 'RB' | 'IT' | 'VS'; // Bioretention, Permeable Pavement, Green Roof, Rain Barrel, Infiltration Trench, Veg Swale
  surfaceLayer: {
    storageDepth: number; // in
    vegetationRatio: number;
    roughness: number;
    slope: number;
  };
  soilLayer?: {
    thickness: number; // in
    porosity: number;
    wiltingPoint: number;
    suctionHead: number;
    conductivity: number; // in/hr
  };
  storageLayer?: {
    thickness: number; // in
    voidRatio: number;
    seepageRate: number; // in/hr
  };
  underdrain?: {
    flowCoeff: number;
    exponent: number;
    offset: number;
  };
}

export interface LIDUsage {
  subcatchmentId: string;
  lidControlName: string;
  numberUnits: number;
  unitArea: number; // sq ft
  unitWidth: number; // ft
  initSat: number; // %
  fromImperv: number; // % of imperv area routed to LID
  toPervious: number; // route treated water to pervious area (0/1)
}

export interface Pollutant {
  name: string;
  units: 'MG/L' | 'UG/L' | 'COUNT/L';
  rainConc: number;
  decayCoeff: number; // 1/day
}

export interface LandUse {
  name: string;
  buildupMethod: 'NONE' | 'POW' | 'EXP' | 'SAT';
  buildupMax: number;
  buildupRate: number;
  washoffMethod: 'EXP' | 'RC' | 'EMC';
  washoffCoeff: number;
  washoffExpon: number;
}

export interface SWMMModel {
  title: string;
  description: string;
  options: ProjectOptions;
  rainGages: RainGage[];
  timeSeries: TimeSeries[];
  subcatchments: Subcatchment[];
  nodes: SWMMNode[];
  links: SWMMLink[];
  lidControls: LIDControl[];
  lidUsages: LIDUsage[];
  pollutants: Pollutant[];
  landUses: LandUse[];
}

// Simulation Results Interfaces
export interface TimeStepResult {
  timeHours: number;
  timeStr: string;
  // System totals
  rainfallRate: number; // in/hr
  totalRunoff: number; // cfs
  totalInfiltration: number; // in/hr
  totalStorageVolume: number; // cu ft
  totalOutflow: number; // cfs
  // Per-Subcatchment
  subcatchmentResults: {
    [id: string]: {
      rainfall: number; // in/hr
      losses: number; // infil + evap
      runoff: number; // cfs
      depth: number; // in
      pollutantWashoff?: number; // mg/sec
    };
  };
  // Per-Node
  nodeResults: {
    [id: string]: {
      inflow: number; // cfs
      head: number; // ft
      depth: number; // ft
      flooding: number; // cfs
      volume: number; // cu ft
    };
  };
  // Per-Link
  linkResults: {
    [id: string]: {
      flow: number; // cfs
      depth: number; // ft
      velocity: number; // fps
      capacityRatio: number; // 0 to >1 (surcharge)
    };
  };
}

export interface ContinuityReport {
  totalPrecipVolume: number; // acre-ft or cu-ft
  totalInfilVolume: number;
  totalEvapVolume: number;
  totalRunoffVolume: number;
  runoffContinuityError: number; // %
  
  routingInitialStorage: number;
  routingTotalInflow: number;
  routingTotalOutflow: number;
  routingFinalStorage: number;
  routingFloodingLoss: number;
  routingContinuityError: number; // %
}

export interface SimulationSummary {
  peakRunoffRate: number; // cfs
  peakRunoffTime: string;
  peakOutflowRate: number; // cfs
  peakOutflowTime: string;
  totalFloodedVolume: number; // cu ft
  floodedNodesCount: number;
  maxSurchargeDurationHr: number;
  continuity: ContinuityReport;
  criticalConduits: {
    linkId: string;
    maxFlow: number;
    maxDepth: number;
    maxVelocity: number;
    hoursFull: number;
  }[];
  criticalNodes: {
    nodeId: string;
    maxDepth: number;
    floodingVolume: number;
    hoursFlooded: number;
  }[];
}

export interface SimulationResult {
  steps: TimeStepResult[];
  summary: SimulationSummary;
  durationHours: number;
}
