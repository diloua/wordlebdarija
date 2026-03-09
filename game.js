const DEBUG = true;
const WORD_LENGTH = 5;
const MAX_GUESSES = 7;

const board = document.getElementById('board');
const keyboard = document.getElementById('keyboard');
const toastContainer = document.getElementById('toast-container');
const helpModal = document.getElementById('help-modal');
const statsModal = document.getElementById('stats-modal');

let currentRow = 0;
let currentCol = 0;
let gameOver = false;
let solution = getDailyWord();
let dayNumber = getDailyNumber();
let guesses = [];
let evaluations = [];

const keyboardRows = [
  ['2', '3', '7', '9'],
  ['w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['Enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'Backspace']
];

const keyStates = {};

function init() {
  buildBoard();
  buildKeyboard();
  loadState();
  setupEventListeners();
}

function buildBoard() {
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement('div');
    row.classList.add('row');
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = document.createElement('div');
      tile.classList.add('tile');
      tile.dataset.row = r;
      tile.dataset.col = c;
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

function buildKeyboard() {
  keyboardRows.forEach((row, i) => {
    const rowEl = document.createElement('div');
    rowEl.classList.add('keyboard-row');
    if (i === 0) rowEl.classList.add('number-row');

    row.forEach(key => {
      const btn = document.createElement('button');
      btn.classList.add('key');
      btn.dataset.key = key;

      if (key === 'Enter' || key === 'Backspace') {
        btn.classList.add('wide');
        btn.textContent = key === 'Enter' ? 'Enter' : '⌫';
      } else {
        btn.textContent = key;
        if (i === 0) btn.classList.add('number-key');
      }

      rowEl.appendChild(btn);
    });

    keyboard.appendChild(rowEl);
  });
}

function setupEventListeners() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') handleEnter();
    else if (e.key === 'Backspace') handleBackspace();
    else if (e.key.length === 1 && isValidChar(e.key)) handleChar(e.key.toLowerCase());
  });

  keyboard.addEventListener('click', e => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    const key = btn.dataset.key;
    if (key === 'Enter') handleEnter();
    else if (key === 'Backspace') handleBackspace();
    else handleChar(key);
  });

  document.getElementById('help-btn').addEventListener('click', () => helpModal.hidden = false);
  document.getElementById('stats-btn').addEventListener('click', () => {
    renderStats();
    statsModal.hidden = false;
  });

  helpModal.querySelector('.modal-close').addEventListener('click', () => helpModal.hidden = true);
  statsModal.querySelector('.modal-close').addEventListener('click', () => statsModal.hidden = true);

  [helpModal, statsModal].forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.hidden = true;
    });
  });

  document.getElementById('share-btn').addEventListener('click', shareResults);
}

function getTile(row, col) {
  return board.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
}

function getRow(row) {
  return board.children[row];
}

function handleChar(ch) {
  if (gameOver || currentCol >= WORD_LENGTH) return;
  const tile = getTile(currentRow, currentCol);
  tile.textContent = ch;
  tile.dataset.state = 'tbd';
  tile.classList.remove('pop');
  void tile.offsetWidth;
  tile.classList.add('pop');
  currentCol++;
}

function handleBackspace() {
  if (gameOver || currentCol === 0) return;
  currentCol--;
  const tile = getTile(currentRow, currentCol);
  tile.textContent = '';
  delete tile.dataset.state;
}

function handleEnter() {
  if (gameOver) return;
  if (currentCol < WORD_LENGTH) {
    shakeRow(currentRow);
    showToast('Not enough letters');
    return;
  }

  const guess = getCurrentGuess();
  if (!isValidWord(guess)) {
    shakeRow(currentRow);
    showToast('Not in word list');
    return;
  }

  const evaluation = evaluate(guess, solution);
  guesses.push(guess);
  evaluations.push(evaluation);
  revealRow(currentRow, evaluation, () => {
    updateKeyboard(guess, evaluation);

    if (guess === solution) {
      gameOver = true;
      const messages = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Nice!', 'Phew!'];
      bounceRow(currentRow - 1, () => {
        showToast(messages[currentRow - 1] || 'Phew!');
        setTimeout(() => { renderStats(); statsModal.hidden = false; }, 2000);
      });
      saveState();
      return;
    }

    if (currentRow >= MAX_GUESSES) {
      gameOver = true;
      showToast(solution.toUpperCase(), 3000);
      setTimeout(() => { renderStats(); statsModal.hidden = false; }, 3500);
      saveState();
      return;
    }

    saveState();
  });

  currentRow++;
  currentCol = 0;
}

function getCurrentGuess() {
  let word = '';
  for (let c = 0; c < WORD_LENGTH; c++) {
    word += getTile(currentRow, c).textContent;
  }
  return word.toLowerCase();
}

// Two-pass evaluation: first mark correct (green), then present (yellow)
function evaluate(guess, answer) {
  const result = Array(WORD_LENGTH).fill('absent');
  const answerChars = answer.split('');
  const guessChars = guess.split('');

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = 'correct';
      answerChars[i] = null;
      guessChars[i] = null;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === null) continue;
    const idx = answerChars.indexOf(guessChars[i]);
    if (idx !== -1) {
      result[i] = 'present';
      answerChars[idx] = null;
    }
  }

  return result;
}

function revealRow(row, evaluation, onComplete) {
  const tiles = [];
  for (let c = 0; c < WORD_LENGTH; c++) tiles.push(getTile(row, c));

  tiles.forEach((tile, i) => {
    setTimeout(() => {
      tile.classList.add('flip-in');

      tile.addEventListener('animationend', function onFlipIn() {
        tile.removeEventListener('animationend', onFlipIn);
        tile.classList.remove('flip-in');
        tile.dataset.state = evaluation[i];
        tile.classList.add('flip-out');

        tile.addEventListener('animationend', function onFlipOut() {
          tile.removeEventListener('animationend', onFlipOut);
          tile.classList.remove('flip-out');
          if (i === WORD_LENGTH - 1 && onComplete) onComplete();
        });
      });
    }, i * 200);
  });
}

function shakeRow(row) {
  const rowEl = getRow(row);
  rowEl.classList.remove('shake');
  void rowEl.offsetWidth;
  rowEl.classList.add('shake');
  rowEl.addEventListener('animationend', () => rowEl.classList.remove('shake'), { once: true });
}

function bounceRow(row, onComplete) {
  const tiles = [];
  for (let c = 0; c < WORD_LENGTH; c++) tiles.push(getTile(row, c));

  tiles.forEach((tile, i) => {
    setTimeout(() => {
      tile.classList.add('bounce');
      tile.addEventListener('animationend', () => {
        tile.classList.remove('bounce');
        if (i === WORD_LENGTH - 1 && onComplete) onComplete();
      }, { once: true });
    }, i * 100);
  });
}

function updateKeyboard(guess, evaluation) {
  const priority = { correct: 3, present: 2, absent: 1 };

  for (let i = 0; i < WORD_LENGTH; i++) {
    const ch = guess[i];
    const state = evaluation[i];
    const current = keyStates[ch];
    if (!current || priority[state] > priority[current]) {
      keyStates[ch] = state;
      const keyEl = keyboard.querySelector(`.key[data-key="${ch}"]`);
      if (keyEl) keyEl.dataset.state = state;
    }
  }
}

function showToast(msg, duration = 1500) {
  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.textContent = msg;
  toastContainer.prepend(toast);

  setTimeout(() => {
    toast.classList.add('fade');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}

function getStats() {
  const stored = localStorage.getItem('wordle-bdarija-stats');
  if (stored) return JSON.parse(stored);
  return {
    played: 0,
    won: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }
  };
}

function saveStats(stats) {
  localStorage.setItem('wordle-bdarija-stats', JSON.stringify(stats));
}

function updateStats(won, numGuesses) {
  const stats = getStats();
  stats.played++;
  if (won) {
    stats.won++;
    stats.currentStreak++;
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.distribution[numGuesses]++;
  } else {
    stats.currentStreak = 0;
  }
  saveStats(stats);
}

function renderStats() {
  const stats = getStats();
  const winPct = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;

  const statsRow = document.getElementById('stats-row');
  statsRow.innerHTML = [
    { value: stats.played, label: 'Played' },
    { value: winPct, label: 'Win %' },
    { value: stats.currentStreak, label: 'Current Streak' },
    { value: stats.maxStreak, label: 'Max Streak' }
  ].map(s => `<div class="stat"><div class="value">${s.value}</div><div class="label">${s.label}</div></div>`).join('');

  const dist = document.getElementById('guess-distribution');
  const maxVal = Math.max(1, ...Object.values(stats.distribution));
  const lastGuess = gameOver && guesses[guesses.length - 1] === solution ? guesses.length : -1;

  dist.innerHTML = '';
  for (let i = 1; i <= MAX_GUESSES; i++) {
    const count = stats.distribution[i];
    const pct = Math.max(8, (count / maxVal) * 100);
    const highlight = i === lastGuess ? ' highlight' : '';
    dist.innerHTML += `<div class="dist-row">
      <span class="guess-num">${i}</span>
      <div class="bar${highlight}" style="width:${pct}%">${count}</div>
    </div>`;
  }

  document.getElementById('share-btn').style.display = gameOver ? 'block' : 'none';
}

function shareResults() {
  const emojiMap = { correct: '🟩', present: '🟨', absent: '⬛' };
  const won = guesses[guesses.length - 1] === solution;
  const score = won ? guesses.length : 'X';

  let text = `Wordle B'Darija #${dayNumber} ${score}/${MAX_GUESSES}\n\n`;
  evaluations.forEach(ev => {
    text += ev.map(s => emojiMap[s]).join('') + '\n';
  });

  navigator.clipboard.writeText(text.trim()).then(() => {
    showToast('Copied to clipboard');
  }).catch(() => {
    showToast('Could not copy');
  });
}

function saveState() {
  const won = guesses.length > 0 && guesses[guesses.length - 1] === solution;
  const lost = gameOver && !won;

  if (gameOver) {
    updateStats(won, guesses.length);
  }

  localStorage.setItem('wordle-bdarija-state', JSON.stringify({
    day: dayNumber,
    guesses,
    evaluations,
    gameOver,
    currentRow,
    currentCol
  }));
}

function loadState() {
  const stored = localStorage.getItem('wordle-bdarija-state');
  if (!stored) return;

  const state = JSON.parse(stored);
  if (state.day !== dayNumber) {
    localStorage.removeItem('wordle-bdarija-state');
    return;
  }

  guesses = state.guesses;
  evaluations = state.evaluations;
  gameOver = state.gameOver;
  currentRow = state.currentRow;
  currentCol = state.currentCol;

  guesses.forEach((guess, r) => {
    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = getTile(r, c);
      tile.textContent = guess[c];
      tile.dataset.state = evaluations[r][c];
    }
    updateKeyboard(guess, evaluations[r]);
  });
}

function resetGame() {
  localStorage.removeItem('wordle-bdarija-state');
  location.reload();
}

if (DEBUG) {
  const btn = document.createElement('button');
  btn.textContent = '↻ Reset';
  btn.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:9999;padding:6px 12px;font-size:12px;background:#e53935;color:#fff;border:none;border-radius:4px;cursor:pointer;opacity:0.7';
  btn.addEventListener('click', resetGame);
  document.body.appendChild(btn);
  console.log('Solution:', solution);
}

init();
