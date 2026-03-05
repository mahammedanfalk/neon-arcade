// ===== Feedback System — Neon Arcade =====
// Bug Report + Suggestion modals. No login required.
// Submits silently via Formsubmit.co → delivered to owner's email.
(function () {
    'use strict';

    const _e = ['mahammedanfalk', 'gmail.com'];
    const ENDPOINT = 'https://formsubmit.co/ajax/' + _e.join('@');

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

    // ===== Keyboard trap: stop game from capturing keys while modal is open =====
    let modalOpen = false;
    document.addEventListener('keydown', (e) => {
        if (modalOpen) e.stopPropagation();
    }, true); // capture phase — fires BEFORE game listeners

    document.addEventListener('keyup', (e) => {
        if (modalOpen) e.stopPropagation();
    }, true);

    document.addEventListener('keypress', (e) => {
        if (modalOpen) e.stopPropagation();
    }, true);

    // ===== Create shared styles once =====
    let stylesAdded = false;
    function addStyles() {
        if (stylesAdded) return;
        stylesAdded = true;
        const style = document.createElement('style');
        style.textContent = `
.fb-overlay {
    position: fixed; inset: 0; z-index: 100000;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px; opacity: 0; transition: opacity 0.3s ease;
    pointer-events: none;
}
.fb-overlay.show { opacity: 1; pointer-events: auto; }
.fb-modal {
    background: linear-gradient(135deg, rgba(15,15,35,0.97), rgba(20,20,45,0.97));
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px; padding: 24px 22px; width: 100%; max-width: 380px;
    max-height: 85vh; overflow-y: auto; position: relative;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,45,117,0.08);
    transform: translateY(20px); transition: transform 0.3s ease;
}
.fb-overlay.show .fb-modal { transform: translateY(0); }
.fb-close {
    position: absolute; top: 12px; right: 14px;
    background: none; border: none; color: rgba(228,228,240,0.5);
    font-size: 18px; cursor: pointer; padding: 4px; transition: color 0.2s;
}
.fb-close:hover { color: #ff2d75; }
.fb-title {
    font-family: 'Orbitron', monospace, sans-serif; font-size: 1.1rem;
    letter-spacing: 0.08em; margin-bottom: 2px;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
}
.fb-title.bug-gradient { background: linear-gradient(135deg, #ff2d75, #ff8a00); -webkit-background-clip: text; background-clip: text; }
.fb-title.sug-gradient { background: linear-gradient(135deg, #00d4ff, #b44dff); -webkit-background-clip: text; background-clip: text; }
.fb-subtitle {
    font-size: 0.65rem; color: rgba(228,228,240,0.4); margin-bottom: 14px;
}
.fb-label {
    font-family: 'Orbitron', monospace, sans-serif;
    font-size: 0.45rem; letter-spacing: 0.12em;
    color: rgba(228,228,240,0.5); display: block; margin-bottom: 4px;
    text-transform: uppercase;
}
.fb-input {
    width: 100%; padding: 8px 12px; margin-bottom: 10px;
    border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
    background: rgba(255,255,255,0.04); color: #e4e4f0;
    font-family: 'Inter', sans-serif; font-size: 0.75rem;
    outline: none; transition: border-color 0.2s; box-sizing: border-box;
}
.fb-input:focus { border-color: rgba(0,212,255,0.4); }
.fb-input[readonly] { opacity: 0.6; cursor: default; }
.fb-textarea { height: 70px; resize: vertical; }
.fb-textarea-sm { height: 50px; resize: vertical; }
.fb-sev { display: flex; gap: 6px; margin-bottom: 10px; }
.sev-btn {
    flex: 1; padding: 6px 4px; border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; background: rgba(255,255,255,0.03);
    color: rgba(228,228,240,0.6); cursor: pointer;
    font-size: 0.6rem; transition: all 0.2s; font-family: 'Inter', sans-serif;
}
.sev-btn:hover { border-color: rgba(255,45,117,0.3); }
.sev-btn.active {
    border-color: rgba(255,45,117,0.5);
    background: rgba(255,45,117,0.1); color: #ff2d75;
}
.fb-submit-btn {
    width: 100%; padding: 10px; border-radius: 10px;
    font-family: 'Orbitron', monospace, sans-serif;
    font-weight: 700; font-size: 0.6rem; letter-spacing: 0.1em;
    cursor: pointer; transition: all 0.3s; margin-top: 4px;
}
.fb-submit-btn.bug-btn {
    border: 1px solid rgba(255,45,117,0.5);
    background: rgba(255,45,117,0.12); color: #ff2d75;
}
.fb-submit-btn.bug-btn:hover {
    background: rgba(255,45,117,0.22);
    box-shadow: 0 0 20px rgba(255,45,117,0.2);
}
.fb-submit-btn.sug-btn {
    border: 1px solid rgba(0,212,255,0.5);
    background: rgba(0,212,255,0.12); color: #00d4ff;
}
.fb-submit-btn.sug-btn:hover {
    background: rgba(0,212,255,0.22);
    box-shadow: 0 0 20px rgba(0,212,255,0.2);
}
.fb-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.fb-success, .fb-error { text-align: center; }
.fb-success h3 {
    font-family: 'Orbitron', monospace, sans-serif;
    color: #00ff88; font-size: 1rem; margin: 8px 0 4px;
}
.fb-error h3 {
    font-family: 'Orbitron', monospace, sans-serif;
    color: #ff2d75; font-size: 1rem; margin: 8px 0 4px;
}
.fb-success p, .fb-error p {
    font-size: 0.7rem; color: rgba(228,228,240,0.5); margin-bottom: 4px;
}
.fb-icon { font-size: 2rem; }
.hidden { display: none !important; }
.fb-floating-wrap {
    position: fixed; bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    right: 16px; z-index: 99999; display: flex; flex-direction: column;
    gap: 8px; align-items: flex-end;
}
.fb-float-btn {
    width: 44px; height: 44px; border-radius: 50%;
    border: 1px solid rgba(255,45,117,0.4);
    background: rgba(15,15,35,0.9); backdrop-filter: blur(8px);
    font-size: 20px; cursor: pointer; display: flex;
    align-items: center; justify-content: center;
    transition: all 0.3s ease;
    box-shadow: 0 2px 12px rgba(255,45,117,0.15);
}
.fb-float-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 20px rgba(255,45,117,0.35);
    border-color: rgba(255,45,117,0.7);
}
.fb-float-btn.sug-float {
    border-color: rgba(0,212,255,0.4);
    box-shadow: 0 2px 12px rgba(0,212,255,0.15);
}
.fb-float-btn.sug-float:hover {
    box-shadow: 0 4px 20px rgba(0,212,255,0.35);
    border-color: rgba(0,212,255,0.7);
}
`;
        document.head.appendChild(style);
    }

    // ===== Generic Modal Builder =====
    function buildModal(type) {
        const isBug = type === 'bug';
        const overlay = document.createElement('div');
        overlay.className = 'fb-overlay';
        overlay.dataset.type = type;

        const gameName = getGameName();
        const titleText = isBug ? '🐛 Report a Bug' : '💡 Suggest a Feature';
        const subtitleText = isBug ? 'Help us improve! No account needed.' : 'Got an idea? We\'d love to hear it!';
        const gradClass = isBug ? 'bug-gradient' : 'sug-gradient';
        const btnClass = isBug ? 'bug-btn' : 'sug-btn';

        overlay.innerHTML = `
<div class="fb-modal">
    <button class="fb-close" aria-label="Close">✕</button>
    <h2 class="fb-title ${gradClass}">${titleText}</h2>
    <p class="fb-subtitle">${subtitleText}</p>
    <form class="fb-form">
        <label class="fb-label">Game / Page</label>
        <input type="text" class="fb-input fb-game" value="${gameName}" readonly>

        <label class="fb-label">${isBug ? 'What happened?' : 'Your idea'}</label>
        <textarea class="fb-input fb-textarea fb-desc" placeholder="${isBug ? 'Describe the bug...' : 'Describe your suggestion...'}" required></textarea>

        ${isBug ? `
        <label class="fb-label">Steps to reproduce (optional)</label>
        <textarea class="fb-input fb-textarea-sm fb-steps" placeholder="1. Go to...\n2. Click on...\n3. See error"></textarea>

        <label class="fb-label">Severity</label>
        <div class="fb-sev">
            <button type="button" class="sev-btn" data-sev="low">😊 Minor</button>
            <button type="button" class="sev-btn active" data-sev="medium">😐 Medium</button>
            <button type="button" class="sev-btn" data-sev="high">😡 Major</button>
        </div>
        ` : ''}

        <label class="fb-label">Your name (optional)</label>
        <input type="text" class="fb-input fb-name" placeholder="Anonymous">

        <button type="submit" class="fb-submit-btn ${btnClass} fb-submit">
            <span class="fb-submit-text">${isBug ? 'Submit Report' : 'Send Suggestion'}</span>
            <span class="fb-submit-spin hidden">⏳ Sending...</span>
        </button>
    </form>
    <div class="fb-success hidden">
        <div class="fb-icon">✅</div>
        <h3>Thank you!</h3>
        <p>${isBug ? 'Your bug report has been sent.' : 'Suggestion received — we appreciate it!'}</p>
        <button class="fb-submit-btn ${btnClass} fb-done-btn" style="margin-top:12px;border-color:rgba(0,255,136,0.5);color:#00ff88;background:rgba(0,255,136,0.1);">Done</button>
    </div>
    <div class="fb-error hidden">
        <div class="fb-icon">❌</div>
        <h3>Oops!</h3>
        <p>Could not send. Report copied to clipboard instead.</p>
        <button class="fb-submit-btn ${btnClass} fb-retry-btn" style="margin-top:12px;">Try Again</button>
    </div>
</div>`;
        return overlay;
    }

    // ===== Modal Controller =====
    const modals = {};

    function openFeedbackModal(type) {
        addStyles();
        modalOpen = true;

        if (!modals[type]) {
            modals[type] = buildModal(type);
            document.body.appendChild(modals[type]);
            wireModal(modals[type], type);
        }

        const m = modals[type];
        // Reset
        const form = m.querySelector('.fb-form');
        form.classList.remove('hidden');
        m.querySelector('.fb-success').classList.add('hidden');
        m.querySelector('.fb-error').classList.add('hidden');
        m.querySelector('.fb-desc').value = '';
        const steps = m.querySelector('.fb-steps');
        if (steps) steps.value = '';
        m.querySelector('.fb-name').value = '';
        m.querySelector('.fb-game').value = getGameName();
        m.querySelector('.fb-submit-text').classList.remove('hidden');
        m.querySelector('.fb-submit-spin').classList.add('hidden');
        m.querySelector('.fb-submit').disabled = false;

        // Reset severity
        m.querySelectorAll('.sev-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.sev === 'medium');
        });
        m._severity = 'medium';

        m.classList.add('show');
    }

    function closeFeedbackModal(type) {
        if (modals[type]) modals[type].classList.remove('show');
        modalOpen = false;
    }

    function wireModal(m, type) {
        const isBug = type === 'bug';
        m._severity = 'medium';

        m.querySelector('.fb-close').addEventListener('click', () => closeFeedbackModal(type));
        m.addEventListener('click', (e) => { if (e.target === m) closeFeedbackModal(type); });

        m.querySelectorAll('.sev-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                m._severity = btn.dataset.sev;
                m.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (window.NeonSFX) NeonSFX.click();
            });
        });

        m.querySelector('.fb-form').addEventListener('submit', (e) => {
            e.preventDefault();
            submitFeedback(m, type);
        });

        m.querySelector('.fb-done-btn').addEventListener('click', () => closeFeedbackModal(type));
        m.querySelector('.fb-retry-btn').addEventListener('click', () => {
            m.querySelector('.fb-form').classList.remove('hidden');
            m.querySelector('.fb-error').classList.add('hidden');
        });
    }

    async function submitFeedback(m, type) {
        const isBug = type === 'bug';
        const game = m.querySelector('.fb-game').value;
        const desc = m.querySelector('.fb-desc').value.trim();
        const steps = m.querySelector('.fb-steps');
        const name = m.querySelector('.fb-name').value.trim() || 'Anonymous';
        const device = getDeviceInfo();

        if (!desc) return;

        m.querySelector('.fb-submit-text').classList.add('hidden');
        m.querySelector('.fb-submit-spin').classList.remove('hidden');
        m.querySelector('.fb-submit').disabled = true;

        const sevLabels = { low: '😊 Minor', medium: '😐 Medium', high: '😡 Major' };
        const payload = {
            type: isBug ? 'Bug Report' : 'Suggestion',
            game: game,
            description: desc,
            reporter: name,
            device: device,
            page_url: window.location.href,
            _subject: `${isBug ? '🐛 Bug' : '💡 Suggestion'}: ${game} — Neon Arcade`,
            _template: 'table',
            _captcha: 'false',
        };
        if (isBug) {
            payload.steps = (steps && steps.value.trim()) || 'N/A';
            payload.severity = sevLabels[m._severity];
        }

        try {
            const res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                m.querySelector('.fb-form').classList.add('hidden');
                m.querySelector('.fb-success').classList.remove('hidden');
                if (window.NeonSFX) NeonSFX.win();
            } else {
                throw new Error(data.message || 'Failed');
            }
        } catch (err) {
            const report = `${isBug ? 'BUG' : 'SUGGESTION'}: ${game}\n${desc}\nBy: ${name}\nDevice: ${device}`;
            try { await navigator.clipboard.writeText(report); } catch (e) { /* */ }
            m.querySelector('.fb-form').classList.add('hidden');
            m.querySelector('.fb-error').classList.remove('hidden');
            if (window.NeonSFX) NeonSFX.gameOver();
        }
    }

    // ===== Floating Buttons =====
    function createButtons() {
        addStyles();
        const wrap = document.createElement('div');
        wrap.className = 'fb-floating-wrap';

        const sugBtn = document.createElement('button');
        sugBtn.className = 'fb-float-btn sug-float';
        sugBtn.title = 'Suggest a Feature';
        sugBtn.innerHTML = '💡';
        sugBtn.setAttribute('aria-label', 'Suggest a Feature');
        sugBtn.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            openFeedbackModal('suggestion');
        });

        const bugBtn = document.createElement('button');
        bugBtn.className = 'fb-float-btn';
        bugBtn.title = 'Report a Bug';
        bugBtn.innerHTML = '🐛';
        bugBtn.setAttribute('aria-label', 'Report a Bug');
        bugBtn.addEventListener('click', () => {
            if (window.NeonSFX) NeonSFX.click();
            openFeedbackModal('bug');
        });

        wrap.appendChild(sugBtn);
        wrap.appendChild(bugBtn);
        document.body.appendChild(wrap);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createButtons);
    } else {
        createButtons();
    }
})();
