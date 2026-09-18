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
        period: 1,
        score: { team1: 0, team2: 0 },
        fouls: { team1: 0, team2: 0 },
        timeouts: { team1: 0, team2: 0 },
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
    formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const pad = (num) => num.toString().padStart(2, '0');
        return `${pad(minutes)}:${pad(seconds)}`;
    },

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
    },

    startMatch() {
        // 1. Валидация названия первой команды
        const team1Name = state.match.team1.name.trim();
        if (!team1Name) {
            Actions.showModal('error', { title: 'Ошибка', message: 'Введите название первой команды' });
            return;
        }

        // 2. Валидация названия второй команды
        const team2Name = state.match.team2.name.trim();
        if (!team2Name) {
            Actions.showModal('error', { title: 'Ошибка', message: 'Введите название второй команды' });
            return;
        }

        // 3. Валидация игроков первой команды
        if (state.match.team1.players.length === 0) {
            Actions.showModal('error', { title: 'Ошибка', message: 'Добавьте хотя бы одного игрока в первую команду' });
            return;
        }

        // 4. Валидация игроков второй команды
        if (state.match.team2.players.length === 0) {
            Actions.showModal('error', { title: 'Ошибка', message: 'Добавьте хотя бы одного игрока во вторую команду' });
            return;
        }

        // 5. Валидация длительности периода
        const durationInput = document.getElementById('period-duration');
        const durationValue = durationInput ? parseInt(durationInput.value, 10) : 0;

        if (!durationValue || durationValue <= 0) {
            Actions.showModal('error', { title: 'Ошибка', message: 'Некорректная длительность периода' });
            return;
        }

        // Запись длительности в секундах
        state.match.periodDuration = durationValue * 60;

        // Генерация ID и времени создания, если матч новый
        if (!state.match.id) {
            state.match.id = Actions.generatePlayerId();
            state.match.createdAt = Date.now();
        }

        // Сброс игровых параметров перед стартом
        state.match.period = 1;
        state.match.score.team1 = 0;
        state.match.score.team2 = 0;
        state.match.fouls.team1 = 0;
        state.match.fouls.team2 = 0;
        state.match.timeouts.team1 = 0;
        state.match.timeouts.team2 = 0;

        // Переход на экран матча
        state.screen = 'match';
        Render.renderScreen(state.screen);
        Render.renderMatch();
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
    },

    renderMatch() {
        const match = state.match;

        // Названия команд (textContent для безопасности)
        const t1NameEl = document.getElementById('team1-name');
        const t2NameEl = document.getElementById('team2-name');
        if (t1NameEl) t1NameEl.textContent = match.team1.name;
        if (t2NameEl) t2NameEl.textContent = match.team2.name;

        // Счёт
        const s1El = document.getElementById('score-team1');
        const s2El = document.getElementById('score-team2');
        if (s1El) s1El.textContent = match.score.team1;
        if (s2El) s2El.textContent = match.score.team2;

        // Таймер (статичный на этом шаге)
        const timerEl = document.getElementById('timer-display');
        if (timerEl) timerEl.textContent = Actions.formatTime(match.periodDuration);

        // Период
        const periodEl = document.getElementById('period-display');
        if (periodEl) periodEl.textContent = `Период ${match.period}`;

        // Нарушения
        const f1El = document.getElementById('fouls-team1');
        const f2El = document.getElementById('fouls-team2');
        if (f1El) f1El.textContent = match.fouls.team1;
        if (f2El) f2El.textContent = match.fouls.team2;

        // Тайм-ауты
        const to1El = document.getElementById('timeouts-team1');
        const to2El = document.getElementById('timeouts-team2');
        if (to1El) to1El.textContent = match.timeouts.team1;
        if (to2El) to2El.textContent = match.timeouts.team2;

        // Индикаторы 10-метрового (скрыты безусловно до Шага 6)
        const sp1El = document.getElementById('second-penalty-team1');
        const sp2El = document.getElementById('second-penalty-team2');
        if (sp1El) sp1El.classList.add('hidden');
        if (sp2El) sp2El.classList.add('hidden');
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
        case 'start-match':
            Actions.startMatch();
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