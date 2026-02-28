// ===== Snake Game — Neon Edition =====
(function () {
    'use strict';

    // ===== Constants =====
    const GRID_SIZE = 20;
    const INITIAL_SPEED = 140; // ms per tick
    const SPEED_INCREMENT = 2;
    const MIN_SPEED = 55;
    const FOOD_SCORE = 10;

    // Colors
    const COLORS = {
        bg: '#0e0e24',
        grid: 'rgba(255,255,255,0.025)',
        snakeHead: '#00ff88',
        snakeBody: '#00cc6a',
        snakeBodyAlt: '#00e878',
        snakeGlow: 'rgba(0,255,136,0.35)',
        food: '#ff2d75',
        foodGlow: 'rgba(255,45,117,0.45)',
        foodInner: '#ff5c99',
        eyes: '#0a0a1a',
    };

    // Directions
    const DIR = {
        UP: { x: 0, y: -1 },
        DOWN: { x: 0, y: 1 },
        LEFT: { x: -1, y: 0 },
        RIGHT: { x: 1, y: 0 },
    };

    // ===== State =====
    let canvas, ctx, cellSize;
    let snake, food, direction, nextDirection;
    let score, highScore, speed;
    let gameState; // 'start' | 'playing' | 'paused' | 'gameover'
    let lastTick = 0;
    let animFrame;
    let foodPulse = 0;
    let particles = [];

    // ===== DOM Refs =====
    const $ = (id) => document.getElementById(id);
    const scoreEl = $('score');
    const highscoreEl = $('highscore');
    const lengthEl = $('length');
    const finalScoreEl = $('final-score');
    const newBestEl = $('new-best');
    const startScreen = $('start-screen');
    const gameOverScreen = $('game-over-screen');
    const pauseScreen = $('pause-screen');
    const startBtn = $('start-btn');
    const restartBtn = $('restart-btn');

    // ===== Init =====
    function init() {
        canvas = $('game-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        highScore = parseInt(localStorage.getItem('snake_high') || '0', 10);
        highscoreEl.textContent = highScore;
        gameState = 'start';
        bindEvents();
    }

    function resizeCanvas() {
        const wrapper = $('canvas-wrapper');
        const size = wrapper.clientWidth;
        canvas.width = size * (window.devicePixelRatio || 1);
        canvas.height = size * (window.devicePixelRatio || 1);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        cellSize = size / GRID_SIZE;
    }

    // ===== Game lifecycle =====
    function startGame() {
        snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 },
        ];
        direction = DIR.RIGHT;
        nextDirection = DIR.RIGHT;
        score = 0;
        speed = INITIAL_SPEED;
        particles = [];
        spawnFood();
        updateUI();
        gameState = 'playing';
        hideAllOverlays();
        lastTick = performance.now();
        cancelAnimationFrame(animFrame);
        if (window.NeonSFX) NeonSFX.gameStart();
        loop(performance.now());
    }

    function gameOver() {
        gameState = 'gameover';
        cancelAnimationFrame(animFrame);
        if (window.NeonSFX) NeonSFX.gameOver();
        finalScoreEl.textContent = score;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snake_high', highScore);
            highscoreEl.textContent = highScore;
            newBestEl.classList.remove('hidden');
        } else {
            newBestEl.classList.add('hidden');
        }
        gameOverScreen.classList.remove('hidden');
    }

    function togglePause() {
        if (window.NeonSFX) NeonSFX.pause();
        if (gameState === 'playing') {
            gameState = 'paused';
            cancelAnimationFrame(animFrame);
            pauseScreen.classList.remove('hidden');
        } else if (gameState === 'paused') {
            gameState = 'playing';
            pauseScreen.classList.add('hidden');
            lastTick = performance.now();
            loop(performance.now());
        }
    }

    // ===== Game Loop =====
    function loop(timestamp) {
        if (gameState !== 'playing') return;
        animFrame = requestAnimationFrame(loop);

        const elapsed = timestamp - lastTick;
        if (elapsed < speed) {
            render(); // keep rendering smoothly
            return;
        }
        lastTick = timestamp;

        update();
        render();
    }

    // ===== Update logic =====
    function update() {
        direction = nextDirection;

        const head = { ...snake[0] };
        head.x += direction.x;
        head.y += direction.y;

        // Wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            gameOver();
            return;
        }

        // Self collision
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                gameOver();
                return;
            }
        }

        snake.unshift(head);

        // Food collision
        if (head.x === food.x && head.y === food.y) {
            score += FOOD_SCORE;
            speed = Math.max(MIN_SPEED, speed - SPEED_INCREMENT);
            spawnParticles(food.x, food.y);
            spawnFood();
            if (window.NeonSFX) NeonSFX.eat();
        } else {
            snake.pop();
        }

        updateUI();
    }

    // ===== Particles =====
    function spawnParticles(gx, gy) {
        const cx = (gx + 0.5) * cellSize;
        const cy = (gy + 0.5) * cellSize;
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
            const vel = 1.5 + Math.random() * 2.5;
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * vel,
                vy: Math.sin(angle) * vel,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                size: 2 + Math.random() * 3,
                color: Math.random() > 0.5 ? COLORS.food : COLORS.foodInner,
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function renderParticles() {
        for (const p of particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ===== Render =====
    function render() {
        const w = canvas.width / (window.devicePixelRatio || 1);
        const h = canvas.height / (window.devicePixelRatio || 1);

        // Background
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5;
        for (let i = 1; i < GRID_SIZE; i++) {
            const pos = i * cellSize;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(w, pos);
            ctx.stroke();
        }

        // Food
        renderFood();

        // Snake
        renderSnake();

        // Particles
        updateParticles();
        renderParticles();

        foodPulse += 0.06;
    }

    function renderFood() {
        const cx = (food.x + 0.5) * cellSize;
        const cy = (food.y + 0.5) * cellSize;
        const r = cellSize * 0.38;
        const pulseR = r + Math.sin(foodPulse) * 2;

        // Glow
        ctx.save();
        ctx.shadowColor = COLORS.foodGlow;
        ctx.shadowBlur = 18 + Math.sin(foodPulse) * 6;
        ctx.fillStyle = COLORS.food;
        ctx.beginPath();
        ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Inner highlight
        ctx.fillStyle = COLORS.foodInner;
        ctx.beginPath();
        ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }

    function renderSnake() {
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const x = seg.x * cellSize;
            const y = seg.y * cellSize;
            const isHead = i === 0;
            const pad = 1;

            // Glow behind head
            if (isHead) {
                ctx.save();
                ctx.shadowColor = COLORS.snakeGlow;
                ctx.shadowBlur = 14;
                ctx.fillStyle = COLORS.snakeHead;
                roundRect(ctx, x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, 5);
                ctx.fill();
                ctx.restore();

                // Eyes
                drawEyes(seg);
            } else {
                // Body with alternating colors
                const t = i / snake.length;
                ctx.fillStyle = i % 2 === 0 ? COLORS.snakeBody : COLORS.snakeBodyAlt;
                ctx.globalAlpha = 1 - t * 0.35;
                roundRect(ctx, x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, 4);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
    }

    function drawEyes(head) {
        const cx = (head.x + 0.5) * cellSize;
        const cy = (head.y + 0.5) * cellSize;
        const eyeR = cellSize * 0.09;
        const off = cellSize * 0.18;
        let e1, e2;

        if (direction === DIR.RIGHT) {
            e1 = { x: cx + off, y: cy - off };
            e2 = { x: cx + off, y: cy + off };
        } else if (direction === DIR.LEFT) {
            e1 = { x: cx - off, y: cy - off };
            e2 = { x: cx - off, y: cy + off };
        } else if (direction === DIR.UP) {
            e1 = { x: cx - off, y: cy - off };
            e2 = { x: cx + off, y: cy - off };
        } else {
            e1 = { x: cx - off, y: cy + off };
            e2 = { x: cx + off, y: cy + off };
        }

        ctx.fillStyle = COLORS.eyes;
        ctx.beginPath();
        ctx.arc(e1.x, e1.y, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(e2.x, e2.y, eyeR, 0, Math.PI * 2);
        ctx.fill();
    }

    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
    }

    // ===== Food Spawning =====
    function spawnFood() {
        const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
        } while (occupied.has(`${pos.x},${pos.y}`));
        food = pos;
    }

    // ===== UI Updates =====
    function updateUI() {
        scoreEl.textContent = score;
        lengthEl.textContent = snake.length;
    }

    function hideAllOverlays() {
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        pauseScreen.classList.add('hidden');
    }

    // ===== Input =====
    function bindEvents() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    setDirection(DIR.UP);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    setDirection(DIR.DOWN);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    setDirection(DIR.LEFT);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    setDirection(DIR.RIGHT);
                    break;
                case ' ':
                    e.preventDefault();
                    if (gameState === 'playing' || gameState === 'paused') togglePause();
                    break;
                case 'Enter':
                    if (gameState === 'start' || gameState === 'gameover') startGame();
                    break;
            }
        });

        // Buttons
        startBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', startGame);

        // Mobile
        $('ctrl-up').addEventListener('click', () => setDirection(DIR.UP));
        $('ctrl-down').addEventListener('click', () => setDirection(DIR.DOWN));
        $('ctrl-left').addEventListener('click', () => setDirection(DIR.LEFT));
        $('ctrl-right').addEventListener('click', () => setDirection(DIR.RIGHT));

        // Resize
        window.addEventListener('resize', () => {
            resizeCanvas();
            if (gameState !== 'playing' && gameState !== 'paused') {
                // Re-render static frame
                if (snake) render();
            }
        });
    }

    function setDirection(dir) {
        if (gameState !== 'playing') return;
        // Prevent 180° reversal
        if (dir.x + direction.x === 0 && dir.y + direction.y === 0) return;
        if (dir !== nextDirection && window.NeonSFX) NeonSFX.turn();
        nextDirection = dir;
    }

    // ===== Mute button =====
    function initMuteBtn() {
        const btn = $('mute-btn');
        const icon = $('mute-icon');
        if (!btn || !icon) return;
        btn.addEventListener('click', () => {
            if (!window.NeonSFX) return;
            const muted = NeonSFX.toggleMute();
            icon.textContent = muted ? '🔇' : '🔊';
            btn.style.borderColor = muted ? 'rgba(255,45,117,0.3)' : 'rgba(0,255,136,0.2)';
            btn.style.color = muted ? '#ff2d75' : '#00ff88';
        });
    }

    // ===== Bootstrap =====
    window.addEventListener('DOMContentLoaded', () => {
        init();
        initMuteBtn();
    });
})();
