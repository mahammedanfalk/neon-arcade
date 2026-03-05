// ===== Leaderboard — Neon Arcade =====
// localStorage-based high-score tracking with a neon leaderboard modal.
// Usage: NeonLeaderboard.submit('snake', 42); NeonLeaderboard.show('snake');
(function () {
    'use strict';

    const LB_KEY = 'neon-arcade-leaderboard';
    const MAX_ENTRIES = 10;

    function getAll() {
        try { return JSON.parse(localStorage.getItem(LB_KEY) || '{}'); } catch { return {}; }
    }

    function save(data) {
        localStorage.setItem(LB_KEY, JSON.stringify(data));
    }

    // Submit a score. Returns placement (1-based) or null if not a high score.
    function submitScore(gameId, score, playerName) {
        const data = getAll();
        if (!data[gameId]) data[gameId] = [];

        const entry = {
            score: score,
            name: playerName || 'Player',
            date: new Date().toLocaleDateString(),
        };

        data[gameId].push(entry);
        // Sort descending by score
        data[gameId].sort((a, b) => b.score - a.score);
        // Keep top N
        data[gameId] = data[gameId].slice(0, MAX_ENTRIES);
        save(data);

        const placement = data[gameId].findIndex(e => e === entry);
        return placement >= 0 ? placement + 1 : null;
    }

    function getScores(gameId) {
        const data = getAll();
        return data[gameId] || [];
    }

    function getHighScore(gameId) {
        const scores = getScores(gameId);
        return scores.length > 0 ? scores[0].score : 0;
    }

    // ===== Leaderboard Modal =====
    let modalEl = null;
    let stylesAdded = false;

    function addStyles() {
        if (stylesAdded) return;
        stylesAdded = true;
        const style = document.createElement('style');
        style.textContent = `
.lb-overlay {
    position: fixed; inset: 0; z-index: 100001;
    background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px; opacity: 0; transition: opacity 0.3s ease;
    pointer-events: none;
}
.lb-overlay.show { opacity: 1; pointer-events: auto; }
.lb-modal {
    background: linear-gradient(135deg, rgba(15,15,35,0.97), rgba(20,20,45,0.97));
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px; padding: 24px 22px; width: 100%; max-width: 380px;
    max-height: 85vh; overflow-y: auto; position: relative;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,255,136,0.08);
    transform: translateY(20px); transition: transform 0.3s ease;
}
.lb-overlay.show .lb-modal { transform: translateY(0); }
.lb-close {
    position: absolute; top: 12px; right: 14px;
    background: none; border: none; color: rgba(228,228,240,0.5);
    font-size: 18px; cursor: pointer; padding: 4px; transition: color 0.2s;
}
.lb-close:hover { color: #ff2d75; }
.lb-title {
    font-family: 'Orbitron', monospace, sans-serif; font-size: 1.1rem;
    letter-spacing: 0.08em; margin-bottom: 4px;
    background: linear-gradient(135deg, #ffe600, #ff8a00);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
}
.lb-game-name {
    font-size: 0.6rem; color: rgba(228,228,240,0.4); margin-bottom: 16px;
    font-family: 'Orbitron', monospace, sans-serif; letter-spacing: 0.1em;
}
.lb-table {
    width: 100%; border-collapse: collapse;
}
.lb-table th {
    font-family: 'Orbitron', monospace, sans-serif;
    font-size: 0.4rem; letter-spacing: 0.12em;
    color: rgba(228,228,240,0.4); text-align: left;
    padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.06);
    text-transform: uppercase;
}
.lb-table td {
    font-family: 'Inter', sans-serif; font-size: 0.7rem;
    color: rgba(228,228,240,0.7); padding: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.03);
}
.lb-table tr:first-child td { color: #ffe600; font-weight: 600; }
.lb-table tr:nth-child(2) td { color: #c0c0c0; }
.lb-table tr:nth-child(3) td { color: #cd7f32; }
.lb-rank { font-family: 'Orbitron', monospace, sans-serif; font-size: 0.6rem; font-weight: 700; }
.lb-score-val { font-family: 'Orbitron', monospace, sans-serif; font-weight: 700; color: #00ff88 !important; }
.lb-empty {
    text-align: center; padding: 30px 0; color: rgba(228,228,240,0.3);
    font-family: 'Inter', sans-serif; font-size: 0.75rem;
}
.lb-medals { font-size: 1.1rem; }
`;
        document.head.appendChild(style);
    }

    function buildModal() {
        addStyles();
        const overlay = document.createElement('div');
        overlay.className = 'lb-overlay';
        overlay.innerHTML = `
<div class="lb-modal">
    <button class="lb-close" aria-label="Close">✕</button>
    <h2 class="lb-title">🏆 Leaderboard</h2>
    <p class="lb-game-name" id="lb-game-name"></p>
    <div id="lb-content"></div>
</div>`;
        overlay.querySelector('.lb-close').addEventListener('click', hideModal);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) hideModal(); });
        document.body.appendChild(overlay);
        return overlay;
    }

    function showModal(gameId, gameName) {
        if (!modalEl) modalEl = buildModal();

        const nameEl = modalEl.querySelector('#lb-game-name');
        nameEl.textContent = gameName || gameId.toUpperCase();

        const content = modalEl.querySelector('#lb-content');
        const scores = getScores(gameId);

        if (scores.length === 0) {
            content.innerHTML = '<div class="lb-empty">No scores yet — play to set the first record! 🎮</div>';
        } else {
            const medals = ['🥇', '🥈', '🥉'];
            let html = `<table class="lb-table">
                <thead><tr><th>#</th><th>Player</th><th>Score</th><th>Date</th></tr></thead>
                <tbody>`;
            scores.forEach((e, i) => {
                const rank = i < 3 ? `<span class="lb-medals">${medals[i]}</span>` : `<span class="lb-rank">${i + 1}</span>`;
                html += `<tr>
                    <td>${rank}</td>
                    <td>${e.name}</td>
                    <td class="lb-score-val">${e.score.toLocaleString()}</td>
                    <td>${e.date}</td>
                </tr>`;
            });
            html += '</tbody></table>';
            content.innerHTML = html;
        }

        modalEl.classList.add('show');
    }

    function hideModal() {
        if (modalEl) modalEl.classList.remove('show');
    }

    // ===== Public API =====
    window.NeonLeaderboard = {
        submit: submitScore,
        getScores: getScores,
        getHighScore: getHighScore,
        show: showModal,
        hide: hideModal,
    };
})();
