// ===== Minesweeper — Neon Edition =====
(function () {
    'use strict';

    const DIFFICULTIES = {
        easy: { rows: 9, cols: 9, mines: 10 },
        medium: { rows: 16, cols: 16, mines: 40 },
        hard: { rows: 16, cols: 30, mines: 99 },
    };

    let difficulty = 'easy';
    let rows, cols, totalMines;
    let grid = [];       // 2D array of cell data
    let cellEls = [];    // 2D array of DOM elements
    let revealed = 0;
    let flagged = 0;
    let gameRunning = false;
    let gameOver = false;
    let firstClick = true;
    let timerInterval = null;
    let startTime = 0;

    // DOM
    const boardEl = document.getElementById('board');
    const minesEl = document.getElementById('mines-val');
    const timeEl = document.getElementById('time-val');
    const bestEl = document.getElementById('best-val');
    const overlay = document.getElementById('overlay');
    const overlayIcon = document.getElementById('overlay-icon');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayInfo = document.getElementById('overlay-info');
    const playBtn = document.getElementById('play-btn');

    // Load best time
    function loadBest() {
        const b = localStorage.getItem(`ms-best-${difficulty}`);
        bestEl.textContent = b ? formatTime(parseInt(b, 10)) : '—';
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // ===== Difficulty Selector =====
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            difficulty = btn.dataset.diff;
            loadBest();
            setupGame();
        });
    });

    // ===== Setup =====
    function setupGame() {
        const d = DIFFICULTIES[difficulty];
        rows = d.rows;
        cols = d.cols;
        totalMines = d.mines;

        grid = [];
        cellEls = [];
        revealed = 0;
        flagged = 0;
        gameRunning = true;
        gameOver = false;
        firstClick = true;
        minesEl.textContent = totalMines;
        timeEl.textContent = '0:00';
        clearInterval(timerInterval);

        boardEl.innerHTML = '';
        boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        // Dynamic cell sizing based on screen width
        const screenW = window.innerWidth;
        const boardPadding = 24; // board padding + outer padding
        const gap = 2; // grid gap
        const availableW = Math.min(screenW - boardPadding, 700 - boardPadding);
        const cellSize = Math.min(32, Math.floor((availableW - gap * (cols - 1)) / cols));
        boardEl.style.setProperty('--cell-size', cellSize + 'px');
        boardEl.style.setProperty('--cell-font', Math.max(0.4, cellSize * 0.022) + 'rem');

        for (let r = 0; r < rows; r++) {
            grid[r] = [];
            cellEls[r] = [];
            for (let c = 0; c < cols; c++) {
                grid[r][c] = { mine: false, count: 0, revealed: false, flagged: false };
                const el = document.createElement('div');
                el.className = 'cell';
                el.dataset.r = r;
                el.dataset.c = c;

                // Left click to reveal
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleClick(r, c);
                });

                // Right click to flag
                el.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    handleFlag(r, c);
                });

                // Long press for mobile flag
                let longPressTimer = null;
                el.addEventListener('touchstart', (e) => {
                    longPressTimer = setTimeout(() => {
                        e.preventDefault();
                        handleFlag(r, c);
                        longPressTimer = null;
                    }, 500);
                }, { passive: false });
                el.addEventListener('touchend', (e) => {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                });
                el.addEventListener('touchmove', () => {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                });

                boardEl.appendChild(el);
                cellEls[r][c] = el;
            }
        }

        overlay.classList.add('hidden');
    }

    // ===== Place Mines (after first click) =====
    function placeMines(safeR, safeC) {
        let placed = 0;
        while (placed < totalMines) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);
            // Don't place on safe zone (3x3 around first click)
            if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
            if (grid[r][c].mine) continue;
            grid[r][c].mine = true;
            placed++;
        }

        // Calculate neighbor counts
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c].mine) continue;
                let count = 0;
                forNeighbors(r, c, (nr, nc) => {
                    if (grid[nr][nc].mine) count++;
                });
                grid[r][c].count = count;
            }
        }
    }

    function forNeighbors(r, c, fn) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    fn(nr, nc);
                }
            }
        }
    }

    // ===== Click =====
    function handleClick(r, c) {
        if (!gameRunning || gameOver) return;
        const cell = grid[r][c];
        if (cell.revealed || cell.flagged) return;

        if (firstClick) {
            firstClick = false;
            placeMines(r, c);
            startTimer();
        }

        if (cell.mine) {
            // Game over — hit mine
            cell.revealed = true;
            cellEls[r][c].classList.add('mine-hit');
            cellEls[r][c].textContent = '💣';
            revealAllMines();
            endGame(false);
            return;
        }

        revealCell(r, c);

        // Check win
        if (revealed === rows * cols - totalMines) {
            endGame(true);
        }
    }

    function revealCell(r, c) {
        const cell = grid[r][c];
        if (cell.revealed || cell.flagged) return;

        cell.revealed = true;
        revealed++;
        const el = cellEls[r][c];
        el.classList.add('revealed');

        if (cell.count > 0) {
            el.textContent = cell.count;
            el.classList.add(`n${cell.count}`);
        } else {
            // Flood fill for empty cells
            forNeighbors(r, c, (nr, nc) => {
                revealCell(nr, nc);
            });
        }

        if (window.NeonSFX && cell.count === 0) NeonSFX.click();
    }

    // ===== Flag =====
    function handleFlag(r, c) {
        if (!gameRunning || gameOver) return;
        const cell = grid[r][c];
        if (cell.revealed) return;

        cell.flagged = !cell.flagged;
        const el = cellEls[r][c];

        if (cell.flagged) {
            el.classList.add('flagged');
            el.textContent = '🚩';
            flagged++;
        } else {
            el.classList.remove('flagged');
            el.textContent = '';
            flagged--;
        }

        minesEl.textContent = totalMines - flagged;
        if (window.NeonSFX) NeonSFX.click();
    }

    // ===== Reveal All Mines =====
    function revealAllMines() {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c].mine && !grid[r][c].revealed) {
                    cellEls[r][c].classList.add('mine-reveal');
                    cellEls[r][c].textContent = '💣';
                }
            }
        }
    }

    // ===== Timer =====
    function startTimer() {
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            timeEl.textContent = formatTime(elapsed);
        }, 500);
    }

    function getElapsed() {
        return Math.floor((Date.now() - startTime) / 1000);
    }

    // ===== End Game =====
    function endGame(won) {
        gameOver = true;
        gameRunning = false;
        clearInterval(timerInterval);
        const elapsed = getElapsed();

        if (won) {
            // Flag all remaining mines
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (grid[r][c].mine && !grid[r][c].flagged) {
                        grid[r][c].flagged = true;
                        cellEls[r][c].classList.add('flagged');
                        cellEls[r][c].textContent = '🚩';
                    }
                }
            }
            minesEl.textContent = '0';

            // Check best
            const prevBest = localStorage.getItem(`ms-best-${difficulty}`);
            const isBest = !prevBest || elapsed < parseInt(prevBest, 10);
            if (isBest) {
                localStorage.setItem(`ms-best-${difficulty}`, elapsed.toString());
                bestEl.textContent = formatTime(elapsed);
            }

            if (window.NeonSFX) NeonSFX.win();
            overlayIcon.textContent = '🏆';
            overlayTitle.textContent = 'CLEARED!';
            overlayInfo.innerHTML = `
                Time: <strong style="color:#00d4ff">${formatTime(elapsed)}</strong>
                ${isBest ? '<br><span style="color:#ffe600">★ NEW BEST ★</span>' : ''}
            `;
        } else {
            if (window.NeonSFX) NeonSFX.gameOver();
            overlayIcon.textContent = '💥';
            overlayTitle.textContent = 'BOOM!';
            overlayInfo.innerHTML = `
                You hit a mine!<br>
                Time: <strong style="color:#ff2d75">${formatTime(elapsed)}</strong>
            `;
        }

        playBtn.textContent = 'PLAY AGAIN';
        setTimeout(() => {
            overlay.classList.remove('hidden');
        }, won ? 200 : 800);
    }

    // ===== Play Button =====
    playBtn.addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        setupGame();
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

    // Init
    loadBest();
    setupGame();
})();
