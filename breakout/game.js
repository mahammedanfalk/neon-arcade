// ===== Neon Breakout — Game Engine =====
(function () {
    'use strict';

    const canvas = document.getElementById('breakout-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // DOM
    const scoreEl = document.getElementById('score-val');
    const levelEl = document.getElementById('level-val');
    const livesEl = document.getElementById('lives-val');
    const highEl = document.getElementById('high-val');
    const overlay = document.getElementById('overlay');
    const overlayIcon = document.getElementById('overlay-icon');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayInfo = document.getElementById('overlay-info');
    const playBtn = document.getElementById('play-btn');

    // ===== Constants =====
    const PADDLE_W = 100;
    const PADDLE_H = 12;
    const PADDLE_Y = H - 35;
    const PADDLE_SPEED = 7;
    const BALL_R = 6;
    const BALL_SPEED_INIT = 4.5;
    const BRICK_ROWS = 6;
    const BRICK_COLS = 10;
    const BRICK_W = (W - 40) / BRICK_COLS;
    const BRICK_H = 20;
    const BRICK_TOP = 60;
    const BRICK_PAD = 3;
    const BRICK_LEFT = 20;

    const BRICK_COLORS = [
        { color: '#ff2d75', glow: 'rgba(255,45,117,0.5)', points: 60 },
        { color: '#ff8a00', glow: 'rgba(255,138,0,0.5)', points: 50 },
        { color: '#ffe600', glow: 'rgba(255,230,0,0.5)', points: 40 },
        { color: '#00ff88', glow: 'rgba(0,255,136,0.5)', points: 30 },
        { color: '#00d4ff', glow: 'rgba(0,212,255,0.5)', points: 20 },
        { color: '#b44dff', glow: 'rgba(180,77,255,0.5)', points: 10 },
    ];

    // Powerup types
    const POWERUP_TYPES = [
        { type: 'wide', color: '#00ff88', label: 'W', desc: 'Wide Paddle' },
        { type: 'multi', color: '#00d4ff', label: 'M', desc: 'Multi-Ball' },
        { type: 'life', color: '#ff2d75', label: '♥', desc: '+1 Life' },
    ];

    // ===== State =====
    let paddle = { x: W / 2 - PADDLE_W / 2, w: PADDLE_W };
    let balls = [];
    let bricks = [];
    let particles = [];
    let powerups = [];
    let score = 0;
    let level = 1;
    let lives = 3;
    let highScore = parseInt(localStorage.getItem('breakout-high') || '0', 10);
    let gameRunning = false;
    let paused = false;
    let ballAttached = true;
    let wideTimer = 0;
    let comboCount = 0;
    let rafId = null;

    const keys = {};
    let mouseX = null;

    highEl.textContent = highScore;

    // ===== Brick Generation =====
    function createBricks() {
        bricks = [];
        for (let r = 0; r < BRICK_ROWS; r++) {
            for (let c = 0; c < BRICK_COLS; c++) {
                bricks.push({
                    x: BRICK_LEFT + c * BRICK_W,
                    y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
                    w: BRICK_W - BRICK_PAD,
                    h: BRICK_H,
                    color: BRICK_COLORS[r].color,
                    glow: BRICK_COLORS[r].glow,
                    points: BRICK_COLORS[r].points,
                    alive: true,
                    // Higher rows (lower index) have more hits on higher levels
                    hits: level >= 3 && r < 2 ? 2 : 1,
                });
            }
        }
    }

    function resetBall() {
        balls = [{
            x: paddle.x + paddle.w / 2,
            y: PADDLE_Y - BALL_R - 1,
            vx: 0,
            vy: 0,
            speed: BALL_SPEED_INIT + (level - 1) * 0.3,
        }];
        ballAttached = true;
    }

    function launchBall() {
        if (!ballAttached || !gameRunning) return;
        const b = balls[0];
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        b.vx = Math.cos(angle) * b.speed;
        b.vy = Math.sin(angle) * b.speed;
        ballAttached = false;
        if (window.NeonSFX) NeonSFX.click();
    }

    // ===== Particles =====
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5 - 1,
                life: 20 + Math.random() * 15,
                maxLife: 35,
                color,
                size: 2 + Math.random() * 3,
            });
        }
    }

    // ===== Powerups =====
    function maybeSpawnPowerup(x, y) {
        if (Math.random() > 0.15) return; // 15% chance
        const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
        powerups.push({
            x, y, vy: 1.5,
            ...type,
            size: 14,
        });
    }

    function applyPowerup(p) {
        switch (p.type) {
            case 'wide':
                paddle.w = PADDLE_W * 1.5;
                wideTimer = 600; // ~10 seconds at 60fps
                break;
            case 'multi':
                const newBalls = [];
                balls.forEach(b => {
                    for (let i = 0; i < 2; i++) {
                        newBalls.push({
                            x: b.x, y: b.y,
                            vx: b.speed * (Math.random() - 0.5) * 1.5,
                            vy: -b.speed * (0.5 + Math.random() * 0.5),
                            speed: b.speed,
                        });
                    }
                });
                balls.push(...newBalls);
                break;
            case 'life':
                if (lives < 5) lives++;
                break;
        }
        if (window.NeonSFX) NeonSFX.eat();
    }

    // ===== Update =====
    function update() {
        if (paused) return;

        // Paddle movement
        if (mouseX !== null) {
            const canvasRect = canvas.getBoundingClientRect();
            const scaleX = W / canvasRect.width;
            paddle.x = (mouseX - canvasRect.left) * scaleX - paddle.w / 2;
        }
        if (keys['ArrowLeft'] || keys['Left']) paddle.x -= PADDLE_SPEED;
        if (keys['ArrowRight'] || keys['Right']) paddle.x += PADDLE_SPEED;
        paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

        // Wide timer
        if (wideTimer > 0) {
            wideTimer--;
            if (wideTimer <= 0) paddle.w = PADDLE_W;
        }

        // Balls
        if (ballAttached && balls.length > 0) {
            balls[0].x = paddle.x + paddle.w / 2;
            balls[0].y = PADDLE_Y - BALL_R - 1;
        }

        for (let i = balls.length - 1; i >= 0; i--) {
            const b = balls[i];
            if (ballAttached && i === 0) continue;

            b.x += b.vx;
            b.y += b.vy;

            // Wall collisions
            if (b.x - BALL_R <= 0) { b.x = BALL_R; b.vx = Math.abs(b.vx); if (window.NeonSFX) NeonSFX.wallBounce(); }
            if (b.x + BALL_R >= W) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); if (window.NeonSFX) NeonSFX.wallBounce(); }
            if (b.y - BALL_R <= 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); if (window.NeonSFX) NeonSFX.wallBounce(); }

            // Bottom — lose ball
            if (b.y + BALL_R >= H) {
                balls.splice(i, 1);
                continue;
            }

            // Paddle collision
            if (b.vy > 0 &&
                b.y + BALL_R >= PADDLE_Y &&
                b.y + BALL_R <= PADDLE_Y + PADDLE_H + 4 &&
                b.x >= paddle.x &&
                b.x <= paddle.x + paddle.w) {
                const hitPos = (b.x - paddle.x) / paddle.w; // 0..1
                const angle = -Math.PI * (0.15 + hitPos * 0.7); // -155deg to -25deg
                b.vx = Math.cos(angle) * b.speed;
                b.vy = Math.sin(angle) * b.speed;
                b.y = PADDLE_Y - BALL_R - 1;
                comboCount = 0;
                if (window.NeonSFX) NeonSFX.paddleHit();
            }

            // Brick collision
            for (let j = bricks.length - 1; j >= 0; j--) {
                const br = bricks[j];
                if (!br.alive) continue;
                if (b.x + BALL_R > br.x && b.x - BALL_R < br.x + br.w &&
                    b.y + BALL_R > br.y && b.y - BALL_R < br.y + br.h) {
                    // Determine which side was hit
                    const overlapLeft = (b.x + BALL_R) - br.x;
                    const overlapRight = (br.x + br.w) - (b.x - BALL_R);
                    const overlapTop = (b.y + BALL_R) - br.y;
                    const overlapBottom = (br.y + br.h) - (b.y - BALL_R);
                    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                    if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                        b.vx = -b.vx;
                    } else {
                        b.vy = -b.vy;
                    }

                    br.hits--;
                    if (br.hits <= 0) {
                        br.alive = false;
                        comboCount++;
                        const comboBonus = Math.min(comboCount, 5);
                        score += br.points * comboBonus;
                        spawnParticles(br.x + br.w / 2, br.y + br.h / 2, br.color, 8);
                        maybeSpawnPowerup(br.x + br.w / 2, br.y + br.h / 2);
                        if (window.NeonSFX) NeonSFX.lineClear();
                    } else {
                        // Darken brick for multi-hit
                        br.color = '#8888aa';
                        br.glow = 'rgba(136, 136, 170, 0.5)';
                        if (window.NeonSFX) NeonSFX.wallBounce();
                    }
                    break; // one collision per frame per ball
                }
            }
        }

        // All balls lost
        if (balls.length === 0 && !ballAttached) {
            lives--;
            if (lives <= 0) {
                endGame();
                return;
            }
            if (window.NeonSFX) NeonSFX.gameOver();
            resetBall();
        }

        // Powerups
        for (let i = powerups.length - 1; i >= 0; i--) {
            const p = powerups[i];
            p.y += p.vy;
            // Caught by paddle
            if (p.y + p.size >= PADDLE_Y && p.y <= PADDLE_Y + PADDLE_H &&
                p.x >= paddle.x && p.x <= paddle.x + paddle.w) {
                applyPowerup(p);
                powerups.splice(i, 1);
                continue;
            }
            // Off screen
            if (p.y > H) {
                powerups.splice(i, 1);
            }
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Level complete
        if (bricks.every(b => !b.alive)) {
            level++;
            if (window.NeonSFX) NeonSFX.levelUp();
            createBricks();
            resetBall();
            paddle.w = PADDLE_W;
            wideTimer = 0;
            powerups = [];
        }

        updateHUD();
    }

    // ===== Draw =====
    function draw() {
        ctx.fillStyle = 'rgba(6, 6, 20, 0.95)';
        ctx.fillRect(0, 0, W, H);

        // Bricks
        bricks.forEach(b => {
            if (!b.alive) return;
            ctx.save();
            ctx.shadowColor = b.glow;
            ctx.shadowBlur = 8;
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);
            // Highlight
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h * 0.35);
            ctx.restore();
        });

        // Paddle
        ctx.save();
        ctx.shadowColor = 'rgba(0, 255, 136, 0.5)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#00ff88';
        const paddleRadius = 6;
        roundRect(ctx, paddle.x, PADDLE_Y, paddle.w, PADDLE_H, paddleRadius);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        roundRect(ctx, paddle.x + 2, PADDLE_Y + 1, paddle.w - 4, PADDLE_H * 0.4, paddleRadius - 1);
        ctx.fill();
        ctx.restore();

        // Balls
        balls.forEach(b => {
            ctx.save();
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
            ctx.fill();
            // Inner glow
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0, 212, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(b.x, b.y, BALL_R * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Powerups
        powerups.forEach(p => {
            ctx.save();
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#0a0a1a';
            ctx.font = '900 12px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.label, p.x, p.y + 1);
            ctx.restore();
        });

        // Particles
        particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            ctx.restore();
        });

        // Pause overlay
        if (paused) {
            ctx.fillStyle = 'rgba(6, 6, 20, 0.75)';
            ctx.fillRect(0, 0, W, H);
            ctx.save();
            ctx.font = '900 1.4rem Orbitron, sans-serif';
            ctx.fillStyle = '#ff2d75';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(255, 45, 117, 0.5)';
            ctx.shadowBlur = 15;
            ctx.fillText('PAUSED', W / 2, H / 2);
            ctx.restore();
        }
    }

    function roundRect(context, x, y, w, h, r) {
        context.beginPath();
        context.moveTo(x + r, y);
        context.lineTo(x + w - r, y);
        context.quadraticCurveTo(x + w, y, x + w, y + r);
        context.lineTo(x + w, y + h - r);
        context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        context.lineTo(x + r, y + h);
        context.quadraticCurveTo(x, y + h, x, y + h - r);
        context.lineTo(x, y + r);
        context.quadraticCurveTo(x, y, x + r, y);
        context.closePath();
    }

    function updateHUD() {
        scoreEl.textContent = score.toLocaleString();
        levelEl.textContent = level;
        const hearts = [];
        for (let i = 0; i < lives; i++) hearts.push('❤️');
        livesEl.textContent = hearts.join('');
    }

    // ===== Game Loop =====
    function gameLoop() {
        if (!gameRunning) return;
        rafId = requestAnimationFrame(gameLoop);
        update();
        draw();
    }

    // ===== Start / End =====
    function startGame() {
        score = 0;
        level = 1;
        lives = 3;
        paused = false;
        particles = [];
        powerups = [];
        comboCount = 0;
        paddle = { x: W / 2 - PADDLE_W / 2, w: PADDLE_W };
        wideTimer = 0;
        createBricks();
        resetBall();
        updateHUD();
        overlay.classList.add('hidden');
        gameRunning = true;
        if (window.NeonSFX) NeonSFX.gameStart();
        rafId = requestAnimationFrame(gameLoop);
    }

    function endGame() {
        gameRunning = false;
        if (rafId) cancelAnimationFrame(rafId);

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('breakout-high', highScore.toString());
            highEl.textContent = highScore.toLocaleString();
        }

        if (window.NeonSFX) NeonSFX.gameOver();

        overlayIcon.textContent = '💀';
        overlayTitle.textContent = 'GAME OVER';
        overlayInfo.innerHTML = `
            Score: <strong style="color:#00ff88">${score.toLocaleString()}</strong><br>
            Level: <strong style="color:#b44dff">${level}</strong>
            ${score >= highScore ? '<br><span style="color:#ffe600;">★ NEW HIGH SCORE ★</span>' : ''}
        `;
        playBtn.textContent = 'PLAY AGAIN';
        overlay.classList.remove('hidden');
    }

    function togglePause() {
        if (!gameRunning) return;
        paused = !paused;
        if (window.NeonSFX) NeonSFX.pause();
    }

    // ===== Input =====
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.key === ' ') { e.preventDefault(); launchBall(); }
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); togglePause(); }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
    });

    canvas.addEventListener('mouseleave', () => {
        mouseX = null;
    });

    canvas.addEventListener('click', () => {
        launchBall();
    });

    // Touch-drag on canvas for paddle
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (ballAttached) launchBall();
        handleCanvasTouch(e.touches[0]);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        handleCanvasTouch(e.touches[0]);
    }, { passive: false });

    function handleCanvasTouch(touch) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        paddle.x = (touch.clientX - rect.left) * scaleX - paddle.w / 2;
        paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));
    }

    // Touch
    function bindTouch(id, action) {
        const btn = document.getElementById(id);
        if (!btn) return;
        let interval = null;
        let timeout = null;
        const rate = 16;
        const start = (e) => { e.preventDefault(); action(); timeout = setTimeout(() => { interval = setInterval(action, rate); }, 150); };
        const stop = (e) => { e.preventDefault(); clearTimeout(timeout); clearInterval(interval); };
        btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('touchend', stop, { passive: false });
        btn.addEventListener('touchcancel', stop, { passive: false });
        btn.addEventListener('mousedown', start);
        btn.addEventListener('mouseup', stop);
        btn.addEventListener('mouseleave', stop);
    }

    bindTouch('touch-left', () => { paddle.x -= PADDLE_SPEED; paddle.x = Math.max(0, paddle.x); });
    bindTouch('touch-right', () => { paddle.x += PADDLE_SPEED; paddle.x = Math.min(W - paddle.w, paddle.x); });

    const launchBtn = document.getElementById('touch-launch');
    if (launchBtn) {
        launchBtn.addEventListener('touchstart', (e) => { e.preventDefault(); launchBall(); }, { passive: false });
        launchBtn.addEventListener('mousedown', (e) => { e.preventDefault(); launchBall(); });
    }

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

    // Play button
    playBtn.addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        startGame();
    });

    // Initial draw
    createBricks();
    resetBall();
    draw();

})();
