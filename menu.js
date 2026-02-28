// ===== Neon Arcade — Menu Interactions =====
(function () {
    'use strict';

    // Tilt effect + hover SFX on playable cards
    document.querySelectorAll('.game-card.playable').forEach((card) => {
        card.addEventListener('mouseenter', () => {
            if (window.NeonSFX) NeonSFX.hover();
        });

        card.addEventListener('click', () => {
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
