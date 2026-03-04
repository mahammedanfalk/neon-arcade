// ===== Wordle — Neon Edition =====
(function () {
    'use strict';

    // 200 common 5-letter words
    const WORDS = [
        'about', 'above', 'acute', 'after', 'agree', 'alert', 'alien', 'align', 'allow', 'alone',
        'angel', 'anger', 'angle', 'apart', 'apple', 'arena', 'arise', 'armor', 'asset', 'award',
        'basic', 'beach', 'begin', 'being', 'below', 'bench', 'birth', 'black', 'blade', 'blank',
        'blast', 'blaze', 'bleed', 'blend', 'bless', 'blind', 'block', 'bloom', 'blown', 'blunt',
        'board', 'bonus', 'bound', 'brain', 'brand', 'brave', 'bread', 'break', 'breed', 'brick',
        'brief', 'bring', 'broad', 'brown', 'brush', 'buddy', 'build', 'burst', 'buyer', 'cable',
        'candy', 'carry', 'catch', 'cause', 'chain', 'chair', 'chaos', 'charm', 'chase', 'cheap',
        'check', 'chess', 'chief', 'child', 'china', 'choir', 'chunk', 'civic', 'claim', 'clash',
        'class', 'clean', 'clear', 'clerk', 'click', 'cliff', 'climb', 'cling', 'clock', 'clone',
        'close', 'cloud', 'coach', 'coast', 'color', 'comet', 'coral', 'count', 'court', 'cover',
        'craft', 'crane', 'crash', 'crawl', 'crazy', 'cream', 'creek', 'crisp', 'crown', 'crush',
        'curve', 'cycle', 'daily', 'dance', 'debut', 'decay', 'demon', 'depth', 'derby', 'devil',
        'diary', 'diner', 'dirty', 'donor', 'doubt', 'draft', 'drain', 'drama', 'drank', 'drawn',
        'dream', 'dress', 'dried', 'drift', 'drill', 'drink', 'drive', 'drone', 'drove', 'dwell',
        'eager', 'early', 'earth', 'elbow', 'elder', 'elite', 'empty', 'endow', 'enemy', 'enjoy',
        'enter', 'entry', 'equal', 'error', 'ethic', 'event', 'every', 'exact', 'exile', 'exist',
        'extra', 'fable', 'facet', 'faint', 'fairy', 'faith', 'false', 'feast', 'fiber', 'field',
        'fifth', 'fifty', 'fight', 'final', 'first', 'flame', 'flash', 'fleet', 'flesh', 'float',
        'flood', 'floor', 'flora', 'fluid', 'flush', 'focal', 'force', 'forge', 'forum', 'found',
        'frame', 'frank', 'fraud', 'fresh', 'front', 'frost', 'fruit', 'giant', 'given', 'glass',
    ];

    const VALID_WORDS = new Set(WORDS);

    const WORD_LENGTH = 5;
    const MAX_GUESSES = 6;
    const KB_ROWS = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
    ];

    // State
    let targetWord = '';
    let currentRow = 0;
    let currentCol = 0;
    let currentGuess = '';
    let gameOver = false;
    let tiles = []; // 2D array of tile elements
    let keyEls = {}; // Map of letter -> key element

    // Stats
    let stats = JSON.parse(localStorage.getItem('wordle-stats') || '{"played":0,"wins":0,"streak":0,"maxStreak":0}');

    // DOM
    const boardEl = document.getElementById('board');
    const kbEl = document.getElementById('keyboard');
    const messageEl = document.getElementById('message');
    const playedEl = document.getElementById('played-val');
    const winEl = document.getElementById('win-val');
    const streakEl = document.getElementById('streak-val');

    updateStatsDisplay();

    // ===== Init =====
    function init() {
        targetWord = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
        currentRow = 0;
        currentCol = 0;
        currentGuess = '';
        gameOver = false;
        tiles = [];
        keyEls = {};

        buildBoard();
        buildKeyboard();
        hideMessage();
    }

    // ===== Board =====
    function buildBoard() {
        boardEl.innerHTML = '';
        for (let r = 0; r < MAX_GUESSES; r++) {
            const row = document.createElement('div');
            row.className = 'board-row';
            tiles[r] = [];
            for (let c = 0; c < WORD_LENGTH; c++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                row.appendChild(tile);
                tiles[r][c] = tile;
            }
            boardEl.appendChild(row);
        }
    }

    // ===== Keyboard =====
    function buildKeyboard() {
        kbEl.innerHTML = '';
        for (const row of KB_ROWS) {
            const rowEl = document.createElement('div');
            rowEl.className = 'kb-row';
            for (const key of row) {
                const keyEl = document.createElement('button');
                keyEl.className = 'kb-key';
                keyEl.textContent = key;
                keyEl.dataset.key = key;
                if (key === 'ENTER' || key === '⌫') keyEl.classList.add('wide');

                keyEl.addEventListener('click', () => handleKey(key));
                rowEl.appendChild(keyEl);

                if (key.length === 1) keyEls[key] = keyEl;
            }
            kbEl.appendChild(rowEl);
        }
    }

    // ===== Input =====
    function handleKey(key) {
        if (gameOver) return;

        if (key === '⌫' || key === 'BACKSPACE') {
            deleteLetter();
        } else if (key === 'ENTER') {
            submitGuess();
        } else if (key.length === 1 && /^[A-Z]$/.test(key)) {
            addLetter(key);
        }
    }

    function addLetter(letter) {
        if (currentCol >= WORD_LENGTH) return;
        currentGuess += letter;
        tiles[currentRow][currentCol].textContent = letter;
        tiles[currentRow][currentCol].classList.add('filled');
        if (window.NeonSFX) NeonSFX.click();
        currentCol++;
    }

    function deleteLetter() {
        if (currentCol <= 0) return;
        currentCol--;
        currentGuess = currentGuess.slice(0, -1);
        tiles[currentRow][currentCol].textContent = '';
        tiles[currentRow][currentCol].classList.remove('filled');
    }

    function submitGuess() {
        if (currentGuess.length !== WORD_LENGTH) {
            showMessage('Not enough letters');
            shakeRow(currentRow);
            return;
        }

        if (!VALID_WORDS.has(currentGuess.toLowerCase())) {
            showMessage('Not in word list');
            shakeRow(currentRow);
            return;
        }

        // Evaluate guess
        const result = evaluateGuess(currentGuess, targetWord);
        revealRow(currentRow, result);

        // Update keyboard
        for (let i = 0; i < WORD_LENGTH; i++) {
            const letter = currentGuess[i];
            const keyEl = keyEls[letter];
            if (!keyEl) continue;

            // Correct > Present > Absent priority
            if (result[i] === 'correct') {
                keyEl.className = 'kb-key correct';
            } else if (result[i] === 'present' && !keyEl.classList.contains('correct')) {
                keyEl.className = 'kb-key present';
            } else if (result[i] === 'absent' && !keyEl.classList.contains('correct') && !keyEl.classList.contains('present')) {
                keyEl.className = 'kb-key absent';
            }
        }

        // Check win
        if (currentGuess === targetWord) {
            setTimeout(() => {
                showMessage(['Genius! 🧠', 'Brilliant! ✨', 'Great! 🎉', 'Nice! 👍', 'Close one! 😅', 'Phew! 😰'][currentRow]);
                if (window.NeonSFX) NeonSFX.win();
                gameOver = true;
                stats.played++;
                stats.wins++;
                stats.streak++;
                stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
                saveStats();
                updateStatsDisplay();

                // New game button after delay
                setTimeout(() => {
                    showMessage('🎉 You got it! Tap any key for a new game');
                    gameOver = 'won';
                }, 2000);
            }, WORD_LENGTH * 300 + 200);
            return;
        }

        currentRow++;
        currentCol = 0;
        currentGuess = '';

        // Check loss
        if (currentRow >= MAX_GUESSES) {
            setTimeout(() => {
                showMessage(`The word was: ${targetWord}`);
                if (window.NeonSFX) NeonSFX.gameOver();
                gameOver = true;
                stats.played++;
                stats.streak = 0;
                saveStats();
                updateStatsDisplay();

                setTimeout(() => {
                    showMessage(`${targetWord} — Tap any key for a new game`);
                    gameOver = 'lost';
                }, 2000);
            }, WORD_LENGTH * 300 + 200);
        }
    }

    function evaluateGuess(guess, target) {
        const result = new Array(WORD_LENGTH).fill('absent');
        const targetArr = target.split('');
        const guessArr = guess.split('');

        // First pass: exact matches
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (guessArr[i] === targetArr[i]) {
                result[i] = 'correct';
                targetArr[i] = null;
                guessArr[i] = null;
            }
        }

        // Second pass: present (wrong position)
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (guessArr[i] === null) continue;
            const idx = targetArr.indexOf(guessArr[i]);
            if (idx !== -1) {
                result[i] = 'present';
                targetArr[idx] = null;
            }
        }

        return result;
    }

    function revealRow(row, result) {
        for (let i = 0; i < WORD_LENGTH; i++) {
            setTimeout(() => {
                tiles[row][i].classList.add(result[i]);
            }, i * 300);
        }
        if (window.NeonSFX) setTimeout(() => NeonSFX.score(), WORD_LENGTH * 300);
    }

    function shakeRow(row) {
        for (let i = 0; i < WORD_LENGTH; i++) {
            tiles[row][i].classList.add('shake');
            setTimeout(() => tiles[row][i].classList.remove('shake'), 500);
        }
        if (window.NeonSFX) NeonSFX.wallBounce();
    }

    // ===== Messages =====
    function showMessage(text) {
        messageEl.textContent = text;
        messageEl.classList.remove('hidden');
    }

    function hideMessage() {
        messageEl.classList.add('hidden');
    }

    // ===== Stats =====
    function saveStats() {
        localStorage.setItem('wordle-stats', JSON.stringify(stats));
    }

    function updateStatsDisplay() {
        playedEl.textContent = stats.played;
        winEl.textContent = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
        streakEl.textContent = stats.streak;
    }

    // ===== Physical Keyboard =====
    document.addEventListener('keydown', (e) => {
        if (gameOver === 'won' || gameOver === 'lost') {
            init();
            return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        if (e.key === 'Enter') {
            handleKey('ENTER');
        } else if (e.key === 'Backspace') {
            handleKey('⌫');
        } else if (/^[a-zA-Z]$/.test(e.key)) {
            handleKey(e.key.toUpperCase());
        }
    });

    // Allow restarting from keyboard on end
    kbEl.addEventListener('click', (e) => {
        if (gameOver === 'won' || gameOver === 'lost') {
            init();
        }
    });

    // Mute
    const muteBtn = document.getElementById('mute-btn');
    const muteIcon = document.getElementById('mute-icon');
    if (muteBtn && muteIcon) {
        muteBtn.addEventListener('click', () => {
            if (!window.NeonSFX) return;
            const muted = NeonSFX.toggleMute();
            muteIcon.textContent = muted ? '🔇' : '🔊';
            muteBtn.style.borderColor = muted ? 'rgba(255,45,117,0.3)' : 'rgba(0,255,136,0.2)';
            muteBtn.style.color = muted ? '#ff2d75' : '#00ff88';
        });
    }

    // Bootstrap
    init();
})();
