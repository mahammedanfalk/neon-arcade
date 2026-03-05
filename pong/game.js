// ===== Pong — Neon Edition =====
(function () {
    'use strict';

    // ===== Detect mobile =====
    const isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 768;

    // ===== Constants (adapt for mobile) =====
    const CANVAS_W = isMobile ? 400 : 700;
    const CANVAS_H = isMobile ? 650 : 500;
    const PADDLE_W = isMobile ? 90 : 12;  // horizontal in mobile, vertical in desktop
    const PADDLE_H = isMobile ? 12 : 90;
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

    let topScore = 0;
    let bottomScore = 0;
    let matchOver = false;

    // Online state
    const PEER_PREFIX = 'neonarcade-pong-';
    let peer = null;
    let conn = null;
    let isHost = false;
    let roomCode = '';
    let onlineReady = false;

    // Keys
    const keys = {};

    // Paddles & ball
    let paddle1, paddle2, ball;
    let ballTrail = [];

    // AI
    let aiTargetPos = isMobile ? CANVAS_W / 2 : CANVAS_H / 2;
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

    // Update canvas dimensions
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    // ===== Init =====
    function init() {
        resetObjects();

        if (isMobile) {
            document.body.style.touchAction = 'none';
            document.body.style.overscrollBehavior = 'none';
            document.documentElement.style.touchAction = 'none';
            document.documentElement.style.overscrollBehavior = 'none';
            document.documentElement.style.overflow = 'hidden';
            document.documentElement.style.position = 'fixed';
            document.documentElement.style.width = '100%';
            document.documentElement.style.height = '100%';
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
        }

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

        // ===== Touch controls =====
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleTouches(e.touches);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            handleTouches(e.touches);
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
        }, { passive: false });

        function handleTouches(touches) {
            const rect = canvas.getBoundingClientRect();
            if (isMobile) {
                // Vertical layout: user = bottom (paddle2), AI/P2 = top (paddle1)
                const scaleX = CANVAS_W / rect.width;
                const scaleY = CANVAS_H / rect.height;
                const midY = rect.top + rect.height / 2;
                for (let i = 0; i < touches.length; i++) {
                    const t = touches[i];
                    const gameX = (t.clientX - rect.left) * scaleX - PADDLE_W / 2;
                    const clampedX = Math.max(0, Math.min(CANVAS_W - PADDLE_W, gameX));
                    if (t.clientY >= midY) {
                        // Bottom half = user's paddle (paddle2)
                        paddle2.x = clampedX;
                    } else {
                        // Top half = P2 paddle (paddle1) — only in 2P mode
                        if (mode === '2p') {
                            paddle1.x = clampedX;
                        }
                    }
                }
            } else {
                // Horizontal layout: left half = paddle1, right half = paddle2
                const scaleY = CANVAS_H / rect.height;
                const midX = rect.left + rect.width / 2;
                for (let i = 0; i < touches.length; i++) {
                    const t = touches[i];
                    const gameY = (t.clientY - rect.top) * scaleY - PADDLE_H / 2;
                    const clampedY = Math.max(0, Math.min(CANVAS_H - PADDLE_H, gameY));
                    if (t.clientX < midX) {
                        paddle1.y = clampedY;
                    } else {
                        if (mode === '2p') {
                            paddle2.y = clampedY;
                        }
                    }
                }
            }
        }

        // Canvas scaling
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Initial draw
        drawFrame();
    }

    function resizeCanvas() {
        if (isMobile) {
            const maxW = Math.min(CANVAS_W, window.innerWidth - 16);
            const maxH = window.innerHeight * 0.62; // leave room for HUD + safe area
            const scale = Math.min(maxW / CANVAS_W, maxH / CANVAS_H);
            canvas.style.width = (CANVAS_W * scale) + 'px';
            canvas.style.height = (CANVAS_H * scale) + 'px';
        } else {
            const maxW = Math.min(CANVAS_W, window.innerWidth - 40);
            canvas.style.width = maxW + 'px';
            canvas.style.height = (maxW * CANVAS_H / CANVAS_W) + 'px';
        }
    }

    // ===== Mode =====
    function setMode(m) {
        if (mode === 'online' && m !== 'online') disconnectOnline();
        mode = m;
        $$('.mode-btn').forEach((b) => b.classList.remove('active'));
        const btn = $(`#mode-${m}`);
        if (btn) btn.classList.add('active');

        const onlinePanel = $('#online-panel');

        if (m === 'ai') {
            diffSelector.classList.remove('hidden');
            p2Label.textContent = 'AI';
            if (onlinePanel) onlinePanel.classList.add('hidden');
        } else if (m === '2p') {
            diffSelector.classList.add('hidden');
            p2Label.textContent = 'P2';
            if (onlinePanel) onlinePanel.classList.add('hidden');
        } else if (m === 'online') {
            diffSelector.classList.add('hidden');
            p1Label.textContent = isMobile ? 'TOP' : 'LEFT';
            p2Label.textContent = isMobile ? 'BOTTOM' : 'RIGHT';
            if (onlinePanel) {
                onlinePanel.classList.remove('hidden');
                showLobby();
            }
        }

        stopMatch();
    }

    // ===== Objects =====
    function resetObjects() {
        if (isMobile) {
            // Vertical: paddles at top and bottom, move horizontally
            paddle1 = { x: CANVAS_W / 2 - PADDLE_W / 2, y: 20, w: PADDLE_W, h: PADDLE_H };
            paddle2 = { x: CANVAS_W / 2 - PADDLE_W / 2, y: CANVAS_H - 20 - PADDLE_H, w: PADDLE_W, h: PADDLE_H };
        } else {
            // Horizontal: paddles on left and right, move vertically
            paddle1 = { x: 20, y: CANVAS_H / 2 - PADDLE_H / 2, w: 12, h: 90 };
            paddle2 = { x: CANVAS_W - 20 - 12, y: CANVAS_H / 2 - PADDLE_H / 2, w: 12, h: 90 };
        }
        resetBall(1);
    }

    function resetBall(dir) {
        const angle = (Math.random() * Math.PI / 4) - Math.PI / 8;
        if (isMobile) {
            // Ball moves vertically (down = toward paddle2)
            ball = {
                x: CANVAS_W / 2,
                y: CANVAS_H / 2,
                vx: BALL_SPEED_INIT * Math.sin(angle),
                vy: BALL_SPEED_INIT * dir * Math.cos(angle),
                speed: BALL_SPEED_INIT,
            };
        } else {
            ball = {
                x: CANVAS_W / 2,
                y: CANVAS_H / 2,
                vx: BALL_SPEED_INIT * dir * Math.cos(angle),
                vy: BALL_SPEED_INIT * Math.sin(angle),
                speed: BALL_SPEED_INIT,
            };
        }
        ballTrail = [];
        aiError = (Math.random() - 0.5) * AI_DIFFICULTY[difficulty].errorMargin * 2;
    }

    // ===== Match Control =====
    function startMatch() {
        topScore = 0;
        bottomScore = 0;
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
        topScore = 0;
        bottomScore = 0;
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
            if (isMobile) {
                overlayInfo.innerHTML = `
                    Drag bottom half to move your paddle${mode === '2p' ? '<br>Drag top half for Player 2' : ''}
                `;
            } else {
                overlayInfo.innerHTML = `
                    <span class="key">W</span> / <span class="key">S</span> — Left Paddle<br>
                    <span class="key">↑</span> / <span class="key">↓</span> — Right Paddle${mode === 'ai' ? '' : ' (2P)'}
                `;
            }
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
        if (mode === 'online' && !isHost) return; // Guest doesn't run physics
        if (isMobile) {
            updateMobile();
        } else {
            updateDesktop();
        }
        // Send state to guest — normalized to 0..1
        if (mode === 'online' && isHost && conn) {
            conn.send({
                type: 'state',
                // Normalize paddle "slide axis" position: 0..1
                // Host is always the one running physics on their own canvas
                p1n: isMobile ? paddle1.x / (CANVAS_W - PADDLE_W) : paddle1.y / (CANVAS_H - PADDLE_H),
                p2n: isMobile ? paddle2.x / (CANVAS_W - PADDLE_W) : paddle2.y / (CANVAS_H - PADDLE_H),
                // Normalize ball position
                bx: ball.x / CANVAS_W,
                by: ball.y / CANVAS_H,
                ts: topScore,
                bs: bottomScore,
                hostMobile: isMobile
            });
        }
    }

    function updateDesktop() {
        // ===== Move Paddles =====
        if (keys['w'] || keys['W']) paddle1.y -= PADDLE_SPEED;
        if (keys['s'] || keys['S']) paddle1.y += PADDLE_SPEED;

        if (mode === '2p') {
            if (keys['ArrowUp']) paddle2.y -= PADDLE_SPEED;
            if (keys['ArrowDown']) paddle2.y += PADDLE_SPEED;
        } else {
            updateAIDesktop();
        }

        paddle1.y = Math.max(0, Math.min(CANVAS_H - paddle1.h, paddle1.y));
        paddle2.y = Math.max(0, Math.min(CANVAS_H - paddle2.h, paddle2.y));

        // ===== Ball =====
        ballTrail.push({ x: ball.x, y: ball.y });
        if (ballTrail.length > TRAIL_LENGTH) ballTrail.shift();

        ball.x += ball.vx;
        ball.y += ball.vy;

        // Top / bottom walls
        if (ball.y - BALL_R <= 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); if (window.NeonSFX) NeonSFX.wallBounce(); }
        if (ball.y + BALL_R >= CANVAS_H) { ball.y = CANVAS_H - BALL_R; ball.vy = -Math.abs(ball.vy); if (window.NeonSFX) NeonSFX.wallBounce(); }

        // Paddle collisions
        if (checkPaddleHitDesktop(paddle1, 'left')) handlePaddleHitDesktop(paddle1);
        if (checkPaddleHitDesktop(paddle2, 'right')) handlePaddleHitDesktop(paddle2);

        // Scoring
        if (ball.x - BALL_R <= 0) {
            bottomScore++;
            updateScoreboard();
            if (window.NeonSFX) NeonSFX.score();
            if (bottomScore >= WIN_SCORE) { endMatch(mode === 'ai' ? 'AI Wins!' : 'Player 2 Wins!'); }
            else resetBall(1);
        }
        if (ball.x + BALL_R >= CANVAS_W) {
            topScore++;
            updateScoreboard();
            if (window.NeonSFX) NeonSFX.score();
            if (topScore >= WIN_SCORE) { endMatch(mode === 'ai' ? 'You Win! 🎉' : 'Player 1 Wins!'); }
            else resetBall(-1);
        }
    }

    function updateMobile() {
        if (mode === 'online') {
            // Host controls bottom paddle2 via touch
            // Guest paddle1 comes from network
        } else if (mode !== '2p') {
            updateAIMobile();
        }

        // Clamp paddles
        paddle1.x = Math.max(0, Math.min(CANVAS_W - PADDLE_W, paddle1.x));
        paddle2.x = Math.max(0, Math.min(CANVAS_W - PADDLE_W, paddle2.x));

        // ===== Ball =====
        ballTrail.push({ x: ball.x, y: ball.y });
        if (ballTrail.length > TRAIL_LENGTH) ballTrail.shift();

        ball.x += ball.vx;
        ball.y += ball.vy;

        // Left/right walls bounce
        if (ball.x - BALL_R <= 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); if (window.NeonSFX) NeonSFX.wallBounce(); }
        if (ball.x + BALL_R >= CANVAS_W) { ball.x = CANVAS_W - BALL_R; ball.vx = -Math.abs(ball.vx); if (window.NeonSFX) NeonSFX.wallBounce(); }

        // Paddle collisions
        if (checkPaddleHitMobile(paddle1, 'top')) handlePaddleHitMobile(paddle1, 'top');
        if (checkPaddleHitMobile(paddle2, 'bottom')) handlePaddleHitMobile(paddle2, 'bottom');

        // Scoring: ball past top = user (paddle2/bottom) scores, ball past bottom = AI (paddle1/top) scores
        if (ball.y - BALL_R <= 0) {
            // Ball went past TOP paddle (AI/paddle1) — user scores!
            bottomScore++;
            updateScoreboard();
            if (window.NeonSFX) NeonSFX.score();
            if (bottomScore >= WIN_SCORE) { endMatch(mode === 'ai' ? 'You Win! 🎉' : 'Player 2 Wins!'); }
            else resetBall(1);
        }
        if (ball.y + BALL_R >= CANVAS_H) {
            // Ball went past BOTTOM paddle (user/paddle2) — AI scores
            topScore++;
            updateScoreboard();
            if (window.NeonSFX) NeonSFX.score();
            if (topScore >= WIN_SCORE) { endMatch(mode === 'ai' ? 'AI Wins!' : 'Player 1 Wins!'); }
            else resetBall(-1);
        }
    }

    // ===== Desktop paddle hit =====
    function checkPaddleHitDesktop(paddle, side) {
        if (side === 'left') {
            return ball.x - BALL_R <= paddle.x + paddle.w && ball.x + BALL_R >= paddle.x && ball.y >= paddle.y && ball.y <= paddle.y + paddle.h && ball.vx < 0;
        } else {
            return ball.x + BALL_R >= paddle.x && ball.x - BALL_R <= paddle.x + paddle.w && ball.y >= paddle.y && ball.y <= paddle.y + paddle.h && ball.vx > 0;
        }
    }

    function handlePaddleHitDesktop(paddle) {
        const relY = ((ball.y - paddle.y) / paddle.h) * 2 - 1;
        const angle = relY * (Math.PI / 3.5);
        ball.speed = Math.min(ball.speed + 0.3, BALL_SPEED_MAX);
        const dir = ball.vx > 0 ? -1 : 1;
        ball.vx = dir * ball.speed * Math.cos(angle);
        ball.vy = ball.speed * Math.sin(angle);
        if (dir === 1) ball.x = paddle.x + paddle.w + BALL_R + 1;
        else ball.x = paddle.x - BALL_R - 1;
        if (window.NeonSFX) NeonSFX.paddleHit();
    }

    // ===== Mobile paddle hit =====
    function checkPaddleHitMobile(paddle, side) {
        if (side === 'top') {
            return ball.y - BALL_R <= paddle.y + paddle.h && ball.y + BALL_R >= paddle.y && ball.x >= paddle.x && ball.x <= paddle.x + paddle.w && ball.vy < 0;
        } else {
            return ball.y + BALL_R >= paddle.y && ball.y - BALL_R <= paddle.y + paddle.h && ball.x >= paddle.x && ball.x <= paddle.x + paddle.w && ball.vy > 0;
        }
    }

    function handlePaddleHitMobile(paddle, side) {
        const relX = ((ball.x - paddle.x) / paddle.w) * 2 - 1;
        const angle = relX * (Math.PI / 3.5);
        ball.speed = Math.min(ball.speed + 0.3, BALL_SPEED_MAX);
        const dir = ball.vy > 0 ? -1 : 1;
        ball.vy = dir * ball.speed * Math.cos(angle);
        ball.vx = ball.speed * Math.sin(angle);
        if (dir === 1) ball.y = paddle.y + paddle.h + BALL_R + 1;
        else ball.y = paddle.y - BALL_R - 1;
        if (window.NeonSFX) NeonSFX.paddleHit();
    }

    // ===== AI (Desktop) =====
    function updateAIDesktop() {
        const ai = AI_DIFFICULTY[difficulty];
        if (ball.vx > 0) {
            const timeToReach = (paddle2.x - ball.x) / ball.vx;
            aiTargetPos = ball.y + ball.vy * timeToReach + aiError;
            if (aiTargetPos < 0) aiTargetPos = -aiTargetPos;
            if (aiTargetPos > CANVAS_H) aiTargetPos = 2 * CANVAS_H - aiTargetPos;
        } else {
            aiTargetPos = CANVAS_H / 2 + aiError;
        }
        const paddleCenter = paddle2.y + paddle2.h / 2;
        const diff = aiTargetPos - paddleCenter;
        if (Math.abs(diff) > 4) {
            paddle2.y += Math.sign(diff) * Math.min(ai.speed, Math.abs(diff) * ai.reaction);
        }
    }

    // ===== AI (Mobile) — AI now controls paddle1 (TOP) =====
    function updateAIMobile() {
        const ai = AI_DIFFICULTY[difficulty];
        // AI controls paddle1 (top), tracks ball when ball is moving upward (toward AI)
        if (ball.vy < 0) {
            const timeToReach = (paddle1.y + paddle1.h - ball.y) / ball.vy;
            aiTargetPos = ball.x + ball.vx * timeToReach + aiError;
            if (aiTargetPos < 0) aiTargetPos = -aiTargetPos;
            if (aiTargetPos > CANVAS_W) aiTargetPos = 2 * CANVAS_W - aiTargetPos;
        } else {
            aiTargetPos = CANVAS_W / 2 + aiError;
        }
        const paddleCenter = paddle1.x + PADDLE_W / 2;
        const diff = aiTargetPos - paddleCenter;
        if (Math.abs(diff) > 4) {
            paddle1.x += Math.sign(diff) * Math.min(ai.speed, Math.abs(diff) * ai.reaction);
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

        if (isMobile) {
            drawFrameMobile();
        } else {
            drawFrameDesktop();
        }

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

    function drawFrameDesktop() {
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

        drawBallTrailAndBall();
        drawPaddle(paddle1, COL_BLUE);
        drawPaddle(paddle2, COL_PINK);
    }

    function drawFrameMobile() {
        // Background glow — top and bottom
        const grdT = ctx.createRadialGradient(CANVAS_W / 2, 0, 0, CANVAS_W / 2, 0, 200);
        grdT.addColorStop(0, 'rgba(0, 212, 255, 0.04)');
        grdT.addColorStop(1, 'transparent');
        ctx.fillStyle = grdT;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H / 2);

        const grdB = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H, 0, CANVAS_W / 2, CANVAS_H, 200);
        grdB.addColorStop(0, 'rgba(255, 45, 117, 0.04)');
        grdB.addColorStop(1, 'transparent');
        ctx.fillStyle = grdB;
        ctx.fillRect(0, CANVAS_H / 2, CANVAS_W, CANVAS_H / 2);

        // Center horizontal dashed line
        ctx.setLineDash([8, 10]);
        ctx.strokeStyle = COL_LINE;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_H / 2);
        ctx.lineTo(CANVAS_W, CANVAS_H / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        drawBallTrailAndBall();
        drawPaddle(paddle1, COL_BLUE);
        drawPaddle(paddle2, COL_PINK);
    }

    function drawBallTrailAndBall() {
        for (let i = 0; i < ballTrail.length; i++) {
            const t = ballTrail[i];
            const alpha = (i / ballTrail.length) * 0.3;
            const r = BALL_R * (i / ballTrail.length) * 0.7;
            ctx.beginPath();
            ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = COL_GREEN;
        ctx.shadowColor = COL_GREEN;
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    function drawPaddle(p, color) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;

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
        scoreLeftEl.textContent = topScore;
        scoreRightEl.textContent = bottomScore;
    }

    // ================================================================
    //  ONLINE MULTIPLAYER (PeerJS)
    // ================================================================

    const onlineLobby = $('#online-lobby');
    const onlineWaiting = $('#online-waiting');
    const onlineConnected = $('#online-connected');
    const waitingText = $('#waiting-text');
    const roomCodeDisplay = $('#room-code-display');
    const roomCodeEl = $('#room-code');
    const shareHint = $('#share-hint');
    const disconnectBtn = $('#disconnect-btn');

    function generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
        return code;
    }

    function showLobby() {
        if (!onlineLobby) return;
        onlineLobby.classList.remove('hidden');
        onlineWaiting.classList.add('hidden');
        onlineConnected.classList.add('hidden');
        const input = $('#room-code-input');
        if (input) input.value = '';
    }

    function showWaiting(text) {
        if (!onlineLobby) return;
        onlineLobby.classList.add('hidden');
        onlineWaiting.classList.remove('hidden');
        onlineConnected.classList.add('hidden');
        waitingText.textContent = text;
    }

    function showConnected() {
        if (!onlineLobby) return;
        onlineLobby.classList.add('hidden');
        onlineWaiting.classList.add('hidden');
        onlineConnected.classList.remove('hidden');
        if (disconnectBtn) disconnectBtn.classList.remove('hidden');
    }

    // Create Room
    if ($('#create-room-btn')) {
        $('#create-room-btn').addEventListener('click', () => {
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
                conn.on('open', () => setupPongConnection());
                conn.on('error', () => handlePongDisconnect());
            });
            peer.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    roomCode = generateCode();
                    peer.destroy();
                    $('#create-room-btn').click();
                } else {
                    waitingText.textContent = 'Connection error. Try again.';
                }
            });
        });
    }

    // Join Room
    if ($('#join-room-btn')) {
        $('#join-room-btn').addEventListener('click', () => {
            const input = $('#room-code-input').value.trim().toUpperCase();
            if (!input || input.length < 3) return;
            if (window.NeonSFX) NeonSFX.click();
            isHost = false;
            roomCode = input;
            showWaiting('Connecting...');
            if (peer) peer.destroy();
            peer = new Peer(undefined, { debug: 0 });
            peer.on('open', () => {
                conn = peer.connect(PEER_PREFIX + roomCode, { reliable: true });
                conn.on('open', () => setupPongConnection());
                conn.on('error', () => { waitingText.textContent = 'Room not found.'; });
            });
            peer.on('error', (err) => {
                waitingText.textContent = err.type === 'peer-unavailable' ? 'Room not found.' : 'Connection error.';
            });
        });
    }

    if ($('#room-code-input')) {
        $('#room-code-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') $('#join-room-btn').click();
        });
    }

    function setupPongConnection() {
        if (window.NeonSFX) NeonSFX.gameStart();
        showConnected();
        onlineReady = true;

        const yourMarkEl = $('#your-mark');
        if (yourMarkEl) {
            yourMarkEl.textContent = isHost ? (isMobile ? 'Bottom' : 'Left (P1)') : (isMobile ? 'Top' : 'Right (P2)');
        }

        if (isHost) {
            p1Label.textContent = isMobile ? 'OPP' : 'YOU';
            p2Label.textContent = isMobile ? 'YOU' : 'OPP';
        } else {
            p1Label.textContent = isMobile ? 'YOU' : 'OPP';
            p2Label.textContent = isMobile ? 'OPP' : 'YOU';
        }

        conn.on('data', (data) => {
            switch (data.type) {
                case 'start':
                    resetObjects();
                    topScore = 0;
                    bottomScore = 0;
                    matchOver = false;
                    running = true;
                    paused = false;
                    updateScoreboard();
                    overlay.classList.add('hidden');
                    if (!isHost) gameLoop(); // guest runs render loop
                    break;
                case 'state':
                    // Guest receives normalized state from host
                    if (!isHost) {
                        const hm = data.hostMobile;
                        const sameLayout = (isMobile === hm);

                        if (sameLayout) {
                            // Same layout — direct denormalize
                            if (isMobile) {
                                paddle1.x = data.p1n * (CANVAS_W - PADDLE_W);
                                paddle2.x = data.p2n * (CANVAS_W - PADDLE_W);
                            } else {
                                paddle1.y = data.p1n * (CANVAS_H - PADDLE_H);
                                paddle2.y = data.p2n * (CANVAS_H - PADDLE_H);
                            }
                            ball.x = data.bx * CANVAS_W;
                            ball.y = data.by * CANVAS_H;
                        } else {
                            // Cross-platform: swap axes
                            // Host's "slide axis" maps to guest's "slide axis"
                            if (isMobile) {
                                // Guest is mobile, host is desktop
                                // Host paddle1 Y -> guest paddle1 X
                                paddle1.x = data.p1n * (CANVAS_W - PADDLE_W);
                                paddle2.x = data.p2n * (CANVAS_W - PADDLE_W);
                                // Host ball: x=horizontal progress, y=vertical
                                // Desktop: x=left-to-right (goal axis), y=bounce axis
                                // Mobile: y=top-to-bottom (goal axis), x=bounce axis
                                ball.x = data.by * CANVAS_W;  // host's vertical -> guest's horizontal
                                ball.y = data.bx * CANVAS_H;  // host's horizontal -> guest's vertical
                            } else {
                                // Guest is desktop, host is mobile
                                paddle1.y = data.p1n * (CANVAS_H - PADDLE_H);
                                paddle2.y = data.p2n * (CANVAS_H - PADDLE_H);
                                ball.x = data.by * CANVAS_W;
                                ball.y = data.bx * CANVAS_H;
                            }
                        }
                        topScore = data.ts;
                        bottomScore = data.bs;
                        ballTrail.push({ x: ball.x, y: ball.y });
                        if (ballTrail.length > 6) ballTrail.shift();
                        updateScoreboard();
                    }
                    break;
                case 'paddle':
                    // Host receives guest's normalized paddle position
                    if (isHost) {
                        const guestVal = data.n; // 0..1 normalized position
                        if (isMobile) {
                            paddle1.x = guestVal * (CANVAS_W - PADDLE_W); // guest=top=paddle1
                        } else {
                            paddle2.y = guestVal * (CANVAS_H - PADDLE_H); // guest=right=paddle2
                        }
                    }
                    break;
                case 'end-match':
                    matchOver = true;
                    running = false;
                    if (animId) cancelAnimationFrame(animId);
                    topScore = data.ts;
                    bottomScore = data.bs;
                    updateScoreboard();
                    drawFrame();
                    showOverlay(data.message, data.icon, false);
                    if (window.NeonSFX) {
                        if (data.message.includes('🎉') || (isHost && data.message.includes('Bottom')) || (!isHost && data.message.includes('Top'))) {
                            NeonSFX.win();
                        } else {
                            NeonSFX.gameOver();
                        }
                    }
                    break;
            }
        });

        conn.on('close', () => handlePongDisconnect());
        conn.on('error', () => handlePongDisconnect());

        // Host auto-starts
        if (isHost) {
            setTimeout(() => {
                startMatch();
                conn.send({ type: 'start' });
            }, 500);
        }
    }

    // Override endMatch for online — broadcast to guest
    const _origEndMatch = endMatch;
    endMatch = function (message) {
        matchOver = true;
        running = false;
        if (animId) cancelAnimationFrame(animId);

        const icon = message.includes('🎉') || message.includes('Player 1') || message.includes('Bottom') ? '🏆' : '💀';
        if (window.NeonSFX) {
            if (icon === '🏆') NeonSFX.win();
            else NeonSFX.gameOver();
        }

        drawFrame();
        showOverlay(message, icon, false);

        if (mode === 'online' && conn) {
            conn.send({
                type: 'end-match',
                message: message,
                icon: icon,
                ts: topScore,
                bs: bottomScore
            });
        }
    };

    function handlePongDisconnect() {
        conn = null;
        onlineReady = false;
        running = false;
        if (animId) cancelAnimationFrame(animId);
        showLobby();
        if (disconnectBtn) disconnectBtn.classList.add('hidden');
        showOverlay('Opponent disconnected', '💔', false);
        if (window.NeonSFX) NeonSFX.gameOver();
    }

    if ($('#cancel-online-btn')) {
        $('#cancel-online-btn').addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            if (peer) { peer.destroy(); peer = null; }
            conn = null;
            showLobby();
        });
    }

    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => disconnectOnline());
    }

    function disconnectOnline() {
        if (window.NeonSFX) NeonSFX.click();
        if (conn) conn.close();
        if (peer) { peer.destroy(); peer = null; }
        conn = null;
        onlineReady = false;
        showLobby();
        if (disconnectBtn) disconnectBtn.classList.add('hidden');
        running = false;
        if (animId) cancelAnimationFrame(animId);
    }

    if ($('#copy-code-btn')) {
        $('#copy-code-btn').addEventListener('click', () => {
            const inviteUrl = window.location.origin + window.location.pathname + '?code=' + roomCode;
            navigator.clipboard.writeText(inviteUrl).then(() => {
                const btn = $('#copy-code-btn');
                btn.textContent = '✅';
                setTimeout(() => { btn.textContent = '🔗'; }, 1500);
            }).catch(() => {
                const el = document.createElement('textarea');
                el.value = inviteUrl;
                document.body.appendChild(el); el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                const btn = $('#copy-code-btn');
                btn.textContent = '✅';
                setTimeout(() => { btn.textContent = '🔗'; }, 1500);
            });
            if (window.NeonSFX) NeonSFX.click();
        });
    }

    // Send paddle position to host periodically (guest only)
    setInterval(() => {
        if (mode === 'online' && !isHost && conn && running) {
            // Send normalized 0..1 paddle position
            let normalizedPos;
            if (isMobile) {
                // Guest mobile: paddle1 (top) controls via X
                normalizedPos = paddle1.x / (CANVAS_W - PADDLE_W);
            } else {
                // Guest desktop: paddle2 (right) controls via Y
                normalizedPos = paddle2.y / (CANVAS_H - PADDLE_H);
            }
            conn.send({ type: 'paddle', n: Math.max(0, Math.min(1, normalizedPos)) });
        }
    }, 50);

    // ===== Auto-join from invite link =====
    function checkInviteLink() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (code && code.length >= 3) {
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
            // Switch to online mode and auto-join
            setMode('online');
            const input = $('#room-code-input');
            if (input) {
                input.value = code.toUpperCase();
                setTimeout(() => {
                    const joinBtn = $('#join-room-btn');
                    if (joinBtn) joinBtn.click();
                }, 500);
            }
        }
    }

    // ===== Bootstrap =====
    window.addEventListener('DOMContentLoaded', () => {
        init();
        checkInviteLink();
    });
})();
