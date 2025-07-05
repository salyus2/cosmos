const db = require('./database');
const GameMap = require('./game_map');
// Ya no necesita gameData, se lo pasa el controlador

class GameState {
    constructor(gameData) {
        // Principio 2: Recibe la dependencia
        this.gameData = gameData;
        this._isReady = false;
        this._turn = 1;
        this._factions = [];
        this._map = {};
    }

    // --- Getters ---
    isReady() { return this._isReady; }
    getTurn() { return this._turn; }
    getFactions() { return this._factions; }
    getMap() { return this._map; }
    getFactionByPlayerName(name) { return this._factions.find(f => f.playerName === name); }
    getFactionById(id) { return this._factions.find(f => f.factionId === id); }

    // --- State Management ---
    updateState(newState, newMap) {
        this._factions = newState.factions;
        this._turn = newState.turn;
        this._map = newMap;
    }

    // --- Database Interaction ---
    load(callback) {
        db.initializeDatabase(err => {
            if (err) return callback(err);

            const turnQuery = "SELECT turn FROM game_state LIMIT 1";
            db.get(turnQuery, [], (err, turnRow) => {
                if (err) return callback(err);
                this._turn = turnRow ? turnRow.turn : 1;

                db.all("SELECT * FROM factions", [], (err, factionRows) => {
                    if (err) return callback(err);
                    this._factions = factionRows.map(r => ({ ...r, units: JSON.parse(r.units) }));

                    // Principio 2: Pasamos gameData a la función que lo necesita
                    GameMap.loadFromDB(this.gameData, (err, loadedMap) => {
                        if (err) return callback(err);
                        this._map = loadedMap;
                        this._isReady = true;
                        callback(null);
                    });
                });
            });
        });
    }

    save(callback) {
        const turnQuery = "UPDATE game_state SET turn = ?";
        db.run(turnQuery, [this._turn]);

        this._factions.forEach(faction => {
            const query = `UPDATE factions SET resources = ?, units = ? WHERE playerName = ?`;
            db.run(query, [faction.resources, JSON.stringify(faction.units), faction.playerName]);
        });
        
        Object.entries(this._map).forEach(([id, system]) => {
            const query = `UPDATE systems SET owner = ?, units = ?, buildings = ? WHERE id = ?`;
            db.run(query, [system.owner, JSON.stringify(system.units), JSON.stringify(system.buildings), id]);
        });
        
        console.log("Game state saved.");
        callback(null);
    }

    restart(callback) {
        this._isReady = false;
        db.run("DELETE FROM factions", []);
        db.run("DELETE FROM systems", []);
        db.run("UPDATE game_state SET turn = 1", [], () => {
            db.run(
                "INSERT INTO factions (playerName, factionId, resources, units) VALUES ('Xisco', 'European', 500, '[]')"
            );
            
            const newMap = GameMap.createInitial(this.gameData);
            newMap['Blanco 1'].owner = 'European';
            newMap['Blanco 1'].units.push({ name: 'Destructor Alfa', quantity: 5, owner: 'European' });

            const systemPromises = Object.entries(newMap).map(([id, system]) => {
                return new Promise((resolve, reject) => {
                    db.run(
                        "INSERT INTO systems (id, owner, units, buildings) VALUES (?, ?, ?, ?)",
                        [id, system.owner, JSON.stringify(system.units), JSON.stringify(system.buildings)],
                        (err) => err ? reject(err) : resolve()
                    );
                });
            });
            Promise.all(systemPromises).then(() => this.load(callback)).catch(callback);
        });
    }

    advanceTurn(callback) {
        this._turn += 1;
        this.save(callback);
    }
}

module.exports = GameState;