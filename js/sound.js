// Zvuky přes WebAudio – "beeper" (čtvercová vlna), melodie na titulní obrazovce.
(function (root) {
    'use strict';

    var LH = root.LH = root.LH || {};

    var ac = null, muted = false, tuneTimer = null, tuneStep = 0;

    try {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (AC) { ac = new AC(); }
    } catch (e) { ac = null; }

    function unlock() {
        if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) { /* ignorovat */ } }
    }

    function beep(freq, dur, slideTo, vol, delay) {
        if (!ac || muted) { return; }
        try {
            var t0 = ac.currentTime + (delay || 0);
            var o = ac.createOscillator(), g = ac.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(freq, t0);
            if (slideTo) { o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur); }
            g.gain.setValueAtTime(vol || 0.04, t0);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            o.connect(g); g.connect(ac.destination);
            o.start(t0); o.stop(t0 + dur + 0.02);
        } catch (e) { /* ignorovat */ }
    }

    function seq(freqs, dur, vol, gap) {
        freqs.forEach(function (f, i) { beep(f, dur, 0, vol || 0.05, i * (gap || dur)); });
    }

    var TUNE = [
        392, 0, 523, 0, 659, 0, 523, 0, 392, 0, 440, 494, 523, 0, 0, 0,
        440, 0, 587, 0, 698, 0, 587, 0, 440, 0, 392, 440, 392, 0, 0, 0
    ];
    var BASS = [131, 0, 0, 0, 131, 0, 0, 0, 98, 0, 0, 0, 131, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0, 98, 0, 0, 0, 98, 0, 0, 0];

    LH.sound = {
        unlock: unlock,
        toggleMute: function () { muted = !muted; if (muted) { LH.sound.stopTune(); } return muted; },
        isMuted: function () { return muted; },
        step: function () { beep(140, 0.03, 0, 0.02); },
        crash: function () { beep(300, 0.6, 40, 0.06); },
        gate: function () { seq([784, 1047], 0.06, 0.04); },
        miss: function () { beep(180, 0.25, 90, 0.05); },
        jump: function () { beep(200, 0.3, 800, 0.04); },
        land: function () { beep(300, 0.1, 100, 0.05); },
        rent: function () { seq([523, 659, 784, 1047], 0.1, 0.05, 0.11); },
        finish: function () { seq([523, 659, 784, 659, 784, 1047, 1047], 0.14, 0.05, 0.13); },
        life: function () { seq([660, 880, 1320], 0.08, 0.05, 0.09); },
        over: function () { seq([392, 330, 262, 196], 0.25, 0.05, 0.22); },
        tick: function () { beep(1800, 0.02, 0, 0.02); },
        startTune: function () {
            if (tuneTimer || !ac) { return; }
            tuneTimer = setInterval(function () {
                var n = TUNE[tuneStep % TUNE.length], b = BASS[tuneStep % BASS.length];
                if (n) { beep(n, 0.12, 0, 0.03); }
                if (b) { beep(b, 0.3, 0, 0.03); }
                tuneStep++;
            }, 150);
        },
        stopTune: function () { if (tuneTimer) { clearInterval(tuneTimer); tuneTimer = null; } tuneStep = 0; }
    };
})(typeof window !== 'undefined' ? window : globalThis);
