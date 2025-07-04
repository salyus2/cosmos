const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const DB_PATH = path.join(__dirname, "..", "cosmos_game.db");
let db;

const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) { reject(err); } else { resolve({ id: this.lastID }); }
    });
});
const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) { reject(err); } else { resolve(row); }
    });
});
const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) { reject(err); } else { resolve(rows); }
    });
});

async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, async (err) => {
            if (err) return reject(err);
            try {
                await run(`CREATE TABLE IF NOT EXISTS game_state (id INTEGER PRIMARY KEY DEFAULT 1, turn INTEGER, gameStarted BOOLEAN)`);
                await run(`CREATE TABLE IF NOT EXISTS factions (playerName TEXT PRIMARY KEY, id TEXT, name TEXT, resources INTEGER, hero TEXT, baseUnits TEXT, baseLocation TEXT, location TEXT, units TEXT)`);
                await run(`CREATE TABLE IF NOT EXISTS systems (name TEXT PRIMARY KEY, id INTEGER, sector TEXT, type TEXT, occupiedBy TEXT, units TEXT, resources TEXT, isSpecialPlanet BOOLEAN, wasCollectedThisTurn BOOLEAN, isBlocked BOOLEAN)`);
                const state = await get("SELECT * FROM game_state WHERE id = 1");
                if (!state) await run("INSERT INTO game_state (id, turn, gameStarted) VALUES (1, 0, 0)");
                resolve();
            } catch (initErr) { reject(initErr); }
        });
    });
}

// CORRECCIÓN: Esta función ahora procesa el array y devuelve un OBJETO, que es lo que el cliente necesita.
async function getAllSystemsDB() {
    const rows = await all("SELECT * FROM systems");
    const gameMap = {};
    rows.forEach(row => {
        if (!gameMap[row.sector]) {
            gameMap[row.sector] = [];
        }
        const system = { ...row, units: JSON.parse(row.units || '{}'), resources: JSON.parse(row.resources || '{}'), isSpecialPlanet: !!row.isSpecialPlanet, wasCollectedThisTurn: !!row.wasCollectedThisTurn, isBlocked: !!row.isBlocked };
        gameMap[row.sector].push(system);
    });
    return gameMap;
}

// CORRECCIÓN: Esta función también devuelve un OBJETO para consistencia.
async function getAllFactionsDB() {
    const rows = await all("SELECT * FROM factions");
    const factions = {};
    rows.forEach(row => {
        factions[row.playerName] = { ...row, units: JSON.parse(row.units || '{}') };
    });
    return factions;
}

async function addFactionDB(faction) {
    if (!faction || !faction.playerName) return;
    const { playerName, id, name, resources, hero, baseUnits, baseLocation, location, units } = faction;
    return run(`INSERT INTO factions (playerName, id, name, resources, hero, baseUnits, baseLocation, location, units) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(playerName) DO UPDATE SET id=excluded.id, name=excluded.name, resources=excluded.resources, hero=excluded.hero, baseUnits=excluded.baseUnits, baseLocation=excluded.baseLocation, location=excluded.location, units=excluded.units`,
               [playerName, id, name, resources, hero, baseUnits, baseLocation, location, JSON.stringify(units || {})]);
}

async function resetAllSystemsStateDB(gameMap) {
    await run("DELETE FROM systems");
    const allSystemsFlat = Object.values(gameMap).flat();
    const insertPromises = allSystemsFlat.map(system => {
        const { name, id, sector, type, occupiedBy, units, resources, isSpecialPlanet, wasCollectedThisTurn, isBlocked } = system;
        return run(`INSERT INTO systems (name, id, sector, type, occupiedBy, units, resources, isSpecialPlanet, wasCollectedThisTurn, isBlocked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                   [name, id, sector, type, occupiedBy, JSON.stringify(units), JSON.stringify(resources), !!isSpecialPlanet, !!wasCollectedThisTurn, !!isBlocked]);
    });
    return Promise.all(insertPromises);
}

module.exports = {
    initializeDatabase,
    getAllSystemsDB,
    getAllFactionsDB,
    addFactionDB,
    resetAllSystemsStateDB,
    getGameStateDB: () => get("SELECT * FROM game_state WHERE id = 1"),
    updateGameStateDB: (turn, gameStarted) => run("UPDATE game_state SET turn = ?, gameStarted = ? WHERE id = 1", [turn, gameStarted ? 1 : 0]),
    removeFactionDB: (playerName) => run("DELETE FROM factions WHERE playerName = ?", [playerName]),
    updateSystemDB: (systemName, data) => {
        const fields = Object.keys(data);
        const values = Object.values(data).map(v => typeof v === 'object' ? JSON.stringify(v) : (v ? 1 : 0));
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        return run(`UPDATE systems SET ${setClause} WHERE name = ?`, [...values, systemName]);
    },
    resetGameStateDB: () => run("UPDATE game_state SET turn = 0, gameStarted = 0 WHERE id = 1"),
    run: run, 
};