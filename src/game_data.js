// src/game_data.js

const AVAILABLE_FACTIONS = {
  European: {
    name: "European",
    startingResources: 500,
    hero: "Ares",
    baseUnits: "Cuartel General (Base Principal)",
  },
  American: {
    name: "American",
    startingResources: 500,
    hero: "Dee Dee Jones",
    baseUnits: "Sede del Banco Estelar (Base Principal)",
  },
  Asian: {
    name: "Asian",
    startingResources: 500,
    hero: "Jun Shu",
    baseUnits: "Gobierno Civil",
  },
  Ocean: {
    name: "Ocean",
    startingResources: 500,
    hero: "Steven Graw",
    baseUnits: "Atlantis",
  },
  "Golden Empire": {
    name: "Golden Empire",
    startingResources: 500,
    hero: "Keop",
    baseUnits: "Ciudadela Dorada",
  },
  "Raukian Republic": {
    name: "Raukian Republic",
    startingResources: 500,
    hero: "Duque",
    baseUnits: "Centro Estratégico de Respuesta Rápida (CERR)",
  },
  "Hive Mind": {
    name: "Hive Mind",
    startingResources: 500,
    hero: "Ignis Contentionem",
    baseUnits: "Mente Maestra",
  },
  Ghosts: {
    name: "Ghosts",
    startingResources: 500,
    hero: "Avatar de la Ira",
    baseUnits: "Valle de las Gemas",
  },
  "Pirate League": {
    name: "Pirate League",
    startingResources: 500,
    hero: "Timmi Do",
    baseUnits: "Acorazado del Rey de los Piratas",
  },
  "Aeshnid Swarm": {
    name: "Aeshnid Swarm",
    startingResources: 500,
    hero: "Sakt'h",
    baseUnits: "Panal Génesis",
  },
  Assimilators: {
    name: "Assimilators",
    startingResources: 500,
    hero: "Genthar",
    baseUnits: "Nave Nexo",
  },
  "Mining Consortium": {
    name: "Mining Consortium",
    startingResources: 500,
    hero: "Pepe el Bombas",
    baseUnits: "Almacén Central",
  },
  ASTANO: {
    name: "ASTANO",
    startingResources: 500,
    hero: "Kry Jaff",
    baseUnits: "Taller Orbital",
  },
  "Naxor Federation": {
    name: "Naxor Federation",
    startingResources: 500,
    hero: "Neil Ironkey",
    baseUnits: "Puesto Avanzado Dimensional",
  },
};

const AVAILABLE_UNITS = {
  "Nave de Transporte Básico": { type: "Nave", cost: 20, movement: 2 },
  "Soldado Genérico": { type: "Tropa", cost: 5, movement: 0 },
};

// --- RESTAURADO: Definición completa de Sectores ---
const SECTORS_CONFIG = {
  Violeta: { count: 8, maxMaterialsPerTurn: 60 },
  Marrón: { count: 16, maxMaterialsPerTurn: 55 },
  Amarillo: { count: 24, maxMaterialsPerTurn: 50 },
  Rojo: { count: 32, maxMaterialsPerTurn: 45 },
  Verde: { count: 40, maxMaterialsPerTurn: 40 },
  Azul: { count: 48, maxMaterialsPerTurn: 35 },
  Naranja: { count: 56, maxMaterialsPerTurn: 30 },
  Blanco: { count: 64, maxMaterialsPerTurn: 25 },
};

const SYSTEMS_PER_ROW_APPROX = 20; // Volvemos a un valor más grande

module.exports = {
  AVAILABLE_FACTIONS,
  AVAILABLE_UNITS,
  SECTORS_CONFIG,
  SYSTEMS_PER_ROW_APPROX,
};
