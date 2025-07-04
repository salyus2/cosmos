const GameMap = require('./game_map');
const _ = require('lodash');
// CORRECCIÓN: Ahora es seguro importar game_data en el nivel superior
const gameData = require('./game_data');

/**
 * Procesa un comando de acción del jugador.
 * Esta es una función pura: no modifica el estado, devuelve uno nuevo.
 * @param {object} currentState - El estado actual del juego { turn, factions }.
 * @param {object} currentMap - El mapa actual del juego.
 * @param {string} actionCommand - El comando completo, ej: 'construir "Destructor Alfa" "Blanco 1"'.
 * @param {object} actingFaction - La facción que realiza la acción.
 * @returns {object} Un objeto con { success, message, newState?, newMap? }.
 */
function processAction(currentState, currentMap, actionCommand, actingFaction) {
    const parts = actionCommand.match(/"[^"]+"|\S+/g) || [];
    const command = parts[0];

    // Clonamos el estado de forma segura para no mutar el original
    const newState = _.cloneDeep(currentState);
    const newMap = _.cloneDeep(currentMap);
    const factionInNewState = newState.factions.find(f => f.factionId === actingFaction.factionId);

    if (!factionInNewState) {
        return { success: false, message: "Error interno: No se encontró la facción en el nuevo estado." };
    }

    switch (command) {
        case 'construir':
            return build(parts, newState, newMap, factionInNewState);
        
        // Aquí añadiremos 'mover', 'recolectar', etc.
        
        default:
            return { success: false, message: `Comando "${command}" desconocido.` };
    }
}

function build(parts, state, map, faction) {
    if (parts.length < 3) {
        return { success: false, message: 'Formato: construir "Unidad" "Sistema"' };
    }
    const unitName = parts[1].replace(/"/g, '');
    const systemKey = parts[2].replace(/"/g, '');

    const unitData = gameData.units.find(u => u.name === unitName);
    if (!unitData) {
        return { success: false, message: `Unidad "${unitName}" desconocida.` };
    }

    const system = map[systemKey];
    if (!system || system.owner !== faction.factionId) {
        return { success: false, message: "No puedes construir en este sistema." };
    }

    if (faction.resources < unitData.cost) {
        return { success: false, message: "Recursos insuficientes." };
    }

    // Modificar el estado clonado
    faction.resources -= unitData.cost;
    let unitInSystem = system.units.find(u => u.name === unitName);
    if (unitInSystem) {
        unitInSystem.quantity += 1;
    } else {
        system.units.push({ name: unitName, quantity: 1, owner: faction.factionId });
    }

    return { 
        success: true, 
        message: `${unitName} construido en ${systemKey}.`,
        newState: state,
        newMap: map,
     };
}

module.exports = {
    processAction,
};