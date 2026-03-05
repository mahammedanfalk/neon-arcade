// ===== Bug Report — Neon Arcade =====
// A floating 🐛 button that opens a pre-filled GitHub Issue.
// Include this script in every page AFTER the DOM is ready.
(function () {
    'use strict';

    const REPO = 'mahammedanfalk/neon-arcade';

    // Detect game name from page title or URL
    function getGameName() {
        const path = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
        const folder = path.length > 1 ? path[path.length - 2] : 'hub';
        const pretty = folder.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return pretty || 'Hub';
    }

    // Collect device & browser info
    function getDeviceInfo() {
        const ua = navigator.userAgent;
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
        const platform = navigator.platform || 'Unknown';
        const screen = `${window.screen.width}×${window.screen.height}`;
        const viewport = `${window.innerWidth}×${window.innerHeight}`;
        return { ua, isMobile, platform, screen, viewport };
    }

    function buildIssueUrl(description) {
        const game = getGameName();
        const info = getDeviceInfo();
        const title = encodeURIComponent(`[Bug] ${game}: `);
        const body = encodeURIComponent(
            `### Game
${game}

### Description
${description || '_Describe the bug here..._'}

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
_What should have happened?_

### Device Info
| | |
|-|-|
| **Platform** | ${info.platform} |
| **Mobile** | ${info.isMobile ? 'Yes' : 'No'} |
| **Screen** | ${info.screen} |
| **Viewport** | ${info.viewport} |
| **User Agent** | ${info.ua} |
| **URL** | ${window.location.href} |
`
        );
        return `https://github.com/${REPO}/issues/new?title=${title}&body=${body}&labels=bug`;
    }

    // Create the floating button
    function createBugButton() {
        const btn = document.createElement('button');
        btn.id = 'bug-report-btn';
        btn.title = 'Report a Bug';
        btn.innerHTML = '🐛';
        btn.setAttribute('aria-label', 'Report a Bug');

        // Styles
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            right: '16px',
            zIndex: '99999',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 45, 117, 0.4)',
            background: 'rgba(15, 15, 35, 0.9)',
            backdropFilter: 'blur(8px)',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 12px rgba(255, 45, 117, 0.15)',
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.boxShadow = '0 4px 20px rgba(255, 45, 117, 0.35)';
            btn.style.borderColor = 'rgba(255, 45, 117, 0.7)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 2px 12px rgba(255, 45, 117, 0.15)';
            btn.style.borderColor = 'rgba(255, 45, 117, 0.4)';
        });

        btn.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            window.open(buildIssueUrl(), '_blank');
        });

        document.body.appendChild(btn);
    }

    // Init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createBugButton);
    } else {
        createBugButton();
    }
})();
