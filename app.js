/**
 * Futsal Stat - Приложение для ведения статистики матчей по мини-футболу
 * Этап 1: Каркас приложения и табло матча
 */

// === Константы ===
const STORAGE_KEY = 'futsal_match_data';

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
    timerInterval: null
};

// === DOM элементы ===
const newMatchScreen = document.getElementById('new-match-screen');
const matchScreen = document.getElementById('match-screen');
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
const goalButtons = document.querySelectorAll('.btn-goal');

// === Инициализация приложения ===
function init() {
    // Проверяем, есть ли сохранённые данные в localStorage
    const savedData = localStorage.getItem(STORAGE_KEY);
    
    if (savedData) {
        // Если есть сохранённый матч, загружаем его
        matchState = JSON.parse(savedData);
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
    
    // Навешиваем обработчики событий
    setupEventListeners();
}

// === Обработчики событий ===
function setupEventListeners() {
    // Создание нового матча
    newMatchForm.addEventListener('submit', handleNewMatch);
    
    // Добавление гола
    goalButtons.forEach(button => {
        button.addEventListener('click', handleGoal);
    });
    
    // Пауза/продолжение
    pauseBtn.addEventListener('click', handlePause);
    
    // Завершение матча
    finishBtn.addEventListener('click', handleFinishMatch);
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
        timerInterval: null
    };
    
    // Сохраняем в localStorage
    saveToStorage();
    
    // Переключаемся на экран матча
    showMatchScreen();
    updateDisplay();
    
    // Запускаем таймер
    startTimer();
}

// === Обработка добавления гола ===
function handleGoal(e) {
    const team = e.target.dataset.team;
    
    if (team === '1') {
        matchState.score1++;
    } else if (team === '2') {
        matchState.score2++;
    }
    
    saveToStorage();
    updateDisplay();
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
        isPaused: matchState.isPaused
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
}

function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
}

// === Запуск приложения ===
document.addEventListener('DOMContentLoaded', init);
