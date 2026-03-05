// ===== Neon Space Invaders — Game Engine =====
(function () {
    'use strict';

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const scoreEl = document.getElementById('score-val');
    const waveEl = document.getElementById('wave-val');
    const livesEl = document.getElementById('lives-val');
    const highEl = document.getElementById('high-val');
    const overlay = document.getElementById('overlay');
    const overlayIcon = document.getElementById('overlay-icon');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayInfo = document.getElementById('overlay-info');
    const playBtn = document.getElementById('play-btn');

    // ===== Constants =====
    const PLAYER_W = 40;
    const PLAYER_H = 16;
    const PLAYER_SPEED = 5;
    const BULLET_SPEED = 7;
    const ALIEN_ROWS = 5;
    const ALIEN_COLS = 8;
    const ALIEN_W = 30;
    const ALIEN_H = 22;
    const ALIEN_PAD_X = 14;
    const ALIEN_PAD_Y = 10;
    const ALIEN_TOP = 50;
    const ALIEN_DROP = 18;
    const ALIEN_BULLET_SPEED = 3;

    const ALIEN_COLORS = [
        { color: '#ff2d75', glow: 'rgba(255,45,117,0.5)', points: 50, emoji: '👾' },
        { color: '#ff8a00', glow: 'rgba(255,138,0,0.5)', points: 40, emoji: '👽' },
        { color: '#ffe600', glow: 'rgba(255,230,0,0.5)', points: 30, emoji: '🛸' },
        { color: '#00ff88', glow: 'rgba(0,255,136,0.5)', points: 20, emoji: '👾' },
        { color: '#00d4ff', glow: 'rgba(0,212,255,0.5)', points: 10, emoji: '👽' },
    ];

    // ===== State =====
    let player = { x: W / 2 - PLAYER_W / 2, y: H - 40 };
    let bullets = [];
    let alienBullets = [];
    let aliens = [];
    let particles = [];
    let stars = [];
    let score = 0;
    let wave = 1;
    let lives = 3;
    let highScore = parseInt(localStorage.getItem('invaders-high') || '0', 10);
    let gameRunning = false;
    let paused = false;
    let alienDir = 1;
    let alienSpeed = 0.5;
    let alienShootTimer = 0;
    let shootCooldown = 0;
    let rafId = null;
    let invincibleTimer = 0;

    const keys = {};
    highEl.textContent = highScore;

    // Stars background
    for (let i = 0; i < 80; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            size: 0.5 + Math.random() * 1.5,
            speed: 0.1 + Math.random() * 0.3,
            alpha: 0.3 + Math.random() * 0.7,
        });
    }

    // ===== Alien Generation =====
    function createAliens() {
        aliens = [];
        const totalW = ALIEN_COLS * (ALIEN_W + ALIEN_PAD_X) - ALIEN_PAD_X;
        const startX = (W - totalW) / 2;
        for (let r = 0; r < ALIEN_ROWS; r++) {
            for (let c = 0; c < ALIEN_COLS; c++) {
                const info = ALIEN_COLORS[r];
                aliens.push({
                    x: startX + c * (ALIEN_W + ALIEN_PAD_X),
                    y: ALIEN_TOP + r * (ALIEN_H + ALIEN_PAD_Y),
                    w: ALIEN_W,
                    h: ALIEN_H,
                    color: info.color,
                    glow: info.glow,
                    points: info.points + (wave - 1) * 5,
                    alive: true,
                    animPhase: Math.random() * Math.PI * 2,
                });
            }
        }
        alienDir = 1;
        alienSpeed = 0.5 + (wave - 1) * 0.15;
    }

    // ===== Particles =====
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 15 + Math.random() * 15,
                maxLife: 30,
                color,
                size: 1.5 + Math.random() * 3,
            });
        }
    }

    // ===== Update =====
    function update() {
        if (paused) return;

        // Player movement
        if (keys['ArrowLeft'] || keys['Left']) player.x -= PLAYER_SPEED;
        if (keys['ArrowRight'] || keys['Right']) player.x += PLAYER_SPEED;
        player.x = Math.max(0, Math.min(W - PLAYER_W, player.x));

        // Shooting
        if (shootCooldown > 0) shootCooldown--;
        if ((keys[' '] || keys['Space']) && shootCooldown <= 0) {
            bullets.push({ x: player.x + PLAYER_W / 2, y: player.y, w: 3, h: 10 });
            shootCooldown = 12;
            if (window.NeonSFX) NeonSFX.turn();
        }

        // Invincibility
        if (invincibleTimer > 0) invincibleTimer--;

        // Player bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].y -= BULLET_SPEED;
            if (bullets[i].y < -10) { bullets.splice(i, 1); continue; }

            // Hit alien
            for (let j = aliens.length - 1; j >= 0; j--) {
                const a = aliens[j];
                if (!a.alive) continue;
                if (bullets[i] &&
                    bullets[i].x > a.x && bullets[i].x < a.x + a.w &&
                    bullets[i].y > a.y && bullets[i].y < a.y + a.h) {
                    a.alive = false;
                    score += a.points;
                    spawnParticles(a.x + a.w / 2, a.y + a.h / 2, a.color, 10);
                    bullets.splice(i, 1);
                    if (window.NeonSFX) NeonSFX.score();

                    // Speed up remaining aliens
                    const aliveCount = aliens.filter(al => al.alive).length;
                    if (aliveCount > 0 && aliveCount < 10) {
                        alienSpeed = (0.5 + (wave - 1) * 0.15) * (1 + (ALIEN_ROWS * ALIEN_COLS - aliveCount) * 0.03);
                    }
                    break;
                }
            }
        }

        // Alien movement
        let edgeHit = false;
        const aliveAliens = aliens.filter(a => a.alive);
        aliveAliens.forEach(a => {
            a.x += alienDir * alienSpeed;
            a.animPhase += 0.05;
            if (a.x <= 5 || a.x + a.w >= W - 5) edgeHit = true;
        });

        if (edgeHit) {
            alienDir *= -1;
            aliveAliens.forEach(a => { a.y += ALIEN_DROP; });

            // Check if aliens reached player level
            if (aliveAliens.some(a => a.y + a.h >= player.y)) {
                endGame();
                return;
            }
        }

        // Alien shooting
        alienShootTimer++;
        const shootInterval = Math.max(25, 60 - wave * 5);
        if (alienShootTimer >= shootInterval && aliveAliens.length > 0) {
            alienShootTimer = 0;
            // Pick a random alien from the bottom row of each column
            const bottomAliens = [];
            for (let c = 0; c < ALIEN_COLS; c++) {
                for (let r = ALIEN_ROWS - 1; r >= 0; r--) {
                    const idx = r * ALIEN_COLS + c;
                    if (aliens[idx] && aliens[idx].alive) {
                        bottomAliens.push(aliens[idx]);
                        break;
                    }
                }
            }
            if (bottomAliens.length > 0) {
                const shooter = bottomAliens[Math.floor(Math.random() * bottomAliens.length)];
                alienBullets.push({
                    x: shooter.x + shooter.w / 2,
                    y: shooter.y + shooter.h,
                    w: 3,
                    h: 10,
                    color: shooter.color,
                });
            }
        }

        // Alien bullets
        for (let i = alienBullets.length - 1; i >= 0; i--) {
            alienBullets[i].y += ALIEN_BULLET_SPEED + wave * 0.2;
            if (alienBullets[i].y > H) { alienBullets.splice(i, 1); continue; }

            // Hit player
            const ab = alienBullets[i];
            if (ab && invincibleTimer <= 0 &&
                ab.x > player.x && ab.x < player.x + PLAYER_W &&
                ab.y + ab.h > player.y && ab.y < player.y + PLAYER_H) {
                alienBullets.splice(i, 1);
                lives--;
                invincibleTimer = 90; // 1.5s invincibility
                spawnParticles(player.x + PLAYER_W / 2, player.y, '#00ff88', 12);
                if (window.NeonSFX) NeonSFX.gameOver();
                if (lives <= 0) {
                    endGame();
                    return;
                }
            }
        }

        // Stars scroll
        stars.forEach(s => {
            s.y += s.speed;
            if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        });

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Wave complete
        if (aliveAliens.length === 0) {
            wave++;
            if (window.NeonSFX) NeonSFX.levelUp();
            createAliens();
            alienBullets = [];
        }

        updateHUD();
    }

    // ===== Draw =====
    function draw() {
        ctx.fillStyle = 'rgba(3, 3, 12, 0.95)';
        ctx.fillRect(0, 0, W, H);

        // Stars
        stars.forEach(s => {
            ctx.save();
            ctx.globalAlpha = s.alpha * (0.5 + Math.sin(Date.now() * 0.002 + s.x) * 0.5);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(s.x, s.y, s.size, s.size);
            ctx.restore();
        });

        // Aliens
        aliens.forEach(a => {
            if (!a.alive) return;
            ctx.save();
            ctx.shadowColor = a.glow;
            ctx.shadowBlur = 8;
            ctx.fillStyle = a.color;

            // Simple alien shape
            const cx = a.x + a.w / 2;
            const cy = a.y + a.h / 2;
            const bob = Math.sin(a.animPhase) * 2;

            // Body
            ctx.fillRect(a.x + 4, a.y + 4 + bob, a.w - 8, a.h - 8);
            // Eyes
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(cx - 7, cy - 3 + bob, 4, 4);
            ctx.fillRect(cx + 3, cy - 3 + bob, 4, 4);
            // Antenna
            ctx.fillStyle = a.color;
            ctx.fillRect(cx - 1, a.y + bob, 2, 5);

            ctx.restore();
        });

        // Player
        if (invincibleTimer <= 0 || Math.floor(invincibleTimer / 4) % 2 === 0) {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 255, 136, 0.6)';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#00ff88';
            // Ship body
            ctx.beginPath();
            ctx.moveTo(player.x + PLAYER_W / 2, player.y - 4);
            ctx.lineTo(player.x + PLAYER_W, player.y + PLAYER_H);
            ctx.lineTo(player.x, player.y + PLAYER_H);
            ctx.closePath();
            ctx.fill();
            // Highlight
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.moveTo(player.x + PLAYER_W / 2, player.y - 2);
            ctx.lineTo(player.x + PLAYER_W / 2 + 8, player.y + 8);
            ctx.lineTo(player.x + PLAYER_W / 2 - 8, player.y + 8);
            ctx.closePath();
            ctx.fill();
            // Thruster
            ctx.fillStyle = `rgba(0, 212, 255, ${0.3 + Math.random() * 0.4})`;
            ctx.fillRect(player.x + PLAYER_W / 2 - 4, player.y + PLAYER_H, 8, 4 + Math.random() * 6);
            ctx.restore();
        }

        // Player bullets
        bullets.forEach(b => {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 255, 136, 0.8)';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
            ctx.restore();
        });

        // Alien bullets
        alienBullets.forEach(b => {
            ctx.save();
            ctx.shadowColor = b.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x - b.w / 2, b.y, b.w, b.h);
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

        // Pause
        if (paused) {
            ctx.fillStyle = 'rgba(3, 3, 12, 0.75)';
            ctx.fillRect(0, 0, W, H);
            ctx.save();
            ctx.font = '900 1.4rem Orbitron, sans-serif';
            ctx.fillStyle = '#00d4ff';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,212,255,0.5)';
            ctx.shadowBlur = 15;
            ctx.fillText('PAUSED', W / 2, H / 2);
            ctx.restore();
        }
    }

    function updateHUD() {
        scoreEl.textContent = score.toLocaleString();
        waveEl.textContent = wave;
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

    function startGame() {
        score = 0;
        wave = 1;
        lives = 3;
        paused = false;
        particles = [];
        bullets = [];
        alienBullets = [];
        shootCooldown = 0;
        alienShootTimer = 0;
        invincibleTimer = 0;
        player.x = W / 2 - PLAYER_W / 2;
        createAliens();
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
            localStorage.setItem('invaders-high', highScore.toString());
            highEl.textContent = highScore.toLocaleString();
        }

        if (window.NeonSFX) NeonSFX.gameOver();

        overlayIcon.textContent = '💀';
        overlayTitle.textContent = 'GAME OVER';
        overlayInfo.innerHTML = `
            Score: <strong style="color:#00ff88">${score.toLocaleString()}</strong><br>
            Waves Survived: <strong style="color:#00d4ff">${wave}</strong>
            ${score >= highScore ? '<br><span style="color:#ffe600;">★ NEW HIGH SCORE ★</span>' : ''}
        `;
        playBtn.textContent = 'PLAY AGAIN';
        overlay.classList.remove('hidden');
        if (window.NeonLeaderboard) NeonLeaderboard.submit('space-invaders', score, 'Player');
    }

    function togglePause() {
        if (!gameRunning) return;
        paused = !paused;
        if (window.NeonSFX) NeonSFX.pause();
    }

    // ===== Input =====
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (e.key === ' ') e.preventDefault();
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { e.preventDefault(); togglePause(); }
    });
    document.addEventListener('keyup', (e) => { keys[e.key] = false; });

    // Touch — drag to move, auto-fire while touching
    let touchActive = false;
    let touchAutoFireInterval = null;

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameRunning || paused) return;
        touchActive = true;
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const tx = (e.touches[0].clientX - rect.left) * scaleX;
        player.x = Math.max(0, Math.min(W - PLAYER_W, tx - PLAYER_W / 2));
        // Start auto-fire
        if (!touchAutoFireInterval) {
            touchAutoFireInterval = setInterval(() => {
                if (!gameRunning || paused || !touchActive) return;
                if (shootCooldown <= 0) {
                    bullets.push({ x: player.x + PLAYER_W / 2, y: player.y, w: 3, h: 10 });
                    shootCooldown = 12;
                    if (window.NeonSFX) NeonSFX.turn();
                }
            }, 50);
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!touchActive || !gameRunning || paused) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = W / rect.width;
        const tx = (e.touches[0].clientX - rect.left) * scaleX;
        player.x = Math.max(0, Math.min(W - PLAYER_W, tx - PLAYER_W / 2));
    }, { passive: false });

    const stopTouch = (e) => {
        e.preventDefault();
        touchActive = false;
        if (touchAutoFireInterval) {
            clearInterval(touchAutoFireInterval);
            touchAutoFireInterval = null;
        }
    };
    canvas.addEventListener('touchend', stopTouch, { passive: false });
    canvas.addEventListener('touchcancel', stopTouch, { passive: false });

    // Hide touch-controls buttons on mobile (replaced by drag)
    const touchCtrlDiv = document.getElementById('touch-controls');
    if (touchCtrlDiv && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        touchCtrlDiv.style.display = 'none';
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

    playBtn.addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        startGame();
    });

    // Initial draw
    createAliens();
    draw();

})();
