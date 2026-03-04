// ===== Neon Memory Match — Game Engine =====
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

    const SYMBOLS = ['🚀', '⚡', '🎮', '💎', '🌟', '🔥', '🎵', '👾'];
    const COLORS = [
        { bg: 'rgba(0, 212, 255, 0.15)', border: 'rgba(0, 212, 255, 0.35)', glow: 'rgba(0, 212, 255, 0.2)' },
        { bg: 'rgba(255, 230, 0, 0.15)', border: 'rgba(255, 230, 0, 0.35)', glow: 'rgba(255, 230, 0, 0.2)' },
        { bg: 'rgba(0, 255, 136, 0.15)', border: 'rgba(0, 255, 136, 0.35)', glow: 'rgba(0, 255, 136, 0.2)' },
        { bg: 'rgba(255, 45, 117, 0.15)', border: 'rgba(255, 45, 117, 0.35)', glow: 'rgba(255, 45, 117, 0.2)' },
        { bg: 'rgba(180, 77, 255, 0.15)', border: 'rgba(180, 77, 255, 0.35)', glow: 'rgba(180, 77, 255, 0.2)' },
        { bg: 'rgba(255, 138, 0, 0.15)', border: 'rgba(255, 138, 0, 0.35)', glow: 'rgba(255, 138, 0, 0.2)' },
        { bg: 'rgba(0, 255, 229, 0.15)', border: 'rgba(0, 255, 229, 0.35)', glow: 'rgba(0, 255, 229, 0.2)' },
        { bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.25)', glow: 'rgba(255, 255, 255, 0.15)' },
    ];

    const TOTAL_PAIRS = SYMBOLS.length;

    // ===== State =====
    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let moves = 0;
    let timerInterval = null;
    let startTime = 0;
    let gameRunning = false;
    let locked = false;
    let bestMoves = parseInt(localStorage.getItem('memory-best') || '0', 10);

    // 2P state
    let gameMode = 'solo'; // 'solo' | '2p'
    let currentPlayer = 1; // 1 or 2
    let playerScores = { 1: 0, 2: 0 };

    if (bestMoves > 0) bestEl.textContent = bestMoves;

    // ===== Mode selector =====
    document.querySelectorAll('#mode-selector .mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            document.querySelectorAll('#mode-selector .mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameMode = btn.dataset.mode;
            updateModeUI();
        });
    });

    function updateModeUI() {
        if (gameMode === '2p') {
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
        if (gameMode !== '2p') return;
        if (currentPlayer === 1) {
            turnText.textContent = "Player 1's Turn";
            turnText.style.color = '#00d4ff';
            turnIndicator.style.borderColor = 'rgba(0, 212, 255, 0.3)';
        } else {
            turnText.textContent = "Player 2's Turn";
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
    function buildBoard() {
        board.innerHTML = '';
        const pairs = [];
        for (let i = 0; i < TOTAL_PAIRS; i++) {
            pairs.push({ symbol: SYMBOLS[i], colorIndex: i });
            pairs.push({ symbol: SYMBOLS[i], colorIndex: i });
        }
        shuffle(pairs);

        cards = pairs.map((item, index) => {
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

            card.addEventListener('click', () => flipCard(card));
            board.appendChild(card);

            return { el: card, symbol: item.symbol, matched: false };
        });
    }

    // ===== Flip Logic =====
    function flipCard(cardEl) {
        if (!gameRunning || locked) return;
        const idx = parseInt(cardEl.dataset.index);
        const card = cards[idx];

        // Can't flip already flipped or matched cards
        if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched')) return;
        // Can't flip same card twice
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
            // Match!
            setTimeout(() => {
                a.el.classList.add('matched', 'match-flash');
                b.el.classList.add('matched', 'match-flash');
                a.matched = true;
                b.matched = true;
                matchedPairs++;
                pairsEl.textContent = `${matchedPairs}/${TOTAL_PAIRS}`;

                if (gameMode === '2p') {
                    playerScores[currentPlayer]++;
                    updateTurnDisplay();
                    // Current player gets another turn on a match — don't switch
                }

                flippedCards = [];
                locked = false;
                if (window.NeonSFX) NeonSFX.score();

                if (matchedPairs === TOTAL_PAIRS) {
                    endGame();
                }
            }, 300);
        } else {
            // No match — shake and flip back
            setTimeout(() => {
                a.el.classList.add('shake');
                b.el.classList.add('shake');
                if (window.NeonSFX) NeonSFX.wallBounce();

                setTimeout(() => {
                    a.el.classList.remove('flipped', 'shake');
                    b.el.classList.remove('flipped', 'shake');
                    flippedCards = [];
                    locked = false;

                    // Switch player in 2P mode on miss
                    if (gameMode === '2p') {
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
    function startGame() {
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
        buildBoard();
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
                localStorage.setItem('memory-best', bestMoves.toString());
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
            // 2P Mode — determine winner
            const p1 = playerScores[1];
            const p2 = playerScores[2];
            if (window.NeonSFX) NeonSFX.win();

            if (p1 > p2) {
                overlayIcon.textContent = '🎉';
                overlayTitle.textContent = 'PLAYER 1 WINS!';
                overlayInfo.innerHTML = `
                    <span style="color:#00d4ff">Player 1: <strong>${p1}</strong> pairs</span><br>
                    <span style="color:#ff2d75">Player 2: <strong>${p2}</strong> pairs</span><br>
                    Time: <strong style="color:#00ff88">${formatTime(elapsed)}</strong>
                `;
            } else if (p2 > p1) {
                overlayIcon.textContent = '🎉';
                overlayTitle.textContent = 'PLAYER 2 WINS!';
                overlayInfo.innerHTML = `
                    <span style="color:#00d4ff">Player 1: <strong>${p1}</strong> pairs</span><br>
                    <span style="color:#ff2d75">Player 2: <strong>${p2}</strong> pairs</span><br>
                    Time: <strong style="color:#00ff88">${formatTime(elapsed)}</strong>
                `;
            } else {
                overlayIcon.textContent = '🤝';
                overlayTitle.textContent = "IT'S A TIE!";
                overlayInfo.innerHTML = `
                    Both players matched <strong style="color:#ffe600">${p1}</strong> pairs!<br>
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
        startGame();
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
