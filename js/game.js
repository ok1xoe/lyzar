// Herní logika Lyžaře Huga: silnice -> půjčovna -> sjezd. Bez závislosti na DOM (testovatelné v Node).
(function (root) {
    'use strict';

    var LH = root.LH = root.LH || {};

    var W = 256;
    var LANE_Y = [40, 56, 72, 88];
    var LANE_DIR = [1, -1, 1, -1];
    var LANE_SPD = [0.9, 1.5, 1.1, 1.8];
    var HUGO_SY = 64;               // y paty lyžaře na obrazovce při sjezdu
    var STEP_HZ = 50;

    function rng(seed) {
        var a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    var G = {
        state: 'title',            // title | road | rent | ski | dying | finish | over | paused
        prev: 'road', phase: 'road',
        level: 1, score: 0, lives: 3, hi: 0, nextLife: 5000,
        frame: 0, timer: 0,
        road: null, ski: null, fin: null,
        input: { left: false, right: false, up: false, down: false, lEdge: false, rEdge: false },
        onEvent: function () { },
        onHi: function () { }
    };

    function ev(name) { try { G.onEvent(name); } catch (e) { /* ignorovat */ } }

    function addScore(n) {
        G.score = Math.max(0, G.score + n);
        if (G.score > G.hi) { G.hi = G.score; G.onHi(G.hi); }
        if (G.score >= G.nextLife) { G.lives = Math.min(G.lives + 1, 8); G.nextLife += 5000; ev('life'); }
    }

    // ---------- silnice ----------
    function levelSpeedScale() { return 1 + 0.12 * Math.min(G.level - 1, 8); }

    function spawnCar(road, lane) {
        var r = road.rnd;
        var truck = r() < 0.3;
        var w = truck ? 32 : 20;
        var dir = LANE_DIR[lane];
        var v = LANE_SPD[lane] * levelSpeedScale();
        road.cars.push({
            lane: lane, w: w, truck: truck, dir: dir, v: v * dir,
            x: dir > 0 ? -w : W,
            col: [2, 6, 5, 3, 4, 10, 14, 13][Math.floor(r() * 8)]
        });
        var density = Math.max(0.6, 1 - road.ticks / 2600);
        var gap = (70 + r() * 110) * density;
        road.lane[lane] = Math.ceil((w + gap) / v);
    }

    function roadTickCars(road) {
        var i;
        for (i = 0; i < 4; i++) {
            if (--road.lane[i] <= 0) { spawnCar(road, i); }
        }
        for (i = road.cars.length - 1; i >= 0; i--) {
            var c = road.cars[i];
            c.x += c.v;
            if (c.x < -c.w - 2 || c.x > W + 2) { road.cars.splice(i, 1); }
        }
    }

    function startRoad() {
        G.phase = 'road';
        G.state = 'road';
        var road = G.road = {
            hx: 128, hy: 170, anim: 0, ticks: 0, moved: false,
            cars: [], lane: [1, 1, 1, 1], rnd: rng(1000 + G.level * 31 + G.frame % 97)
        };
        // předpřipravený provoz
        for (var i = 0; i < 500; i++) { roadTickCars(road); }
    }

    function carHits(road) {
        var hx = road.hx, hy = road.hy;
        for (var i = 0; i < road.cars.length; i++) {
            var c = road.cars[i];
            var cy = LANE_Y[c.lane];
            if (hx + 3 > c.x + 1 && hx - 3 < c.x + c.w - 1 && hy > cy + 3 && hy - 8 < cy + 13) { return true; }
        }
        return false;
    }

    function roadTick() {
        var road = G.road, inp = G.input;
        road.ticks++;
        var sp = 1.1, dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), dy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
        road.moved = dx !== 0 || dy !== 0;
        if (road.moved) { road.anim++; if (road.anim % 8 === 0) { ev('step'); } }
        road.hx = clamp(road.hx + dx * sp, 6, W - 6);
        road.hy = clamp(road.hy + dy * sp, 39, 172);
        roadTickCars(road);
        if (carHits(road)) { die(); return; }
        if (road.hy <= 40 && road.hx >= 108 && road.hx <= 140) {
            G.state = 'rent'; G.timer = 100; ev('rent');
        }
    }

    // ---------- sjezd ----------
    function buildCourse(level) {
        var r = rng(level * 7919 + 13);
        var L = Math.min(6000, 2200 + 500 * (level - 1));
        var gates = [], obs = [], ramps = [], snow = [];
        var gw = Math.max(30, 48 - 2 * (level - 1));
        var y = 320, lastX = 128;
        while (y < L - 160) {
            var cx = clamp(lastX + (r() * 2 - 1) * 70, 20 + gw / 2, 236 - gw / 2);
            gates.push({ y: Math.round(y), x1: Math.round(cx - gw / 2), x2: Math.round(cx + gw / 2), state: 0 });
            lastX = cx;
            y += 140 + r() * 60;
        }
        function nearGate(yy, x) {
            for (var i = 0; i < gates.length; i++) {
                if (Math.abs(gates[i].y - yy) < 30 && x > gates[i].x1 - 12 && x < gates[i].x2 + 12) { return true; }
            }
            return false;
        }
        function nearGateRow(yy) {
            for (var i = 0; i < gates.length; i++) { if (Math.abs(gates[i].y - yy) < 40) { return true; } }
            return false;
        }
        // skokánky
        var ry = 520;
        while (ry < L - 300) {
            var rx = 50 + r() * 156;
            if (!nearGateRow(ry)) { ramps.push({ x: Math.round(rx), y: Math.round(ry), used: false }); }
            ry += 420 + r() * 300;
        }
        function nearRamp(yy, x) {
            for (var i = 0; i < ramps.length; i++) {
                var p = ramps[i];
                if (yy > p.y - 30 && yy < p.y + 170 && Math.abs(x - p.x) < 60) { return true; }
            }
            return false;
        }
        var prob = Math.min(0.9, 0.5 + 0.05 * level);
        for (y = 230; y < L - 100; y += 16) {
            if (r() > prob) { continue; }
            var t = r(), x = Math.round(12 + r() * 232), yy = Math.round(y + r() * 10);
            if (t < 0.15) {
                if (!nearGateRow(yy) && !nearRamp(yy, x)) { snow.push({ x: x, y: yy + 14, w: 48 + Math.round(r() * 16), h: 26 + Math.round(r() * 8) }); }
                continue;
            }
            if (nearGate(yy, x) || nearRamp(yy, x)) { continue; }
            obs.push(t < 0.72 ? { t: 'tree', x: x, y: yy, hw: 5, h: 8 } : { t: 'rock', x: x, y: yy, hw: 6, h: 6 });
        }
        return { L: L, gates: gates, obs: obs, ramps: ramps, snow: snow };
    }

    function startSki() {
        G.phase = 'ski';
        G.state = 'ski';
        var c = buildCourse(G.level);
        var v0 = Math.min(2.6, 1.5 + 0.2 * (G.level - 1));
        G.ski = {
            L: c.L, gates: c.gates, obs: c.obs, ramps: c.ramps, snow: c.snow,
            d: 0, x: 128, vy: 0.8, v0: v0, h: 0, air: 0, ticks: 0, penalty: 0,
            flags: 0, missed: 0, lh: 0, rh: 0, jumps: 0, anim: 0
        };
        ev('rent');
    }

    function overlapBox(s, o) {
        var hxl = s.x - 3, hxr = s.x + 3, hyt = s.d - 4, hyb = s.d;
        return hxr > o.x - o.hw && hxl < o.x + o.hw && hyb > o.y - o.h && hyt < o.y;
    }

    function skiTick() {
        var s = G.ski, inp = G.input, i;
        s.ticks++;
        // zatáčení: klepnutí = o stupeň, držení = opakování
        if (inp.lEdge) { s.h = Math.max(-3, s.h - 1); inp.lEdge = false; s.lh = 0; }
        if (inp.rEdge) { s.h = Math.min(3, s.h + 1); inp.rEdge = false; s.rh = 0; }
        if (inp.left && !inp.right) { s.lh++; if (s.lh > 12 && s.lh % 6 === 0) { s.h = Math.max(-3, s.h - 1); } } else { s.lh = 0; }
        if (inp.right && !inp.left) { s.rh++; if (s.rh > 12 && s.rh % 6 === 0) { s.h = Math.min(3, s.h + 1); } } else { s.rh = 0; }

        var tgt = s.v0;
        if (inp.up) { tgt = s.v0 * 0.45; } else if (inp.down) { tgt = s.v0 * 1.5; }
        var inSnow = false;
        for (i = 0; i < s.snow.length; i++) {
            var sn = s.snow[i];
            if (s.x > sn.x - sn.w / 2 && s.x < sn.x + sn.w / 2 && s.d > sn.y - sn.h && s.d < sn.y) { inSnow = true; break; }
        }
        s.inSnow = inSnow && s.air === 0;
        if (s.inSnow) { tgt = Math.min(tgt, s.v0 * 0.4); }
        s.vy += clamp(tgt - s.vy, -0.05, 0.03);
        s.x = clamp(s.x + s.h * 0.5 * (0.6 + 0.4 * s.vy / s.v0), 8, W - 8);
        var prevD = s.d;
        s.d += s.vy;
        s.anim++;

        // skokánky
        if (s.air === 0) {
            for (i = 0; i < s.ramps.length; i++) {
                var rp = s.ramps[i];
                if (!rp.used && overlapBox(s, { x: rp.x, hw: 12, y: rp.y, h: 6 })) {
                    rp.used = true;
                    s.air = 28 + Math.round(s.vy * 10);
                    s.airMax = s.air;
                    s.jumps++;
                    ev('jump');
                }
            }
        } else {
            s.air--;
            if (s.air === 0) { addScore(100); ev('land'); }
        }

        // branky
        for (i = 0; i < s.gates.length; i++) {
            var g = s.gates[i];
            if (g.state === 0 && prevD < g.y && s.d >= g.y) {
                if (s.x > g.x1 + 2 && s.x < g.x2 - 2) { g.state = 1; s.flags++; addScore(50); ev('gate'); }
                else { g.state = 2; s.missed++; s.penalty += 150; addScore(-25); ev('miss'); }
            }
        }

        // překážky
        if (s.air === 0) {
            for (i = 0; i < s.obs.length; i++) {
                var o = s.obs[i];
                if (o.y < s.d - 20 || o.y > s.d + 20) { continue; }
                if (overlapBox(s, o)) { s.hit = o; die(); return; }
            }
        }

        if (s.d >= s.L) { startFinish(); }
    }

    function startFinish() {
        var s = G.ski;
        var secs = (s.ticks + s.penalty) / STEP_HZ;
        var par = s.L / (s.v0 * STEP_HZ) * 1.25;
        var timeBonus = Math.max(0, Math.round(par - secs)) * 50;
        var flagBonus = s.flags * 25;
        G.fin = { secs: secs, par: par, timeBonus: timeBonus, flagBonus: flagBonus, total: timeBonus + flagBonus };
        addScore(G.fin.total);
        G.state = 'finish';
        G.timer = 260;
        ev('finish');
    }

    // ---------- společné ----------
    function die() {
        G.prev = G.state;
        G.state = 'dying';
        G.timer = 70;
        G.lives--;
        ev('crash');
    }

    function afterDeath() {
        if (G.lives <= 0) {
            G.state = 'over'; G.timer = 0;
            ev('over');
            return;
        }
        if (G.phase === 'road') {
            G.road.hx = 128; G.road.hy = 170;
            G.state = 'road';
        } else {
            var s = G.ski;
            s.obs = s.obs.filter(function (o) { return Math.abs(o.y - s.d) > 40; });
            s.h = 0; s.vy = 0.6; s.air = 0;
            s.penalty += 100;
            s.hit = null;
            G.state = 'ski';
        }
    }

    function newGame() {
        G.score = 0; G.lives = 3; G.level = 1; G.nextLife = 5000;
        startRoad();
    }

    G.tick = function () {
        G.frame++;
        switch (G.state) {
            case 'road': roadTick(); break;
            case 'ski': skiTick(); break;
            case 'rent':
                if (--G.timer <= 0) { startSki(); }
                break;
            case 'dying':
                if (--G.timer <= 0) { afterDeath(); }
                break;
            case 'finish':
                if (--G.timer <= 0) { G.level++; startRoad(); }
                break;
            case 'over':
                G.timer++;
                break;
            default: break;
        }
    };

    // start / potvrzení
    G.press = function () {
        if (G.state === 'title') { newGame(); }
        else if (G.state === 'over' && G.timer > 40) { G.state = 'title'; }
        else if (G.state === 'finish' && G.timer < 200) { G.timer = 1; }
    };

    G.togglePause = function () {
        if (G.state === 'paused') { G.state = G.prev; }
        else if (G.state === 'road' || G.state === 'ski' || G.state === 'rent' || G.state === 'finish') {
            G.prev = G.state; G.state = 'paused';
        }
    };

    G.hide = function () {
        if (G.state === 'road' || G.state === 'ski' || G.state === 'rent') { G.prev = G.state; G.state = 'paused'; }
    };

    G.HUGO_SY = HUGO_SY;
    G.LANE_Y = LANE_Y;
    G.buildCourse = buildCourse;
    G.newGame = newGame;
    LH.G = G;
})(typeof window !== 'undefined' ? window : globalThis);
