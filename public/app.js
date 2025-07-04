const socket = io();

let currentPage = "";
let currentPlayerName = "";
let currentFullGameMap = {};
let currentGameState = {};

function initClient(type) {
  currentPage = type;
  console.log(`[CLIENT] Cliente inicializado como: ${currentPage}`);
  
  if (currentPage === "admin") {
    setupAdminListeners();
    socket.emit("requestInitialData");
  } else if (currentPage === "player") {
    setupPlayerListeners();
    const storedPlayerName = localStorage.getItem("currentPlayerName");
    if (storedPlayerName) {
      handlePlayerLogin(storedPlayerName);
    }
  }
}

// --- SOCKET.IO LISTENERS ---
socket.on("initialDataResponse", (data) => {
  console.log("[CLIENT] Datos iniciales recibidos:", data);
  currentGameState = data.gameState || {};
  currentFullGameMap = data.gameMap || {};
  const allSectorNames = Object.keys(currentFullGameMap);
  
  if (currentPage === "admin") {
    const sectorSelect = document.getElementById("sector-display-select");
    populateFactionSelect(document.getElementById("faction-select"), data.availableFactions);
    populateSectorSelect(sectorSelect, allSectorNames);
    updateAdminView(currentGameState);
  } else if (currentPage === "player") {
    const sectorSelectPlayer = document.getElementById("sector-display-select-player");
    populateSectorSelect(sectorSelectPlayer, allSectorNames);
    if (currentGameState.factions[currentPlayerName]) {
        updatePlayerView(currentGameState);
    }
  }
});

socket.on("gameStateUpdate", (gameState) => {
  console.log("[CLIENT] Actualización de gameState recibida.");
  currentGameState = gameState;
  if (currentPage === "admin") updateAdminView(gameState);
  else updatePlayerView(gameState);
});

socket.on("gameMapUpdate", (gameMapData) => {
  console.log("[CLIENT] Actualización de gameMap recibida.");
  currentFullGameMap = gameMapData;
  if (currentPage === "admin") {
      renderGameMap(currentFullGameMap, document.getElementById("sector-display-select").value);
  } else {
      // En el jugador, es mejor actualizar toda la vista para recalcular las listas de unidades
      updatePlayerView(currentGameState);
  }
});

// --- ADMIN ---
function setupAdminListeners() {
  document.getElementById("advance-turn-btn").addEventListener("click", () => socket.emit("adminAction", { action: "advanceTurn" }));
  document.getElementById("reset-game-btn").addEventListener("click", () => {
    if (confirm("¿Seguro que quieres reiniciar la partida?")) socket.emit("adminAction", { action: "reset" });
  });
  document.getElementById("add-faction-btn").addEventListener("click", () => {
    const playerName = document.getElementById("player-name-input").value.trim();
    const factionId = document.getElementById("faction-select").value;
    if (playerName && factionId) socket.emit("adminAction", { action: "addFaction", playerName, factionId });
  });
  document.getElementById("sector-display-select").addEventListener("change", (e) => renderGameMap(currentFullGameMap, e.target.value));
}

function updateAdminView(gameState) {
  document.getElementById("current-turn").textContent = gameState.turn;
  renderFactionsList(gameState.factions);
  renderGameMap(currentFullGameMap, document.getElementById("sector-display-select").value);
}

function renderFactionsList(factions) {
    const list = document.getElementById("factions-list");
    list.innerHTML = "";
    if (!factions || Object.keys(factions).length === 0) {
        list.innerHTML = "<li>No hay facciones asignadas.</li>";
        return;
    }
    for (const playerName in factions) {
        const faction = factions[playerName];
        const li = document.createElement("li");
        li.innerHTML = `<div><strong>${playerName}</strong> (${faction.name})</div> <div>Base: <strong>${faction.baseLocation}</strong></div>`;
        list.appendChild(li);
    }
}

// --- PLAYER ---
function setupPlayerListeners() {
  document.getElementById("access-faction-btn").addEventListener("click", () => {
    const name = document.getElementById("player-id-input").value.trim();
    if (name) handlePlayerLogin(name);
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    currentPlayerName = "";
    localStorage.removeItem("currentPlayerName");
    document.getElementById("player-login-section").classList.remove("hidden");
    document.getElementById("player-info-section").classList.add("hidden");
  });
  document.getElementById("send-order-btn").addEventListener("click", () => {
    const orderInput = document.getElementById("order-input");
    if (orderInput.value.trim() && currentPlayerName) {
      socket.emit("playerOrder", { playerName: currentPlayerName, order: orderInput.value.trim() });
      orderInput.value = "";
    }
  });
  document.getElementById("sector-display-select-player").addEventListener("change", (e) => renderGameMapPlayer(currentFullGameMap, e.target.value));
}

function handlePlayerLogin(name) {
  currentPlayerName = name;
  localStorage.setItem("currentPlayerName", name);
  socket.emit("requestInitialData");
}

function updatePlayerView(gameState) {
  if (currentPage !== 'player' || !currentPlayerName || !gameState.factions[currentPlayerName]) {
    return;
  }
  
  document.getElementById("player-login-section").classList.add("hidden");
  document.getElementById("player-info-section").classList.remove("hidden");

  const faction = gameState.factions[currentPlayerName];
  document.getElementById("current-turn-player").textContent = gameState.turn;
  document.getElementById("faction-name-display").textContent = faction.name;
  document.getElementById("player-resources-display").textContent = faction.resources;
  
  renderPlayerUnitsBySystem(currentFullGameMap, currentPlayerName);
  renderGameMapPlayer(currentFullGameMap, document.getElementById("sector-display-select-player").value);
}

// MEJORA: Muestra las unidades agrupadas por sistema.
function renderPlayerUnitsBySystem(gameMap, playerName) {
    const listContainer = document.getElementById("player-unit-list");
    listContainer.innerHTML = "";

    const systemsWithUnits = [];
    for (const sector in gameMap) {
        gameMap[sector].forEach(system => {
            if (system.occupiedBy === playerName) {
                const playerUnits = Object.entries(system.units || {}).filter(([, count]) => count > 0);
                if (playerUnits.length > 0) {
                    systemsWithUnits.push({
                        name: system.name,
                        units: playerUnits
                    });
                }
            }
        });
    }

    if (systemsWithUnits.length === 0) {
        listContainer.innerHTML = "<li>No tienes unidades desplegadas.</li>";
        return;
    }

    systemsWithUnits.forEach(system => {
        const systemLi = document.createElement("li");
        systemLi.className = "system-unit-group";
        
        let unitsHtml = "";
        system.units.forEach(([unitName, count]) => {
            unitsHtml += `<li>${unitName}: ${count}</li>`;
        });

        systemLi.innerHTML = `
            <div class="system-unit-header">${system.name}</div>
            <ul class="unit-sublist">${unitsHtml}</ul>
        `;
        listContainer.appendChild(systemLi);
    });
}

// --- MAP & UI HELPERS ---
function renderGameMap(gameMap, selectedSector) {
    const container = document.getElementById("game-map-display");
    container.innerHTML = "";
    if (!selectedSector || !gameMap[selectedSector]) {
        container.innerHTML = "<p>Selecciona un sector.</p>";
        return;
    }
    const systems = gameMap[selectedSector];
    const ul = document.createElement("ul");
    ul.className = "systems-list";
    systems.forEach(system => {
        const li = document.createElement("li");
        li.className = "system-item";
        let content = `<strong>${system.name}</strong>`;
        if (system.occupiedBy) content += ` - Ocupado por: <em>${system.occupiedBy}</em>`;
        const unitsInSystem = Object.entries(system.units || {}).map(([unit, count]) => count > 0 ? `${unit}: ${count}` : null).filter(Boolean).join(", ");
        if (unitsInSystem) content += `<br><small>Unidades: ${unitsInSystem}</small>`;
        li.innerHTML = content;
        ul.appendChild(li);
    });
    container.appendChild(ul);
}

// MEJORA: Muestra las unidades detalladas en el mapa del jugador.
function renderGameMapPlayer(gameMap, selectedSector) {
    const container = document.getElementById("game-map-display-player");
    container.innerHTML = "";
    if (!selectedSector || !gameMap[selectedSector]) {
        container.innerHTML = "<p>Selecciona un sector.</p>";
        return;
    }
    const systems = gameMap[selectedSector];
    const ul = document.createElement("ul");
    ul.className = "systems-list";
    systems.forEach(system => {
        const li = document.createElement("li");
        li.className = "system-item";
        let content = `<strong>${system.name}</strong>`;
        if (system.occupiedBy) {
            const unitsInSystem = Object.entries(system.units || {}).map(([unit, count]) => count > 0 ? `${unit}: ${count}` : null).filter(Boolean).join(", ");
            if (system.occupiedBy === currentPlayerName) {
                content += ` - <span style="color: var(--secondary-accent);">Tus Unidades</span>`;
                if (unitsInSystem) {
                    content += `<br><small>${unitsInSystem}</small>`;
                }
            } else {
                content += ` - <span style="color: var(--danger-accent);">Presencia Detectada</span>`;
            }
        }
        li.innerHTML = content;
        ul.appendChild(li);
    });
    container.appendChild(ul);
}

function populateSectorSelect(select, sectors) {
    const orderedSectors = ["Violeta", "Marrón", "Amarillo", "Rojo", "Verde", "Azul", "Naranja", "Blanco", "Negro", "Ciudadela"];
    select.innerHTML = "";
    if (!sectors || sectors.length === 0) return;
    orderedSectors.forEach(sectorName => {
        if (sectors.includes(sectorName)) {
            select.innerHTML += `<option value="${sectorName}">${sectorName}</option>`;
        }
    });
    select.dispatchEvent(new Event('change'));
}

function populateFactionSelect(select, factions) {
    select.innerHTML = '<option value="">Selecciona una facción</option>';
    for (const id in factions) {
        select.innerHTML += `<option value="${id}">${factions[id].name}</option>`;
    }
}