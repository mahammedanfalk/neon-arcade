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

    // DOM
    const holes = document.querySelectorAll('.hole');
    const scoreEl = document.getElementById('score-val');
    const timeEl = document.getElementById('time-val');
    const bestEl = document.getElementById('best-val');
    const comboEl = document.getElementById('combo-val');
    const overlay = document.getElementById('overlay');
    const overlayIcon = document.getElementById('overlay-icon');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayInfo = document.getElementById('overlay-info');
    const playBtn = document.getElementById('play-btn');

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
        const hole = holes[index];
        activeMoles.add(index);

        // Golden mole?
        const isGolden = Math.random() < GOLDEN_CHANCE;
        if (isGolden) hole.classList.add('golden');

        hole.classList.add('active');

        // Auto-hide after timeout
        const showTime = MIN_SHOW_TIME + Math.random() * (MAX_SHOW_TIME - MIN_SHOW_TIME);
        // Speed up over time
        const speedFactor = Math.max(0.4, 1 - (GAME_DURATION - timeLeft) / GAME_DURATION * 0.6);
        const adjustedShowTime = showTime * speedFactor;

        setTimeout(() => {
            if (hole.classList.contains('active')) {
                hole.classList.remove('active', 'golden');
                activeMoles.delete(index);
            }
        }, adjustedShowTime);

        scheduleSpawn();
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
        timeLeft = GAME_DURATION;
        combo = 0;
        lastWhackTime = 0;
        gameRunning = true;
        activeMoles.clear();

        scoreEl.textContent = '0';
        timeEl.textContent = GAME_DURATION;
        comboEl.textContent = '×1';
        comboEl.style.color = '#00ff88';

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
        playBtn.textContent = 'PLAY AGAIN';
        overlay.classList.remove('hidden');
    }

    // ===== Play Button =====
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
