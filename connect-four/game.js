// ===== Connect Four — Neon Edition =====
(function () {
    'use strict';

    const ROWS = 6;
    const COLS = 7;
    const CONNECT = 4;

    let board = [];
    let currentPlayer = 1; // 1 = blue (P1), 2 = pink (P2/AI)
    let mode = 'ai';
    let gameActive = true;
    let aiThinking = false;
    let scores = { 1: 0, 2: 0, draw: 0 };

    // DOM
    const boardEl = document.getElementById('board');
    const colIndicators = document.getElementById('column-indicators');
    const statusBar = document.getElementById('status-bar');
    const statusText = document.getElementById('status-text');
    const p1ScoreEl = document.getElementById('p1-score');
    const p2ScoreEl = document.getElementById('p2-score');
    const drawsEl = document.getElementById('draws');
    const p1Label = document.getElementById('p1-label');
    const p2Label = document.getElementById('p2-label');
    const resetBtn = document.getElementById('reset-btn');

    // ===== Init =====
    function init() {
        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.NeonSFX) NeonSFX.click();
                mode = btn.dataset.mode;
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                p1Label.textContent = 'P1';
                p2Label.textContent = mode === 'ai' ? 'AI' : 'P2';
                if (mode === 'ai') p1Label.textContent = 'YOU';
                resetScores();
                resetGame();
            });
        });

        resetBtn.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            resetGame();
        });

        // Mute
        const muteBtn = document.getElementById('mute-btn');
        const muteIcon = document.getElementById('mute-icon');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                if (!window.NeonSFX) return;
                const muted = NeonSFX.toggleMute();
                muteIcon.textContent = muted ? '🔇' : '🔊';
                muteBtn.style.borderColor = muted ? 'rgba(255,45,117,0.3)' : 'rgba(0,255,136,0.2)';
                muteBtn.style.color = muted ? '#ff2d75' : '#00ff88';
            });
        }

        resetGame();
    }

    // ===== Board =====
    function resetGame() {
        board = [];
        for (let r = 0; r < ROWS; r++) {
            board[r] = new Array(COLS).fill(0);
        }
        currentPlayer = 1;
        gameActive = true;
        aiThinking = false;
        buildBoard();
        updateStatus();
    }

    function buildBoard() {
        boardEl.innerHTML = '';
        colIndicators.innerHTML = '';

        for (let c = 0; c < COLS; c++) {
            const ind = document.createElement('div');
            ind.className = 'col-indicator';
            ind.dataset.col = c;
            colIndicators.appendChild(ind);
        }

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const slot = document.createElement('div');
                slot.className = 'slot';
                slot.dataset.row = r;
                slot.dataset.col = c;

                slot.addEventListener('click', () => handleColumnClick(c));
                slot.addEventListener('mouseenter', () => highlightColumn(c));
                slot.addEventListener('mouseleave', () => clearColumnHighlight());

                boardEl.appendChild(slot);
            }
        }
    }

    function getSlot(r, c) {
        return boardEl.children[r * COLS + c];
    }

    function highlightColumn(c) {
        if (!gameActive || aiThinking) return;
        const indicators = colIndicators.children;
        for (let i = 0; i < indicators.length; i++) {
            indicators[i].classList.remove('active', 'active-p2');
        }
        indicators[c].classList.add(currentPlayer === 1 ? 'active' : 'active-p2');
    }

    function clearColumnHighlight() {
        const indicators = colIndicators.children;
        for (let i = 0; i < indicators.length; i++) {
            indicators[i].classList.remove('active', 'active-p2');
        }
    }

    // ===== Drop Disc =====
    function handleColumnClick(col) {
        if (!gameActive || aiThinking) return;
        if (mode === 'ai' && currentPlayer === 2) return;

        const row = getLowestEmptyRow(col);
        if (row === -1) return; // Column full

        dropDisc(row, col, currentPlayer);

        if (checkWin(row, col, currentPlayer)) {
            endGame(currentPlayer);
            return;
        }
        if (isBoardFull()) {
            endGame(0);
            return;
        }

        currentPlayer = currentPlayer === 1 ? 2 : 1;
        updateStatus();

        if (mode === 'ai' && currentPlayer === 2) {
            aiThinking = true;
            updateStatus();
            setTimeout(() => {
                const aiCol = getAIMove();
                const aiRow = getLowestEmptyRow(aiCol);
                if (aiRow !== -1) {
                    dropDisc(aiRow, aiCol, 2);
                    if (checkWin(aiRow, aiCol, 2)) {
                        endGame(2);
                        return;
                    }
                    if (isBoardFull()) {
                        endGame(0);
                        return;
                    }
                }
                currentPlayer = 1;
                aiThinking = false;
                updateStatus();
            }, 400 + Math.random() * 300);
        }
    }

    function getLowestEmptyRow(col) {
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][col] === 0) return r;
        }
        return -1;
    }

    function dropDisc(row, col, player) {
        board[row][col] = player;
        const slot = getSlot(row, col);
        slot.classList.add(player === 1 ? 'p1' : 'p2');
        if (window.NeonSFX) NeonSFX.place();
    }

    function isBoardFull() {
        return board[0].every(cell => cell !== 0);
    }

    // ===== Win Check =====
    function checkWin(row, col, player) {
        const directions = [
            [0, 1],  // horizontal
            [1, 0],  // vertical
            [1, 1],  // diagonal right
            [1, -1], // diagonal left
        ];

        for (const [dr, dc] of directions) {
            let count = 1;
            const winCells = [[row, col]];

            // Forward
            for (let i = 1; i < CONNECT; i++) {
                const nr = row + dr * i;
                const nc = col + dc * i;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) {
                    count++;
                    winCells.push([nr, nc]);
                } else break;
            }

            // Backward
            for (let i = 1; i < CONNECT; i++) {
                const nr = row - dr * i;
                const nc = col - dc * i;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) {
                    count++;
                    winCells.push([nr, nc]);
                } else break;
            }

            if (count >= CONNECT) {
                // Highlight winning cells
                for (const [wr, wc] of winCells) {
                    getSlot(wr, wc).classList.add('win-cell');
                }
                return true;
            }
        }
        return false;
    }

    // ===== AI =====
    function getAIMove() {
        // 1. Check if AI can win
        for (let c = 0; c < COLS; c++) {
            const r = getLowestEmptyRow(c);
            if (r === -1) continue;
            board[r][c] = 2;
            if (checkWinSilent(r, c, 2)) { board[r][c] = 0; return c; }
            board[r][c] = 0;
        }

        // 2. Block opponent win
        for (let c = 0; c < COLS; c++) {
            const r = getLowestEmptyRow(c);
            if (r === -1) continue;
            board[r][c] = 1;
            if (checkWinSilent(r, c, 1)) { board[r][c] = 0; return c; }
            board[r][c] = 0;
        }

        // 3. Avoid giving opponent a winning column
        const safeCols = [];
        for (let c = 0; c < COLS; c++) {
            const r = getLowestEmptyRow(c);
            if (r === -1) continue;
            // Check if placing here gives opponent a win above
            board[r][c] = 2;
            let safe = true;
            if (r - 1 >= 0) {
                board[r - 1][c] = 1;
                if (checkWinSilent(r - 1, c, 1)) safe = false;
                board[r - 1][c] = 0;
            }
            board[r][c] = 0;
            if (safe) safeCols.push(c);
        }

        const candidateCols = safeCols.length > 0 ? safeCols : [];
        if (candidateCols.length === 0) {
            // All moves are risky, pick any valid
            for (let c = 0; c < COLS; c++) {
                if (getLowestEmptyRow(c) !== -1) candidateCols.push(c);
            }
        }

        // 4. Score remaining candidates
        let bestScore = -Infinity;
        let bestCol = candidateCols[0];
        for (const c of candidateCols) {
            const r = getLowestEmptyRow(c);
            let score = 0;

            // Prefer center
            score += (3 - Math.abs(c - 3)) * 3;

            // Count threats
            board[r][c] = 2;
            score += countThreats(2) * 5;
            board[r][c] = 0;

            if (score > bestScore) {
                bestScore = score;
                bestCol = c;
            }
        }

        return bestCol;
    }

    function checkWinSilent(row, col, player) {
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of directions) {
            let count = 1;
            for (let i = 1; i < CONNECT; i++) {
                const nr = row + dr * i, nc = col + dc * i;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) count++;
                else break;
            }
            for (let i = 1; i < CONNECT; i++) {
                const nr = row - dr * i, nc = col - dc * i;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === player) count++;
                else break;
            }
            if (count >= CONNECT) return true;
        }
        return false;
    }

    function countThreats(player) {
        let threats = 0;
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] !== player) continue;
                for (const [dr, dc] of directions) {
                    let count = 1;
                    let empty = 0;
                    for (let i = 1; i < CONNECT; i++) {
                        const nr = r + dr * i, nc = c + dc * i;
                        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break;
                        if (board[nr][nc] === player) count++;
                        else if (board[nr][nc] === 0) { empty++; break; }
                        else break;
                    }
                    if (count >= 3 && empty >= 1) threats++;
                    if (count >= 2 && empty >= 1) threats += 0.3;
                }
            }
        }
        return threats;
    }

    // ===== End Game =====
    function endGame(winner) {
        gameActive = false;

        if (winner === 0) {
            scores.draw++;
            statusText.textContent = "It's a draw!";
            statusBar.className = '';
            if (window.NeonSFX) NeonSFX.draw();
        } else {
            scores[winner]++;
            if (mode === 'ai') {
                statusText.textContent = winner === 1 ? 'You win! 🎉' : 'AI wins!';
            } else {
                statusText.textContent = `Player ${winner} wins!`;
            }
            statusBar.className = 'win-state';
            if (window.NeonSFX) {
                if (winner === 1) NeonSFX.win(); else NeonSFX.gameOver();
            }
        }

        updateScoreboard();
    }

    // ===== Status =====
    function updateStatus() {
        if (!gameActive) return;
        if (mode === 'ai') {
            if (aiThinking) {
                statusText.textContent = 'AI thinking...';
                statusBar.className = 'p2-turn';
            } else {
                statusText.textContent = 'Your turn';
                statusBar.className = '';
            }
        } else {
            statusText.textContent = `Player ${currentPlayer}'s turn`;
            statusBar.className = currentPlayer === 2 ? 'p2-turn' : '';
        }
    }

    function updateScoreboard() {
        p1ScoreEl.textContent = scores[1];
        p2ScoreEl.textContent = scores[2];
        drawsEl.textContent = scores.draw;
    }

    function resetScores() {
        scores = { 1: 0, 2: 0, draw: 0 };
        updateScoreboard();
    }

    // ===== Bootstrap =====
    window.addEventListener('DOMContentLoaded', init);
})();
