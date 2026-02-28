// ===== Pong — Neon Edition =====
(function () {
    'use strict';

    // ===== Constants =====
    const CANVAS_W = 700;
    const CANVAS_H = 500;
    const PADDLE_W = 12;
    const PADDLE_H = 90;
    const BALL_R = 8;
    const PADDLE_SPEED = 6;
    const BALL_SPEED_INIT = 5;
    const BALL_SPEED_MAX = 9;
    const WIN_SCORE = 7;
    const TRAIL_LENGTH = 8;

    const AI_DIFFICULTY = {
        easy: { speed: 3.0, reaction: 0.35, errorMargin: 40 },
        medium: { speed: 4.5, reaction: 0.55, errorMargin: 18 },
        hard: { speed: 6.0, reaction: 0.85, errorMargin: 5 },
    };

    // Colors
    const COL_BLUE = '#00d4ff';
    const COL_PINK = '#ff2d75';
    const COL_GREEN = '#00ff88';
    const COL_PURPLE = '#b44dff';
    const COL_LINE = 'rgba(255,255,255,0.06)';

    // ===== State =====
    let mode = 'ai';
    let difficulty = 'medium';
    let running = false;
    let paused = false;
    let animId = null;

    let leftScore = 0;
    let rightScore = 0;
    let matchOver = false;

    // Keys
    const keys = {};

    // Paddles
    let leftPaddle, rightPaddle, ball;
    let ballTrail = [];

    // AI
    let aiTargetY = CANVAS_H / 2;
    let aiError = 0;

    // ===== DOM =====
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);
    const canvas = $('#pong-canvas');
    const ctx = canvas.getContext('2d');
    const overlay = $('#overlay');
    const overlayTitle = $('#overlay-title');
    const overlayIcon = $('#overlay-icon');
    const overlayInfo = $('#overlay-info');
    const playBtn = $('#play-btn');
    const scoreLeftEl = $('#score-left');
    const scoreRightEl = $('#score-right');
    const p1Label = $('#p1-label');
    const p2Label = $('#p2-label');
    const diffSelector = $('#difficulty-selector');

    // ===== Init =====
    function init() {
        resetObjects();

        playBtn.addEventListener('click', startMatch);

        // Mode buttons
        $$('.mode-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (window.NeonSFX) NeonSFX.click();
                setMode(btn.dataset.mode);
            });
        });

        // Difficulty buttons
        $$('.diff-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                if (window.NeonSFX) NeonSFX.click();
                difficulty = btn.dataset.diff;
                $$('.diff-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Mute
        const muteBtn = $('#mute-btn');
        const muteIcon = $('#mute-icon');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                if (!window.NeonSFX) return;
                const muted = NeonSFX.toggleMute();
                muteIcon.textContent = muted ? '🔇' : '🔊';
                muteBtn.style.borderColor = muted ? 'rgba(255,45,117,0.3)' : 'rgba(0,255,136,0.2)';
                muteBtn.style.color = muted ? '#ff2d75' : '#00ff88';
            });
        }

        // Keyboard
        window.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            if (e.key === ' ' && running && !matchOver) {
                e.preventDefault();
                paused = !paused;
                if (window.NeonSFX) NeonSFX.pause();
            }
        });
        window.addEventListener('keyup', (e) => { keys[e.key] = false; });

        // Canvas scaling
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Initial draw
        drawFrame();
    }

    function resizeCanvas() {
        const maxW = Math.min(CANVAS_W, window.innerWidth - 40);
        canvas.style.width = maxW + 'px';
        canvas.style.height = (maxW * CANVAS_H / CANVAS_W) + 'px';
    }

    // ===== Mode =====
    function setMode(m) {
        mode = m;
        $$('.mode-btn').forEach((b) => b.classList.remove('active'));
        $(`#mode-${m}`).classList.add('active');

        if (m === 'ai') {
            diffSelector.classList.remove('hidden');
            p2Label.textContent = 'AI';
        } else {
            diffSelector.classList.add('hidden');
            p2Label.textContent = 'P2';
        }

        stopMatch();
    }

    // ===== Objects =====
    function resetObjects() {
        leftPaddle = { x: 20, y: CANVAS_H / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H };
        rightPaddle = { x: CANVAS_W - 20 - PADDLE_W, y: CANVAS_H / 2 - PADDLE_H / 2, w: PADDLE_W, h: PADDLE_H };
        resetBall(1);
    }

    function resetBall(dir) {
        const angle = (Math.random() * Math.PI / 4) - Math.PI / 8;
        ball = {
            x: CANVAS_W / 2,
            y: CANVAS_H / 2,
            vx: BALL_SPEED_INIT * dir * Math.cos(angle),
            vy: BALL_SPEED_INIT * Math.sin(angle),
            speed: BALL_SPEED_INIT,
        };
        ballTrail = [];
        aiError = (Math.random() - 0.5) * AI_DIFFICULTY[difficulty].errorMargin * 2;
    }

    // ===== Match Control =====
    function startMatch() {
        leftScore = 0;
        rightScore = 0;
        matchOver = false;
        paused = false;
        updateScoreboard();
        resetObjects();
        overlay.classList.add('hidden');
        running = true;
        if (window.NeonSFX) NeonSFX.gameStart();
        gameLoop();
    }

    function stopMatch() {
        running = false;
        if (animId) cancelAnimationFrame(animId);
        leftScore = 0;
        rightScore = 0;
        matchOver = false;
        updateScoreboard();
        resetObjects();
        showOverlay('Ready to Play?', '🏓', true);
        drawFrame();
    }

    function showOverlay(title, icon, showControls) {
        overlay.classList.remove('hidden');
        overlayTitle.textContent = title;
        overlayIcon.textContent = icon;
        if (showControls) {
            overlayInfo.innerHTML = `
                <span class="key">W</span> / <span class="key">S</span> — Left Paddle<br>
                <span class="key">↑</span> / <span class="key">↓</span> — Right Paddle${mode === 'ai' ? '' : ' (2P)'}
            `;
        } else {
            overlayInfo.textContent = '';
        }
        playBtn.textContent = matchOver ? 'PLAY AGAIN' : 'START GAME';
    }

    // ===== Game Loop =====
    function gameLoop() {
        if (!running) return;
        if (!paused) {
            update();
        }
        drawFrame();
        animId = requestAnimationFrame(gameLoop);
    }

    function update() {
        // ===== Move Paddles =====
        // Left paddle: W / S
        if (keys['w'] || keys['W']) leftPaddle.y -= PADDLE_SPEED;
        if (keys['s'] || keys['S']) leftPaddle.y += PADDLE_SPEED;

        // Right paddle: Arrow keys (2P) or AI
        if (mode === '2p') {
            if (keys['ArrowUp']) rightPaddle.y -= PADDLE_SPEED;
            if (keys['ArrowDown']) rightPaddle.y += PADDLE_SPEED;
        } else {
            updateAI();
        }

        // Clamp paddles
        leftPaddle.y = Math.max(0, Math.min(CANVAS_H - PADDLE_H, leftPaddle.y));
        rightPaddle.y = Math.max(0, Math.min(CANVAS_H - PADDLE_H, rightPaddle.y));

        // ===== Ball Trail =====
        ballTrail.push({ x: ball.x, y: ball.y });
        if (ballTrail.length > TRAIL_LENGTH) ballTrail.shift();

        // ===== Move Ball =====
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Top / bottom walls
        if (ball.y - BALL_R <= 0) {
            ball.y = BALL_R;
            ball.vy = Math.abs(ball.vy);
            if (window.NeonSFX) NeonSFX.wallBounce();
        }
        if (ball.y + BALL_R >= CANVAS_H) {
            ball.y = CANVAS_H - BALL_R;
            ball.vy = -Math.abs(ball.vy);
            if (window.NeonSFX) NeonSFX.wallBounce();
        }

        // Paddle collisions
        if (checkPaddleHit(leftPaddle, 'left')) {
            handlePaddleHit(leftPaddle);
        }
        if (checkPaddleHit(rightPaddle, 'right')) {
            handlePaddleHit(rightPaddle);
        }

        // Scoring
        if (ball.x - BALL_R <= 0) {
            rightScore++;
            updateScoreboard();
            if (window.NeonSFX) NeonSFX.score();
            if (rightScore >= WIN_SCORE) {
                endMatch(mode === 'ai' ? 'AI Wins!' : 'Player 2 Wins!');
            } else {
                resetBall(1);
            }
        }
        if (ball.x + BALL_R >= CANVAS_W) {
            leftScore++;
            updateScoreboard();
            if (window.NeonSFX) NeonSFX.score();
            if (leftScore >= WIN_SCORE) {
                endMatch(mode === 'ai' ? 'You Win! 🎉' : 'Player 1 Wins!');
            } else {
                resetBall(-1);
            }
        }
    }

    function checkPaddleHit(paddle, side) {
        if (side === 'left') {
            return ball.x - BALL_R <= paddle.x + paddle.w &&
                ball.x + BALL_R >= paddle.x &&
                ball.y >= paddle.y &&
                ball.y <= paddle.y + paddle.h &&
                ball.vx < 0;
        } else {
            return ball.x + BALL_R >= paddle.x &&
                ball.x - BALL_R <= paddle.x + paddle.w &&
                ball.y >= paddle.y &&
                ball.y <= paddle.y + paddle.h &&
                ball.vx > 0;
        }
    }

    function handlePaddleHit(paddle) {
        // Calculate hit position relative to paddle center (-1 to 1)
        const relY = ((ball.y - paddle.y) / paddle.h) * 2 - 1;
        const angle = relY * (Math.PI / 3.5); // max ~51 degrees

        // Increase speed slightly
        ball.speed = Math.min(ball.speed + 0.3, BALL_SPEED_MAX);

        const dir = ball.vx > 0 ? -1 : 1;
        ball.vx = dir * ball.speed * Math.cos(angle);
        ball.vy = ball.speed * Math.sin(angle);

        // Nudge ball out of paddle
        if (dir === 1) ball.x = paddle.x + paddle.w + BALL_R + 1;
        else ball.x = paddle.x - BALL_R - 1;

        if (window.NeonSFX) NeonSFX.paddleHit();
    }

    // ===== AI =====
    function updateAI() {
        const ai = AI_DIFFICULTY[difficulty];

        // Only react when ball is coming toward AI
        if (ball.vx > 0) {
            // Predict where ball will be
            const timeToReach = (rightPaddle.x - ball.x) / ball.vx;
            aiTargetY = ball.y + ball.vy * timeToReach + aiError;
            // Bounce prediction
            if (aiTargetY < 0) aiTargetY = -aiTargetY;
            if (aiTargetY > CANVAS_H) aiTargetY = 2 * CANVAS_H - aiTargetY;
        } else {
            // Return toward center when ball going away
            aiTargetY = CANVAS_H / 2 + aiError;
        }

        const paddleCenter = rightPaddle.y + PADDLE_H / 2;
        const diff = aiTargetY - paddleCenter;

        if (Math.abs(diff) > 4) {
            const move = Math.sign(diff) * Math.min(ai.speed, Math.abs(diff) * ai.reaction);
            rightPaddle.y += move;
        }
    }

    function endMatch(message) {
        matchOver = true;
        running = false;
        if (animId) cancelAnimationFrame(animId);

        const isWin = message.includes('🎉') || message.includes('Player 1');
        if (window.NeonSFX) {
            if (isWin) NeonSFX.win();
            else NeonSFX.gameOver();
        }

        drawFrame();
        showOverlay(message, isWin ? '🏆' : '💀', false);
    }

    // ===== Drawing =====
    function drawFrame() {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Background glow
        const grdL = ctx.createRadialGradient(0, CANVAS_H / 2, 0, 0, CANVAS_H / 2, 200);
        grdL.addColorStop(0, 'rgba(0, 212, 255, 0.04)');
        grdL.addColorStop(1, 'transparent');
        ctx.fillStyle = grdL;
        ctx.fillRect(0, 0, CANVAS_W / 2, CANVAS_H);

        const grdR = ctx.createRadialGradient(CANVAS_W, CANVAS_H / 2, 0, CANVAS_W, CANVAS_H / 2, 200);
        grdR.addColorStop(0, 'rgba(255, 45, 117, 0.04)');
        grdR.addColorStop(1, 'transparent');
        ctx.fillStyle = grdR;
        ctx.fillRect(CANVAS_W / 2, 0, CANVAS_W / 2, CANVAS_H);

        // Center dashed line
        ctx.setLineDash([8, 10]);
        ctx.strokeStyle = COL_LINE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(CANVAS_W / 2, 0);
        ctx.lineTo(CANVAS_W / 2, CANVAS_H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ball trail
        for (let i = 0; i < ballTrail.length; i++) {
            const t = ballTrail[i];
            const alpha = (i / ballTrail.length) * 0.3;
            const r = BALL_R * (i / ballTrail.length) * 0.7;
            ctx.beginPath();
            ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
            ctx.fill();
        }

        // Ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = COL_GREEN;
        ctx.shadowColor = COL_GREEN;
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Left paddle
        drawPaddle(leftPaddle, COL_BLUE);
        // Right paddle
        drawPaddle(rightPaddle, COL_PINK);

        // Paused text
        if (paused && running) {
            ctx.fillStyle = 'rgba(6, 6, 20, 0.6)';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            ctx.font = '900 28px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillStyle = COL_PURPLE;
            ctx.shadowColor = COL_PURPLE;
            ctx.shadowBlur = 15;
            ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2 + 8);
            ctx.shadowBlur = 0;
        }
    }

    function drawPaddle(p, color) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;

        // Rounded rectangle
        const r = 6;
        ctx.beginPath();
        ctx.moveTo(p.x + r, p.y);
        ctx.lineTo(p.x + p.w - r, p.y);
        ctx.quadraticCurveTo(p.x + p.w, p.y, p.x + p.w, p.y + r);
        ctx.lineTo(p.x + p.w, p.y + p.h - r);
        ctx.quadraticCurveTo(p.x + p.w, p.y + p.h, p.x + p.w - r, p.y + p.h);
        ctx.lineTo(p.x + r, p.y + p.h);
        ctx.quadraticCurveTo(p.x, p.y + p.h, p.x, p.y + p.h - r);
        ctx.lineTo(p.x, p.y + r);
        ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // ===== Scoreboard =====
    function updateScoreboard() {
        scoreLeftEl.textContent = leftScore;
        scoreRightEl.textContent = rightScore;
    }

    // ===== Bootstrap =====
    window.addEventListener('DOMContentLoaded', init);
})();
