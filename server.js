const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const { gameState, resetGame, advanceTurn, loadGameStateFromDB, loadFactionsFromDB, createTestPlayer } = require("./src/game_state");
const gameMapModule = require("./src/game_map");
const gameActions = require("./src/game_actions");
const gameData = require("./src/game_data");
const database = require("./src/database");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
gameActions.setIoInstance(io);

async function main() {
  try {
    await database.initializeDatabase();
    await loadGameStateFromDB();
    await loadFactionsFromDB();

    if (gameState.turn === 0 && Object.keys(gameState.factions).length === 0) {
      await resetGame();
    } else {
      await gameMapModule.loadGameMapFromDB();
      await createTestPlayer();
    }
  } catch (error) {
    console.error("FATAL: Error durante la inicialización.", error);
    process.exit(1);
  }

  io.on("connection", (socket) => {
    socket.on("requestInitialData", () => {
      socket.emit("initialDataResponse", {
        gameMap: gameMapModule.getGameMap(),
        gameState: gameState,
        availableFactions: gameData.AVAILABLE_FACTIONS,
      });
    });
    
    socket.on("adminAction", async (data) => {
        if (data.action === "reset") await resetGame();
        // ... (resto de acciones)
        io.emit("gameStateUpdate", gameState);
        io.emit("gameMapUpdate", gameMapModule.getGameMap());
    });
    
    socket.on("playerOrder", (data) => gameActions.processPlayerOrder(data.playerName, data.order));
  });

  server.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
}

main();