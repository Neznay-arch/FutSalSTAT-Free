// ============================================
// STORAGE
// ============================================
const Storage = {
    get(key, defaultValue) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }
};

// ============================================
// STATE
// ============================================
const state = {
    screen: 'new-match',
    modal: null,
    match: {
        id: null,
        createdAt: null,
        finishedAt: null,
        periodDuration: 1200,
        team1: {
            name: '',
            players: []
        },
        team2: {
            name: '',
            players: []
        }
    }
};

// ============================================
// ACTIONS
// ============================================
const Actions = {
    generatePlayerId() {
        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substring(2, 8);
        return `${timestamp}-${randomPart}`;
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    showAddPlayerForm(teamId) {
        const form = document.getElementById(`${teamId}-add-form`);
        if (form) {
            form.classList.remove('hidden');
        }
    },

    hideAddPlayerForm(teamId) {
        const form = document.getElementById(`${teamId}-add-form`);
        if (form) {
            form.classList.add('hidden');
            const nameInput = document.getElementById(`${teamId}-player-name-input`);
            const numberInput = document.getElementById(`${teamId}-player-number-input`);
            if (nameInput) nameInput.value = '';
            if (numberInput) numberInput.value = '';
        }
    },

    addPlayer(teamId) {
        const nameInput = document.getElementById(`${teamId}-player-name-input`);
        const numberInput = document.getElementById(`${teamId}-player-number-input`);
        
        if (!nameInput) return;
        
        const name = nameInput.value.trim();
        const number = numberInput && numberInput.value.trim() ? numberInput.value.trim() : '';

        if (!name) {
            alert('Имя обязательно');
            return;
        }

        const team = state.match[teamId];
        if (!team) return;

        if (team.players.length >= 12) {
            alert('Лимит: 12 игроков');
            return;
        }

        const player = {
            id: Actions.generatePlayerId(),
            name: name,
            number: number
        };

        team.players.push(player);
        Actions.hideAddPlayerForm(teamId);
        Render.renderPlayersList(teamId);
        Render.updatePlayerCount(teamId);
    },

    removePlayer(teamId, playerId) {
        const team = state.match[teamId];
        if (!team) return;

        team.players = team.players.filter(p => p.id !== playerId);
        Render.renderPlayersList(teamId);
        Render.updatePlayerCount(teamId);
    },

    setTeamName(teamId, name) {
        state.match[teamId].name = name;
    },

    showModal(type, payload) {
        state.modal = { type, payload };
        Render.renderModal();
    },

    hideModal() {
        state.modal = null;
        Render.renderModal();
    },

    navigateTo(screenId) {
        state.screen = screenId;
        Render.renderScreen(state.screen);
    }
};

// ============================================
// RENDER
// ============================================
const Render = {
    renderScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        const targetScreen = document.getElementById(`screen-${screenId}`);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
        }
    },

    renderModal() {
        const container = document.getElementById('modal-container');
        if (!container) return;

        if (state.modal) {
            const titleEl = document.getElementById('modal-title');
            const bodyEl = document.getElementById('modal-body');
            if (titleEl) titleEl.textContent = state.modal.payload.title || 'Заголовок';
            if (bodyEl) bodyEl.innerHTML = state.modal.payload.message || '';
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    },

    renderPlayersList(teamId) {
        const listEl = document.getElementById(`${teamId}-players-list`);
        if (!listEl) return;

        const team = state.match[teamId];
        if (!team) return;

        listEl.innerHTML = '';
        team.players.forEach(player => {
            const li = document.createElement('li');
            li.className = 'row';
            
            const playerInfo = document.createElement('span');
            const escapedName = Actions.escapeHtml(player.name);
            if (player.number) {
                playerInfo.textContent = `${escapedName} (#${player.number})`;
            } else {
                playerInfo.textContent = escapedName;
            }
            
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.textContent = '×';
            deleteBtn.setAttribute('data-action', 'remove-player');
            deleteBtn.setAttribute('data-team', teamId);
            deleteBtn.setAttribute('data-player-id', player.id);
            
            li.appendChild(playerInfo);
            li.appendChild(deleteBtn);
            listEl.appendChild(li);
        });
    },

    updatePlayerCount(teamId) {
        const countEl = document.getElementById(`${teamId}-count`);
        if (!countEl) return;

        const team = state.match[teamId];
        if (!team) return;

        countEl.textContent = team.players.length;
    },

    renderAll() {
        Render.renderScreen(state.screen);
        Render.renderModal();
        Render.renderPlayersList('team1');
        Render.renderPlayersList('team2');
        Render.updatePlayerCount('team1');
        Render.updatePlayerCount('team2');
    }
};

// ============================================
// EVENTS
// ============================================
document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.getAttribute('data-action');
    const team = button.getAttribute('data-team');
    const playerId = button.getAttribute('data-player-id');

    switch (action) {
        case 'show-add-player':
            if (team) Actions.showAddPlayerForm(team);
            break;
        case 'hide-add-player':
            if (team) Actions.hideAddPlayerForm(team);
            break;
        case 'add-player':
            if (team) Actions.addPlayer(team);
            break;
        case 'remove-player':
            if (team && playerId) Actions.removePlayer(team, playerId);
            break;
        case 'open-history':
            Actions.navigateTo('history');
            break;
        case 'back-to-menu':
            Actions.navigateTo('new-match');
            break;
        case 'back-to-match':
            Actions.navigateTo('match');
            break;
        case 'open-stats':
            Actions.navigateTo('stats');
            break;
        case 'close-modal':
            Actions.hideModal();
            break;
    }
});

document.addEventListener('input', (event) => {
    const target = event.target;
    
    if (target.id === 'team1-name-input') {
        Actions.setTeamName('team1', target.value);
    } else if (target.id === 'team2-name-input') {
        Actions.setTeamName('team2', target.value);
    }
});

// ============================================
// TIMER
// ============================================
// Таймер будет добавлен в Шаге 3

// ============================================
// INIT
// ============================================
function init() {
    Render.renderAll();
}

init();