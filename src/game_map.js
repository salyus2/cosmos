// src/game_map.js
const { SECTORS_CONFIG, SYSTEMS_PER_ROW_APPROX } = require("./game_data");
const database = require("./database");

let gameMap = {};
let allSystemNames = [];
let specialPlanets = [];
let systemCoordinates = {};
let coordinatesToSystemName = {};

function getGameMap() {
  return gameMap;
}

function getSystemByName(systemName) {
  if (!systemName) return null;
  const parts = systemName.split(" ");
  const sectorName = parts[0];
  if (gameMap[sectorName]) {
    if (parts.length >= 2) {
      const systemId = parseInt(parts[1]);
      if (!isNaN(systemId)) {
        return gameMap[sectorName].find((s) => s.id === systemId);
      }
    }
    return gameMap[sectorName][0]; // Para "Ciudadela Central"
  }
  return null;
}

// CORRECCIÓN: La definición de esta función fue restaurada.
function assignCoordinatesAndBuildAdjacency() {
  systemCoordinates = {};
  coordinatesToSystemName = {};
  let currentGridX = 0;
  let currentGridY = 0;
  if (!allSystemNames) return;

  allSystemNames.forEach((sysName) => {
    const system = getSystemByName(sysName);
    if (system) {
      system.x = currentGridX;
      system.y = currentGridY;
      systemCoordinates[sysName] = { x: currentGridX, y: currentGridY };
      coordinatesToSystemName[`${currentGridX}_${currentGridY}`] = sysName;
      currentGridX++;
      if (currentGridX >= SYSTEMS_PER_ROW_APPROX) {
        currentGridX = 0;
        currentGridY++;
      }
    }
  });
  console.log("Coordenadas ficticias asignadas.");
}

function buildMapStructureInMemory() {
  console.log("Construyendo estructura de mapa en memoria...");
  gameMap = {};
  allSystemNames = [];
  specialPlanets = [];

  for (const sectorName in SECTORS_CONFIG) {
    const config = SECTORS_CONFIG[sectorName];
    gameMap[sectorName] = [];
    for (let i = 1; i <= config.count; i++) {
      const systemName = `${sectorName} ${i}`;
      gameMap[sectorName].push({
        name: systemName,
        id: i,
        sector: sectorName,
        type: "normal",
        occupiedBy: null,
        units: { "Nave de Transporte Básico": 0, "Soldado Genérico": 0 },
        resources: { maxProduction: config.maxMaterialsPerTurn },
        isSpecialPlanet: false,
        wasCollectedThisTurn: false,
        isBlocked: false,
      });
      allSystemNames.push(systemName);
    }
  }

  const eligibleSpecialSystems = [
    ...(gameMap["Naranja"] || []).map((s) => s.name),
    ...(gameMap["Verde"] || []).map((s) => s.name),
  ];
  for (let i = eligibleSpecialSystems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligibleSpecialSystems[i], eligibleSpecialSystems[j]] = [
      eligibleSpecialSystems[j],
      eligibleSpecialSystems[i],
    ];
  }
  specialPlanets = eligibleSpecialSystems.slice(0, 20);
  specialPlanets.forEach((name) => {
    const system = getSystemByName(name);
    if (system) {
      system.isSpecialPlanet = true;
      system.type = "especial";
    }
  });

  gameMap["Ciudadela"] = [
    {
      name: "Ciudadela Central",
      id: 0,
      sector: "Central",
      type: "ciudadela",
      occupiedBy: null,
      isBlocked: true,
      units: {},
      resources: { maxProduction: 0 },
      isSpecialPlanet: false,
      wasCollectedThisTurn: false,
    },
  ];
  allSystemNames.push("Ciudadela Central");
  gameMap["Negro"] = [];
  for (let i = 1; i <= 100; i++) {
    const systemName = `Negro ${i}`;
    gameMap["Negro"].push({
      name: systemName,
      id: i,
      sector: "Negro",
      type: "negro",
      occupiedBy: null,
      units: {},
      resources: { maxProduction: 0 },
      isSpecialPlanet: false,
      wasCollectedThisTurn: false,
    });
    allSystemNames.push(systemName);
  }

  assignCoordinatesAndBuildAdjacency();
  console.log(`Mapa construido con ${Object.keys(gameMap).length} sectores.`);
}

async function loadGameMapFromDB() {
  console.log("Intentando cargar mapa desde DB...");
  try {
    const loadedMap = await database.getAllSystemsDB();
    if (Object.keys(loadedMap).length < Object.keys(SECTORS_CONFIG).length) {
      console.log("-> Mapa incompleto en DB. Reconstruyendo...");
      buildMapStructureInMemory();
      await database.resetAllSystemsStateDB(gameMap);
      console.log("-> Mapa nuevo guardado en DB.");
    } else {
      gameMap = loadedMap;
      allSystemNames = Object.values(gameMap)
        .flat()
        .map((s) => s.name);
      assignCoordinatesAndBuildAdjacency(); // Esta llamada ahora es segura
      console.log("-> Mapa cargado con éxito desde DB.");
    }
  } catch (err) {
    console.error("-> ERROR al cargar/inicializar el mapa:", err.message);
    throw err;
  }
}

async function resetSystemsState() {
  console.log("Entrando en resetSystemsState...");
  buildMapStructureInMemory();
  await database.resetAllSystemsStateDB(gameMap);
  console.log("resetSystemsState completado.");
}

function getRandomWhiteSectorSystem() {
  const { gameState } = require("./game_state");
  const occupiedSystems = Object.values(gameState.factions).map(
    (f) => f.baseLocation
  );
  const availableSystems = gameMap["Blanco"]
    ? gameMap["Blanco"].filter((sys) => !occupiedSystems.includes(sys.name))
    : [];
  if (availableSystems.length === 0) return null;
  return availableSystems[Math.floor(Math.random() * availableSystems.length)]
    .name;
}

function getDistance(systemA_Name, systemB_Name) {
  const sysA_coords = systemCoordinates[systemA_Name];
  const sysB_coords = systemCoordinates[systemB_Name];
  if (!sysA_coords || !sysB_coords) return Infinity;
  return Math.max(
    Math.abs(sysA_coords.x - sysB_coords.x),
    Math.abs(sysA_coords.y - sysB_coords.y)
  );
}

module.exports = {
  getGameMap,
  loadGameMapFromDB,
  getSystemByName,
  getRandomWhiteSectorSystem,
  resetSystemsState,
  getDistance,
};
