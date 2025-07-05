const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Principio 1: Carga Centralizada. Cargamos los datos estáticos primero.
const gameData = require('./src/game_data'); 
const GameController = require('./src/game_controller');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Principio 2: Inyección de Dependencias. Pasamos los datos al controlador.
const gameController = new GameController(gameData);

// --- Lógica de Socket.IO ---
io.on('connection', (socket) => {
    console.log('Un cliente se ha conectado');

    socket.emit('static-data', { factions: gameData.factions, sectors: gameData.sectors });

    if (!gameController.isReady()) {
        socket.emit('server-not-ready', 'El servidor se está inicializando, por favor espera...');
    } else {
        socket.emit('server-ready');
    }

    socket.on('admin-login', () => {
        if (!gameController.isReady()) return;
        socket.join('admin_room');
        socket.emit('update-game-state', gameController.getFullState());
    });

    socket.on('player-login', (playerName) => {
        if (!gameController.isReady()) return;
        const playerView = gameController.getPlayerView(playerName);
        if (playerView) {
            socket.playerName = playerName;
            socket.emit('login-success', playerView);
        } else {
            socket.emit('login-fail');
        }
    });

    socket.on('player-action', (actionData) => {
        if (!gameController.isReady()) return;
        gameController.handlePlayerAction(actionData, (response) => {
            socket.emit('action-response', response);
            if (response.success) {
                gameController.broadcastGameState(io);
            }
        });
    });

    socket.on('restart-game', () => {
        console.log('Petición de reinicio recibida...');
        gameController.handleRestart((err) => {
            if (err) return console.error("Error al reiniciar:", err);
            gameController.broadcastGameState(io);
        });
    });
    
    socket.on('advance-turn', () => {
        console.log('Petición de avanzar turno recibida...');
        gameController.handleAdvanceTurn((err) => {
            if (err) return console.error("Error al avanzar turno:", err);
            gameController.broadcastGameState(io);
        });
    });

    socket.on('disconnect', () => console.log('Un cliente se ha desconectado'));
});

// --- Arranque del Servidor ---
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
    gameController.initialize((err) => {
        if (err) {
            console.error("FATAL: No se pudo inicializar el controlador del juego.", err);
            process.exit(1);
        }
        console.log("El juego está listo para aceptar conexiones y acciones.");
        io.emit('server-ready');
    });
});