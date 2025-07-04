const socket = io();
let currentPlayer = null;
let visiblePlayerMap = {};

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('login-btn');
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            const playerName = document.getElementById('player-name-input').value.trim();
            if (playerName) {
                if (playerName === 'admin') {
                    document.getElementById('login-container').style.display = 'none';
                    document.getElementById('admin-container').style.display = 'block';
                    socket.emit('admin-login');
                } else {
                    socket.emit('player-login', playerName);
                }
            }
        });
    }

    const actionForm = document.getElementById('action-form');
    if (actionForm) {
        actionForm.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') return;
            e.preventDefault();
            // Lógica de acciones (se implementará más adelante)
        });
    }

    const restartButton = document.getElementById('restart-btn');
    if (restartButton) {
        restartButton.addEventListener('click', () => socket.emit('restart-game'));
    }

    const advanceTurnButton = document.getElementById('advance-turn-btn');
    if (advanceTurnButton) {
        advanceTurnButton.addEventListener('click', () => socket.emit('advance-turn'));
    }
});

// --- Socket Handlers ---
socket.on('static-data', (data) => {
    console.log("Datos estáticos recibidos:", data);
    populateFactionSelect(data.factions);
    populateSectorSelect(data.sectors);
});

socket.on('update-game-state', (state) => {
    console.log("Estado del juego recibido (admin):", state);
    const adminTurnCounter = document.getElementById('admin-turn-counter');
    if (adminTurnCounter) adminTurnCounter.textContent = state.turn;
    renderGameMapAdmin(state.map);
});

socket.on('login-success', (data) => {
    console.log('Login exitoso:', data);
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('player-container').style.display = 'block';
    
    currentPlayer = data.faction;
    visiblePlayerMap = data.map;
    
    renderPlayerInfo(data.faction);
    renderPlayerUnitsBySystem(data.faction.factionId, data.map);
    renderGameMapPlayer(data.map);
});

socket.on('update-player-view', (data) => {
    if (currentPlayer && currentPlayer.playerName === data.faction.playerName) {
        console.log("Vista del jugador actualizada:", data);
        currentPlayer = data.faction;
        visiblePlayerMap = data.map;
        renderPlayerInfo(data.faction);
        renderPlayerUnitsBySystem(data.faction.factionId, data.map);
        renderGameMapPlayer(data.map);
    }
});

// --- Funciones de Renderizado ---

function populateFactionSelect(factions) {
    const select = document.getElementById('faction-select');
    if (!select || select.options.length > 1) return;
    factions.forEach(faction => {
        const option = document.createElement('option');
        option.value = faction.id;
        option.textContent = faction.name;
        select.appendChild(option);
    });
}

function populateSectorSelect(sectors) {
    const select = document.getElementById('sector-select');
    if (!select || select.options.length > 1) return;
    sectors.forEach(sector => {
        const option = document.createElement('option');
        option.value = sector.color;
        option.textContent = `Sector ${sector.color}`;
        select.appendChild(option);
    });
}

function renderPlayerInfo(faction) {
    document.getElementById('player-faction-name').textContent = faction.factionId;
    document.getElementById('player-resources').textContent = faction.resources;
    document.getElementById('player-turn-counter').textContent = gameState.getState().turn; // Asumiendo que el turno viene del estado global
}

function renderGameMapAdmin(fullMap) {
    const mapContainer = document.getElementById('game-map-container');
    if (!mapContainer || !fullMap) return;
    mapContainer.innerHTML = '';

    const sectorSelect = document.getElementById('sector-select');
    const selectedColor = sectorSelect.value;

    Object.entries(fullMap).forEach(([key, system]) => {
        if (key.startsWith(selectedColor)) {
            const systemDiv = document.createElement('div');
            systemDiv.className = 'map-system';
            systemDiv.innerHTML = `<strong>${key}</strong>`;
            if (system.owner) {
                systemDiv.innerHTML += `<br>Ocupado: ${system.owner}`;
            }
            if (system.units.length > 0) {
                const unitsList = document.createElement('ul');
                system.units.forEach(unit => {
                    const li = document.createElement('li');
                    li.textContent = `${unit.name}: ${unit.quantity}`;
                    unitsList.appendChild(li);
                });
                systemDiv.appendChild(unitsList);
            }
            mapContainer.appendChild(systemDiv);
        }
    });
}

// El resto de funciones de renderizado (renderPlayerUnitsBySystem, renderGameMapPlayer) se mantienen como estaban.
function renderPlayerUnitsBySystem(factionId, playerMap) {
    const container = document.getElementById('player-units-container');
    if (!container) return;
    container.innerHTML = '<h3>Tus Unidades</h3>';

    const systemsWithUnits = {};
    for (const systemKey in playerMap) {
        const system = playerMap[systemKey];
        if (system.owner === factionId && system.units.length > 0) {
            systemsWithUnits[systemKey] = system.units;
        }
    }

    if (Object.keys(systemsWithUnits).length === 0) {
        container.innerHTML += '<p>No tienes unidades desplegadas.</p>';
        return;
    }

    const list = document.createElement('ul');
    for (const systemKey in systemsWithUnits) {
        const systemLi = document.createElement('li');
        systemLi.innerHTML = `<strong>${systemKey}</strong>`;
        const unitsUl = document.createElement('ul');
        systemsWithUnits[systemKey].forEach(unit => {
            const unitLi = document.createElement('li');
            unitLi.textContent = `${unit.name}: ${unit.quantity}`;
            unitsUl.appendChild(unitLi);
        });
        systemLi.appendChild(unitsUl);
        list.appendChild(systemLi);
    }
    container.appendChild(list);
}

function renderGameMapPlayer(playerMap) {
    const mapContainer = document.getElementById('player-map-container');
    if (!mapContainer) return;
    mapContainer.innerHTML = '';

    const sectors = [ // Esto debería venir de gameData, pero lo hardcodeamos por ahora
        { color: 'Violeta', systems: 60 }, { color: 'Marrón', systems: 55 }, 
        { color: 'Amarillo', systems: 50 }, { color: 'Rojo', systems: 45 }, 
        { color: 'Verde', systems: 40 }, { color: 'Azul', systems: 35 }, 
        { color: 'Naranja', systems: 30 }, { color: 'Blanco', systems: 25 }
    ];

    sectors.forEach(sector => {
        const sectorDiv = document.createElement('div');
        sectorDiv.className = 'map-sector';
        sectorDiv.innerHTML = `<h4>Sector ${sector.color}</h4>`;
        const systemsGrid = document.createElement('div');
        systemsGrid.className = 'systems-grid';

        for (let i = 1; i <= sector.systems; i++) {
            const systemKey = `${sector.color} ${i}`;
            const systemDiv = document.createElement('div');
            systemDiv.className = 'map-system';
            const systemData = playerMap[systemKey];
            if (systemData) {
                systemDiv.innerHTML = `<strong>${systemKey}</strong>`;
                if (systemData.owner) {
                     systemDiv.innerHTML += `<br><span class="owner-faction-${systemData.owner.toLowerCase()}">Ocupado por: ${systemData.owner}</span>`;
                     if (currentPlayer && systemData.owner === currentPlayer.factionId) {
                         systemDiv.classList.add('owned-by-player');
                     }
                }
                if (systemData.units && systemData.units.length > 0) {
                    const unitsList = document.createElement('ul');
                    systemData.units.forEach(unit => {
                        const li = document.createElement('li');
                        li.textContent = `${unit.name}: ${unit.quantity}`;
                        unitsList.appendChild(li);
                    });
                    systemDiv.appendChild(unitsList);
                }
            } else {
                systemDiv.innerHTML = `<strong>${systemKey}</strong>`;
                systemDiv.classList.add('fog-of-war');
            }
            systemsGrid.appendChild(systemDiv);
        }
        sectorDiv.appendChild(systemsGrid);
        mapContainer.appendChild(sectorDiv);
    });
}