// ===== Neon 2048 — Game Engine =====
(function () {
    'use strict';

    const SIZE = 4;
    const gridEl = document.getElementById('grid');
    const scoreEl = document.getElementById('score-val');
    const highEl = document.getElementById('high-val');
    const overlay = document.getElementById('overlay');
    const overlayIcon = document.getElementById('overlay-icon');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayInfo = document.getElementById('overlay-info');
    const playBtn = document.getElementById('play-btn');
    const newGameBtn = document.getElementById('new-game-btn');

    let grid = [];
    let score = 0;
    let highScore = parseInt(localStorage.getItem('2048-high') || '0', 10);
    let gameOver = false;
    let won = false;
    let continueAfterWin = false;

    highEl.textContent = highScore.toLocaleString();

    // ===== Grid Logic =====
    function createGrid() {
        grid = [];
        for (let r = 0; r < SIZE; r++) {
            grid.push(new Array(SIZE).fill(0));
        }
    }

    function addRandomTile() {
        const empty = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] === 0) empty.push({ r, c });
            }
        }
        if (empty.length === 0) return false;
        const cell = empty[Math.floor(Math.random() * empty.length)];
        grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
        return cell;
    }

    function slide(row) {
        // Remove zeros
        let arr = row.filter(v => v !== 0);
        let merged = false;
        // Merge
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) {
                arr[i] *= 2;
                score += arr[i];
                arr.splice(i + 1, 1);
                merged = true;
            }
        }
        // Pad with zeros
        while (arr.length < SIZE) arr.push(0);
        return { result: arr, merged };
    }

    function moveLeft() {
        let moved = false;
        for (let r = 0; r < SIZE; r++) {
            const { result, merged } = slide(grid[r]);
            if (grid[r].some((v, i) => v !== result[i])) moved = true;
            grid[r] = result;
        }
        return moved;
    }

    function moveRight() {
        let moved = false;
        for (let r = 0; r < SIZE; r++) {
            const reversed = [...grid[r]].reverse();
            const { result } = slide(reversed);
            const newRow = result.reverse();
            if (grid[r].some((v, i) => v !== newRow[i])) moved = true;
            grid[r] = newRow;
        }
        return moved;
    }

    function moveUp() {
        let moved = false;
        for (let c = 0; c < SIZE; c++) {
            const col = [];
            for (let r = 0; r < SIZE; r++) col.push(grid[r][c]);
            const { result } = slide(col);
            for (let r = 0; r < SIZE; r++) {
                if (grid[r][c] !== result[r]) moved = true;
                grid[r][c] = result[r];
            }
        }
        return moved;
    }

    function moveDown() {
        let moved = false;
        for (let c = 0; c < SIZE; c++) {
            const col = [];
            for (let r = 0; r < SIZE; r++) col.push(grid[r][c]);
            col.reverse();
            const { result } = slide(col);
            const newCol = result.reverse();
            for (let r = 0; r < SIZE; r++) {
                if (grid[r][c] !== newCol[r]) moved = true;
                grid[r][c] = newCol[r];
            }
        }
        return moved;
    }

    function canMove() {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] === 0) return true;
                if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return true;
                if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
            }
        }
        return false;
    }

    function hasWon() {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] >= 2048) return true;
            }
        }
        return false;
    }

    // ===== Rendering =====
    function buildCells() {
        gridEl.innerHTML = '';
        gridEl.style.position = 'relative';
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                gridEl.appendChild(cell);
            }
        }
    }

    function renderTiles(newTilePos, mergedPositions) {
        // Remove old tiles
        gridEl.querySelectorAll('.tile').forEach(t => t.remove());

        const gap = 8;
        const style = getComputedStyle(document.documentElement);
        const cellSize = parseInt(style.getPropertyValue('--cell-size')) || 80;

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] === 0) continue;
                const val = grid[r][c];
                const tile = document.createElement('div');

                let tileClass = 'tile';
                if (val <= 2048) {
                    tileClass += ` tile-${val}`;
                } else {
                    tileClass += ' tile-super';
                }

                // Animation classes
                if (newTilePos && newTilePos.r === r && newTilePos.c === c) {
                    tileClass += ' new';
                }
                if (mergedPositions && mergedPositions.some(p => p.r === r && p.c === c)) {
                    tileClass += ' merged';
                }

                tile.className = tileClass;
                tile.textContent = val;
                tile.style.top = r * (cellSize + gap) + 'px';
                tile.style.left = c * (cellSize + gap) + 'px';
                gridEl.appendChild(tile);
            }
        }
    }

    function updateHUD() {
        scoreEl.textContent = score.toLocaleString();
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('2048-high', highScore.toString());
        }
        highEl.textContent = highScore.toLocaleString();
    }

    // ===== Move Handler =====
    function doMove(direction) {
        if (gameOver) return;

        // Snapshot for merge detection
        const before = grid.map(r => [...r]);

        let moved = false;
        switch (direction) {
            case 'left': moved = moveLeft(); break;
            case 'right': moved = moveRight(); break;
            case 'up': moved = moveUp(); break;
            case 'down': moved = moveDown(); break;
        }

        if (!moved) return;

        // Find merged positions
        const mergedPositions = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] > 0 && grid[r][c] !== before[r][c] && before[r][c] > 0) {
                    mergedPositions.push({ r, c });
                }
            }
        }

        if (mergedPositions.length > 0) {
            if (window.NeonSFX) NeonSFX.place();
        } else {
            if (window.NeonSFX) NeonSFX.move();
        }

        const newPos = addRandomTile();
        updateHUD();
        renderTiles(newPos, mergedPositions);

        // Check win
        if (!won && !continueAfterWin && hasWon()) {
            won = true;
            showWin();
            return;
        }

        // Check game over
        if (!canMove()) {
            gameOver = true;
            setTimeout(() => showGameOver(), 300);
        }
    }

    // ===== Overlays =====
    function showWin() {
        overlayIcon.textContent = '🏆';
        overlayTitle.textContent = 'YOU WIN!';
        overlayInfo.innerHTML = `
            Score: <strong style="color:#00ff88">${score.toLocaleString()}</strong><br>
            <span style="color:#ffe600;">You reached 2048!</span>
        `;
        playBtn.textContent = 'KEEP GOING';
        overlay.classList.remove('hidden');
        if (window.NeonSFX) NeonSFX.win();
    }

    function showGameOver() {
        overlayIcon.textContent = '💀';
        overlayTitle.textContent = 'GAME OVER';
        overlayInfo.innerHTML = `
            Score: <strong style="color:#00ff88">${score.toLocaleString()}</strong>
            ${score >= highScore ? '<br><span style="color:#ffe600;">★ NEW HIGH SCORE ★</span>' : ''}
        `;
        playBtn.textContent = 'PLAY AGAIN';
        overlay.classList.remove('hidden');
        if (window.NeonSFX) NeonSFX.gameOver();
        if (window.NeonLeaderboard) NeonLeaderboard.submit('2048', score, 'Player');
    }

    // ===== Start =====
    function startGame(continueMode) {
        if (continueMode) {
            continueAfterWin = true;
            overlay.classList.add('hidden');
            return;
        }
        score = 0;
        gameOver = false;
        won = false;
        continueAfterWin = false;
        createGrid();
        buildCells();
        addRandomTile();
        addRandomTile();
        updateHUD();
        renderTiles();
        overlay.classList.add('hidden');
        if (window.NeonSFX) NeonSFX.gameStart();
    }

    // ===== Input =====
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft': case 'Left': e.preventDefault(); doMove('left'); break;
            case 'ArrowRight': case 'Right': e.preventDefault(); doMove('right'); break;
            case 'ArrowUp': case 'Up': e.preventDefault(); doMove('up'); break;
            case 'ArrowDown': case 'Down': e.preventDefault(); doMove('down'); break;
        }
    });

    // Swipe support
    let touchStartX = 0, touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        e.preventDefault(); // prevent scroll and pull-to-refresh
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (Math.max(absDx, absDy) < 30) return; // too short

        e.preventDefault();
        if (absDx > absDy) {
            doMove(dx > 0 ? 'right' : 'left');
        } else {
            doMove(dy > 0 ? 'down' : 'up');
        }
    }, { passive: false });

    // Play button
    playBtn.addEventListener('click', () => {
        if (window.NeonSFX) NeonSFX.click();
        if (won && !continueAfterWin) {
            startGame(true);
        } else {
            startGame(false);
        }
    });

    // New game button
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            startGame(false);
        });
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

    // Initial state
    createGrid();
    buildCells();

})();
