// ===== Bug Report — Neon Arcade =====
// In-app modal form — no login required.
// Reports are sent via email and copied to clipboard.
(function () {
    'use strict';

    const OWNER_EMAIL = 'mahammedanfalk@gmail.com';

    // Detect game name from URL
    function getGameName() {
        const path = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
        const folder = path.length > 1 ? path[path.length - 2] : (path[0] || 'hub');
        return folder.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    function getDeviceInfo() {
        const ua = navigator.userAgent;
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
        return `${isMobile ? 'Mobile' : 'Desktop'} | ${window.innerWidth}×${window.innerHeight} | ${navigator.platform || 'Unknown'}`;
    }

    // ===== Create Modal =====
    function createModal() {
        const overlay = document.createElement('div');
        overlay.id = 'bug-overlay';
        overlay.innerHTML = `
<div id="bug-modal">
    <button id="bug-close" aria-label="Close">✕</button>
    <h2 id="bug-title">🐛 Report a Bug</h2>
    <p id="bug-subtitle">Help us improve! No login needed.</p>
    <form id="bug-form">
        <label class="bug-label">Game</label>
        <input type="text" id="bug-game" class="bug-input" value="${getGameName()}" readonly>

        <label class="bug-label">What happened?</label>
        <textarea id="bug-desc" class="bug-input bug-textarea" placeholder="Describe the bug..." required></textarea>

        <label class="bug-label">Steps to reproduce (optional)</label>
        <textarea id="bug-steps" class="bug-input bug-textarea-sm" placeholder="1. Go to...\n2. Click on...\n3. See error"></textarea>

        <label class="bug-label">Severity</label>
        <div id="bug-severity">
            <button type="button" class="sev-btn" data-sev="low">😊 Minor</button>
            <button type="button" class="sev-btn active" data-sev="medium">😐 Medium</button>
            <button type="button" class="sev-btn" data-sev="high">😡 Major</button>
        </div>

        <label class="bug-label">Your name (optional)</label>
        <input type="text" id="bug-name" class="bug-input" placeholder="Anonymous">

        <button type="submit" id="bug-submit" class="bug-submit-btn">Submit Report</button>
    </form>
    <div id="bug-success" class="hidden">
        <div class="success-icon">✅</div>
        <h3>Thank you!</h3>
        <p>Your bug report has been submitted.</p>
        <div id="bug-actions">
            <button id="bug-email-btn" class="bug-action-btn">📧 Send via Email</button>
            <button id="bug-copy-btn" class="bug-action-btn">📋 Copy Report</button>
        </div>
        <button id="bug-done" class="bug-submit-btn" style="margin-top:12px;">Done</button>
    </div>
</div>`;

        // Styles
        const style = document.createElement('style');
        style.textContent = `
#bug-overlay {
    position: fixed; inset: 0; z-index: 100000;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px; opacity: 0; transition: opacity 0.3s ease;
}
#bug-overlay.show { opacity: 1; }
#bug-modal {
    background: linear-gradient(135deg, rgba(15,15,35,0.97), rgba(20,20,45,0.97));
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px; padding: 24px 22px; width: 100%; max-width: 380px;
    max-height: 85vh; overflow-y: auto; position: relative;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,45,117,0.08);
    transform: translateY(20px); transition: transform 0.3s ease;
}
#bug-overlay.show #bug-modal { transform: translateY(0); }
#bug-close {
    position: absolute; top: 12px; right: 14px;
    background: none; border: none; color: rgba(228,228,240,0.5);
    font-size: 18px; cursor: pointer; padding: 4px;
    transition: color 0.2s;
}
#bug-close:hover { color: #ff2d75; }
#bug-title {
    font-family: 'Orbitron', monospace, sans-serif; font-size: 1.1rem;
    letter-spacing: 0.08em; color: #ff2d75; margin-bottom: 2px;
    background: linear-gradient(135deg, #ff2d75, #ff8a00);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
}
#bug-subtitle {
    font-size: 0.65rem; color: rgba(228,228,240,0.4);
    margin-bottom: 14px;
}
.bug-label {
    font-family: 'Orbitron', monospace, sans-serif;
    font-size: 0.45rem; letter-spacing: 0.12em;
    color: rgba(228,228,240,0.5); display: block; margin-bottom: 4px;
    text-transform: uppercase;
}
.bug-input {
    width: 100%; padding: 8px 12px; margin-bottom: 10px;
    border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
    background: rgba(255,255,255,0.04); color: #e4e4f0;
    font-family: 'Inter', sans-serif; font-size: 0.75rem;
    outline: none; transition: border-color 0.2s;
    box-sizing: border-box;
}
.bug-input:focus { border-color: rgba(255,45,117,0.4); }
.bug-input[readonly] { opacity: 0.6; cursor: default; }
.bug-textarea { height: 70px; resize: vertical; }
.bug-textarea-sm { height: 50px; resize: vertical; }
#bug-severity {
    display: flex; gap: 6px; margin-bottom: 10px;
}
.sev-btn {
    flex: 1; padding: 6px 4px; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; background: rgba(255,255,255,0.03);
    color: rgba(228,228,240,0.6); cursor: pointer;
    font-size: 0.6rem; transition: all 0.2s;
    font-family: 'Inter', sans-serif;
}
.sev-btn:hover { border-color: rgba(255,45,117,0.3); }
.sev-btn.active {
    border-color: rgba(255,45,117,0.5);
    background: rgba(255,45,117,0.1);
    color: #ff2d75;
}
.bug-submit-btn {
    width: 100%; padding: 10px; border: 1px solid rgba(255,45,117,0.5);
    border-radius: 10px; background: rgba(255,45,117,0.12);
    color: #ff2d75; font-family: 'Orbitron', monospace, sans-serif;
    font-weight: 700; font-size: 0.6rem; letter-spacing: 0.1em;
    cursor: pointer; transition: all 0.3s; margin-top: 4px;
}
.bug-submit-btn:hover {
    background: rgba(255,45,117,0.22);
    box-shadow: 0 0 20px rgba(255,45,117,0.2);
}
#bug-success { text-align: center; }
#bug-success h3 {
    font-family: 'Orbitron', monospace, sans-serif;
    color: #00ff88; font-size: 1rem; margin: 8px 0 4px;
}
#bug-success p { font-size: 0.7rem; color: rgba(228,228,240,0.5); margin-bottom: 12px; }
.success-icon { font-size: 2rem; }
#bug-actions { display: flex; gap: 8px; margin-top: 8px; }
.bug-action-btn {
    flex: 1; padding: 8px 6px; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; background: rgba(255,255,255,0.04);
    color: rgba(228,228,240,0.7); cursor: pointer;
    font-size: 0.6rem; transition: all 0.2s;
    font-family: 'Inter', sans-serif;
}
.bug-action-btn:hover {
    border-color: rgba(0,255,136,0.3);
    color: #00ff88;
}
.hidden { display: none !important; }
`;
        document.head.appendChild(style);
        document.body.appendChild(overlay);
        return overlay;
    }

    // ===== Logic =====
    let modal = null;
    let severity = 'medium';
    let lastReport = '';

    function openModal() {
        if (!modal) modal = createModal();

        // Reset
        const form = document.getElementById('bug-form');
        const success = document.getElementById('bug-success');
        form.classList.remove('hidden');
        success.classList.add('hidden');
        document.getElementById('bug-desc').value = '';
        document.getElementById('bug-steps').value = '';
        document.getElementById('bug-name').value = '';
        document.getElementById('bug-game').value = getGameName();
        severity = 'medium';
        document.querySelectorAll('.sev-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.sev === 'medium');
        });

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Wire up events (only once)
        if (!modal._wired) {
            modal._wired = true;

            document.getElementById('bug-close').addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

            document.querySelectorAll('.sev-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    severity = btn.dataset.sev;
                    document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if (window.NeonSFX) NeonSFX.click();
                });
            });

            document.getElementById('bug-form').addEventListener('submit', (e) => {
                e.preventDefault();
                submitReport();
            });

            document.getElementById('bug-email-btn').addEventListener('click', sendEmail);
            document.getElementById('bug-copy-btn').addEventListener('click', copyReport);
            document.getElementById('bug-done').addEventListener('click', closeModal);
        }
    }

    function closeModal() {
        if (modal) modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    function buildReport() {
        const game = document.getElementById('bug-game').value;
        const desc = document.getElementById('bug-desc').value.trim();
        const steps = document.getElementById('bug-steps').value.trim();
        const name = document.getElementById('bug-name').value.trim() || 'Anonymous';
        const sevLabels = { low: 'Minor', medium: 'Medium', high: 'Major' };
        const device = getDeviceInfo();
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

        return `BUG REPORT — Neon Arcade
========================
Game: ${game}
Severity: ${sevLabels[severity]}
Reporter: ${name}
Date: ${timestamp}
Device: ${device}
URL: ${window.location.href}

DESCRIPTION:
${desc}
${steps ? `\nSTEPS TO REPRODUCE:\n${steps}` : ''}
========================`;
    }

    function submitReport() {
        lastReport = buildReport();

        // Store locally as backup
        try {
            const reports = JSON.parse(localStorage.getItem('neon-bug-reports') || '[]');
            reports.push({
                game: document.getElementById('bug-game').value,
                desc: document.getElementById('bug-desc').value.trim(),
                steps: document.getElementById('bug-steps').value.trim(),
                severity: severity,
                reporter: document.getElementById('bug-name').value.trim() || 'Anonymous',
                device: getDeviceInfo(),
                url: window.location.href,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('neon-bug-reports', JSON.stringify(reports));
        } catch (e) { /* ignore */ }

        // Show success
        document.getElementById('bug-form').classList.add('hidden');
        document.getElementById('bug-success').classList.remove('hidden');
        if (window.NeonSFX) NeonSFX.win();
    }

    function sendEmail() {
        const subject = encodeURIComponent(`[Bug] ${document.getElementById('bug-game').value} — Neon Arcade`);
        const body = encodeURIComponent(lastReport);
        window.open(`mailto:${OWNER_EMAIL}?subject=${subject}&body=${body}`, '_self');
        if (window.NeonSFX) NeonSFX.click();
    }

    function copyReport() {
        navigator.clipboard.writeText(lastReport).then(() => {
            const btn = document.getElementById('bug-copy-btn');
            btn.textContent = '✅ Copied!';
            setTimeout(() => { btn.textContent = '📋 Copy Report'; }, 2000);
        }).catch(() => {
            const el = document.createElement('textarea');
            el.value = lastReport;
            document.body.appendChild(el); el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            const btn = document.getElementById('bug-copy-btn');
            btn.textContent = '✅ Copied!';
            setTimeout(() => { btn.textContent = '📋 Copy Report'; }, 2000);
        });
        if (window.NeonSFX) NeonSFX.click();
    }

    // ===== Floating Button =====
    function createBugButton() {
        const btn = document.createElement('button');
        btn.id = 'bug-report-btn';
        btn.title = 'Report a Bug';
        btn.innerHTML = '🐛';
        btn.setAttribute('aria-label', 'Report a Bug');

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
            openModal();
        });

        document.body.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createBugButton);
    } else {
        createBugButton();
    }
})();
