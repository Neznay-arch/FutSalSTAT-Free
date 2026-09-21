// ============================================================================
// СЛОЙ STORAGE
// ============================================================================
const Storage = {
  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Storage read error:', e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage write error:', e);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Storage remove error:', e);
    }
  }
};

// ============================================================================
// СЛОЙ STATE
// ============================================================================
const state = {
  screen: 'new-match',
  modal: null,
  match: {
    id: '',
    createdAt: null,
    finishedAt: null,
    periodDuration: 1200,
    period: 1,
    score: { team1: 0, team2: 0 },
    fouls: { team1: 0, team2: 0 },
    timeouts: { team1: 0, team2: 0 },
    events: [],
    timer: {
      remainingSec: 0,
      isRunning: false,
      lastTickAt: null
    },
    team1: { name: '', players: [] },
    team2: { name: '', players: [] }
  }
};

// ============================================================================
// СЛОЙ ACTIONS
// ============================================================================
const SECOND_PENALTY_FOULS = 5;
const FOUL_REASONS = ['Задержка соперника', 'Игра рукой', 'Опасная игра', 'Начальная позиция', 'Другое'];

const Actions = {
  formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  navigateTo(screenId) {
    state.screen = screenId;
    Render.renderScreen(state.screen);
  },

  showModal(type, payload) {
    state.modal = { type, payload };
    Render.renderModal();
  },

  hideModal() {
    state.modal = null;
    Render.renderModal();
  },

  showAddPlayerForm(teamId) {
    const formId = `${teamId}-add-form`;
    const form = document.getElementById(formId);
    if (form) {
      form.classList.remove('hidden');
    }
  },

  hideAddPlayerForm(teamId) {
    const formId = `${teamId}-add-form`;
    const form = document.getElementById(formId);
    if (form) {
      form.classList.add('hidden');
    }

    const nameInput = document.getElementById(`${teamId}-player-name-input`);
    const numberInput = document.getElementById(`${teamId}-player-number-input`);
    if (nameInput) nameInput.value = '';
    if (numberInput) numberInput.value = '';
  },

  addPlayer(teamId) {
    const nameInput = document.getElementById(`${teamId}-player-name-input`);
    const numberInput = document.getElementById(`${teamId}-player-number-input`);

    const name = nameInput ? nameInput.value.trim() : '';
    const number = numberInput ? numberInput.value.trim() : '';

    if (!name) {
      this.showModal('error', { title: 'Ошибка', message: 'Введите имя игрока' });
      return;
    }

    const team = state.match[teamId];
    if (team.players.length >= 12) {
      this.showModal('error', { title: 'Ошибка', message: 'Максимум 12 игроков в команде' });
      return;
    }

    const player = {
      id: this.generateId(),
      name: name,
      number: number
    };

    team.players.push(player);
    Render.renderPlayersList(teamId);
    Render.updatePlayerCount(teamId);
    this.hideAddPlayerForm(teamId);
  },

  removePlayer(teamId, playerId) {
    const team = state.match[teamId];
    team.players = team.players.filter(p => p.id !== playerId);
    Render.renderPlayersList(teamId);
    Render.updatePlayerCount(teamId);
  },

  setTeamName(teamId) {
    const input = document.getElementById(`${teamId}-name-input`);
    if (input) {
      state.match[teamId].name = input.value.trim();
    }
  },

  startMatch() {
    const team1Name = state.match.team1.name.trim();
    if (!team1Name) {
      this.showModal('error', { title: 'Ошибка', message: 'Введите название первой команды' });
      return;
    }

    const team2Name = state.match.team2.name.trim();
    if (!team2Name) {
      this.showModal('error', { title: 'Ошибка', message: 'Введите название второй команды' });
      return;
    }

    if (state.match.team1.players.length === 0) {
      this.showModal('error', { title: 'Ошибка', message: 'Добавьте хотя бы одного игрока в первую команду' });
      return;
    }

    if (state.match.team2.players.length === 0) {
      this.showModal('error', { title: 'Ошибка', message: 'Добавьте хотя бы одного игрока во вторую команду' });
      return;
    }

    const durationInput = document.getElementById('period-duration');
    const durationValue = durationInput ? parseInt(durationInput.value, 10) : 0;

    if (!durationValue || durationValue <= 0) {
      this.showModal('error', { title: 'Ошибка', message: 'Некорректная длительность периода' });
      return;
    }

    state.match.periodDuration = durationValue * 60;

    if (!state.match.id) {
      state.match.id = this.generateId();
      state.match.createdAt = Date.now();
    }

    state.match.period = 1;
    state.match.score.team1 = 0;
    state.match.score.team2 = 0;
    state.match.fouls.team1 = 0;
    state.match.fouls.team2 = 0;
    state.match.timeouts.team1 = 0;
    state.match.timeouts.team2 = 0;
    state.match.events = [];

    state.match.timer.remainingSec = state.match.periodDuration;
    state.match.timer.isRunning = false;
    state.match.timer.lastTickAt = null;

    state.screen = 'match';
    Render.renderScreen(state.screen);
    Render.renderMatch();
  },

  toggleTimer() {
    if (!state.match || !state.match.timer) return;

    const timer = state.match.timer;

    if (!timer.isRunning) {
      timer.isRunning = true;
      timer.lastTickAt = Date.now();
    } else {
      timer.isRunning = false;
      timer.lastTickAt = null;
    }

    Render.renderTimer();
  },

  startSecondPeriod() {
    // Право на 10-метровый выводится из fouls и сбрасывается автоматически вместе с ними; перенос активных штрафов (меньшинств после удалений) добавит шаг удалений, т.к. удалений ещё нет
    state.match.period = 2;
    state.match.fouls.team1 = 0;
    state.match.fouls.team2 = 0;
    state.match.timeouts.team1 = 0;
    state.match.timeouts.team2 = 0;
    state.match.timer.remainingSec = state.match.periodDuration;
    state.match.timer.isRunning = false;
    state.match.timer.lastTickAt = null;
    state.modal = null;
    Render.renderMatch();
    Render.renderModal();
  },

  openFoulModal() {
    state.modal = { type: 'foul', payload: { teamId: null, playerId: null, reason: null } };
    Render.renderModal();
  },

  selectFoulTeam(teamId) {
    if (state.modal && state.modal.type === 'foul') {
      state.modal.payload.teamId = teamId;
      state.modal.payload.playerId = null;
      Render.renderModal();
    }
  },

  selectFoulPlayer(playerId) {
    if (state.modal && state.modal.type === 'foul') {
      state.modal.payload.playerId = playerId;
      Render.renderModal();
    }
  },

  selectFoulReason(reason) {
    if (state.modal && state.modal.type === 'foul') {
      state.modal.payload.reason = reason;
      Render.renderModal();
    }
  },

  saveFoul() {
    if (!state.modal || state.modal.type !== 'foul') return;

    const payload = state.modal.payload;
    if (!payload.teamId || !payload.playerId || !payload.reason) {
      this.showModal('error', { title: 'Ошибка', message: 'Выберите команду, игрока и причину' });
      return;
    }

    const team = state.match[payload.teamId];
    team.fouls++;

    const timeSec = state.match.periodDuration - state.match.timer.remainingSec;
    state.match.events.push({
      type: 'foul',
      period: state.match.period,
      timeSec,
      teamId: payload.teamId,
      playerId: payload.playerId,
      reason: payload.reason
    });

    state.modal = null;
    Render.renderModal();
    Render.renderMatch();
  },

  tickTimer(now) {
    if (!state.match || !state.match.timer) return;

    const timer = state.match.timer;

    if (!timer.isRunning || !timer.lastTickAt) return;

    const elapsedMs = now - timer.lastTickAt;

    if (elapsedMs <= 0) return;

    const elapsedSec = Math.floor(elapsedMs / 1000);

    if (elapsedSec < 1) return;

    timer.remainingSec -= elapsedSec;
    timer.lastTickAt = now - (elapsedMs - elapsedSec * 1000);

    if (timer.remainingSec <= 0) {
      timer.remainingSec = 0;
      timer.isRunning = false;
      timer.lastTickAt = null;
      Render.renderTimer();
      if (state.match.period === 1) {
        this.showModal('period-end', { title: 'Конец первого периода', message: 'Первый период завершён.' });
      } else if (state.match.period === 2) {
        this.showModal('period-end', { title: 'Конец матча', message: 'Матч завершён.' });
      }
    } else {
      Render.renderTimer();
    }
  }
};

// ============================================================================
// СЛОЙ RENDER
// ============================================================================
const Render = {
  renderScreen(screenId) {
    const screens = ['new-match', 'match', 'stats', 'history'];
    screens.forEach(id => {
      const el = document.getElementById(`screen-${id}`);
      if (el) {
        if (id === screenId) {
          el.classList.remove('hidden');
        } else {
          el.classList.add('hidden');
        }
      }
    });
  },

  renderModal() {
    const container = document.getElementById('modal-container');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const closeBtn = document.getElementById('modal-close');

    if (!container || !titleEl || !bodyEl) return;

    if (!state.modal) {
      container.classList.add('hidden');
      if (closeBtn) closeBtn.classList.remove('hidden');
      return;
    }

    if (state.modal.type === 'period-end') {
      if (closeBtn) closeBtn.classList.add('hidden');
      titleEl.textContent = state.modal.payload.title;
      bodyEl.innerHTML = '';
      const period = state.match.period;
      if (period === 1) {
        const btn1 = document.createElement('button');
        btn1.type = 'button';
        btn1.setAttribute('data-action', 'start-second-period');
        btn1.textContent = 'Начать второй период';
        bodyEl.appendChild(btn1);
        const btn2 = document.createElement('button');
        btn2.type = 'button';
        btn2.setAttribute('data-action', 'finish-match');
        btn2.textContent = 'Завершить матч';
        bodyEl.appendChild(btn2);
      } else if (period === 2) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('data-action', 'finish-match');
        btn.textContent = 'Завершить матч';
        bodyEl.appendChild(btn);
      }
      container.classList.remove('hidden');
    } else if (state.modal.type === 'foul') {
      if (closeBtn) closeBtn.classList.remove('hidden');
      titleEl.textContent = 'Нарушение';
      bodyEl.innerHTML = '';

      const payload = state.modal.payload;
      const match = state.match;

      const teamLabel = document.createElement('div');
      teamLabel.style.marginBottom = '8px';
      const teamName = (payload.teamId && match[payload.teamId]) ? match[payload.teamId].name : '—';
      teamLabel.textContent = `Команда: ${teamName}`;
      bodyEl.appendChild(teamLabel);

      const teamBtn1 = document.createElement('button');
      teamBtn1.type = 'button';
      teamBtn1.setAttribute('data-action', 'select-foul-team');
      teamBtn1.setAttribute('data-team', 'team1');
      teamBtn1.textContent = 'Команда 1';
      teamBtn1.style.marginRight = '8px';
      bodyEl.appendChild(teamBtn1);

      const teamBtn2 = document.createElement('button');
      teamBtn2.type = 'button';
      teamBtn2.setAttribute('data-action', 'select-foul-team');
      teamBtn2.setAttribute('data-team', 'team2');
      teamBtn2.textContent = 'Команда 2';
      bodyEl.appendChild(teamBtn2);

      const playerLabel = document.createElement('div');
      playerLabel.style.marginBottom = '8px';
      playerLabel.style.marginTop = '12px';
      let playerName = '—';
      if (payload.teamId && payload.playerId && match[payload.teamId]) {
        const player = match[payload.teamId].players.find(p => p.id === payload.playerId);
        if (player) playerName = `${player.number ? player.number + '. ' : ''}${player.name}`;
      }
      playerLabel.textContent = `Игрок: ${playerName}`;
      bodyEl.appendChild(playerLabel);

      if (payload.teamId) {
        const players = match[payload.teamId].players;
        players.forEach(p => {
          const pBtn = document.createElement('button');
          pBtn.type = 'button';
          pBtn.setAttribute('data-action', 'select-foul-player');
          pBtn.setAttribute('data-player-id', p.id);
          pBtn.textContent = `${p.number ? p.number + '. ' : ''}${p.name}`;
          pBtn.style.display = 'block';
          pBtn.style.width = '100%';
          pBtn.style.marginBottom = '4px';
          pBtn.style.textAlign = 'left';
          bodyEl.appendChild(pBtn);
        });
      } else {
        const noTeamMsg = document.createElement('div');
        noTeamMsg.textContent = 'Сначала выберите команду';
        noTeamMsg.style.fontStyle = 'italic';
        noTeamMsg.style.color = '#888';
        bodyEl.appendChild(noTeamMsg);
      }

      const reasonLabel = document.createElement('div');
      reasonLabel.style.marginBottom = '8px';
      reasonLabel.style.marginTop = '12px';
      reasonLabel.textContent = `Причина: ${payload.reason || '—'}`;
      bodyEl.appendChild(reasonLabel);

      FOUL_REASONS.forEach(reason => {
        const rBtn = document.createElement('button');
        rBtn.type = 'button';
        rBtn.setAttribute('data-action', 'select-foul-reason');
        rBtn.setAttribute('data-reason', reason);
        rBtn.textContent = reason;
        rBtn.style.display = 'block';
        rBtn.style.width = '100%';
        rBtn.style.marginBottom = '4px';
        rBtn.style.textAlign = 'left';
        bodyEl.appendChild(rBtn);
      });

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.setAttribute('data-action', 'save-foul');
      saveBtn.textContent = 'Сохранить нарушение';
      saveBtn.style.marginTop = '16px';
      saveBtn.style.width = '100%';
      saveBtn.className = 'btn btn-primary';
      bodyEl.appendChild(saveBtn);

      container.classList.remove('hidden');
    } else {
      if (closeBtn) closeBtn.classList.remove('hidden');
      titleEl.textContent = state.modal.payload.title;
      bodyEl.textContent = state.modal.payload.message;
      container.classList.remove('hidden');
    }
  },

  renderPlayersList(teamId) {
    const listEl = document.getElementById(`${teamId}-players-list`);
    if (!listEl) return;

    const team = state.match[teamId];
    listEl.innerHTML = '';

    team.players.forEach(player => {
      const li = document.createElement('li');
      li.className = 'player-item';

      const infoSpan = document.createElement('span');
      infoSpan.textContent = `${player.number ? player.number + '. ' : ''}${player.name}`;

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'remove-player-btn';
      deleteBtn.textContent = '×';
      deleteBtn.setAttribute('data-action', 'remove-player');
      deleteBtn.setAttribute('data-team', teamId);
      deleteBtn.setAttribute('data-player-id', player.id);

      li.appendChild(infoSpan);
      li.appendChild(deleteBtn);
      listEl.appendChild(li);
    });
  },

  updatePlayerCount(teamId) {
    const countEl = document.getElementById(`${teamId}-count`);
    if (countEl) {
      countEl.textContent = state.match[teamId].players.length;
    }
  },

  renderMatch() {
    const match = state.match;

    const t1NameEl = document.getElementById('team1-name');
    const t2NameEl = document.getElementById('team2-name');
    if (t1NameEl) t1NameEl.textContent = match.team1.name;
    if (t2NameEl) t2NameEl.textContent = match.team2.name;

    const s1El = document.getElementById('score-team1');
    const s2El = document.getElementById('score-team2');
    if (s1El) s1El.textContent = match.score.team1;
    if (s2El) s2El.textContent = match.score.team2;

    const timerEl = document.getElementById('timer-display');
    if (timerEl) timerEl.textContent = Actions.formatTime(match.timer.remainingSec);

    const periodEl = document.getElementById('period-display');
    if (periodEl) periodEl.textContent = `Период ${match.period}`;

    const f1El = document.getElementById('fouls-team1');
    const f2El = document.getElementById('fouls-team2');
    if (f1El) f1El.textContent = match.fouls.team1;
    if (f2El) f2El.textContent = match.fouls.team2;

    const to1El = document.getElementById('timeouts-team1');
    const to2El = document.getElementById('timeouts-team2');
    if (to1El) to1El.textContent = match.timeouts.team1;
    if (to2El) to2El.textContent = match.timeouts.team2;

    const sp1El = document.getElementById('second-penalty-team1');
    const sp2El = document.getElementById('second-penalty-team2');

    if (sp1El) {
      sp1El.textContent = (match.fouls.team1 >= SECOND_PENALTY_FOULS ? '10м' : '—');
      sp1El.classList.remove('hidden');
    }
    if (sp2El) {
      sp2El.textContent = (match.fouls.team2 >= SECOND_PENALTY_FOULS ? '10м' : '—');
      sp2El.classList.remove('hidden');
    }
  },

  renderTimer() {
    const timerEl = document.getElementById('timer-display');
    if (timerEl && state.match && state.match.timer) {
      timerEl.textContent = Actions.formatTime(state.match.timer.remainingSec);
    }
  },

  renderAll() {
    this.renderScreen(state.screen);
    this.renderModal();
    this.renderPlayersList('team1');
    this.updatePlayerCount('team1');
    this.renderPlayersList('team2');
    this.updatePlayerCount('team2');
  }
};

// ============================================================================
// СЛОЙ EVENTS
// ============================================================================
const Events = {
  init() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');

      switch (action) {
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
        case 'show-add-player':
          Actions.showAddPlayerForm(btn.getAttribute('data-team'));
          break;
        case 'hide-add-player':
          Actions.hideAddPlayerForm(btn.getAttribute('data-team'));
          break;
        case 'add-player':
          Actions.addPlayer(btn.getAttribute('data-team'));
          break;
        case 'remove-player':
          Actions.removePlayer(btn.getAttribute('data-team'), btn.getAttribute('data-player-id'));
          break;
        case 'start-match':
          Actions.startMatch();
          break;
        case 'toggle-timer':
          Actions.toggleTimer();
          break;
        case 'start-second-period':
          Actions.startSecondPeriod();
          break;
        case 'finish-match':
          break;
        case 'close-modal':
          if (state.modal && state.modal.type === 'period-end') return;
          Actions.hideModal();
          break;
        case 'open-foul-modal':
          Actions.openFoulModal();
          break;
        case 'select-foul-team':
          Actions.selectFoulTeam(btn.getAttribute('data-team'));
          break;
        case 'select-foul-player':
          Actions.selectFoulPlayer(btn.getAttribute('data-player-id'));
          break;
        case 'select-foul-reason':
          Actions.selectFoulReason(btn.getAttribute('data-reason'));
          break;
        case 'save-foul':
          Actions.saveFoul();
          break;
      }
    });

    const team1Input = document.getElementById('team1-name-input');
    const team2Input = document.getElementById('team2-name-input');

    if (team1Input) {
      team1Input.addEventListener('input', () => Actions.setTeamName('team1'));
    }
    if (team2Input) {
      team2Input.addEventListener('input', () => Actions.setTeamName('team2'));
    }
  }
};

// ============================================================================
// СЛОЙ TIMER
// ============================================================================
const Timer = {
  init() {
    setInterval(() => {
      Actions.tickTimer(Date.now());
    }, 1000);
  }
};

// ============================================================================
// СЛОЙ INIT
// ============================================================================
const Init = {
  init() {
    Render.renderAll();
    Events.init();
    Timer.init();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Init.init);
} else {
  Init.init();
}
