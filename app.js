/**
 * Futsal Stat - Приложение для ведения статистики матчей по мини-футболу
 * Этапы 3-4: Редактирование игроков, привязка голов, экран статистики
 */

// === Константы ===
const STORAGE_KEY = 'futsal_match_data';
const MAX_PLAYERS = 12;
const MIN_PLAYERS = 1;

// === Состояние приложения ===
let matchState = {
    team1Name: '',
    team2Name: '',
    score1: 0,
    score2: 0,
    periodDuration: 20, // в минутах
    currentTime: 0, // в секундах
    period: 1,
    isPaused: false,
    timerInterval: null,
    team1Players: [], // массив игроков {id, name, number}
    team2Players: [],
    events: [] // массив событий матча {id, teamId, scorerId, assistId, minute, timestamp}
};

// === DOM элементы ===
const newMatchScreen = document.getElementById('new-match-screen');
const matchScreen = document.getElementById('match-screen');
const statsScreen = document.getElementById('stats-screen');
const newMatchForm = document.getElementById('new-match-form');
const team1NameInput = document.getElementById('team1-name');
const team2NameInput = document.getElementById('team2-name');
const periodDurationInput = document.getElementById('period-duration');
const team1Display = document.getElementById('team1-display');
const team2Display = document.getElementById('team2-display');
const score1Display = document.getElementById('score1');
const score2Display = document.getElementById('score2');
const timerDisplay = document.getElementById('timer');
const periodDisplay = document.getElementById('period-display');
const pauseBtn = document.getElementById('pause-btn');
const finishBtn = document.getElementById('finish-btn');
const statsBtn = document.getElementById('stats-btn');
const backToMatchBtn = document.getElementById('back-to-match-btn');
const goalButtons = document.querySelectorAll('.btn-goal');

// Элементы для управления игроками
const addPlayerButtons = document.querySelectorAll('.btn-add-player');
const savePlayerButtons = document.querySelectorAll('.btn-save-player');
const cancelPlayerButtons = document.querySelectorAll('.btn-cancel-player');
const team1PlayersList = document.getElementById('team1-players-list');
const team2PlayersList = document.getElementById('team2-players-list');
const team1PlayerForm = document.getElementById('team1-player-form');
const team2PlayerForm = document.getElementById('team2-player-form');
const team1PlayerNameInput = document.getElementById('team1-player-name');
const team1PlayerNumberInput = document.getElementById('team1-player-number');
const team2PlayerNameInput = document.getElementById('team2-player-name');
const team2PlayerNumberInput = document.getElementById('team2-player-number');
const team1PlayersCount = document.getElementById('team1-players-count');
const team2PlayersCount = document.getElementById('team2-players-count');

// Элементы модального окна редактирования игрока
const editPlayerModal = document.getElementById('edit-player-modal');
const editPlayerIdInput = document.getElementById('edit-player-id');
const editPlayerTeamInput = document.getElementById('edit-player-team');
const editPlayerNameInput = document.getElementById('edit-player-name');
const editPlayerNumberInput = document.getElementById('edit-player-number');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Элементы модального окна гола
const goalModal = document.getElementById('goal-modal');
const goalModalTitle = document.getElementById('goal-modal-title');
const goalTeamIdInput = document.getElementById('goal-team-id');
const goalScorerSelect = document.getElementById('goal-scorer');
const goalAssistSelect = document.getElementById('goal-assist');
const confirmGoalBtn = document.getElementById('confirm-goal-btn');
const cancelGoalBtn = document.getElementById('cancel-goal-btn');

// Элементы экрана статистики
const statsTeam1Name = document.getElementById('stats-team1-name');
const statsTeam2Name = document.getElementById('stats-team2-name');
const statsTeam1Body = document.getElementById('stats-team1-body');
const statsTeam2Body = document.getElementById('stats-team2-body');
const statsTeam1Totals = document.getElementById('stats-team1-totals');
const statsTeam2Totals = document.getElementById('stats-team2-totals');

// === Инициализация приложения ===
function init() {
    // Проверяем, есть ли сохранённые данные в localStorage
    const savedData = localStorage.getItem(STORAGE_KEY);
    
    if (savedData) {
        // Если есть сохранённый матч, загружаем его
        matchState = JSON.parse(savedData);
        
        // Убеждаемся, что массив events существует (для совместимости со старыми данными)
        if (!matchState.events) {
            matchState.events = [];
        }
        
        showMatchScreen();
        updateDisplay();
        
        // Если таймер не на паузе и время ещё есть, запускаем таймер
        if (!matchState.isPaused && matchState.currentTime > 0) {
            startTimer();
        }
    } else {
        // Иначе показываем экран создания матча
        showNewMatchScreen();
    }
    
    // Обновляем списки игроков и счётчики
    updatePlayersListDisplay(1);
    updatePlayersListDisplay(2);
    updatePlayersCount(1);
    updatePlayersCount(2);
    
    // Навешиваем обработчики событий
    setupEventListeners();
}

// === Обработчики событий ===
function setupEventListeners() {
    // Создание нового матча
    newMatchForm.addEventListener('submit', handleNewMatch);
    
    // Добавление гола (теперь открывает модальное окно)
    goalButtons.forEach(button => {
        button.addEventListener('click', handleGoalButtonClick);
    });
    
    // Пауза/продолжение
    pauseBtn.addEventListener('click', handlePause);
    
    // Завершение матча
    finishBtn.addEventListener('click', handleFinishMatch);
    
    // Открытие экрана статистики
    statsBtn.addEventListener('click', showStatsScreen);
    
    // Возврат к матчу
    backToMatchBtn.addEventListener('click', () => {
        statsScreen.classList.add('hidden');
        matchScreen.classList.remove('hidden');
    });
    
    // Управление игроками - показ формы добавления
    addPlayerButtons.forEach(button => {
        button.addEventListener('click', handleShowPlayerForm);
    });
    
    // Сохранение игрока
    savePlayerButtons.forEach(button => {
        button.addEventListener('click', handleSavePlayer);
    });
    
    // Отмена добавления игрока
    cancelPlayerButtons.forEach(button => {
        button.addEventListener('click', handleCancelPlayerForm);
    });
    
    // Редактирование игрока - открытие модального окна
    saveEditBtn.addEventListener('click', handleSaveEditPlayer);
    cancelEditBtn.addEventListener('click', closeEditModal);
    
    // Модальное окно гола
    confirmGoalBtn.addEventListener('click', handleConfirmGoal);
    cancelGoalBtn.addEventListener('click', closeGoalModal);
}

// === Обработка создания нового матча ===
function handleNewMatch(e) {
    e.preventDefault();
    
    const team1Name = team1NameInput.value.trim();
    const team2Name = team2NameInput.value.trim();
    const periodDuration = parseInt(periodDurationInput.value);
    
    if (!team1Name || !team2Name || !periodDuration) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    // Проверяем минимальное количество игроков
    if (matchState.team1Players.length < MIN_PLAYERS) {
        alert(`Добавьте минимум ${MIN_PLAYERS} игрока в команду 1`);
        return;
    }
    if (matchState.team2Players.length < MIN_PLAYERS) {
        alert(`Добавьте минимум ${MIN_PLAYERS} игрока в команду 2`);
        return;
    }
    
    // Инициализируем состояние матча
    matchState = {
        team1Name: team1Name,
        team2Name: team2Name,
        score1: 0,
        score2: 0,
        periodDuration: periodDuration,
        currentTime: periodDuration * 60, // конвертируем минуты в секунды
        period: 1,
        isPaused: false,
        timerInterval: null,
        team1Players: [...matchState.team1Players],
        team2Players: [...matchState.team2Players],
        events: [] // начинаем с пустого массива событий
    };
    
    // Сохраняем в localStorage
    saveToStorage();
    
    // Переключаемся на экран матча
    showMatchScreen();
    updateDisplay();
    
    // Запускаем таймер
    startTimer();
}

// === Обработка нажатия кнопки "+1 гол" - открывает модальное окно ===
function handleGoalButtonClick(e) {
    const team = e.target.dataset.team;
    const teamName = team === '1' ? matchState.team1Name : matchState.team2Name;
    const players = team === '1' ? matchState.team1Players : matchState.team2Players;
    
    // Проверка: есть ли игроки в команде
    if (players.length === 0) {
        alert('Сначала добавьте игроков в команду');
        return;
    }
    
    // Заполняем модальное окно
    goalModalTitle.textContent = `Гол: ${teamName}`;
    goalTeamIdInput.value = team;
    
    // Заполняем селект автора гола
    goalScorerSelect.innerHTML = '<option value="">-- Выберите игрока --</option>';
    players.forEach(player => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.number 
            ? `${player.number}. ${escapeHtml(player.name)}` 
            : escapeHtml(player.name);
        goalScorerSelect.appendChild(option);
    });
    
    // Заполняем селект ассистента (те же игроки)
    goalAssistSelect.innerHTML = '<option value="">Нет</option>';
    players.forEach(player => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.number 
            ? `${player.number}. ${escapeHtml(player.name)}` 
            : escapeHtml(player.name);
        goalAssistSelect.appendChild(option);
    });
    
    // Сбрасываем значения
    goalScorerSelect.value = '';
    goalAssistSelect.value = '';
    
    // Показываем модальное окно
    goalModal.classList.remove('hidden');
}

// === Закрытие модального окна гола ===
function closeGoalModal() {
    goalModal.classList.add('hidden');
    goalScorerSelect.value = '';
    goalAssistSelect.value = '';
}

// === Подтверждение гола - запись события ===
function handleConfirmGoal() {
    const team = goalTeamIdInput.value;
    const scorerId = goalScorerSelect.value;
    const assistId = goalAssistSelect.value || null;
    
    // Проверка: автор гола обязателен
    if (!scorerId) {
        alert('Выберите автора гола');
        return;
    }
    
    // Проверка: ассистент не может быть тем же игроком
    if (assistId && assistId === scorerId) {
        alert('Ассистент не может быть тем же игроком, что и автор гола');
        return;
    }
    
    // Вычисляем текущую минуту матча
    const totalSeconds = matchState.periodDuration * 60;
    const elapsedSeconds = totalSeconds - matchState.currentTime;
    const currentMinute = Math.floor(elapsedSeconds / 60) + 1;
    
    // Создаём событие гола
    const goalEvent = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        teamId: `team${team}`,
        scorerId: parseInt(scorerId),
        assistId: assistId ? parseInt(assistId) : null,
        minute: currentMinute,
        timestamp: Date.now()
    };
    
    // Добавляем событие в массив
    matchState.events.push(goalEvent);
    
    // Увеличиваем счёт
    if (team === '1') {
        matchState.score1++;
    } else {
        matchState.score2++;
    }
    
    // Сохраняем и обновляем интерфейс
    saveToStorage();
    updateDisplay();
    
    // Закрываем модальное окно
    closeGoalModal();
}

// === Обработка добавления гола (старая функция, теперь не используется напрямую) ===
function handleGoal(e) {
    // Эта функция больше не вызывается напрямую
    // Вместо неё используется handleGoalButtonClick -> handleConfirmGoal
}

// === Обработка паузы ===
function handlePause() {
    if (matchState.isPaused) {
        // Продолжить
        matchState.isPaused = false;
        pauseBtn.textContent = 'Пауза';
        startTimer();
    } else {
        // Поставить на паузу
        matchState.isPaused = true;
        pauseBtn.textContent = 'Продолжить';
        stopTimer();
    }
    
    saveToStorage();
}

// === Обработка завершения матча ===
function handleFinishMatch() {
    if (confirm('Вы уверены, что хотите завершить матч? Все данные будут потеряны.')) {
        stopTimer();
        clearStorage();
        
        // Сбрасываем форму
        newMatchForm.reset();
        
        // Сбрасываем состояние игроков
        matchState.team1Players = [];
        matchState.team2Players = [];
        updatePlayersListDisplay(1);
        updatePlayersListDisplay(2);
        updatePlayersCount(1);
        updatePlayersCount(2);
        
        // Возвращаемся на стартовый экран
        showNewMatchScreen();
    }
}

// === Таймер ===
function startTimer() {
    // Очищаем предыдущий интервал, если был
    stopTimer();
    
    matchState.timerInterval = setInterval(() => {
        if (matchState.currentTime > 0 && !matchState.isPaused) {
            matchState.currentTime--;
            updateDisplay();
            saveToStorage();
            
            // Если время вышло
            if (matchState.currentTime === 0) {
                handlePeriodEnd();
            }
        }
    }, 1000);
}

function stopTimer() {
    if (matchState.timerInterval) {
        clearInterval(matchState.timerInterval);
        matchState.timerInterval = null;
    }
}

function handlePeriodEnd() {
    stopTimer();
    matchState.isPaused = true;
    pauseBtn.textContent = 'Продолжить';
    
    // Предлагаем перейти к следующему периоду
    const nextPeriod = matchState.period + 1;
    const userWantsToContinue = confirm(`Период ${matchState.period} завершён!\n\nПерейти к ${nextPeriod}-му периоду?`);
    
    if (userWantsToContinue) {
        matchState.period = nextPeriod;
        matchState.currentTime = matchState.periodDuration * 60;
        matchState.isPaused = false;
        pauseBtn.textContent = 'Пауза';
        updateDisplay();
        saveToStorage();
        startTimer();
    } else {
        updateDisplay();
        saveToStorage();
    }
}

// === Обновление отображения ===
function updateDisplay() {
    // Обновляем названия команд
    team1Display.textContent = matchState.team1Name;
    team2Display.textContent = matchState.team2Name;
    
    // Обновляем счёт
    score1Display.textContent = matchState.score1;
    score2Display.textContent = matchState.score2;
    
    // Обновляем таймер
    timerDisplay.textContent = formatTime(matchState.currentTime);
    
    // Обновляем номер периода
    periodDisplay.textContent = `${matchState.period}-й период`;
}

// === Форматирование времени (MM:SS) ===
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// === Переключение экранов ===
function showNewMatchScreen() {
    newMatchScreen.classList.remove('hidden');
    matchScreen.classList.add('hidden');
}

function showMatchScreen() {
    newMatchScreen.classList.add('hidden');
    matchScreen.classList.remove('hidden');
}

// === Работа с localStorage ===
function saveToStorage() {
    // Сохраняем всё кроме timerInterval (это функция, её нельзя сериализовать)
    const dataToSave = {
        team1Name: matchState.team1Name,
        team2Name: matchState.team2Name,
        score1: matchState.score1,
        score2: matchState.score2,
        periodDuration: matchState.periodDuration,
        currentTime: matchState.currentTime,
        period: matchState.period,
        isPaused: matchState.isPaused,
        team1Players: matchState.team1Players,
        team2Players: matchState.team2Players,
        events: matchState.events
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
}

function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
}

// === Управление игроками ===

// Показать форму добавления игрока
function handleShowPlayerForm(e) {
    const team = e.target.dataset.team;
    const form = team === '1' ? team1PlayerForm : team2PlayerForm;
    const inputName = team === '1' ? team1PlayerNameInput : team2PlayerNameInput;
    
    // Проверяем максимальное количество игроков
    const players = team === '1' ? matchState.team1Players : matchState.team2Players;
    if (players.length >= MAX_PLAYERS) {
        alert(`Максимум ${MAX_PLAYERS} игроков в команде`);
        return;
    }
    
    form.classList.remove('hidden');
    inputName.focus();
}

// Отменить добавление игрока
function handleCancelPlayerForm(e) {
    const team = e.target.dataset.team;
    const form = team === '1' ? team1PlayerForm : team2PlayerForm;
    const inputName = team === '1' ? team1PlayerNameInput : team2PlayerNameInput;
    const inputNumber = team === '1' ? team1PlayerNumberInput : team2PlayerNumberInput;
    
    form.classList.add('hidden');
    inputName.value = '';
    inputNumber.value = '';
}

// Сохранить игрока
function handleSavePlayer(e) {
    const team = e.target.dataset.team;
    const nameInput = team === '1' ? team1PlayerNameInput : team2PlayerNameInput;
    const numberInput = team === '1' ? team1PlayerNumberInput : team2PlayerNumberInput;
    const form = team === '1' ? team1PlayerForm : team2PlayerForm;
    
    const name = nameInput.value.trim();
    const number = numberInput.value.trim();
    
    if (!name) {
        alert('Введите имя игрока');
        return;
    }
    
    // Создаём объект игрока
    const player = {
        id: Date.now(), // уникальный ID на основе времени
        name: name,
        number: number ? parseInt(number) : null
    };
    
    // Добавляем в соответствующую команду
    if (team === '1') {
        matchState.team1Players.push(player);
    } else {
        matchState.team2Players.push(player);
    }
    
    // Очищаем форму и скрываем её
    nameInput.value = '';
    numberInput.value = '';
    form.classList.add('hidden');
    
    // Обновляем отображение
    updatePlayersListDisplay(team);
    updatePlayersCount(team);
    
    // Сохраняем в localStorage
    saveToStorage();
}

// Удалить игрока
function handleDeletePlayer(team, playerId) {
    if (team === '1') {
        matchState.team1Players = matchState.team1Players.filter(p => p.id !== playerId);
    } else {
        matchState.team2Players = matchState.team2Players.filter(p => p.id !== playerId);
    }
    
    updatePlayersListDisplay(team);
    updatePlayersCount(team);
    saveToStorage();
}

// Обновить список игроков на экране
function updatePlayersListDisplay(team) {
    const players = team === '1' ? matchState.team1Players : matchState.team2Players;
    const listElement = team === '1' ? team1PlayersList : team2PlayersList;
    
    if (players.length === 0) {
        listElement.innerHTML = '<p class="no-players">Нет игроков</p>';
        return;
    }
    
    listElement.innerHTML = players.map(player => `
        <div class="player-item">
            <div class="player-info">
                ${player.number ? `<span class="player-number">${player.number}</span>` : ''}
                <span class="player-name">${escapeHtml(player.name)}</span>
            </div>
            <div class="player-actions">
                <button class="btn-edit-player" onclick="openEditModal(${team}, ${player.id})">✏️</button>
                <button class="btn-delete-player" onclick="handleDeletePlayer(${team}, ${player.id})">Удалить</button>
            </div>
        </div>
    `).join('');
}

// Обновить счётчик игроков
function updatePlayersCount(team) {
    const players = team === '1' ? matchState.team1Players : matchState.team2Players;
    const countElement = team === '1' ? team1PlayersCount : team2PlayersCount;
    
    countElement.textContent = `${players.length} игроков (минимум ${MIN_PLAYERS}, максимум ${MAX_PLAYERS})`;
    
    // Визуально предупредить, если меньше минимума
    if (players.length < MIN_PLAYERS) {
        countElement.style.color = '#e74c3c';
    } else if (players.length >= MAX_PLAYERS) {
        countElement.style.color = '#f39c12';
    } else {
        countElement.style.color = 'rgba(255, 255, 255, 0.6)';
    }
}

// Экранирование HTML для защиты от XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// === Редактирование игроков ===

// Открыть модальное окно редактирования игрока
function openEditModal(team, playerId) {
    const players = team === '1' ? matchState.team1Players : matchState.team2Players;
    const player = players.find(p => p.id === playerId);
    
    if (!player) {
        alert('Игрок не найден');
        return;
    }
    
    // Заполняем форму данными игрока
    editPlayerIdInput.value = player.id;
    editPlayerTeamInput.value = team;
    editPlayerNameInput.value = player.name;
    editPlayerNumberInput.value = player.number || '';
    
    // Показываем модальное окно
    editPlayerModal.classList.remove('hidden');
}

// Закрыть модальное окно редактирования
function closeEditModal() {
    editPlayerModal.classList.add('hidden');
    editPlayerIdInput.value = '';
    editPlayerTeamInput.value = '';
    editPlayerNameInput.value = '';
    editPlayerNumberInput.value = '';
}

// Сохранить изменения игрока
function handleSaveEditPlayer() {
    const playerId = parseInt(editPlayerIdInput.value);
    const team = editPlayerTeamInput.value;
    const name = editPlayerNameInput.value.trim();
    const number = editPlayerNumberInput.value.trim();
    
    // Проверка: имя обязательно
    if (!name) {
        alert('Введите имя игрока');
        return;
    }
    
    // Проверка номера: от 1 до 99 если указан
    if (number) {
        const numValue = parseInt(number);
        if (isNaN(numValue) || numValue < 1 || numValue > 99) {
            alert('Номер должен быть от 1 до 99');
            return;
        }
    }
    
    // Получаем игроков команды
    const players = team === '1' ? matchState.team1Players : matchState.team2Players;
    
    // Проверка на дубликаты номеров (исключая текущего игрока)
    if (number) {
        const numValue = parseInt(number);
        const duplicate = players.find(p => p.number === numValue && p.id !== playerId);
        if (duplicate) {
            alert(`Номер ${numValue} уже занят игроком ${duplicate.name}`);
            return;
        }
    }
    
    // Обновляем данные игрока
    const playerIndex = players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
        players[playerIndex].name = name;
        players[playerIndex].number = number ? parseInt(number) : null;
        
        // Обновляем отображение
        updatePlayersListDisplay(team);
        updatePlayersCount(team);
        
        // Сохраняем в localStorage
        saveToStorage();
        
        // Закрываем модальное окно
        closeEditModal();
    }
}

// === Статистика игроков ===

// Показать экран статистики
function showStatsScreen() {
    // Устанавливаем названия команд
    statsTeam1Name.textContent = matchState.team1Name;
    statsTeam2Name.textContent = matchState.team2Name;
    
    // Рассчитываем и отображаем статистику
    renderTeamStats(1, matchState.team1Players);
    renderTeamStats(2, matchState.team2Players);
    
    // Переключаемся на экран статистики
    matchScreen.classList.add('hidden');
    statsScreen.classList.remove('hidden');
}

// Рассчитать и отобразить статистику команды
function renderTeamStats(teamNum, players) {
    const tbody = teamNum === '1' ? statsTeam1Body : statsTeam2Body;
    const totalsEl = teamNum === '1' ? statsTeam1Totals : statsTeam2Totals;
    const teamId = `team${teamNum}`;
    
    // Если нет игроков
    if (!players || players.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-stats-message">Нет данных</td></tr>';
        totalsEl.textContent = 'Всего: Г — 0, А — 0';
        return;
    }
    
    // Подсчёт статистики для каждого игрока
    const playerStats = players.map(player => {
        let goals = 0;
        let assists = 0;
        
        // Проходим по всем событиям матча
        matchState.events.forEach(event => {
            if (event.teamId === teamId) {
                if (event.scorerId === player.id) {
                    goals++;
                }
                if (event.assistId === player.id) {
                    assists++;
                }
            }
        });
        
        return {
            ...player,
            goals,
            assists,
            total: goals + assists
        };
    });
    
    // Сортировка: сначала по total (убывание), затем игроки без статистики ниже
    playerStats.sort((a, b) => {
        if (b.total !== a.total) {
            return b.total - a.total;
        }
        // Если total одинаковый, сортируем по имени
        return a.name.localeCompare(b.name);
    });
    
    // Находим максимальный total для определения лидера
    const maxTotal = Math.max(...playerStats.map(p => p.total), 0);
    
    // Генерируем HTML таблицы
    tbody.innerHTML = playerStats.map((player, index) => {
        const isLeader = player.total === maxTotal && player.total > 0;
        const leaderBadge = isLeader ? '<span class="leader-badge">🏆</span>' : '';
        const leaderClass = isLeader ? 'player-leader' : '';
        
        return `
            <tr class="${leaderClass}">
                <td>${player.number || '-'}</td>
                <td>${escapeHtml(player.name)}${leaderBadge}</td>
                <td>${player.goals}</td>
                <td>${player.assists}</td>
                <td><strong>${player.total}</strong></td>
                <td>—</td>
            </tr>
        `;
    }).join('');
    
    // Подсчёт итогов команды
    const totalGoals = playerStats.reduce((sum, p) => sum + p.goals, 0);
    const totalAssists = playerStats.reduce((sum, p) => sum + p.assists, 0);
    totalsEl.textContent = `Всего: Г — ${totalGoals}, А — ${totalAssists}`;
}

// === Запуск приложения ===
document.addEventListener('DOMContentLoaded', init);
