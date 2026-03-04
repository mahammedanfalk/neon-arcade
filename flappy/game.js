// ===== Flappy Bird — Neon Edition =====
(function () {
    'use strict';

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // ===== Constants =====
    const GRAVITY = 0.45;
    const FLAP_POWER = -7.5;
    const PIPE_WIDTH = 52;
    const PIPE_GAP = 150;
    const PIPE_SPEED = 2.5;
    const PIPE_SPAWN_INTERVAL = 100; // frames
    const BIRD_SIZE = 24;
    const BIRD_X = 80;

    // Colors
    const COL_GREEN = '#00ff88';
    const COL_BLUE = '#00d4ff';
    const COL_PINK = '#ff2d75';
    const COL_PURPLE = '#b44dff';
    const COL_YELLOW = '#ffe600';

    // ===== State =====
    let bird = { y: H / 2, vy: 0, angle: 0 };
    let pipes = [];
    let frameCount = 0;
    let score = 0;
    let bestScore = parseInt(localStorage.getItem('flappy-best') || '0', 10);
    let gameRunning = false;
    let gameOver = false;
    let animId = null;

    // Stars
    const stars = [];
    for (let i = 0; i < 60; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 1.5 + 0.3,
            speed: Math.random() * 0.3 + 0.1,
            alpha: Math.random() * 0.5 + 0.2,
        });
    }

    // Particles
    let particles = [];

    // ===== DOM =====
    const overlay = document.getElementById('overlay');
    const overlayIcon = document.getElementById('overlay-icon');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayInfo = document.getElementById('overlay-info');
    const playBtn = document.getElementById('play-btn');
    const scoreEl = document.getElementById('score-val');
    const bestEl = document.getElementById('best-val');

    bestEl.textContent = bestScore;

    // ===== Game Functions =====
    function resetGame() {
        bird = { y: H / 2, vy: 0, angle: 0 };
        pipes = [];
        particles = [];
        frameCount = 0;
        score = 0;
        gameOver = false;
        scoreEl.textContent = '0';
    }

    function startGame() {
        resetGame();
        gameRunning = true;
        overlay.classList.add('hidden');
        if (window.NeonSFX) NeonSFX.gameStart();
        gameLoop();
    }

    function flap() {
        if (!gameRunning || gameOver) return;
        bird.vy = FLAP_POWER;
        // Spawn flap particles
        for (let i = 0; i < 5; i++) {
            particles.push({
                x: BIRD_X,
                y: bird.y + BIRD_SIZE / 2,
                vx: -(Math.random() * 2 + 1),
                vy: Math.random() * 3 - 1,
                life: 15 + Math.random() * 10,
                maxLife: 25,
                color: COL_YELLOW,
                r: Math.random() * 3 + 1,
            });
        }
        if (window.NeonSFX) NeonSFX.click();
    }

    function spawnPipe() {
        const minTop = 60;
        const maxTop = H - PIPE_GAP - 60;
        const topH = Math.floor(Math.random() * (maxTop - minTop)) + minTop;
        pipes.push({
            x: W,
            topH: topH,
            bottomY: topH + PIPE_GAP,
            scored: false,
            color: [COL_GREEN, COL_BLUE, COL_PINK, COL_PURPLE][Math.floor(Math.random() * 4)],
        });
    }

    function update() {
        frameCount++;

        // Spawn pipes
        if (frameCount % PIPE_SPAWN_INTERVAL === 0) {
            spawnPipe();
        }

        // Bird physics
        bird.vy += GRAVITY;
        bird.y += bird.vy;
        bird.angle = Math.min(Math.max(bird.vy * 3, -30), 70);

        // Move pipes
        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].x -= PIPE_SPEED;

            // Score when bird passes pipe
            if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < BIRD_X) {
                pipes[i].scored = true;
                score++;
                scoreEl.textContent = score;
                if (window.NeonSFX) NeonSFX.score();

                // Score particles
                for (let j = 0; j < 8; j++) {
                    particles.push({
                        x: BIRD_X + BIRD_SIZE,
                        y: bird.y,
                        vx: Math.random() * 4 - 2,
                        vy: Math.random() * 4 - 2,
                        life: 20 + Math.random() * 15,
                        maxLife: 35,
                        color: COL_GREEN,
                        r: Math.random() * 3 + 1,
                    });
                }
            }

            // Remove off-screen pipes
            if (pipes[i].x + PIPE_WIDTH < -10) {
                pipes.splice(i, 1);
            }
        }

        // Collision detection
        // Floor/ceiling
        if (bird.y < 0 || bird.y + BIRD_SIZE > H) {
            die();
            return;
        }

        // Pipes
        for (const pipe of pipes) {
            if (BIRD_X + BIRD_SIZE > pipe.x && BIRD_X < pipe.x + PIPE_WIDTH) {
                if (bird.y < pipe.topH || bird.y + BIRD_SIZE > pipe.bottomY) {
                    die();
                    return;
                }
            }
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Stars scroll
        for (const star of stars) {
            star.x -= star.speed;
            if (star.x < 0) { star.x = W; star.y = Math.random() * H; }
        }
    }

    function die() {
        gameOver = true;
        gameRunning = false;
        if (animId) cancelAnimationFrame(animId);

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('flappy-best', bestScore.toString());
            bestEl.textContent = bestScore;
        }

        // Death particles
        for (let i = 0; i < 20; i++) {
            particles.push({
                x: BIRD_X + BIRD_SIZE / 2,
                y: bird.y + BIRD_SIZE / 2,
                vx: Math.random() * 8 - 4,
                vy: Math.random() * 8 - 4,
                life: 30 + Math.random() * 20,
                maxLife: 50,
                color: COL_PINK,
                r: Math.random() * 4 + 1,
            });
        }

        if (window.NeonSFX) NeonSFX.gameOver();

        setTimeout(() => {
            overlayIcon.textContent = '💀';
            overlayTitle.textContent = 'Game Over!';
            overlayInfo.innerHTML = `
                Score: <strong style="color:${COL_GREEN}">${score}</strong><br>
                Best: <strong style="color:${COL_BLUE}">${bestScore}</strong>
                ${score >= bestScore && score > 0 ? '<br><span style="color:#ffe600">★ NEW BEST ★</span>' : ''}
            `;
            playBtn.textContent = 'PLAY AGAIN';
            overlay.classList.remove('hidden');
        }, 600);
    }

    // ===== Drawing =====
    function drawFrame() {
        ctx.clearRect(0, 0, W, H);

        // Background gradient
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0a0a2a');
        bg.addColorStop(0.5, '#060614');
        bg.addColorStop(1, '#0d0d1a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Stars
        for (const star of stars) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            ctx.fill();
        }

        // Ground line
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, H - 1);
        ctx.lineTo(W, H - 1);
        ctx.stroke();

        // Ceiling line
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.lineTo(W, 1);
        ctx.stroke();

        // Pipes
        for (const pipe of pipes) {
            drawPipe(pipe);
        }

        // Particles
        for (const p of particles) {
            const alpha = p.life / p.maxLife;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
            ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
            // Fallback for hex colors
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Bird
        drawBird();

        // Score on canvas (large, centered)
        if (gameRunning && !gameOver) {
            ctx.font = '900 48px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0, 255, 136, 0.12)';
            ctx.fillText(score.toString(), W / 2, 80);
        }
    }

    function drawPipe(pipe) {
        const glow = pipe.color;

        // Top pipe
        ctx.fillStyle = 'rgba(15, 15, 35, 0.9)';
        ctx.strokeStyle = glow;
        ctx.lineWidth = 2;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 12;

        // Top pipe body
        ctx.beginPath();
        ctx.roundRect(pipe.x, 0, PIPE_WIDTH, pipe.topH, [0, 0, 8, 8]);
        ctx.fill();
        ctx.stroke();

        // Top pipe cap
        ctx.beginPath();
        ctx.roundRect(pipe.x - 4, pipe.topH - 20, PIPE_WIDTH + 8, 20, [0, 0, 6, 6]);
        ctx.fill();
        ctx.stroke();

        // Bottom pipe body
        ctx.beginPath();
        ctx.roundRect(pipe.x, pipe.bottomY, PIPE_WIDTH, H - pipe.bottomY, [8, 8, 0, 0]);
        ctx.fill();
        ctx.stroke();

        // Bottom pipe cap
        ctx.beginPath();
        ctx.roundRect(pipe.x - 4, pipe.bottomY, PIPE_WIDTH + 8, 20, [6, 6, 0, 0]);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
    }

    function drawBird() {
        ctx.save();
        ctx.translate(BIRD_X + BIRD_SIZE / 2, bird.y + BIRD_SIZE / 2);
        ctx.rotate((bird.angle * Math.PI) / 180);

        // Glow
        ctx.shadowColor = COL_YELLOW;
        ctx.shadowBlur = 16;

        // Body
        ctx.fillStyle = COL_YELLOW;
        ctx.beginPath();
        ctx.ellipse(0, 0, BIRD_SIZE / 2 + 2, BIRD_SIZE / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = '#fff8';
        ctx.beginPath();
        ctx.ellipse(-2, -3, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(6, -4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(7, -5, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = COL_PINK;
        ctx.beginPath();
        ctx.moveTo(BIRD_SIZE / 2 + 2, -2);
        ctx.lineTo(BIRD_SIZE / 2 + 10, 1);
        ctx.lineTo(BIRD_SIZE / 2 + 2, 4);
        ctx.closePath();
        ctx.fill();

        // Wing (animated)
        const wingFlap = Math.sin(frameCount * 0.3) * 6;
        ctx.fillStyle = 'rgba(255, 230, 0, 0.7)';
        ctx.beginPath();
        ctx.ellipse(-4, 4 + wingFlap, 8, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ===== Game Loop =====
    function gameLoop() {
        if (!gameRunning) return;
        update();
        drawFrame();
        animId = requestAnimationFrame(gameLoop);
    }

    // ===== Input =====
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            flap();
        }
    });

    // Mouse click
    canvas.addEventListener('click', (e) => {
        e.preventDefault();
        flap();
    });

    // Touch
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        flap();
    }, { passive: false });

    // Play button
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

    // Initial draw
    resetGame();
    // Draw a static frame
    bird.y = H / 2 - BIRD_SIZE;
    drawFrame();
})();
