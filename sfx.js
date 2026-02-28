// ===== Neon Arcade — Procedural Sound Effects (No Music) =====
// Uses Web Audio API to generate short UI/game sounds only.
window.NeonSFX = (function () {
    'use strict';

    let ctx = null;
    let muted = false;

    function getCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    // ===== Utility: play an oscillator for a short burst =====
    function playTone(freq, duration, type, volume, rampEnd) {
        if (muted) return;
        const ac = getCtx();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, ac.currentTime);
        if (rampEnd !== undefined) {
            osc.frequency.linearRampToValueAtTime(rampEnd, ac.currentTime + duration);
        }
        gain.gain.setValueAtTime(volume || 0.15, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(ac.currentTime);
        osc.stop(ac.currentTime + duration);
    }

    // ===== Utility: noise burst =====
    function playNoise(duration, volume) {
        if (muted) return;
        const ac = getCtx();
        const bufferSize = ac.sampleRate * duration;
        const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const src = ac.createBufferSource();
        src.buffer = buffer;
        const gain = ac.createGain();
        gain.gain.setValueAtTime(volume || 0.08, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
        src.connect(gain);
        gain.connect(ac.destination);
        src.start(ac.currentTime);
    }

    // ===== Sound Effects =====

    /** Short blip when eating food */
    function eat() {
        playTone(880, 0.08, 'square', 0.1);
        setTimeout(() => playTone(1200, 0.06, 'square', 0.08), 50);
    }

    /** Game over low buzz */
    function gameOver() {
        playTone(220, 0.25, 'sawtooth', 0.12, 80);
        setTimeout(() => playNoise(0.15, 0.06), 100);
    }

    /** Game start rising tone */
    function gameStart() {
        playTone(400, 0.1, 'square', 0.08);
        setTimeout(() => playTone(600, 0.1, 'square', 0.08), 80);
        setTimeout(() => playTone(900, 0.12, 'square', 0.08), 160);
    }

    /** Direction change subtle tick */
    function turn() {
        playTone(1400, 0.03, 'square', 0.04);
    }

    /** Pause / unpause click */
    function pause() {
        playTone(600, 0.06, 'sine', 0.08);
    }

    /** UI button hover tick */
    function hover() {
        playTone(2000, 0.025, 'sine', 0.03);
    }

    /** UI button click */
    function click() {
        playTone(800, 0.06, 'square', 0.08);
        setTimeout(() => playTone(1000, 0.04, 'square', 0.05), 40);
    }

    /** Locked / error sound */
    function locked() {
        playTone(300, 0.1, 'square', 0.08);
        setTimeout(() => playTone(250, 0.12, 'square', 0.08), 100);
    }

    /** Place a mark (tic-tac-toe) */
    function place() {
        playTone(500, 0.07, 'triangle', 0.1);
        setTimeout(() => playTone(700, 0.05, 'triangle', 0.06), 40);
    }

    /** Win sound — short ascending beeps */
    function win() {
        playTone(500, 0.1, 'square', 0.09);
        setTimeout(() => playTone(650, 0.1, 'square', 0.09), 100);
        setTimeout(() => playTone(800, 0.1, 'square', 0.09), 200);
        setTimeout(() => playTone(1050, 0.15, 'square', 0.1), 300);
    }

    /** Draw sound — flat neutral tone */
    function draw() {
        playTone(400, 0.15, 'triangle', 0.08);
        setTimeout(() => playTone(350, 0.18, 'triangle', 0.06), 120);
    }

    /** Toggle mute */
    function toggleMute() {
        muted = !muted;
        return muted;
    }

    function isMuted() {
        return muted;
    }

    return { eat, gameOver, gameStart, turn, pause, hover, click, locked, place, win, draw, toggleMute, isMuted };
})();
