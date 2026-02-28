// ===== Tic-Tac-Toe — Neon Edition (with Online Multiplayer) =====
(function () {
    'use strict';

    // ===== Constants =====
    const WIN_COMBOS = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
    ];

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

    const PEER_PREFIX = 'neonarcade-ttt-';

    // ===== State =====
    let board = Array(9).fill(null);
    let currentPlayer = 'X';
    let gameActive = true;
    let mode = 'ai'; // 'ai' | '2p' | 'online'
    let scores = { X: 0, O: 0, draw: 0 };
    let aiThinking = false;

    // Online state
    let peer = null;
    let conn = null;
    let myMark = null; // 'X' or 'O'
    let isHost = false;
    let roomCode = '';

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
    const onlinePanel = $('#online-panel');
    const onlineLobby = $('#online-lobby');
    const onlineWaiting = $('#online-waiting');
    const onlineConnected = $('#online-connected');
    const waitingText = $('#waiting-text');
    const roomCodeDisplay = $('#room-code-display');
    const roomCodeEl = $('#room-code');
    const shareHint = $('#share-hint');
    const yourMarkEl = $('#your-mark');
    const disconnectBtn = $('#disconnect-btn');

    // ===== Init =====
    function init() {
        cells.forEach((cell) => {
            cell.addEventListener('click', () => handleCellClick(cell));
        });

        $('#reset-btn').addEventListener('click', handleReset);
        $('#reset-scores-btn').addEventListener('click', resetScores);

        // Mode buttons
        $$('.mode-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (window.NeonSFX) NeonSFX.click();
                setMode(btn.dataset.mode);
            });
        });

        // Online buttons
        $('#create-room-btn').addEventListener('click', createRoom);
        $('#join-room-btn').addEventListener('click', joinRoom);
        $('#cancel-online-btn').addEventListener('click', cancelOnline);
        $('#copy-code-btn').addEventListener('click', copyRoomCode);
        disconnectBtn.addEventListener('click', disconnect);

        // Enter key on room code input
        $('#room-code-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') joinRoom();
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
        // Clean up online if leaving
        if (mode === 'online' && newMode !== 'online') {
            disconnect();
        }

        mode = newMode;
        $$('.mode-btn').forEach((b) => b.classList.remove('active'));
        $(`#mode-${newMode}`).classList.add('active');

        if (newMode === 'online') {
            onlinePanel.classList.remove('hidden');
            showLobby();
            disconnectBtn.classList.add('hidden');
            footerEl.textContent = 'Online multiplayer via peer-to-peer';
        } else {
            onlinePanel.classList.add('hidden');
            disconnectBtn.classList.add('hidden');
            footerEl.textContent = newMode === 'ai' ? 'You are X • AI is O' : 'Player 1 is X • Player 2 is O';
        }

        resetGame();
    }

    // ===== Cell Click =====
    function handleCellClick(cell) {
        const idx = parseInt(cell.dataset.index);
        if (!gameActive || board[idx] !== null || aiThinking) return;

        if (mode === 'online') {
            if (!conn || currentPlayer !== myMark) return;
            makeMove(idx);
            conn.send({ type: 'move', index: idx });
            return;
        }

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
            if (mode === 'online') {
                const youWon = winner === myMark;
                statusText.textContent = youWon ? 'You win! 🎉' : 'You lose!';
            } else {
                statusText.textContent = `${winner} wins!`;
            }
            statusEl.className = 'win-state';
            if (window.NeonSFX) NeonSFX.win();
            combo.forEach((i) => cells[i].classList.add('win-cell'));
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
    function handleReset() {
        if (mode === 'online' && conn) {
            resetGame();
            conn.send({ type: 'reset' });
        } else {
            resetGame();
        }
    }

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
        if (mode === 'online') {
            if (!conn) {
                statusText.textContent = 'Waiting for opponent...';
                statusEl.className = '';
            } else if (currentPlayer === myMark) {
                statusText.textContent = 'Your turn (' + myMark + ')';
                statusEl.className = myMark === 'X' ? 'x-turn' : 'o-turn';
            } else {
                statusText.textContent = "Opponent's turn";
                statusEl.className = currentPlayer === 'X' ? 'x-turn' : 'o-turn';
            }
        } else if (mode === 'ai') {
            const label = currentPlayer === 'X' ? "Your turn (X)" : "AI thinking...";
            statusText.textContent = label;
            statusEl.className = currentPlayer === 'X' ? 'x-turn' : 'o-turn';
        } else {
            statusText.textContent = `${currentPlayer}'s turn`;
            statusEl.className = currentPlayer === 'X' ? 'x-turn' : 'o-turn';
        }
    }

    function updateScoreboard() {
        winsXEl.textContent = scores.X;
        winsOEl.textContent = scores.O;
        drawsEl.textContent = scores.draw;
    }

    // ================================================================
    //  ONLINE MULTIPLAYER (PeerJS)
    // ================================================================

    function generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    function showLobby() {
        onlineLobby.classList.remove('hidden');
        onlineWaiting.classList.add('hidden');
        onlineConnected.classList.add('hidden');
        $('#room-code-input').value = '';
    }

    function showWaiting(text) {
        onlineLobby.classList.add('hidden');
        onlineWaiting.classList.remove('hidden');
        onlineConnected.classList.add('hidden');
        waitingText.textContent = text;
    }

    function showConnected() {
        onlineLobby.classList.add('hidden');
        onlineWaiting.classList.add('hidden');
        onlineConnected.classList.remove('hidden');
        yourMarkEl.textContent = myMark;
        yourMarkEl.className = myMark === 'X' ? 'x-color' : 'o-color';
        disconnectBtn.classList.remove('hidden');
    }

    // ===== Create Room (Host) =====
    function createRoom() {
        if (window.NeonSFX) NeonSFX.click();
        isHost = true;
        myMark = 'X';
        roomCode = generateCode();

        showWaiting('Creating room...');

        // Destroy old peer if any
        if (peer) peer.destroy();

        peer = new Peer(PEER_PREFIX + roomCode, {
            debug: 0,
        });

        peer.on('open', () => {
            waitingText.textContent = 'Waiting for opponent...';
            roomCodeDisplay.classList.remove('hidden');
            roomCodeEl.textContent = roomCode;
            shareHint.classList.remove('hidden');
        });

        peer.on('connection', (c) => {
            conn = c;
            setupConnection();
        });

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            if (err.type === 'unavailable-id') {
                roomCode = generateCode();
                peer.destroy();
                createRoom();
            } else {
                waitingText.textContent = 'Connection error. Try again.';
                roomCodeDisplay.classList.add('hidden');
                shareHint.classList.add('hidden');
            }
        });
    }

    // ===== Join Room (Guest) =====
    function joinRoom() {
        const input = $('#room-code-input').value.trim().toUpperCase();
        if (!input || input.length < 3) return;

        if (window.NeonSFX) NeonSFX.click();
        isHost = false;
        myMark = 'O';
        roomCode = input;

        showWaiting('Connecting...');
        roomCodeDisplay.classList.add('hidden');
        shareHint.classList.add('hidden');

        if (peer) peer.destroy();

        peer = new Peer(undefined, { debug: 0 });

        peer.on('open', () => {
            conn = peer.connect(PEER_PREFIX + roomCode, { reliable: true });
            conn.on('open', () => {
                setupConnection();
            });
            conn.on('error', () => {
                waitingText.textContent = 'Room not found. Check code.';
            });
        });

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            if (err.type === 'peer-unavailable') {
                waitingText.textContent = 'Room not found. Check code.';
            } else {
                waitingText.textContent = 'Connection error. Try again.';
            }
        });
    }

    function setupConnection() {
        if (window.NeonSFX) NeonSFX.gameStart();
        showConnected();
        resetGame();

        conn.on('data', (data) => {
            if (data.type === 'move') {
                if (board[data.index] === null && gameActive) {
                    makeMove(data.index);
                }
            } else if (data.type === 'reset') {
                resetGame();
            }
        });

        conn.on('close', () => {
            handleDisconnect();
        });

        conn.on('error', () => {
            handleDisconnect();
        });
    }

    function handleDisconnect() {
        conn = null;
        gameActive = false;
        statusText.textContent = 'Opponent disconnected';
        statusEl.className = '';
        showLobby();
        disconnectBtn.classList.add('hidden');
        if (window.NeonSFX) NeonSFX.locked();
    }

    function cancelOnline() {
        if (window.NeonSFX) NeonSFX.click();
        if (peer) {
            peer.destroy();
            peer = null;
        }
        conn = null;
        showLobby();
    }

    function disconnect() {
        if (window.NeonSFX) NeonSFX.click();
        if (conn) conn.close();
        if (peer) {
            peer.destroy();
            peer = null;
        }
        conn = null;
        showLobby();
        disconnectBtn.classList.add('hidden');
        resetGame();
    }

    function copyRoomCode() {
        navigator.clipboard.writeText(roomCode).then(() => {
            const btn = $('#copy-code-btn');
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = '📋'; }, 1500);
        }).catch(() => {
            // Fallback: select and copy
            const el = document.createElement('textarea');
            el.value = roomCode;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            const btn = $('#copy-code-btn');
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = '📋'; }, 1500);
        });
        if (window.NeonSFX) NeonSFX.click();
    }

    // ===== Bootstrap =====
    window.addEventListener('DOMContentLoaded', init);
})();
