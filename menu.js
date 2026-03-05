// ===== Neon Arcade — Menu Interactions =====
(function () {
    'use strict';

    // ===== Favorites (localStorage) =====
    const FAV_KEY = 'neon-arcade-favorites';
    let favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');

    function saveFavorites() {
        localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
    }

    function toggleFavorite(gameId) {
        const idx = favorites.indexOf(gameId);
        if (idx >= 0) {
            favorites.splice(idx, 1);
        } else {
            favorites.push(gameId);
        }
        saveFavorites();
        updateFavButtons();
        // If fav filter is active, re-filter
        const activeFilter = document.querySelector('.filter-btn.active');
        if (activeFilter && activeFilter.dataset.filter === 'fav') {
            applyFilter('fav');
        }
    }

    function updateFavButtons() {
        document.querySelectorAll('.fav-btn').forEach(btn => {
            const gameId = btn.dataset.game;
            const isFav = favorites.includes(gameId);
            btn.classList.toggle('fav-active', isFav);
            btn.textContent = isFav ? '♥' : '♡';
        });
    }

    // ===== Filtering =====
    let currentFilter = 'all';

    function applyFilter(filter) {
        currentFilter = filter;
        const grid = document.getElementById('games-grid');
        if (!grid) return;

        const cards = Array.from(grid.querySelectorAll('.game-card'));

        // Sort: favorites first (unless filtering by specific mode)
        if (filter === 'all' || filter === 'fav') {
            cards.sort((a, b) => {
                const aFav = favorites.includes(a.querySelector('.fav-btn')?.dataset.game) ? 0 : 1;
                const bFav = favorites.includes(b.querySelector('.fav-btn')?.dataset.game) ? 0 : 1;
                return aFav - bFav;
            });
            // Re-append in sorted order
            cards.forEach(card => grid.appendChild(card));
        }

        cards.forEach(card => {
            const modes = (card.dataset.modes || '').split(' ');
            let show = true;

            if (filter === 'fav') {
                const gameId = card.querySelector('.fav-btn')?.dataset.game;
                show = favorites.includes(gameId);
            } else if (filter !== 'all') {
                show = modes.includes(filter);
            }

            card.style.display = show ? '' : 'none';
            if (show) {
                card.style.opacity = '0';
                card.style.transform = 'translateY(10px)';
                requestAnimationFrame(() => {
                    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    card.style.opacity = '1';
                    card.style.transform = '';
                });
            }
        });
    }

    // ===== Init =====
    // Tilt effect + hover SFX on playable cards
    document.querySelectorAll('.game-card.playable').forEach((card) => {
        card.addEventListener('mouseenter', () => {
            if (window.NeonSFX) NeonSFX.hover();
        });

        card.addEventListener('click', (e) => {
            // Don't navigate if clicking fav button
            if (e.target.classList.contains('fav-btn')) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (window.NeonSFX) NeonSFX.click();
        });

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const rotateX = ((y - cy) / cy) * -6;
            const rotateY = ((x - cx) / cx) * 6;
            card.style.transform = `translateY(-6px) scale(1.02) perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });

    // Tooltip + locked SFX on locked cards
    document.querySelectorAll('.game-card.locked').forEach((card) => {
        card.addEventListener('mouseenter', () => {
            if (window.NeonSFX) NeonSFX.hover();
        });

        card.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.locked();
            const title = card.querySelector('.card-title').textContent;
            showToast(`${title} is coming soon! Stay tuned 🚀`);
        });
    });

    // Mute button
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

    // Favorite buttons
    document.querySelectorAll('.fav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.NeonSFX) NeonSFX.click();
            toggleFavorite(btn.dataset.game);
        });
    });

    updateFavButtons();

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilter(btn.dataset.filter);
        });
    });

    // Initial sort: favorites first
    applyFilter('all');

    // Simple toast notification
    function showToast(message) {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%) translateY(20px)',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '0.7rem',
            letterSpacing: '0.06em',
            padding: '12px 28px',
            borderRadius: '50px',
            background: 'rgba(14, 14, 38, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#b44dff',
            border: '1px solid rgba(180, 77, 255, 0.3)',
            boxShadow: '0 0 20px rgba(180, 77, 255, 0.15)',
            zIndex: '9999',
            opacity: '0',
            transition: 'all 0.35s ease',
        });

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => toast.remove(), 350);
        }, 2500);
    }
})();
