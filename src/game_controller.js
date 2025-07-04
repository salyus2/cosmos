const GameState = require('./game_state');
const GameActions = require('./game_actions');
const GameMap = require('./game_map');

class GameController {
    constructor() {
        this.gameState = new GameState();
    }

    initialize(callback) {
        this.gameState.load(callback);
    }

    isReady() {
        return this.gameState.isReady();
    }

    getFullState() {
        return {
            turn: this.gameState.getTurn(),
            factions: this.gameState.getFactions(),
            map: this.gameState.getMap(),
        };
    }

    getPlayerView(playerName) {
        const faction = this.gameState.getFactionByPlayerName(playerName);
        if (!faction) return null;

        const fullMap = this.gameState.getMap();
        const visibleMap = GameMap.getVisibleMapForPlayer(faction.factionId, fullMap);
        
        return { faction, map: visibleMap };
    }
    
    handlePlayerAction(actionData, callback) {
        const { factionId, action } = actionData;
        const currentState = this.getFullState();
        const faction = this.gameState.getFactionById(factionId);

        if (!faction) {
            return callback({ success: false, message: "Facción no encontrada." });
        }

        const result = GameActions.processAction(currentState, action, faction);

        if (!result.success) {
            return callback(result); // Devuelve el error de la acción
        }

        // Si la acción fue exitosa, actualiza el estado y guárdalo
        this.gameState.updateState(result.newState, result.newMap);
        this.gameState.save((err) => {
            if (err) {
                return callback({ success: false, message: "Error al guardar el estado del juego." });
            }
            callback({ success: true, message: result.message });
        });
    }

    handleAdvanceTurn(callback) {
        this.gameState.advanceTurn(callback);
    }

    handleRestart(callback) {
        this.gameState.restart(callback);
    }

    broadcastGameState(io) {
        const fullState = this.getFullState();
        
        io.to('admin_room').emit('update-game-state', fullState);

        fullState.factions.forEach(faction => {
            const playerSocket = this._findSocketByPlayerName(io, faction.playerName);
            if (playerSocket) {
                const playerView = this.getPlayerView(faction.playerName);
                playerSocket.emit('update-player-view', playerView);
            }
        });
    }

    _findSocketByPlayerName(io, playerName) {
        for (const [_, socket] of io.of("/").sockets) {
            if (socket.playerName === playerName) return socket;
        }
        return null;
    }
}

module.exports = GameController;