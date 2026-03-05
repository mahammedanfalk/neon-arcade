// ===== Whack-a-Mole — Neon Edition =====
(function () {
    'use strict';

    const GAME_DURATION = 30; // seconds
    const MIN_SHOW_TIME = 600; // ms
    const MAX_SHOW_TIME = 1200;
    const MIN_SPAWN_DELAY = 300;
    const MAX_SPAWN_DELAY = 800;
    const GOLDEN_CHANCE = 0.15; // 15% chance of golden mole

    let score = 0;
    let bestScore = parseInt(localStorage.getItem('wam-best') || '0', 10);
    let timeLeft = GAME_DURATION;
    let gameRunning = false;
    let timerInterval = null;
    let spawnTimeout = null;
    let combo = 0;
    let lastWhackTime = 0;
    let gameMode = 'solo';

    // Online state
    const PEER_PREFIX = 'neonarcade-wam-';
    let peer = null;
    let conn = null;
    let isHost = false;
    let roomCode = '';
    let oppScore = 0;

    // DOM
    const holes = document.querySelectorAll('.hole');
    const scoreEl = document.getElementById('score-val');
    const timeEl = document.getElementById('time-val');
    const bestEl = document.getElementById('best-val');
    const comboEl = document.getElementById('combo-val');
    const oppScoreEl = document.getElementById('opp-score-val');
    const overlay = document.getElementById('overlay');
    const overlayIcon = document.getElementById('overlay-icon');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayInfo = document.getElementById('overlay-info');
    const playBtn = document.getElementById('play-btn');
    const hudOnlineItems = document.querySelectorAll('.hud-online');

    bestEl.textContent = bestScore;

    // Active moles tracking
    let activeMoles = new Set();

    // ===== Hole Click =====
    holes.forEach((hole, index) => {
        const whack = (e) => {
            e.preventDefault();
            if (!gameRunning) return;
            if (!hole.classList.contains('active')) {
                // Miss — reset combo
                combo = 0;
                comboEl.textContent = '×1';
                return;
            }

            // Whack!
            hole.classList.remove('active');
            hole.classList.add('whacked');
            activeMoles.delete(index);

            // Combo logic
            const now = Date.now();
            if (now - lastWhackTime < 1500) {
                combo++;
            } else {
                combo = 1;
            }
            lastWhackTime = now;

            const multiplier = Math.min(combo, 5);
            comboEl.textContent = `×${multiplier}`;
            comboEl.style.color = multiplier >= 3 ? '#ff8a00' : multiplier >= 2 ? '#ffe600' : '#00ff88';

            const isGolden = hole.classList.contains('golden');
            const points = (isGolden ? 3 : 1) * multiplier;
            score += points;
            scoreEl.textContent = score;

            // Send score to opponent
            if (gameMode === 'online' && conn) {
                conn.send({ type: 'score-update', score: score });
            }

            // Float score
            const floater = document.createElement('div');
            floater.className = 'float-score' + (isGolden ? ' golden' : '');
            floater.textContent = `+${points}`;
            hole.appendChild(floater);
            setTimeout(() => floater.remove(), 800);

            hole.classList.remove('golden');
            setTimeout(() => hole.classList.remove('whacked'), 200);

            if (window.NeonSFX) NeonSFX.paddleHit();
        };

        hole.addEventListener('click', whack);
        hole.addEventListener('touchstart', (e) => {
            e.preventDefault();
            whack(e);
        }, { passive: false });
    });

    // ===== Spawn Moles =====
    function spawnMole() {
        if (!gameRunning) return;

        // In online mode, only host generates spawns
        if (gameMode === 'online' && !isHost) {
            scheduleSpawn();
            return;
        }

        // Pick a random non-active hole
        const available = [];
        holes.forEach((h, i) => {
            if (!activeMoles.has(i)) available.push(i);
        });
        if (available.length === 0) {
            scheduleSpawn();
            return;
        }

        const index = available[Math.floor(Math.random() * available.length)];
        const isGolden = Math.random() < GOLDEN_CHANCE;
        const showTime = MIN_SHOW_TIME + Math.random() * (MAX_SHOW_TIME - MIN_SHOW_TIME);
        const speedFactor = Math.max(0.4, 1 - (GAME_DURATION - timeLeft) / GAME_DURATION * 0.6);
        const adjustedShowTime = showTime * speedFactor;

        showMole(index, isGolden, adjustedShowTime);

        // Broadcast to opponent
        if (gameMode === 'online' && conn) {
            conn.send({ type: 'spawn', index, isGolden, duration: adjustedShowTime });
        }

        scheduleSpawn();
    }

    function showMole(index, isGolden, duration) {
        const hole = holes[index];
        activeMoles.add(index);
        if (isGolden) hole.classList.add('golden');
        hole.classList.add('active');

        setTimeout(() => {
            if (hole.classList.contains('active')) {
                hole.classList.remove('active', 'golden');
                activeMoles.delete(index);
            }
        }, duration);
    }

    function scheduleSpawn() {
        if (!gameRunning) return;
        const delay = MIN_SPAWN_DELAY + Math.random() * (MAX_SPAWN_DELAY - MIN_SPAWN_DELAY);
        // Speed up spawn rate over time
        const speedFactor = Math.max(0.3, 1 - (GAME_DURATION - timeLeft) / GAME_DURATION * 0.7);
        spawnTimeout = setTimeout(spawnMole, delay * speedFactor);
    }

    // ===== Game Control =====
    function startGame() {
        score = 0;
        oppScore = 0;
        timeLeft = GAME_DURATION;
        combo = 0;
        lastWhackTime = 0;
        gameRunning = true;
        activeMoles.clear();

        scoreEl.textContent = '0';
        timeEl.textContent = GAME_DURATION;
        comboEl.textContent = '×1';
        comboEl.style.color = '#00ff88';
        if (oppScoreEl) oppScoreEl.textContent = '0';

        holes.forEach(h => h.classList.remove('active', 'golden', 'whacked'));

        overlay.classList.add('hidden');
        if (window.NeonSFX) NeonSFX.gameStart();

        timerInterval = setInterval(() => {
            timeLeft--;
            timeEl.textContent = timeLeft;

            if (timeLeft <= 5) {
                timeEl.style.color = '#ff2d75';
            }

            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);

        // Start spawning
        spawnMole();
        // Spawn a second mole shortly after
        setTimeout(() => { if (gameRunning) spawnMole(); }, 500);
    }

    function endGame() {
        gameRunning = false;
        clearInterval(timerInterval);
        clearTimeout(spawnTimeout);

        // Clear all active moles
        holes.forEach(h => h.classList.remove('active', 'golden'));
        activeMoles.clear();

        timeEl.style.color = '#00ff88';

        // Send final score to opponent
        if (gameMode === 'online' && conn) {
            conn.send({ type: 'final-score', score: score });
        }

        if (gameMode === 'solo') {
            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem('wam-best', bestScore.toString());
                bestEl.textContent = bestScore;
            }

            if (window.NeonSFX) {
                if (score > 0) NeonSFX.win();
                else NeonSFX.gameOver();
            }

            overlayIcon.textContent = score >= 30 ? '🏆' : score >= 15 ? '🔨' : '😅';
            overlayTitle.textContent = score >= 30 ? 'AMAZING!' : score >= 15 ? 'Nice Job!' : 'Game Over';
            overlayInfo.innerHTML = `
                Score: <strong style="color:#00ff88">${score}</strong><br>
                Best: <strong style="color:#00d4ff">${bestScore}</strong>
                ${score >= bestScore && score > 0 ? '<br><span style="color:#ffe600">★ NEW BEST ★</span>' : ''}
            `;
        } else {
            // Online mode
            if (window.NeonSFX) {
                if (score > oppScore) NeonSFX.win();
                else NeonSFX.gameOver();
            }

            if (score > oppScore) {
                overlayIcon.textContent = '🏆';
                overlayTitle.textContent = 'YOU WIN!';
            } else if (score < oppScore) {
                overlayIcon.textContent = '💀';
                overlayTitle.textContent = 'YOU LOSE!';
            } else {
                overlayIcon.textContent = '🤝';
                overlayTitle.textContent = 'TIE!';
            }
            overlayInfo.innerHTML = `
                You: <strong style="color:#00ff88">${score}</strong> &nbsp;
                Opponent: <strong style="color:#ff2d75">${oppScore}</strong>
            `;
        }

        playBtn.textContent = 'PLAY AGAIN';
        overlay.classList.remove('hidden');
    }

    // ===== Play Button =====
    playBtn.addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        if (gameMode === 'online' && isHost && conn) {
            startGame();
            conn.send({ type: 'start' });
        } else if (gameMode !== 'online') {
            startGame();
        }
    });

    // ===== Mode Selector =====
    document.querySelectorAll('#mode-selector .mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            document.querySelectorAll('#mode-selector .mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const newMode = btn.dataset.mode;
            if (gameMode === 'online' && newMode !== 'online') disconnectOnline();
            gameMode = newMode;
            if (gameMode === 'online') {
                document.getElementById('online-panel').classList.remove('hidden');
                hudOnlineItems.forEach(el => el.classList.remove('hidden'));
                showLobby();
            } else {
                document.getElementById('online-panel').classList.add('hidden');
                hudOnlineItems.forEach(el => el.classList.add('hidden'));
            }
        });
    });

    // ================================================================
    //  ONLINE MULTIPLAYER (PeerJS)
    // ================================================================

    const onlineLobby = document.getElementById('online-lobby');
    const onlineWaiting = document.getElementById('online-waiting');
    const onlineConnected = document.getElementById('online-connected');
    const waitingText = document.getElementById('waiting-text');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const roomCodeEl = document.getElementById('room-code');
    const shareHint = document.getElementById('share-hint');
    const disconnectBtn = document.getElementById('disconnect-btn');

    function generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
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
        disconnectBtn.classList.remove('hidden');
    }

    document.getElementById('create-room-btn').addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        isHost = true;
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
            conn.on('open', () => setupConnection());
            conn.on('error', () => handleDisconnect());
        });
        peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                roomCode = generateCode();
                peer.destroy();
                document.getElementById('create-room-btn').click();
            } else {
                waitingText.textContent = 'Connection error. Try again.';
            }
        });
    });

    document.getElementById('join-room-btn').addEventListener('click', () => {
        const input = document.getElementById('room-code-input').value.trim().toUpperCase();
        if (!input || input.length < 3) return;
        if (window.NeonSFX) NeonSFX.click();
        isHost = false;
        roomCode = input;
        showWaiting('Connecting...');
        if (peer) peer.destroy();
        peer = new Peer(undefined, { debug: 0 });
        peer.on('open', () => {
            conn = peer.connect(PEER_PREFIX + roomCode, { reliable: true });
            conn.on('open', () => setupConnection());
            conn.on('error', () => { waitingText.textContent = 'Room not found.'; });
        });
        peer.on('error', (err) => {
            waitingText.textContent = err.type === 'peer-unavailable' ? 'Room not found.' : 'Connection error.';
        });
    });

    document.getElementById('room-code-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('join-room-btn').click();
    });

    function setupConnection() {
        if (window.NeonSFX) NeonSFX.gameStart();
        showConnected();

        conn.on('data', (data) => {
            switch (data.type) {
                case 'start':
                    startGame();
                    break;
                case 'spawn':
                    showMole(data.index, data.isGolden, data.duration);
                    break;
                case 'score-update':
                    oppScore = data.score;
                    if (oppScoreEl) oppScoreEl.textContent = oppScore;
                    break;
                case 'final-score':
                    oppScore = data.score;
                    if (oppScoreEl) oppScoreEl.textContent = oppScore;
                    break;
            }
        });

        conn.on('close', () => handleDisconnect());
        conn.on('error', () => handleDisconnect());

        // If host, auto-start
        if (isHost) {
            startGame();
            conn.send({ type: 'start' });
        }
    }

    function handleDisconnect() {
        conn = null;
        gameRunning = false;
        clearInterval(timerInterval);
        clearTimeout(spawnTimeout);
        overlayIcon.textContent = '💔';
        overlayTitle.textContent = 'Disconnected';
        overlayInfo.textContent = 'Your opponent left the game.';
        playBtn.textContent = 'OK';
        overlay.classList.remove('hidden');
        showLobby();
        disconnectBtn.classList.add('hidden');
        if (window.NeonSFX) NeonSFX.gameOver();
    }

    document.getElementById('cancel-online-btn').addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        if (peer) { peer.destroy(); peer = null; }
        conn = null;
        showLobby();
    });

    disconnectBtn.addEventListener('click', () => disconnectOnline());

    function disconnectOnline() {
        if (window.NeonSFX) NeonSFX.click();
        if (conn) conn.close();
        if (peer) { peer.destroy(); peer = null; }
        conn = null;
        showLobby();
        disconnectBtn.classList.add('hidden');
        gameRunning = false;
        clearInterval(timerInterval);
        clearTimeout(spawnTimeout);
    }

    document.getElementById('copy-code-btn').addEventListener('click', () => {
        const inviteUrl = window.location.origin + window.location.pathname + '?code=' + roomCode;
        navigator.clipboard.writeText(inviteUrl).then(() => {
            const btn = document.getElementById('copy-code-btn');
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = '🔗'; }, 1500);
        }).catch(() => {
            const el = document.createElement('textarea');
            el.value = inviteUrl;
            document.body.appendChild(el); el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            const btn = document.getElementById('copy-code-btn');
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = '🔗'; }, 1500);
        });
        if (window.NeonSFX) NeonSFX.click();
    });

    // ===== Auto-join from invite link =====
    (function checkInviteLink() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code && code.length >= 3) {
            window.history.replaceState({}, '', window.location.pathname);
            document.querySelectorAll('#mode-selector .mode-btn').forEach(b => b.classList.remove('active'));
            const onlineBtn = document.getElementById('mode-online');
            if (onlineBtn) {
                onlineBtn.classList.add('active');
                onlineBtn.click();
            }
            setTimeout(() => {
                const input = document.getElementById('room-code-input');
                if (input) {
                    input.value = code.toUpperCase();
                    const joinBtn = document.getElementById('join-room-btn');
                    if (joinBtn) joinBtn.click();
                }
            }, 500);
        }
    })();

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
