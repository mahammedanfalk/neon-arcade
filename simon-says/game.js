// ===== Simon Says — Neon Edition =====
(function () {
    'use strict';

    const SHOW_DELAY = 400; // ms between showing each color
    const SHOW_DURATION = 350; // ms a button stays lit
    const SPEED_INCREMENT = 20; // ms faster per round

    let sequence = [];
    let playerIndex = 0;
    let round = 0;
    let bestScore = parseInt(localStorage.getItem('simon-best') || '0', 10);
    let accepting = false;
    let gameActive = false;

    // DOM
    const buttons = document.querySelectorAll('.simon-btn');
    const roundEl = document.getElementById('round-val');
    const bestEl = document.getElementById('best-val');
    const statusEl = document.getElementById('status');
    const startBtn = document.getElementById('start-btn');

    bestEl.textContent = bestScore;

    // Audio tones for each button using Web Audio API
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const TONES = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

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
        btn.classList.add('lit');
        playTone(index, duration);
        setTimeout(() => btn.classList.remove('lit'), duration);
    }

    // Show the sequence
    function showSequence() {
        accepting = false;
        statusEl.textContent = 'Watch the pattern...';
        const delay = Math.max(200, SHOW_DELAY - round * SPEED_INCREMENT);
        const dur = Math.max(180, SHOW_DURATION - round * (SPEED_INCREMENT / 2));

        sequence.forEach((colorIdx, i) => {
            setTimeout(() => {
                lightButton(colorIdx, dur);
            }, i * delay + 500);
        });

        setTimeout(() => {
            accepting = true;
            playerIndex = 0;
            statusEl.textContent = 'Your turn! Repeat the pattern';
        }, sequence.length * delay + 500 + dur);
    }

    // Start new game
    function startGame() {
        sequence = [];
        round = 0;
        gameActive = true;
        roundEl.textContent = '0';
        startBtn.textContent = 'RESTART';
        nextRound();
    }

    // Add next color and show
    function nextRound() {
        round++;
        roundEl.textContent = round;
        sequence.push(Math.floor(Math.random() * 4));
        showSequence();
    }

    // Player clicks a button
    buttons.forEach((btn, index) => {
        const handler = (e) => {
            e.preventDefault();
            if (!accepting || !gameActive) return;

            lightButton(index, 200);

            if (sequence[playerIndex] === index) {
                playerIndex++;
                if (playerIndex === sequence.length) {
                    // Completed this round!
                    accepting = false;
                    statusEl.textContent = 'Correct! ✨';
                    if (window.NeonSFX) NeonSFX.paddleHit();
                    setTimeout(nextRound, 800);
                }
            } else {
                // Wrong!
                gameOver();
            }
        };

        btn.addEventListener('click', handler);
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handler(e);
        }, { passive: false });
    });

    function gameOver() {
        gameActive = false;
        accepting = false;
        playErrorTone();

        if (round - 1 > bestScore) {
            bestScore = round - 1;
            localStorage.setItem('simon-best', bestScore.toString());
            bestEl.textContent = bestScore;
            statusEl.textContent = `Game Over! Round ${round - 1} — New Best! 🏆`;
        } else {
            statusEl.textContent = `Game Over! You reached round ${round - 1}`;
        }

        if (window.NeonSFX) NeonSFX.gameOver();

        // Flash all buttons red
        buttons.forEach(b => {
            b.style.borderColor = 'rgba(255, 45, 117, 0.6)';
            b.style.background = 'rgba(255, 45, 117, 0.15)';
        });
        setTimeout(() => {
            buttons.forEach(b => {
                b.style.borderColor = '';
                b.style.background = '';
            });
        }, 600);

        startBtn.textContent = 'PLAY AGAIN';
    }

    // Start button
    startBtn.addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        if (audioCtx.state === 'suspended') audioCtx.resume();
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
