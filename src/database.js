const sqlite3 = require('sqlite3').verbose();
const DB_PATH = './cosmos_game.db';

let db;

function initializeDatabase(callback) {
    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error("Error opening database:", err.message);
            return callback(err);
        }
        console.log("Database connected.");
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS factions (
                playerName TEXT PRIMARY KEY,
                factionId TEXT NOT NULL,
                resources INTEGER DEFAULT 0,
                units TEXT DEFAULT '[]'
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS systems (
                id TEXT PRIMARY KEY,
                owner TEXT,
                units TEXT DEFAULT '[]',
                buildings TEXT DEFAULT '[]'
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS game_state (
                turn INTEGER NOT NULL DEFAULT 1
            )`, (err) => {
                if (err) return callback(err);
                db.get("SELECT COUNT(*) as count FROM game_state", [], (err, row) => {
                    if (err) return callback(err);
                    if (row.count === 0) {
                        db.run("INSERT INTO game_state (turn) VALUES (1)", callback);
                    } else {
                        callback();
                    }
                });
            });
        });
    });
}

function get(query, params, callback) {
    if (!db) return callback(new Error("Database not initialized."));
    db.get(query, params, callback);
}

function all(query, params, callback) {
    if (!db) return callback(new Error("Database not initialized."));
    db.all(query, params, callback);
}

function run(query, params, callback = () => {}) {
    if (!db) return callback(new Error("Database not initialized."));
    db.run(query, params, callback);
}

module.exports = {
    initializeDatabase,
    get,
    all,
    run,
};