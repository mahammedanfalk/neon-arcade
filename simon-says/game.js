// ===== Simon Says — Neon Edition =====
(function () {
    'use strict';

    // ===== Difficulty Config =====
    const DIFF = {
        easy: { showDelay: 550, showDur: 450, speedInc: 10, buttons: 4, label: 'Slow & steady' },
        medium: { showDelay: 400, showDur: 350, speedInc: 20, buttons: 4, label: 'Standard pace' },
        hard: { showDelay: 280, showDur: 250, speedInc: 30, buttons: 6, label: '6 buttons — fast!' },
    };

    let difficulty = 'medium';
    let gameMode = 'solo'; // solo | online
    let sequence = [];
    let playerIndex = 0;
    let round = 0;
    let bestScore = parseInt(localStorage.getItem('simon-best-medium') || '0', 10);
    let accepting = false;
    let gameActive = false;

    // Online state
    const PEER_PREFIX = 'neonarcade-ss-';
    let peer = null;
    let conn = null;
    let isHost = false;
    let roomCode = '';
    let oppRound = 0;
    let oppAlive = true;
    let myTurn = false; // online turn-based: is it my turn?

    // DOM
    const allButtons = document.querySelectorAll('.simon-btn');
    let buttons = document.querySelectorAll('.simon-btn:not(.hidden)');
    const roundEl = document.getElementById('round-val');
    const bestEl = document.getElementById('best-val');
    const statusEl = document.getElementById('status');
    const startBtn = document.getElementById('start-btn');
    const oppRoundEl = document.getElementById('opp-round-val');
    const hudOnlineItems = document.querySelectorAll('.hud-online');
    const onlinePanel = document.getElementById('online-panel');

    bestEl.textContent = bestScore;

    // Audio
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const TONES = [261.63, 329.63, 392.00, 523.25, 587.33, 739.99]; // C4, E4, G4, C5, D5, F#5

    function playTone(index, duration = 200) {
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = TONES[index];
            gain.gain.value = 0.15;
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration / 1000);
        } catch (e) { /* silent */ }
    }

    function playErrorTone() {
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = 100;
            gain.gain.value = 0.12;
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        } catch (e) { /* silent */ }
    }

    // Light up a button
    function lightButton(index, duration) {
        const btn = buttons[index];
        // Force un-glow first (handles repeated same-color in sequence)
        btn.classList.remove('lit');
        void btn.offsetWidth; // force reflow so the browser registers the removal
        btn.classList.add('lit');
        playTone(index, duration);
        setTimeout(() => btn.classList.remove('lit'), duration);
    }

    // Show the sequence
    function showSequence() {
        accepting = false;
        statusEl.textContent = 'Watch the pattern...';
        const cfg = DIFF[difficulty];
        const delay = Math.max(150, cfg.showDelay - round * cfg.speedInc);
        const dur = Math.max(120, cfg.showDur - round * (cfg.speedInc / 2));

        sequence.forEach((colorIdx, i) => {
            setTimeout(() => lightButton(colorIdx, dur), i * delay + 500);
        });

        setTimeout(() => {
            playerIndex = 0;
            if (gameMode === 'online') {
                if (myTurn) {
                    accepting = true;
                    statusEl.textContent = `Your turn! Repeat ${sequence.length} taps`;
                } else {
                    accepting = false;
                    statusEl.textContent = 'Opponent\'s turn — watch...';
                }
            } else {
                accepting = true;
                statusEl.textContent = 'Your turn! Repeat the pattern';
            }
        }, sequence.length * delay + 500 + dur);
    }

    // Start new game
    function startGame() {
        sequence = [];
        round = 0;
        gameActive = true;
        oppRound = 0;
        oppAlive = true;
        myTurn = false;
        roundEl.textContent = '0';
        if (oppRoundEl) oppRoundEl.textContent = '0';
        startBtn.textContent = 'RESTART';

        if (gameMode === 'online') {
            // Turn-based: P1 (host) goes first on odd rounds, P2 (guest) on even rounds
            if (isHost) {
                myTurn = true;
                nextRound();
            } else {
                myTurn = false;
                statusEl.textContent = 'Opponent\'s turn — watch and wait...';
            }
        } else {
            nextRound();
        }
    }

    // Add next color and show
    function nextRound() {
        round++;
        roundEl.textContent = round;

        const numBtns = DIFF[difficulty].buttons;
        if (gameMode === 'online') {
            if (isHost) {
                // Host always generates and sends
                const nextColor = Math.floor(Math.random() * numBtns);
                sequence.push(nextColor);
                if (conn) conn.send({ type: 'next-round', sequence: [...sequence], round: round });
            }
            // Show sequence to active player, spectator watches
            showSequence();
        } else {
            sequence.push(Math.floor(Math.random() * numBtns));
            showSequence();
        }
    }

    // Player clicks a button
    allButtons.forEach((btn, index) => {
        const handler = (e) => {
            e.preventDefault();
            if (!accepting || !gameActive) return;
            // In online mode, only accept input if it's my turn
            if (gameMode === 'online' && !myTurn) return;

            lightButton(index, 200);

            if (sequence[playerIndex] === index) {
                playerIndex++;
                if (playerIndex === sequence.length) {
                    // Completed this round!
                    accepting = false;
                    statusEl.textContent = 'Correct! ✨';
                    if (window.NeonSFX) NeonSFX.paddleHit();

                    if (gameMode === 'online' && conn) {
                        conn.send({ type: 'round-complete', round: round });
                        // Switch turn to opponent
                        myTurn = false;
                        if (isHost) {
                            // Host still needs to generate next round and send
                            setTimeout(() => {
                                if (gameActive && oppAlive) {
                                    nextRound();
                                    statusEl.textContent = 'Opponent\'s turn — watch...';
                                }
                            }, 800);
                        } else {
                            statusEl.textContent = 'Opponent\'s turn — watch...';
                        }
                    } else {
                        setTimeout(nextRound, 800);
                    }
                }
            } else {
                // Wrong!
                if (gameMode === 'online' && conn) {
                    conn.send({ type: 'player-failed', round: round - 1 });
                }
                gameOver();
            }
        };

        btn.addEventListener('click', handler);
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handler(e);
        }, { passive: false });
    });

    function handleOnlineWin() {
        gameActive = false;
        accepting = false;
        statusEl.textContent = '🏆 You survived! Opponent failed!';
        if (window.NeonSFX) NeonSFX.win();
        startBtn.textContent = 'PLAY AGAIN';
    }

    function gameOver() {
        gameActive = false;
        accepting = false;
        playErrorTone();

        const finalRound = round - 1;
        const key = `simon-best-${difficulty}`;
        bestScore = parseInt(localStorage.getItem(key) || '0', 10);

        if (finalRound > bestScore) {
            bestScore = finalRound;
            localStorage.setItem(key, bestScore.toString());
            bestEl.textContent = bestScore;
        }

        if (gameMode === 'online') {
            if (oppAlive) {
                statusEl.textContent = `💀 Failed at round ${finalRound}! Waiting for opponent...`;
            } else {
                // Both failed — compare rounds
                if (finalRound > oppRound) {
                    statusEl.textContent = `🏆 You Win! Round ${finalRound} vs ${oppRound}`;
                    if (window.NeonSFX) NeonSFX.win();
                } else if (finalRound < oppRound) {
                    statusEl.textContent = `💀 You Lose! Round ${finalRound} vs ${oppRound}`;
                    if (window.NeonSFX) NeonSFX.gameOver();
                } else {
                    statusEl.textContent = `🤝 Tie! Both reached round ${finalRound}`;
                }
            }
        } else {
            statusEl.textContent = finalRound > 0 && finalRound >= bestScore
                ? `Game Over! Round ${finalRound} — New Best! 🏆`
                : `Game Over! You reached round ${finalRound}`;
            if (window.NeonSFX) NeonSFX.gameOver();
        }

        // Flash all buttons red
        buttons.forEach(b => {
            b.style.borderColor = 'rgba(255, 45, 117, 0.6)';
            b.style.background = 'rgba(255, 45, 117, 0.15)';
        });
        setTimeout(() => {
            buttons.forEach(b => { b.style.borderColor = ''; b.style.background = ''; });
        }, 600);

        startBtn.textContent = 'PLAY AGAIN';
    }

    // ===== Start button =====
    startBtn.addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        if (disconnected) {
            window.location.href = '../index.html';
            return;
        }

        if (gameMode === 'online' && isHost && conn) {
            startGame();
            conn.send({ type: 'start', difficulty: difficulty });
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
                onlinePanel.classList.remove('hidden');
                hudOnlineItems.forEach(el => el.classList.remove('hidden'));
                showLobby();
                // Lock difficulty during online
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.add('disabled'));
            } else {
                onlinePanel.classList.add('hidden');
                hudOnlineItems.forEach(el => el.classList.add('hidden'));
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('disabled'));
            }
            gameActive = false;
            accepting = false;
            roundEl.textContent = '0';
            statusEl.textContent = 'Press START to begin';
            startBtn.textContent = 'START';
        });
    });

    // ===== Difficulty Selector =====
    function updateBoardLayout() {
        const board = document.getElementById('board');
        const numBtns = DIFF[difficulty].buttons;
        const extraBtns = document.querySelectorAll('.simon-btn-extra');
        if (numBtns === 6) {
            board.classList.add('board-6');
            extraBtns.forEach(b => b.classList.remove('hidden'));
        } else {
            board.classList.remove('board-6');
            extraBtns.forEach(b => b.classList.add('hidden'));
        }
        buttons = document.querySelectorAll('.simon-btn:not(.hidden)');
    }

    document.querySelectorAll('#diff-selector .diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (gameMode === 'online') return; // Guard
            if (window.NeonSFX) NeonSFX.click();
            document.querySelectorAll('#diff-selector .diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            difficulty = btn.dataset.diff;
            updateBoardLayout();
            const key = `simon-best-${difficulty}`;
            bestScore = parseInt(localStorage.getItem(key) || '0', 10);
            bestEl.textContent = bestScore;
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

    // Create room
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

    // Join room
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

        // Reset
        gameActive = false;
        accepting = false;
        myTurn = false;
        sequence = [];
        round = 0;
        oppRound = 0;
        oppAlive = true;
        roundEl.textContent = '0';
        if (oppRoundEl) oppRoundEl.textContent = '0';
        statusEl.textContent = isHost ? 'Press START to begin' : 'Waiting for host to start...';
        startBtn.textContent = isHost ? 'START' : 'WAITING...';
        startBtn.disabled = !isHost;

        conn.on('data', (data) => {
            switch (data.type) {
                case 'start':
                    difficulty = data.difficulty || 'medium';
                    // Update difficulty UI
                    document.querySelectorAll('.diff-btn').forEach(b => {
                        b.classList.remove('active');
                        if (b.dataset.diff === difficulty) b.classList.add('active');
                    });
                    updateBoardLayout();
                    startGame();
                    break;
                case 'next-round':
                    // Guest receives full sequence from host
                    if (!isHost) {
                        sequence = data.sequence;
                        round = data.round;
                        roundEl.textContent = round;
                        // Check if it's my turn (guest plays even rounds: 2, 4, 6...)
                        const isGuestTurn = (round % 2 === 0);
                        myTurn = isGuestTurn;
                        showSequence();
                        if (!myTurn) {
                            // Not my turn — just watch the sequence
                            statusEl.textContent = 'Opponent\'s turn — watch the pattern...';
                        }
                    } else {
                        // Host: check if it's my turn (host plays odd rounds: 1, 3, 5...)
                        myTurn = (round % 2 === 1);
                    }
                    break;
                case 'round-complete':
                    oppRound = data.round;
                    if (oppRoundEl) oppRoundEl.textContent = oppRound;
                    // Opponent completed their turn, now it's my turn
                    if (isHost) {
                        // Host generates next round
                        setTimeout(() => {
                            if (gameActive) nextRound();
                        }, 800);
                    }
                    break;
                case 'player-failed':
                    oppAlive = false;
                    oppRound = data.round;
                    if (oppRoundEl) oppRoundEl.textContent = oppRound;
                    if (!gameActive) {
                        // I already failed too — compare
                        const myFinal = round - 1;
                        if (myFinal > oppRound) {
                            statusEl.textContent = `\ud83c\udfc6 You Win! Round ${myFinal} vs ${oppRound}`;
                            if (window.NeonSFX) NeonSFX.win();
                        } else if (myFinal < oppRound) {
                            statusEl.textContent = `\ud83d\udc80 You Lose! Round ${myFinal} vs ${oppRound}`;
                        } else {
                            statusEl.textContent = `\ud83e\udd1d Tie! Both reached round ${myFinal}`;
                        }
                    } else {
                        // Opponent failed, I win!
                        handleOnlineWin();
                    }
                    break;
            }
        });

        conn.on('close', () => handleDisconnect());
        conn.on('error', () => handleDisconnect());
    }

    let disconnected = false;

    function handleDisconnect() {
        conn = null;
        gameActive = false;
        accepting = false;
        disconnected = true;
        statusEl.textContent = '💔 Opponent disconnected';
        startBtn.textContent = 'OK';
        startBtn.disabled = false;
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
        gameActive = false;
        accepting = false;
        startBtn.disabled = false;
    }

    // Copy invite link
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

    // Auto-join from invite link
    (function checkInviteLink() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code && code.length >= 3) {
            window.history.replaceState({}, '', window.location.pathname);
            // Switch to online mode
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
