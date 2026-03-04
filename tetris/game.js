// ===== Neon Tetris — Game Engine =====
(function () {
    'use strict';

    // ===== Constants =====
    const COLS = 10;
    const ROWS = 20;
    const BLOCK = 30; // px per cell
    const NEXT_BLOCK = 24;

    const canvas = document.getElementById('tetris-canvas');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('next-canvas');
    const nextCtx = nextCanvas.getContext('2d');

    // DOM refs
    const scoreEl = document.getElementById('score-val');
    const levelEl = document.getElementById('level-val');
    const linesEl = document.getElementById('lines-val');
    const highEl = document.getElementById('high-val');
    const overlay = document.getElementById('overlay');
    const overlayIcon = document.getElementById('overlay-icon');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayInfo = document.getElementById('overlay-info');
    const playBtn = document.getElementById('play-btn');

    // ===== Tetromino Definitions =====
    const PIECES = {
        I: {
            shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
            color: '#00d4ff',
            glow: 'rgba(0, 212, 255, 0.5)',
        },
        O: {
            shape: [[1, 1], [1, 1]],
            color: '#ffe600',
            glow: 'rgba(255, 230, 0, 0.5)',
        },
        T: {
            shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
            color: '#b44dff',
            glow: 'rgba(180, 77, 255, 0.5)',
        },
        S: {
            shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
            color: '#00ff88',
            glow: 'rgba(0, 255, 136, 0.5)',
        },
        Z: {
            shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
            color: '#ff2d75',
            glow: 'rgba(255, 45, 117, 0.5)',
        },
        J: {
            shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
            color: '#3d8bff',
            glow: 'rgba(61, 139, 255, 0.5)',
        },
        L: {
            shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
            color: '#ff8a00',
            glow: 'rgba(255, 138, 0, 0.5)',
        },
    };

    const PIECE_NAMES = Object.keys(PIECES);

    // SRS wall kick data (J, L, S, T, Z; I uses separate table)
    const WALL_KICKS = {
        '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
        '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    };

    const I_WALL_KICKS = {
        '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
        '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    };

    // Scoring
    const LINE_SCORES = [0, 100, 300, 500, 800];
    const SOFT_DROP_SCORE = 1;
    const HARD_DROP_SCORE = 2;

    // Speed per level (ms per drop) — speeds up each level
    function getSpeed(level) {
        const speeds = [800, 720, 630, 550, 470, 380, 300, 220, 150, 100, 80, 70, 60, 50, 40];
        return speeds[Math.min(level - 1, speeds.length - 1)];
    }

    // ===== Game State =====
    let board = [];
    let currentPiece = null;
    let nextPiece = null;
    let score = 0;
    let level = 1;
    let lines = 0;
    let highScore = parseInt(localStorage.getItem('tetris-high') || '0', 10);
    let gameRunning = false;
    let paused = false;
    let dropTimer = null;
    let lastDrop = 0;
    let rafId = null;
    let particles = [];
    let flashRows = [];
    let flashTimer = 0;

    highEl.textContent = highScore;

    // ===== Board Helpers =====
    function createBoard() {
        board = [];
        for (let r = 0; r < ROWS; r++) {
            board.push(new Array(COLS).fill(null));
        }
    }

    // ===== Piece Helpers =====
    function randomPiece() {
        const name = PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)];
        const p = PIECES[name];
        return {
            name: name,
            shape: p.shape.map(row => [...row]),
            color: p.color,
            glow: p.glow,
            rotation: 0,
            x: Math.floor((COLS - p.shape[0].length) / 2),
            y: 0,
        };
    }

    function rotateMatrix(matrix) {
        const N = matrix.length;
        const result = [];
        for (let r = 0; r < N; r++) {
            result.push([]);
            for (let c = 0; c < N; c++) {
                result[r].push(matrix[N - 1 - c][r]);
            }
        }
        return result;
    }

    function collides(shape, px, py) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const nx = px + c;
                const ny = py + r;
                if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
                if (ny >= 0 && board[ny][nx]) return true;
            }
        }
        return false;
    }

    function lockPiece() {
        const s = currentPiece.shape;
        for (let r = 0; r < s.length; r++) {
            for (let c = 0; c < s[r].length; c++) {
                if (!s[r][c]) continue;
                const bx = currentPiece.x + c;
                const by = currentPiece.y + r;
                if (by < 0) {
                    // Game over
                    endGame();
                    return;
                }
                board[by][bx] = { color: currentPiece.color, glow: currentPiece.glow };
            }
        }
        clearLines();
        spawnPiece();
    }

    function clearLines() {
        const cleared = [];
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every(cell => cell !== null)) {
                cleared.push(r);
            }
        }
        if (cleared.length === 0) return;

        // Flash effect
        flashRows = cleared.slice();
        flashTimer = 12; // frames

        // Particles
        cleared.forEach(row => {
            for (let c = 0; c < COLS; c++) {
                const cell = board[row][c];
                for (let i = 0; i < 4; i++) {
                    particles.push({
                        x: c * BLOCK + BLOCK / 2 + (Math.random() - 0.5) * BLOCK,
                        y: row * BLOCK + BLOCK / 2,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6 - 2,
                        life: 30 + Math.random() * 20,
                        maxLife: 50,
                        color: cell ? cell.color : '#00ff88',
                        size: 2 + Math.random() * 3,
                    });
                }
            }
        });

        // Remove rows
        cleared.sort((a, b) => a - b);
        for (const row of cleared) {
            board.splice(row, 1);
            board.unshift(new Array(COLS).fill(null));
        }

        // Score
        const count = cleared.length;
        score += LINE_SCORES[count] * level;
        lines += count;

        // Level up every 10 lines
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            if (window.NeonSFX) NeonSFX.levelUp();
        }

        if (window.NeonSFX) NeonSFX.lineClear();

        updateHUD();
    }

    function spawnPiece() {
        currentPiece = nextPiece || randomPiece();
        nextPiece = randomPiece();
        drawNextPiece();

        // Check if new piece immediately collides => game over
        if (collides(currentPiece.shape, currentPiece.x, currentPiece.y)) {
            endGame();
        }
    }

    function getGhostY() {
        let gy = currentPiece.y;
        while (!collides(currentPiece.shape, currentPiece.x, gy + 1)) {
            gy++;
        }
        return gy;
    }

    // ===== Movement =====
    function moveLeft() {
        if (!currentPiece || paused) return;
        if (!collides(currentPiece.shape, currentPiece.x - 1, currentPiece.y)) {
            currentPiece.x--;
            if (window.NeonSFX) NeonSFX.move();
        }
    }

    function moveRight() {
        if (!currentPiece || paused) return;
        if (!collides(currentPiece.shape, currentPiece.x + 1, currentPiece.y)) {
            currentPiece.x++;
            if (window.NeonSFX) NeonSFX.move();
        }
    }

    function softDrop() {
        if (!currentPiece || paused) return;
        if (!collides(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
            currentPiece.y++;
            score += SOFT_DROP_SCORE;
            updateHUD();
        } else {
            lockPiece();
        }
    }

    function hardDrop() {
        if (!currentPiece || paused) return;
        let dropped = 0;
        while (!collides(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
            currentPiece.y++;
            dropped++;
        }
        score += dropped * HARD_DROP_SCORE;
        if (window.NeonSFX) NeonSFX.hardDrop();
        updateHUD();
        lockPiece();
    }

    function rotate() {
        if (!currentPiece || paused) return;
        if (currentPiece.name === 'O') return; // O doesn't rotate

        const oldRotation = currentPiece.rotation;
        const newRotation = (oldRotation + 1) % 4;
        const rotated = rotateMatrix(currentPiece.shape);
        const kickKey = `${oldRotation}>${newRotation}`;
        const kicks = currentPiece.name === 'I' ? I_WALL_KICKS[kickKey] : WALL_KICKS[kickKey];

        for (const [dx, dy] of (kicks || [[0, 0]])) {
            if (!collides(rotated, currentPiece.x + dx, currentPiece.y - dy)) {
                currentPiece.shape = rotated;
                currentPiece.x += dx;
                currentPiece.y -= dy;
                currentPiece.rotation = newRotation;
                if (window.NeonSFX) NeonSFX.rotate();
                return;
            }
        }
    }

    // ===== HUD =====
    function updateHUD() {
        scoreEl.textContent = score.toLocaleString();
        levelEl.textContent = level;
        linesEl.textContent = lines;
    }

    // ===== Drawing =====
    function drawBlock(context, x, y, color, glowColor, blockSize, alpha) {
        const a = alpha !== undefined ? alpha : 1;
        context.save();
        context.globalAlpha = a;

        // Glow
        context.shadowColor = glowColor || color;
        context.shadowBlur = 10;

        // Main fill
        context.fillStyle = color;
        context.fillRect(x * blockSize + 1, y * blockSize + 1, blockSize - 2, blockSize - 2);

        // Inner highlight
        context.shadowBlur = 0;
        context.fillStyle = 'rgba(255, 255, 255, 0.15)';
        context.fillRect(x * blockSize + 2, y * blockSize + 2, blockSize - 4, (blockSize - 4) * 0.35);

        // Border
        context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        context.lineWidth = 0.5;
        context.strokeRect(x * blockSize + 1, y * blockSize + 1, blockSize - 2, blockSize - 2);

        context.restore();
    }

    function drawBoard() {
        // Background
        ctx.fillStyle = 'rgba(6, 6, 20, 0.95)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
        ctx.lineWidth = 0.5;
        for (let r = 0; r <= ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * BLOCK);
            ctx.lineTo(canvas.width, r * BLOCK);
            ctx.stroke();
        }
        for (let c = 0; c <= COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * BLOCK, 0);
            ctx.lineTo(c * BLOCK, canvas.height);
            ctx.stroke();
        }

        // Locked cells
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) {
                    drawBlock(ctx, c, r, board[r][c].color, board[r][c].glow, BLOCK);
                }
            }
        }

        // Flash rows
        if (flashTimer > 0) {
            const flashAlpha = (flashTimer / 12) * 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
            for (const row of flashRows) {
                ctx.fillRect(0, row * BLOCK, canvas.width, BLOCK);
            }
        }
    }

    function drawGhost() {
        if (!currentPiece) return;
        const gy = getGhostY();
        if (gy === currentPiece.y) return;
        const s = currentPiece.shape;
        for (let r = 0; r < s.length; r++) {
            for (let c = 0; c < s[r].length; c++) {
                if (!s[r][c]) continue;
                drawBlock(ctx, currentPiece.x + c, gy + r, currentPiece.color, currentPiece.glow, BLOCK, 0.18);
            }
        }
    }

    function drawCurrentPiece() {
        if (!currentPiece) return;
        const s = currentPiece.shape;
        for (let r = 0; r < s.length; r++) {
            for (let c = 0; c < s[r].length; c++) {
                if (!s[r][c]) continue;
                const by = currentPiece.y + r;
                if (by < 0) continue;
                drawBlock(ctx, currentPiece.x + c, by, currentPiece.color, currentPiece.glow, BLOCK);
            }
        }
    }

    function drawNextPiece() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        if (!nextPiece) return;
        const s = nextPiece.shape;
        const pieceW = s[0].length * NEXT_BLOCK;
        const pieceH = s.length * NEXT_BLOCK;
        const offsetX = (nextCanvas.width - pieceW) / 2 / NEXT_BLOCK;
        const offsetY = (nextCanvas.height - pieceH) / 2 / NEXT_BLOCK;

        for (let r = 0; r < s.length; r++) {
            for (let c = 0; c < s[r].length; c++) {
                if (!s[r][c]) continue;
                drawBlock(nextCtx, offsetX + c, offsetY + r, nextPiece.color, nextPiece.glow, NEXT_BLOCK);
            }
        }
    }

    function drawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // gravity
            p.life--;
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            const alpha = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            ctx.restore();
        }
    }

    function drawPauseOverlay() {
        ctx.fillStyle = 'rgba(6, 6, 20, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.font = '900 1.4rem Orbitron, sans-serif';
        ctx.fillStyle = '#b44dff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(180, 77, 255, 0.5)';
        ctx.shadowBlur = 15;
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }

    // ===== Game Loop =====
    function gameLoop(timestamp) {
        if (!gameRunning) return;

        rafId = requestAnimationFrame(gameLoop);

        if (paused) {
            drawBoard();
            drawPauseOverlay();
            return;
        }

        // Gravity
        if (timestamp - lastDrop > getSpeed(level)) {
            lastDrop = timestamp;
            if (currentPiece) {
                if (!collides(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
                    currentPiece.y++;
                } else {
                    lockPiece();
                }
            }
        }

        // Flash timer
        if (flashTimer > 0) flashTimer--;

        // Draw
        drawBoard();
        drawGhost();
        drawCurrentPiece();
        drawParticles();
    }

    // ===== Start / End =====
    function startGame() {
        createBoard();
        score = 0;
        level = 1;
        lines = 0;
        paused = false;
        particles = [];
        flashRows = [];
        flashTimer = 0;
        lastDrop = performance.now();
        updateHUD();

        currentPiece = null;
        nextPiece = null;
        spawnPiece();

        overlay.classList.add('hidden');
        gameRunning = true;
        if (window.NeonSFX) NeonSFX.gameStart();
        rafId = requestAnimationFrame(gameLoop);
    }

    function endGame() {
        gameRunning = false;
        if (rafId) cancelAnimationFrame(rafId);

        // High score
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('tetris-high', highScore.toString());
            highEl.textContent = highScore.toLocaleString();
        }

        if (window.NeonSFX) NeonSFX.gameOver();

        overlayIcon.textContent = '💀';
        overlayTitle.textContent = 'GAME OVER';
        overlayInfo.innerHTML = `
            Score: <strong style="color:#00ff88">${score.toLocaleString()}</strong><br>
            Lines: <strong style="color:#00d4ff">${lines}</strong> &nbsp; Level: <strong style="color:#b44dff">${level}</strong>
            ${score >= highScore ? '<br><span style="color:#ffe600;">★ NEW HIGH SCORE ★</span>' : ''}
        `;
        playBtn.textContent = 'PLAY AGAIN';
        overlay.classList.remove('hidden');
    }

    function togglePause() {
        if (!gameRunning) return;
        paused = !paused;
        if (!paused) {
            lastDrop = performance.now();
        }
        if (window.NeonSFX) NeonSFX.pause();
    }

    // ===== Input =====
    const keyRepeat = {};
    const REPEAT_DELAY = 170;
    const REPEAT_RATE = 50;

    document.addEventListener('keydown', (e) => {
        if (!gameRunning && e.key !== 'Enter') return;

        switch (e.key) {
            case 'ArrowLeft':
            case 'Left':
                e.preventDefault();
                if (!keyRepeat['left']) {
                    moveLeft();
                    keyRepeat['left'] = {
                        timer: setTimeout(() => {
                            keyRepeat['left'].interval = setInterval(moveLeft, REPEAT_RATE);
                        }, REPEAT_DELAY)
                    };
                }
                break;
            case 'ArrowRight':
            case 'Right':
                e.preventDefault();
                if (!keyRepeat['right']) {
                    moveRight();
                    keyRepeat['right'] = {
                        timer: setTimeout(() => {
                            keyRepeat['right'].interval = setInterval(moveRight, REPEAT_RATE);
                        }, REPEAT_DELAY)
                    };
                }
                break;
            case 'ArrowDown':
            case 'Down':
                e.preventDefault();
                if (!keyRepeat['down']) {
                    softDrop();
                    keyRepeat['down'] = {
                        timer: setTimeout(() => {
                            keyRepeat['down'].interval = setInterval(softDrop, REPEAT_RATE);
                        }, REPEAT_DELAY)
                    };
                }
                break;
            case 'ArrowUp':
            case 'Up':
                e.preventDefault();
                rotate();
                break;
            case ' ':
                e.preventDefault();
                hardDrop();
                break;
            case 'p':
            case 'P':
            case 'Escape':
                e.preventDefault();
                togglePause();
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        let key = null;
        if (e.key === 'ArrowLeft' || e.key === 'Left') key = 'left';
        if (e.key === 'ArrowRight' || e.key === 'Right') key = 'right';
        if (e.key === 'ArrowDown' || e.key === 'Down') key = 'down';
        if (key && keyRepeat[key]) {
            clearTimeout(keyRepeat[key].timer);
            if (keyRepeat[key].interval) clearInterval(keyRepeat[key].interval);
            delete keyRepeat[key];
        }
    });

    // ===== Touch Controls — Canvas Gestures =====
    const isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // Prevent page scrolling on mobile during gameplay
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
        // Hide the old button controls
        const touchCtrlDiv = document.getElementById('touch-controls');
        if (touchCtrlDiv) touchCtrlDiv.style.display = 'none';
    }

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let touchMoved = false;
    let lastTouchMoveCol = 0; // track column-sized drags
    let longPressTimer = null;
    let longPressActive = false;
    let softDropInterval = null;

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameRunning || paused) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        touchMoved = false;
        lastTouchMoveCol = 0;
        longPressActive = false;

        // Long press = continuous soft drop
        longPressTimer = setTimeout(() => {
            longPressActive = true;
            softDropInterval = setInterval(() => {
                if (gameRunning && !paused && currentPiece) {
                    softDrop();
                }
            }, 60);
        }, 500);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!gameRunning || paused || !currentPiece) return;

        // If long press is active (soft-dropping), don't process horizontal movements
        if (longPressActive) return;

        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;

        // Cancel long press if user starts dragging
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        }

        // Calculate column moves based on drag distance
        const rect = canvas.getBoundingClientRect();
        const cellWidth = rect.width / COLS;
        const colDelta = Math.floor(dx / cellWidth);

        if (colDelta !== lastTouchMoveCol) {
            const diff = colDelta - lastTouchMoveCol;
            if (diff > 0) {
                for (let i = 0; i < diff; i++) moveRight();
            } else {
                for (let i = 0; i < -diff; i++) moveLeft();
            }
            lastTouchMoveCol = colDelta;
            touchMoved = true;
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        if (softDropInterval) { clearInterval(softDropInterval); softDropInterval = null; }

        if (!gameRunning || paused) return;
        if (longPressActive) { longPressActive = false; return; }

        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const elapsed = Date.now() - touchStartTime;

        if (!touchMoved && absDx < 15 && absDy < 15) {
            // Tap = rotate
            rotate();
            return;
        }

        // Fast swipe detection
        if (elapsed < 300 && absDy > 40) {
            if (dy > 0 && absDy > absDx) {
                // Swipe down = hard drop
                hardDrop();
                return;
            } else if (dy < 0 && absDy > absDx) {
                // Swipe up = rotate
                rotate();
                return;
            }
        }
        // No more slow-drag soft-drop — removed to prevent accidental single-block drops
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        if (softDropInterval) { clearInterval(softDropInterval); softDropInterval = null; }
        longPressActive = false;
    }, { passive: false });

    // ===== Mute Button =====
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

    // ===== Play Button =====
    playBtn.addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        startGame();
    });

    // ===== Initial Draw =====
    createBoard();
    drawBoard();

})();
