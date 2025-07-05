const db = require('./database');

// NOTA: gameData se importa dentro de las funciones para evitar problemas de dependencias circulares.

/**
 * Creates a fresh map object based on game_data.
 * @returns {object} The initial map object.
 */
function createInitial() {
    const gameData = require('./game_data');
    const map = {};
    gameData.sectors.forEach(sector => {
        for (let i = 1; i <= sector.systems; i++) {
            const systemKey = `${sector.color} ${i}`;
            map[systemKey] = {
                owner: null,
                units: [],
                buildings: []
            };
        }
    });
    return map;
}

/**
 * Loads the map state from the database.
 * @param {function} callback - Callback with (err, map).
 */
function loadFromDB(callback) {
    const map = createInitial();
    db.all("SELECT * FROM systems", [], (err, rows) => {
        if (err) {
            console.error("Error loading map from DB:", err.message);
            return callback(err, null);
        }
        rows.forEach(row => {
            if (map[row.id]) {
                map[row.id] = {
                    owner: row.owner,
                    units: JSON.parse(row.units),
                    buildings: JSON.parse(row.buildings)
                };
            }
        });
        callback(null, map);
    });
}

/**
 * Gets all systems adjacent to a given system.
 * @param {string} systemKey - The key of the origin system (e.g., "Blanco 1").
 * @returns {string[]} An array of adjacent system keys.
 */
function getAdjacentSystems(systemKey) {
    const gameData = require('./game_data');
    const adjacent = new Set();
    const [sectorColor, systemNumberStr] = systemKey.split(' ');
    const systemNumber = parseInt(systemNumberStr, 10);
    const sectorData = gameData.sectors.find(s => s.color === sectorColor);
    const sectorIndex = gameData.sectors.findIndex(s => s.color === sectorColor);

    if (!sectorData) return [];

    const prevInSector = systemNumber === 1 ? sectorData.systems : systemNumber - 1;
    const nextInSector = systemNumber === sectorData.systems ? 1 : systemNumber + 1;
    adjacent.add(`${sectorColor} ${prevInSector}`);
    adjacent.add(`${sectorColor} ${nextInSector}`);

    const checkAdjacentSector = (index) => {
        if (index >= 0 && index < gameData.sectors.length) {
            const adjSector = gameData.sectors[index];
            if (systemNumber <= adjSector.systems) {
                adjacent.add(`${adjSector.color} ${systemNumber}`);
            }
        }
    };
    checkAdjacentSector(sectorIndex - 1);
    checkAdjacentSector(sectorIndex + 1);
    
    return Array.from(adjacent);
}

/**
 * Creates a filtered view of the map for a specific player (Fog of War).
 * @param {string} factionId - The ID of the faction viewing the map.
 * @param {object} fullMap - The complete game map object.
 * @returns {object} A map object containing only visible systems.
 */
function getVisibleMapForPlayer(factionId, fullMap) {
    const visibleMap = {};
    const visibleSystemKeys = new Set();

    for (const systemKey in fullMap) {
        if (fullMap[systemKey].owner === factionId) {
            visibleSystemKeys.add(systemKey);
            getAdjacentSystems(systemKey).forEach(adjKey => {
                if (fullMap[adjKey]) {
                    visibleSystemKeys.add(adjKey);
                }
            });
        }
    }
    
    for (const key of visibleSystemKeys) {
        visibleMap[key] = fullMap[key];
    }

    return visibleMap;
}

module.exports = {
    createInitial,
    loadFromDB,
    getAdjacentSystems,
    getVisibleMapForPlayer,
};