## 2025-05-10 - SWMM Simulation Engine Hot Loop Optimization
**Learning:** In SWMM hydrograph/routing simulation engines, `runSWMMSimulation` iterates through hundreds of time steps (`totalSteps`). Performing O(N) array `.find()` or `.filter()` calls inside the per-timestep loops for nodes, rain gages, time series, and LID controls creates massive repetitive overhead.
**Action:** Pre-build Map lookups (`nodeMap`, `gageTimeSeriesMap`, `subLidUnitFactorMap`, `nodeTotalOutletCapacities`) prior to entering the simulation time loop to convert O(N) lookups into O(1) direct map accesses.
