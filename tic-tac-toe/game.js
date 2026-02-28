// ===== Tic-Tac-Toe — Neon Edition =====
(function () {
    'use strict';

    // ===== Constants =====
    const WIN_COMBOS = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
        [0, 4, 8], [2, 4, 6],             // diags
    ];

    // Win line coordinates (fraction of board size for SVG viewBox 0 0 300 300)
    // Each cell center: col*100+50, row*100+50
    const LINE_COORDS = {
        '0,1,2': { x1: 50, y1: 50, x2: 250, y2: 50 },
        '3,4,5': { x1: 50, y1: 150, x2: 250, y2: 150 },
        '6,7,8': { x1: 50, y1: 250, x2: 250, y2: 250 },
        '0,3,6': { x1: 50, y1: 50, x2: 50, y2: 250 },
        '1,4,7': { x1: 150, y1: 50, x2: 150, y2: 250 },
        '2,5,8': { x1: 250, y1: 50, x2: 250, y2: 250 },
        '0,4,8': { x1: 50, y1: 50, x2: 250, y2: 250 },
        '2,4,6': { x1: 250, y1: 50, x2: 50, y2: 250 },
    };

    // ===== State =====
    let board = Array(9).fill(null);
    let currentPlayer = 'X';
    let gameActive = true;
    let mode = 'ai'; // 'ai' or '2p'
    let scores = { X: 0, O: 0, draw: 0 };
    let aiThinking = false;

    // ===== DOM =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    const cells = $$('.cell');
    const statusEl = $('#status');
    const statusText = $('#status-text');
    const winsXEl = $('#wins-x');
    const winsOEl = $('#wins-o');
    const drawsEl = $('#draws');
    const winLineEl = $('#win-line-el');
    const footerEl = $('#footer p');

    // ===== Init =====
    function init() {
        cells.forEach((cell) => {
            cell.addEventListener('click', () => handleCellClick(cell));
        });

        $('#reset-btn').addEventListener('click', resetGame);
        $('#reset-scores-btn').addEventListener('click', resetScores);

        // Mode buttons
        $$('.mode-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (window.NeonSFX) NeonSFX.click();
                setMode(btn.dataset.mode);
            });
        });

        // Mute button
        const muteBtn = $('#mute-btn');
        const muteIcon = $('#mute-icon');
        if (muteBtn && muteIcon) {
            muteBtn.addEventListener('click', () => {
                if (!window.NeonSFX) return;
                const muted = NeonSFX.toggleMute();
                muteIcon.textContent = muted ? '🔇' : '🔊';
                muteBtn.style.borderColor = muted ? 'rgba(255,45,117,0.3)' : 'rgba(0,255,136,0.2)';
                muteBtn.style.color = muted ? '#ff2d75' : '#00ff88';
            });
        }

        updateStatus();
    }

    // ===== Mode =====
    function setMode(newMode) {
        mode = newMode;
        $$('.mode-btn').forEach((b) => b.classList.remove('active'));
        $(`#mode-${newMode}`).classList.add('active');
        footerEl.textContent = mode === 'ai' ? 'You are X • AI is O' : 'Player 1 is X • Player 2 is O';
        resetGame();
    }

    // ===== Cell Click =====
    function handleCellClick(cell) {
        const idx = parseInt(cell.dataset.index);
        if (!gameActive || board[idx] !== null || aiThinking) return;

        makeMove(idx);

        // AI turn
        if (mode === 'ai' && gameActive && currentPlayer === 'O') {
            aiThinking = true;
            setTimeout(() => {
                const aiMove = getBestMove();
                if (aiMove !== -1) makeMove(aiMove);
                aiThinking = false;
            }, 350);
        }
    }

    function makeMove(idx) {
        board[idx] = currentPlayer;
        const cell = cells[idx];
        cell.textContent = currentPlayer;
        cell.classList.add(currentPlayer.toLowerCase(), 'taken');

        if (window.NeonSFX) NeonSFX.place();

        const winCombo = checkWin(currentPlayer);
        if (winCombo) {
            endGame(currentPlayer, winCombo);
            return;
        }

        if (board.every((c) => c !== null)) {
            endGame(null, null);
            return;
        }

        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateStatus();
    }

    // ===== Win Check =====
    function checkWin(player) {
        for (const combo of WIN_COMBOS) {
            if (combo.every((i) => board[i] === player)) return combo;
        }
        return null;
    }

    // ===== End Game =====
    function endGame(winner, combo) {
        gameActive = false;

        if (winner) {
            scores[winner]++;
            statusText.textContent = `${winner} wins!`;
            statusEl.className = 'win-state';
            if (window.NeonSFX) NeonSFX.win();

            // Highlight winning cells
            combo.forEach((i) => cells[i].classList.add('win-cell'));

            // Draw win line
            drawWinLine(combo);
        } else {
            scores.draw++;
            statusText.textContent = "It's a draw!";
            statusEl.className = 'draw-state';
            if (window.NeonSFX) NeonSFX.draw();
        }

        updateScoreboard();
    }

    function drawWinLine(combo) {
        const key = combo.join(',');
        const coords = LINE_COORDS[key];
        if (!coords) return;

        winLineEl.setAttribute('x1', coords.x1);
        winLineEl.setAttribute('y1', coords.y1);
        winLineEl.setAttribute('x2', coords.x2);
        winLineEl.setAttribute('y2', coords.y2);
        winLineEl.classList.add('animate');
    }

    // ===== AI (Minimax) =====
    function getBestMove() {
        // First check for quick win or block
        let bestScore = -Infinity;
        let bestMove = -1;

        for (let i = 0; i < 9; i++) {
            if (board[i] !== null) continue;
            board[i] = 'O';
            const score = minimax(board, 0, false);
            board[i] = null;
            if (score > bestScore) {
                bestScore = score;
                bestMove = i;
            }
        }

        return bestMove;
    }

    function minimax(b, depth, isMaximizing) {
        const winO = checkWin('O');
        const winX = checkWin('X');
        if (winO) return 10 - depth;
        if (winX) return depth - 10;
        if (b.every((c) => c !== null)) return 0;

        if (isMaximizing) {
            let best = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (b[i] !== null) continue;
                b[i] = 'O';
                best = Math.max(best, minimax(b, depth + 1, false));
                b[i] = null;
            }
            return best;
        } else {
            let best = Infinity;
            for (let i = 0; i < 9; i++) {
                if (b[i] !== null) continue;
                b[i] = 'X';
                best = Math.min(best, minimax(b, depth + 1, true));
                b[i] = null;
            }
            return best;
        }
    }

    // ===== Reset =====
    function resetGame() {
        board = Array(9).fill(null);
        currentPlayer = 'X';
        gameActive = true;
        aiThinking = false;

        cells.forEach((cell) => {
            cell.textContent = '';
            cell.className = 'cell';
        });

        winLineEl.classList.remove('animate');
        winLineEl.setAttribute('x1', 0);
        winLineEl.setAttribute('y1', 0);
        winLineEl.setAttribute('x2', 0);
        winLineEl.setAttribute('y2', 0);

        updateStatus();
        if (window.NeonSFX) NeonSFX.click();
    }

    function resetScores() {
        scores = { X: 0, O: 0, draw: 0 };
        updateScoreboard();
        resetGame();
    }

    // ===== UI =====
    function updateStatus() {
        const label = mode === 'ai'
            ? (currentPlayer === 'X' ? "Your turn (X)" : "AI thinking...")
            : `${currentPlayer}'s turn`;
        statusText.textContent = label;
        statusEl.className = currentPlayer === 'X' ? 'x-turn' : 'o-turn';
    }

    function updateScoreboard() {
        winsXEl.textContent = scores.X;
        winsOEl.textContent = scores.O;
        drawsEl.textContent = scores.draw;
    }

    // ===== Bootstrap =====
    window.addEventListener('DOMContentLoaded', init);
})();
