// Lyžař Hugo: spojení s prohlížečem (canvas, vstup, smyčka 50 Hz).
(function (root) {
    'use strict';

    var LH = root.LH;
    var G = LH.G;
    var canvas = document.getElementById('screen');
    var ctx = canvas.getContext('2d');
    var scr = new LH.Screen();
    var inp = G.input;

    try { G.hi = parseInt(localStorage.getItem('lyzar.hi'), 10) || 0; } catch (e) { G.hi = 0; }
    G.onHi = function (v) { try { localStorage.setItem('lyzar.hi', String(v)); } catch (e) { /* ignorovat */ } };
    G.onEvent = function (name) { if (LH.sound[name]) { LH.sound[name](); } };

    var lastState = '';
    function syncState() {
        if (G.state === lastState) { return; }
        if (G.state === 'title') { LH.sound.startTune(); } else if (lastState === 'title') { LH.sound.stopTune(); }
        lastState = G.state;
        var c = LH.PAL[LH.borderColor() & 7];
        document.body.style.background = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    }

    var KEYS = {
        37: 'left', 65: 'left', 39: 'right', 68: 'right',
        38: 'up', 87: 'up', 40: 'down', 83: 'down'
    };

    function setKey(k, v) {
        if (k === 'left' && v && !inp.left) { inp.lEdge = true; }
        if (k === 'right' && v && !inp.right) { inp.rEdge = true; }
        inp[k] = v;
    }

    document.addEventListener('keydown', function (e) {
        var k = KEYS[e.keyCode];
        LH.sound.unlock();
        if (k) {
            e.preventDefault();
            setKey(k, true);
        } else if (e.keyCode === 32 || e.keyCode === 13) {
            e.preventDefault();
            if (!e.repeat) { G.press(); }
        } else if (e.keyCode === 80) {
            G.togglePause();
        } else if (e.keyCode === 77) {
            if (!LH.sound.toggleMute() && G.state === 'title') { LH.sound.startTune(); }
        }
    });

    document.addEventListener('keyup', function (e) {
        var k = KEYS[e.keyCode];
        if (k) { setKey(k, false); }
    });

    Array.prototype.forEach.call(document.querySelectorAll('#touch button'), function (b) {
        var act = b.getAttribute('data-act');
        function down(e) {
            e.preventDefault();
            LH.sound.unlock();
            if (act === 'pause') { G.togglePause(); return; }
            if (act === 'fast') { G.press(); return; }
            setKey(act, true);
        }
        function up(e) {
            e.preventDefault();
            if (act === 'pause') { return; }
            if (act !== 'fast') { setKey(act, false); }
        }
        b.addEventListener('pointerdown', down);
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', up);
        b.addEventListener('pointerleave', up);
        b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });

    canvas.addEventListener('pointerdown', function () {
        LH.sound.unlock();
        if (G.state === 'title' || G.state === 'over') { G.press(); }
        else if (G.state === 'paused') { G.togglePause(); }
    });

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) { G.hide(); }
    });
    window.addEventListener('blur', function () { G.hide(); });

    // celočíselné měřítko
    function fit() {
        var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        var availH = window.innerHeight - (touch ? 190 : 24);
        var s = Math.min(window.innerWidth / 256, availH / 192);
        s = s >= 1 ? Math.floor(s) : Math.max(0.5, s);
        canvas.style.width = Math.round(256 * s) + 'px';
        canvas.style.height = Math.round(192 * s) + 'px';
    }
    window.addEventListener('resize', fit);
    fit();

    // fixní krok 50 Hz
    var last = 0, acc = 0, STEP = 1000 / 50;

    function frame(ts) {
        var dt = Math.min(250, ts - last || 0);
        last = ts;
        if (G.state !== 'paused') {
            acc += dt;
            while (acc >= STEP) { G.tick(); acc -= STEP; }
        } else {
            acc = 0;
            G.frame++;
        }
        syncState();
        LH.draw(scr);
        scr.render(ctx);
        requestAnimationFrame(frame);
    }

    LH.main = { scr: scr, step: function () { G.tick(); syncState(); LH.draw(scr); } };

    syncState();
    requestAnimationFrame(frame);
})(window);
