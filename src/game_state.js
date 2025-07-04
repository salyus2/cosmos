const gameMapModule = require("./game_map");
const database = require("./database");
const gameData = require("./game_data");

let gameState = { turn: 0, factions: {}, gameStarted: false, systemsCollectedThisTurn: [], playerOrdersThisTurn: {} };

async function createTestPlayer() {
    if (!gameState.factions["Xisco"]) {
      const initialSystemName = "Blanco 1";
      const initialSystem = gameMapModule.getSystemByName(initialSystemName);
      if (initialSystem) {
        const testFaction = {
            playerName: "Xisco", id: "European", name: "European", resources: 500, hero: "Ares", 
            baseUnits: "Cuartel General", baseLocation: initialSystemName, 
            location: initialSystemName, units: { "Nave de Transporte Básico": 1, "Soldado Genérico": 1 }
        };
        gameState.factions["Xisco"] = testFaction;
        initialSystem.occupiedBy = "Xisco";
        initialSystem.units = { ...testFaction.units };
        await database.addFactionDB(testFaction);
        await database.updateSystemDB(initialSystem.name, { occupiedBy: "Xisco", units: initialSystem.units });
        console.log("-> Jugador de prueba 'Xisco' creado y guardado.");
      }
    }
}

async function resetGame() {
  await database.resetGameStateDB();
  await database.run("DELETE FROM factions");
  await gameMapModule.resetSystemsState();
  await loadGameStateFromDB();
  await loadFactionsFromDB();
  await createTestPlayer();
  gameState.systemsCollectedThisTurn = [];
  gameState.playerOrdersThisTurn = {};
  console.log("Juego reiniciado a estado inicial.");
}

async function loadGameStateFromDB() {
  const state = await database.getGameStateDB();
  if (state) {
    gameState.turn = state.turn;
    gameState.gameStarted = !!state.gameStarted;
  }
}

// CORRECCIÓN: La función de la DB ahora devuelve un objeto, por lo que la carga es directa.
async function loadFactionsFromDB() {
  gameState.factions = await database.getAllFactionsDB();
  console.log(`-> ${Object.keys(gameState.factions).length} facciones cargadas desde DB.`);
}

module.exports = {
  gameState,
  resetGame,
  advanceTurn: async () => { /* Lógica de avance de turno */ },
  loadGameStateFromDB,
  loadFactionsFromDB,
  createTestPlayer,
};