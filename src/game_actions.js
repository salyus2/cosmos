// src/game_actions.js
const { gameState } = require("./game_state");
const gameMapModule = require("./game_map");
const gameData = require("./game_data");
const database = require("./database");

let io = null; // Instancia de Socket.IO para emitir mensajes

function setIoInstance(socketIoInstance) {
  io = socketIoInstance;
}

// Función para enviar un mensaje a un jugador específico
function sendPlayerMessage(playerName, message) {
  if (
    io &&
    gameState.factions[playerName] &&
    gameState.factions[playerName].socketId
  ) {
    io.to(gameState.factions[playerName].socketId).emit(
      "playerMessage",
      message
    );
  } else {
    // Si no hay socket, lo mostramos en la consola del servidor
    console.log(`Mensaje para ${playerName} (sin socket): ${message}`);
  }
}

// --- Lógica Principal de Acciones de Jugador ---

async function processPlayerOrder(playerName, order) {
  if (!gameState.factions[playerName]) {
    return sendPlayerMessage(playerName, "Error: Tu facción no existe.");
  }
  if (gameState.playerOrdersThisTurn[playerName]) {
    return sendPlayerMessage(
      playerName,
      "Error: Ya has enviado una orden este turno."
    );
  }

  // Parsear la orden: acción "Parámetro 1" "Parámetro 2"
  const parts = order.match(/"[^"]+"|\S+/g) || [];
  const command = parts.length > 0 ? parts[0].toLowerCase() : "";
  const params = parts.slice(1).map((p) => p.replace(/"/g, ""));

  try {
    let success = false;
    switch (command) {
      case "construir":
        if (params.length === 2) {
          success = await handleBuild(playerName, params[0], params[1]);
        } else {
          sendPlayerMessage(
            playerName,
            'Formato incorrecto. Usa: construir "NombreUnidad" "Sistema"'
          );
        }
        break;
      case "recolectar":
        if (params.length === 1) {
          success = await handleCollect(playerName, params[0]);
        } else {
          sendPlayerMessage(
            playerName,
            'Formato incorrecto. Usa: recolectar "Sistema"'
          );
        }
        break;
      case "mover":
        if (params.length === 2) {
          success = await handleMove(playerName, params[0], params[1]);
        } else {
          sendPlayerMessage(
            playerName,
            'Formato incorrecto. Usa: mover "NombreNave" "SistemaDestino"'
          );
        }
        break;
      default:
        sendPlayerMessage(
          playerName,
          `Error: Comando desconocido "${command}".`
        );
        return; // No marcar como orden válida si el comando es desconocido
    }

    // Solo marcamos la orden como usada si la acción fue procesada con éxito.
    if (success) {
      gameState.playerOrdersThisTurn[playerName] = true;
    }
  } catch (error) {
    console.error(`Error procesando la orden para ${playerName}:`, error);
    sendPlayerMessage(
      playerName,
      "Error interno del servidor al procesar tu orden."
    );
  }
}

async function handleBuild(playerName, unitName, systemName) {
  const faction = gameState.factions[playerName];
  const unitData = gameData.AVAILABLE_UNITS[unitName];
  const system = gameMapModule.getSystemByName(systemName);

  if (!unitData) {
    sendPlayerMessage(playerName, `Error: La unidad "${unitName}" no existe.`);
    return false;
  }
  if (!system) {
    sendPlayerMessage(
      playerName,
      `Error: El sistema "${systemName}" no existe.`
    );
    return false;
  }
  if (faction.baseLocation !== systemName) {
    sendPlayerMessage(
      playerName,
      `Error: Solo puedes construir en tu base (${faction.baseLocation}).`
    );
    return false;
  }
  if (faction.resources < unitData.cost) {
    sendPlayerMessage(
      playerName,
      `Error: No tienes suficientes recursos. Necesitas ${unitData.cost}R, tienes ${faction.resources}R.`
    );
    return false;
  }

  // Actualizar estado en memoria
  faction.resources -= unitData.cost;
  faction.units[unitName] = (faction.units[unitName] || 0) + 1;
  system.units[unitName] = (system.units[unitName] || 0) + 1;

  // Actualizar base de datos
  await database.addFactionDB(faction);
  await database.updateSystemDB(system.name, { units: system.units });

  sendPlayerMessage(
    playerName,
    `Construcción exitosa: 1x ${unitName} en ${systemName}. Recursos restantes: ${faction.resources}R.`
  );
  io.emit("gameStateUpdate", gameState);
  io.emit("gameMapUpdate", gameMapModule.getGameMap());
  return true;
}

async function handleCollect(playerName, systemName) {
  const faction = gameState.factions[playerName];
  const system = gameMapModule.getSystemByName(systemName);

  if (!system) {
    sendPlayerMessage(
      playerName,
      `Error: El sistema "${systemName}" no existe.`
    );
    return false;
  }
  if (faction.baseLocation !== systemName) {
    sendPlayerMessage(
      playerName,
      `Error: Solo puedes recolectar en tu base (${faction.baseLocation}).`
    );
    return false;
  }
  if (system.wasCollectedThisTurn) {
    sendPlayerMessage(
      playerName,
      `Error: Ya se han recolectado recursos en ${systemName} este turno.`
    );
    return false;
  }
  if (
    !faction.units["Soldado Genérico"] ||
    faction.units["Soldado Genérico"] === 0
  ) {
    sendPlayerMessage(
      playerName,
      `Error: Necesitas al menos un "Soldado Genérico" para recolectar.`
    );
    return false;
  }

  const resourcesToCollect = Math.min(
    faction.units["Soldado Genérico"] * 10,
    system.resources.maxProduction
  );

  // Actualizar estado en memoria
  faction.resources += resourcesToCollect;
  system.wasCollectedThisTurn = true;
  gameState.systemsCollectedThisTurn.push(systemName);

  // Actualizar base de datos
  await database.addFactionDB(faction);
  await database.updateSystemDB(system.name, { wasCollectedThisTurn: true });

  sendPlayerMessage(
    playerName,
    `Recolectaste ${resourcesToCollect}R en ${systemName}. Total: ${faction.resources}R.`
  );
  io.emit("gameStateUpdate", gameState);
  io.emit("gameMapUpdate", gameMapModule.getGameMap());
  return true;
}

async function handleMove(playerName, unitName, destinationSystemName) {
  const faction = gameState.factions[playerName];
  const sourceSystemName = faction.baseLocation;
  const sourceSystem = gameMapModule.getSystemByName(sourceSystemName);
  const destinationSystem = gameMapModule.getSystemByName(
    destinationSystemName
  );

  if (unitName !== "Nave de Transporte Básico") {
    sendPlayerMessage(
      playerName,
      `Error: Por ahora solo puedes mover "Nave de Transporte Básico".`
    );
    return false;
  }
  if (!sourceSystem || !destinationSystem) {
    sendPlayerMessage(
      playerName,
      "Error: Sistema de origen o destino no válido."
    );
    return false;
  }
  if (!sourceSystem.units[unitName] || sourceSystem.units[unitName] < 1) {
    sendPlayerMessage(
      playerName,
      `Error: No tienes un "${unitName}" en ${sourceSystemName} para mover.`
    );
    return false;
  }

  const distance = gameMapModule.getDistance(
    sourceSystemName,
    destinationSystemName
  );
  const unitMovement = gameData.AVAILABLE_UNITS[unitName].movement;
  if (distance > unitMovement) {
    sendPlayerMessage(
      playerName,
      `Error: ${destinationSystemName} está demasiado lejos (distancia ${distance}, movimiento ${unitMovement}).`
    );
    return false;
  }

  // Actualizar estado en memoria
  sourceSystem.units[unitName]--;
  destinationSystem.units[unitName] =
    (destinationSystem.units[unitName] || 0) + 1;

  // Actualizar base de datos
  await database.updateSystemDB(sourceSystem.name, {
    units: sourceSystem.units,
  });
  await database.updateSystemDB(destinationSystem.name, {
    units: destinationSystem.units,
  });

  sendPlayerMessage(
    playerName,
    `Moviste 1x ${unitName} de ${sourceSystemName} a ${destinationSystemName}.`
  );
  io.emit("gameMapUpdate", gameMapModule.getGameMap());
  return true;
}

module.exports = {
  setIoInstance,
  processPlayerOrder,
};
