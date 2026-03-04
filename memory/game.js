// ===== Neon Memory Match — Game Engine (Solo, 2P Local, Online) =====
(function () {
    'use strict';

    const board = document.getElementById('board');
    const movesEl = document.getElementById('moves-val');
    const pairsEl = document.getElementById('pairs-val');
    const timeEl = document.getElementById('time-val');
    const bestEl = document.getElementById('best-val');
    const bestItem = document.getElementById('best-item');
    const overlay = document.getElementById('overlay');
    const overlayIcon = document.getElementById('overlay-icon');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayInfo = document.getElementById('overlay-info');
    const playBtn = document.getElementById('play-btn');
    const turnIndicator = document.getElementById('turn-indicator');
    const turnText = document.getElementById('turn-text');
    const p1PairsEl = document.getElementById('p1-pairs');
    const p2PairsEl = document.getElementById('p2-pairs');
    const hud2pItems = document.querySelectorAll('.hud-2p');

    // Online panel
    const onlinePanel = document.getElementById('online-panel');
    const onlineLobby = document.getElementById('online-lobby');
    const onlineWaiting = document.getElementById('online-waiting');
    const onlineConnected = document.getElementById('online-connected');
    const waitingText = document.getElementById('waiting-text');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const roomCodeEl = document.getElementById('room-code');
    const shareHint = document.getElementById('share-hint');
    const yourMarkEl = document.getElementById('your-mark');
    const disconnectBtn = document.getElementById('disconnect-btn');

    const ALL_SYMBOLS = ['🚀', '⚡', '🎮', '💎', '🌟', '🔥', '🎵', '👾', '🎯', '🌈'];
    const COLORS = [
        { bg: 'rgba(0, 212, 255, 0.15)', border: 'rgba(0, 212, 255, 0.35)', glow: 'rgba(0, 212, 255, 0.2)' },
        { bg: 'rgba(255, 230, 0, 0.15)', border: 'rgba(255, 230, 0, 0.35)', glow: 'rgba(255, 230, 0, 0.2)' },
        { bg: 'rgba(0, 255, 136, 0.15)', border: 'rgba(0, 255, 136, 0.35)', glow: 'rgba(0, 255, 136, 0.2)' },
        { bg: 'rgba(255, 45, 117, 0.15)', border: 'rgba(255, 45, 117, 0.35)', glow: 'rgba(255, 45, 117, 0.2)' },
        { bg: 'rgba(180, 77, 255, 0.15)', border: 'rgba(180, 77, 255, 0.35)', glow: 'rgba(180, 77, 255, 0.2)' },
        { bg: 'rgba(255, 138, 0, 0.15)', border: 'rgba(255, 138, 0, 0.35)', glow: 'rgba(255, 138, 0, 0.2)' },
        { bg: 'rgba(0, 255, 229, 0.15)', border: 'rgba(0, 255, 229, 0.35)', glow: 'rgba(0, 255, 229, 0.2)' },
        { bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.25)', glow: 'rgba(255, 255, 255, 0.15)' },
        { bg: 'rgba(255, 80, 80, 0.15)', border: 'rgba(255, 80, 80, 0.35)', glow: 'rgba(255, 80, 80, 0.2)' },
        { bg: 'rgba(120, 255, 120, 0.15)', border: 'rgba(120, 255, 120, 0.35)', glow: 'rgba(120, 255, 120, 0.2)' },
    ];

    const DIFF_CONFIG = {
        easy: { pairs: 6, cols: 3, rows: 4 },
        medium: { pairs: 8, cols: 4, rows: 4 },
        hard: { pairs: 10, cols: 5, rows: 4 },
    };

    let memDifficulty = 'medium';
    let TOTAL_PAIRS = DIFF_CONFIG[memDifficulty].pairs;
    const PEER_PREFIX = 'neonarcade-mm-';

    // ===== State =====
    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let moves = 0;
    let timerInterval = null;
    let startTime = 0;
    let gameRunning = false;
    let locked = false;
    let bestMoves = parseInt(localStorage.getItem(`memory-best-${memDifficulty}`) || '0', 10);

    // ===== Difficulty selector =====
    document.querySelectorAll('#diff-selector .diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            document.querySelectorAll('#diff-selector .diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            memDifficulty = btn.dataset.diff;
            TOTAL_PAIRS = DIFF_CONFIG[memDifficulty].pairs;
            bestMoves = parseInt(localStorage.getItem(`memory-best-${memDifficulty}`) || '0', 10);
            bestEl.textContent = bestMoves > 0 ? bestMoves : '—';
            startGame();
        });
    });

    // Mode state
    let gameMode = 'solo'; // 'solo' | '2p' | 'online'
    let currentPlayer = 1; // 1 or 2
    let playerScores = { 1: 0, 2: 0 };

    // Online state
    let peer = null;
    let conn = null;
    let myPlayerNum = null; // 1 or 2
    let isHost = false;
    let roomCode = '';
    let boardSeed = null; // shuffled card order from host

    if (bestMoves > 0) bestEl.textContent = bestMoves;

    // ===== Mode selector =====
    document.querySelectorAll('#mode-selector .mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            document.querySelectorAll('#mode-selector .mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const newMode = btn.dataset.mode;
            if (gameMode === 'online' && newMode !== 'online') disconnectOnline();
            gameMode = newMode;

            if (gameMode === 'online') {
                onlinePanel.classList.remove('hidden');
                showLobby();
            } else {
                onlinePanel.classList.add('hidden');
            }

            updateModeUI();
        });
    });

    function updateModeUI() {
        const is2p = gameMode === '2p' || gameMode === 'online';
        if (is2p) {
            turnIndicator.classList.remove('hidden');
            hud2pItems.forEach(el => el.classList.remove('hidden'));
            bestItem.classList.add('hidden');
        } else {
            turnIndicator.classList.add('hidden');
            hud2pItems.forEach(el => el.classList.add('hidden'));
            bestItem.classList.remove('hidden');
        }
        updateTurnDisplay();
    }

    function updateTurnDisplay() {
        if (gameMode !== '2p' && gameMode !== 'online') return;
        if (currentPlayer === 1) {
            turnText.textContent = gameMode === 'online'
                ? (myPlayerNum === 1 ? "Your Turn" : "Opponent's Turn")
                : "Player 1's Turn";
            turnText.style.color = '#00d4ff';
            turnIndicator.style.borderColor = 'rgba(0, 212, 255, 0.3)';
        } else {
            turnText.textContent = gameMode === 'online'
                ? (myPlayerNum === 2 ? "Your Turn" : "Opponent's Turn")
                : "Player 2's Turn";
            turnText.style.color = '#ff2d75';
            turnIndicator.style.borderColor = 'rgba(255, 45, 117, 0.3)';
        }
        p1PairsEl.textContent = playerScores[1];
        p2PairsEl.textContent = playerScores[2];
    }

    // ===== Shuffle =====
    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // ===== Build Board =====
    function buildBoard(order) {
        board.innerHTML = '';
        const cfg = DIFF_CONFIG[memDifficulty];
        const gridCols = cfg.cols;
        board.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;

        // Dynamic card sizing
        const screenW = window.innerWidth;
        const boardPad = 24;
        const gap = 8;
        const availW = Math.min(screenW - boardPad, 500 - boardPad);
        const cardW = Math.min(80, Math.floor((availW - gap * (gridCols - 1)) / gridCols));
        board.style.setProperty('--card-w', cardW + 'px');
        board.style.setProperty('--card-h', (cardW * 1.2) + 'px');
        board.style.setProperty('--card-font', Math.max(1.2, cardW * 0.035) + 'rem');

        const symbols = ALL_SYMBOLS.slice(0, TOTAL_PAIRS);
        const pairs = [];
        for (let i = 0; i < TOTAL_PAIRS; i++) {
            pairs.push({ symbol: symbols[i], colorIndex: i });
            pairs.push({ symbol: symbols[i], colorIndex: i });
        }

        // Use provided order or shuffle
        let orderedPairs;
        if (order) {
            orderedPairs = order.map(idx => pairs[idx]);
        } else {
            const indices = pairs.map((_, i) => i);
            shuffle(indices);
            boardSeed = indices; // save for sending to opponent
            orderedPairs = indices.map(idx => pairs[idx]);
        }

        cards = orderedPairs.map((item, index) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.index = index;
            card.dataset.symbol = item.symbol;

            const front = document.createElement('div');
            front.className = 'card-face-front';

            const back = document.createElement('div');
            back.className = 'card-face-back';
            back.textContent = item.symbol;

            const c = COLORS[item.colorIndex];
            back.style.background = c.bg;
            back.style.borderColor = c.border;
            back.style.boxShadow = `0 0 14px ${c.glow}`;

            card.appendChild(front);
            card.appendChild(back);

            card.addEventListener('click', () => onCardClick(index));
            board.appendChild(card);

            return { el: card, symbol: item.symbol, matched: false };
        });
    }

    // ===== Card Click =====
    function onCardClick(index) {
        if (!gameRunning || locked) return;
        // In online mode, only allow clicks on your turn
        if (gameMode === 'online' && currentPlayer !== myPlayerNum) return;

        const cardEl = cards[index].el;
        if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;
        if (flippedCards.length === 1 && flippedCards[0].el === cardEl) return;

        flipCard(index);

        // Send flip to opponent
        if (gameMode === 'online' && conn) {
            conn.send({ type: 'flip', index: index });
        }
    }

    function flipCard(index) {
        const cardEl = cards[index].el;
        const card = cards[index];

        if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;
        if (flippedCards.length === 1 && flippedCards[0].el === cardEl) return;

        cardEl.classList.add('flipped');
        flippedCards.push(card);
        if (window.NeonSFX) NeonSFX.click();

        if (flippedCards.length === 2) {
            moves++;
            movesEl.textContent = moves;
            checkMatch();
        }
    }

    function checkMatch() {
        locked = true;
        const [a, b] = flippedCards;

        if (a.symbol === b.symbol) {
            setTimeout(() => {
                a.el.classList.add('matched', 'match-flash');
                b.el.classList.add('matched', 'match-flash');
                a.matched = true;
                b.matched = true;
                matchedPairs++;
                pairsEl.textContent = `${matchedPairs}/${TOTAL_PAIRS}`;

                if (gameMode === '2p' || gameMode === 'online') {
                    playerScores[currentPlayer]++;
                    updateTurnDisplay();
                }

                flippedCards = [];
                locked = false;
                if (window.NeonSFX) NeonSFX.score();

                if (matchedPairs === TOTAL_PAIRS) {
                    endGame();
                }
            }, 300);
        } else {
            setTimeout(() => {
                a.el.classList.add('shake');
                b.el.classList.add('shake');
                if (window.NeonSFX) NeonSFX.wallBounce();

                setTimeout(() => {
                    a.el.classList.remove('flipped', 'shake');
                    b.el.classList.remove('flipped', 'shake');
                    flippedCards = [];
                    locked = false;

                    if (gameMode === '2p' || gameMode === 'online') {
                        currentPlayer = currentPlayer === 1 ? 2 : 1;
                        updateTurnDisplay();
                    }
                }, 400);
            }, 600);
        }
    }

    // ===== Timer =====
    function startTimer() {
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }, 500);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    function getElapsedTime() {
        return Math.floor((Date.now() - startTime) / 1000);
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // ===== Start / End =====
    function startGame(order) {
        moves = 0;
        matchedPairs = 0;
        flippedCards = [];
        locked = false;
        gameRunning = true;
        currentPlayer = 1;
        playerScores = { 1: 0, 2: 0 };
        movesEl.textContent = '0';
        pairsEl.textContent = `0/${TOTAL_PAIRS}`;
        timeEl.textContent = '0:00';
        updateModeUI();
        buildBoard(order || null);
        stopTimer();
        startTimer();
        overlay.classList.add('hidden');
        if (window.NeonSFX) NeonSFX.gameStart();
    }

    function endGame() {
        gameRunning = false;
        stopTimer();
        const elapsed = getElapsedTime();

        if (gameMode === 'solo') {
            if (bestMoves === 0 || moves < bestMoves) {
                bestMoves = moves;
                localStorage.setItem(`memory-best-${memDifficulty}`, bestMoves.toString());
                bestEl.textContent = bestMoves;
            }
            if (window.NeonSFX) NeonSFX.win();
            overlayIcon.textContent = '🏆';
            overlayTitle.textContent = 'PERFECT!';
            overlayInfo.innerHTML = `
                Moves: <strong style="color:#00ff88">${moves}</strong><br>
                Time: <strong style="color:#00d4ff">${formatTime(elapsed)}</strong>
                ${moves <= bestMoves ? '<br><span style="color:#ffe600;">★ NEW BEST ★</span>' : ''}
            `;
        } else {
            // 2P / Online
            const p1 = playerScores[1];
            const p2 = playerScores[2];
            if (window.NeonSFX) NeonSFX.win();

            let winnerLabel1 = gameMode === 'online' ? (myPlayerNum === 1 ? 'You' : 'Opponent') : 'Player 1';
            let winnerLabel2 = gameMode === 'online' ? (myPlayerNum === 2 ? 'You' : 'Opponent') : 'Player 2';

            if (p1 > p2) {
                overlayIcon.textContent = '🎉';
                overlayTitle.textContent = `${winnerLabel1} Win${winnerLabel1 === 'You' ? '' : 's'}!`;
                overlayInfo.innerHTML = `
                    <span style="color:#00d4ff">${winnerLabel1}: <strong>${p1}</strong> pairs</span><br>
                    <span style="color:#ff2d75">${winnerLabel2}: <strong>${p2}</strong> pairs</span><br>
                    Time: <strong style="color:#00ff88">${formatTime(elapsed)}</strong>
                `;
            } else if (p2 > p1) {
                overlayIcon.textContent = '🎉';
                overlayTitle.textContent = `${winnerLabel2} Win${winnerLabel2 === 'You' ? '' : 's'}!`;
                overlayInfo.innerHTML = `
                    <span style="color:#00d4ff">${winnerLabel1}: <strong>${p1}</strong> pairs</span><br>
                    <span style="color:#ff2d75">${winnerLabel2}: <strong>${p2}</strong> pairs</span><br>
                    Time: <strong style="color:#00ff88">${formatTime(elapsed)}</strong>
                `;
            } else {
                overlayIcon.textContent = '🤝';
                overlayTitle.textContent = "IT'S A TIE!";
                overlayInfo.innerHTML = `
                    Both matched <strong style="color:#ffe600">${p1}</strong> pairs!<br>
                    Time: <strong style="color:#00ff88">${formatTime(elapsed)}</strong>
                `;
            }
        }

        playBtn.textContent = 'PLAY AGAIN';
        overlay.classList.remove('hidden');
    }

    // ===== Input =====
    playBtn.addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        if (gameMode === 'online') {
            // Host starts and sends board to opponent
            if (isHost && conn) {
                startGame();
                conn.send({ type: 'start', order: boardSeed });
            }
        } else {
            startGame();
        }
    });

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
        const input = document.getElementById('room-code-input');
        if (input) input.value = '';
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
        yourMarkEl.textContent = myPlayerNum === 1 ? 'Player 1' : 'Player 2';
        yourMarkEl.style.color = myPlayerNum === 1 ? '#00d4ff' : '#ff2d75';
        disconnectBtn.classList.remove('hidden');
    }

    // Create Room
    document.getElementById('create-room-btn').addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        isHost = true;
        myPlayerNum = 1;
        roomCode = generateCode();

        showWaiting('Creating room...');

        if (peer) peer.destroy();
        peer = new Peer(PEER_PREFIX + roomCode, { debug: 0 });

        peer.on('open', () => {
            waitingText.textContent = 'Waiting for opponent...';
            roomCodeDisplay.classList.remove('hidden');
            roomCodeEl.textContent = roomCode;
            shareHint.classList.remove('hidden');
        });

        peer.on('connection', (c) => {
            conn = c;
            conn.on('open', () => {
                setupConnection();
            });
            conn.on('error', () => handleDisconnect());
        });

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            if (err.type === 'unavailable-id') {
                roomCode = generateCode();
                peer.destroy();
                document.getElementById('create-room-btn').click();
            } else {
                waitingText.textContent = 'Connection error. Try again.';
                roomCodeDisplay.classList.add('hidden');
                shareHint.classList.add('hidden');
            }
        });
    });

    // Join Room
    document.getElementById('join-room-btn').addEventListener('click', () => {
        const input = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (!input || input.length < 3) return;

        if (window.NeonSFX) NeonSFX.click();
        isHost = false;
        myPlayerNum = 2;
        roomCode = input;

        showWaiting('Connecting...');
        roomCodeDisplay.classList.add('hidden');
        shareHint.classList.add('hidden');

        if (peer) peer.destroy();
        peer = new Peer(undefined, { debug: 0 });

        peer.on('open', () => {
            conn = peer.connect(PEER_PREFIX + roomCode, { reliable: true });
            conn.on('open', () => setupConnection());
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
    });

    // Enter key to join
    document.getElementById('room-code-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('join-room-btn').click();
    });

    function setupConnection() {
        if (window.NeonSFX) NeonSFX.gameStart();
        showConnected();
        updateModeUI();

        conn.on('data', (data) => {
            switch (data.type) {
                case 'start':
                    // Guest receives board order from host
                    startGame(data.order);
                    break;
                case 'flip':
                    // Opponent flipped a card
                    flipCard(data.index);
                    break;
            }
        });

        conn.on('close', () => handleDisconnect());
        conn.on('error', () => handleDisconnect());

        // If host, auto-start a game
        if (isHost) {
            startGame();
            conn.send({ type: 'start', order: boardSeed });
        }
    }

    function handleDisconnect() {
        conn = null;
        gameRunning = false;
        stopTimer();
        overlayIcon.textContent = '💔';
        overlayTitle.textContent = 'Disconnected';
        overlayInfo.textContent = 'Your opponent left the game.';
        playBtn.textContent = 'OK';
        overlay.classList.remove('hidden');
        showLobby();
        disconnectBtn.classList.add('hidden');
        if (window.NeonSFX) NeonSFX.gameOver();
    }

    // Cancel
    document.getElementById('cancel-online-btn').addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        if (peer) { peer.destroy(); peer = null; }
        conn = null;
        showLobby();
    });

    // Disconnect
    disconnectBtn.addEventListener('click', () => {
        disconnectOnline();
    });

    function disconnectOnline() {
        if (window.NeonSFX) NeonSFX.click();
        if (conn) conn.close();
        if (peer) { peer.destroy(); peer = null; }
        conn = null;
        showLobby();
        disconnectBtn.classList.add('hidden');
        gameRunning = false;
        stopTimer();
    }

    // Copy room code
    document.getElementById('copy-code-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(roomCode).then(() => {
            const btn = document.getElementById('copy-code-btn');
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = '📋'; }, 1500);
        }).catch(() => {
            const el = document.createElement('textarea');
            el.value = roomCode;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            const btn = document.getElementById('copy-code-btn');
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = '📋'; }, 1500);
        });
        if (window.NeonSFX) NeonSFX.click();
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

})();
