// Headless test v Node: atrapa DOM, simulace snímků, bot (silnice + sjezd), kontrola NaN,
// přechody stavů a export framebufferu do PNG.   Použití: node tools/test-headless.js [výstupní/adresář]
'use strict';
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var root = path.join(__dirname, '..');
var outDir = process.argv[2] || null;

var ctxStub = { createImageData: function (w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; }, putImageData: function () { } };
var canvasStub = { getContext: function () { return ctxStub; }, addEventListener: function () { }, style: {} };
var docListeners = {};
global.window = global;
global.document = {
    getElementById: function () { return canvasStub; },
    querySelectorAll: function () { return []; },
    addEventListener: function (t, f) { (docListeners[t] = docListeners[t] || []).push(f); },
    body: { style: {} }, hidden: false
};
global.innerWidth = 1024; global.innerHeight = 768;
global.matchMedia = function () { return { matches: false }; };
global.addEventListener = function () { };
global.localStorage = { getItem: function () { return null; }, setItem: function () { } };
var raf = null;
global.requestAnimationFrame = function (cb) { raf = cb; };
global.setInterval = function () { return 0; };
global.clearInterval = function () { };

['font', 'gfx', 'sprites', 'sound', 'game', 'render', 'main'].forEach(function (f) {
    var src = fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8');
    (0, eval)(src);
});
var LH = global.LH, G = LH.G;
var fails = 0;
function check(c, msg) { if (!c) { console.log('  CHYBA: ' + msg); fails++; } else { console.log('  ok: ' + msg); } }

// ---------- PNG ----------
function crc32(buf) {
    var c, crc = 0xFFFFFFFF;
    for (var n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xFF; for (var k = 0; k < 8; k++) { c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; } crc = (crc >>> 8) ^ c; }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
    var len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    var td = Buffer.concat([Buffer.from(type), data]);
    var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
}
function savePng(name, scale) {
    if (!outDir) { return; }
    scale = scale || 3;
    var scr = LH.main.scr; scr.render(ctxStub);
    var d = scr.imageData.data, W = 256 * scale, H = 192 * scale;
    var raw = Buffer.alloc((W * 3 + 1) * H);
    for (var y = 0; y < H; y++) {
        raw[y * (W * 3 + 1)] = 0;
        for (var x = 0; x < W; x++) {
            var o = (((y / scale) | 0) * 256 + ((x / scale) | 0)) * 4, p = y * (W * 3 + 1) + 1 + x * 3;
            raw[p] = d[o]; raw[p + 1] = d[o + 1]; raw[p + 2] = d[o + 2];
        }
    }
    var ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
    var png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
    fs.writeFileSync(path.join(outDir, name + '.png'), png);
}
function shot(name) { LH.draw(LH.main.scr); savePng(name); }

// ---------- NaN ----------
function finite(o, label) {
    for (var k in o) {
        var v = o[k];
        if (typeof v === 'number' && !isFinite(v)) { fails++; console.log('  CHYBA: NaN v ' + label + '.' + k); return false; }
    }
    return true;
}
function checkNaN() {
    finite(G, 'G'); if (G.road) { finite(G.road, 'road'); } if (G.ski) { finite(G.ski, 'ski'); }
}

// ---------- boti ----------
function safeAt(hx, hy, t) {
    var road = G.road;
    for (var i = 0; i < road.cars.length; i++) {
        var c = road.cars[i], cx = c.x + c.v * t, cy = G.LANE_Y[c.lane];
        if (hx + 4 > cx && hx - 4 < cx + c.w && hy + 1 > cy + 3 && hy - 9 < cy + 13) { return false; }
    }
    return true;
}
function roadBot() {
    var r = G.road, inp = G.input;
    var opts = [[0, -1], [-1, -1], [1, -1], [0, 0], [0, 1]];
    // směr k obchodu
    var best = null;
    for (var oi = 0; oi < opts.length; oi++) {
        var o = opts[oi], x = r.hx, y = r.hy, ok = true;
        for (var t = 1; t <= 18; t++) {
            x = Math.min(250, Math.max(6, x + o[0] * 1.1)); y = Math.min(172, Math.max(39, y + o[1] * 1.1));
            if (!safeAt(x, y, t)) { ok = false; break; }
        }
        if (ok) { best = o; break; }
    }
    if (!best) { best = [0, 0]; }
    // zarovnání na dveře
    if (best[0] !== 0 && Math.abs(r.hx - 124) < 8) { best = [0, best[1]]; }
    if (best[1] === -1 && r.hy < 90 && Math.abs(r.hx - 124) > 8) { /* jdi šikmo */ }
    inp.left = best[0] < 0; inp.right = best[0] > 0; inp.up = best[1] < 0; inp.down = best[1] > 0;
    if (best[0] === 0 && best[1] === -1 && Math.abs(r.hx - 124) > 10) { inp.left = r.hx > 124; inp.right = r.hx < 124; }
}
function skiBot() {
    var s = G.ski, inp = G.input;
    inp.up = false; inp.down = false; inp.left = false; inp.right = false;
    var tx = 128, i;
    for (i = 0; i < s.gates.length; i++) { if (s.gates[i].state === 0 && s.gates[i].y > s.d - 2) { tx = (s.gates[i].x1 + s.gates[i].x2) / 2; break; } }
    // vyhýbání
    var look = 70 + s.vy * 10;
    for (i = 0; i < s.obs.length; i++) {
        var o = s.obs[i];
        if (o.y > s.d - 2 && o.y < s.d + look && Math.abs(o.x - tx) < o.hw + 8 && Math.abs(o.x - s.x) < o.hw + 16) {
            tx = o.x > s.x ? o.x - o.hw - 7 : o.x + o.hw + 7;
            break;
        }
    }
    for (i = 0; i < s.ramps.length; i++) {
        var rp = s.ramps[i];
        if (!rp.used && rp.y > s.d - 2 && rp.y < s.d + 60 && Math.abs(rp.x - tx) < 22) { tx = rp.x > s.x ? rp.x - 26 : rp.x + 26; }
    }
    var diff = tx - s.x;
    var want = Math.max(-3, Math.min(3, Math.round(diff / 14)));
    if (want < s.h) { G.input.lEdge = true; } else if (want > s.h) { G.input.rEdge = true; }
    if (Math.abs(diff) < 6 && s.h !== 0) { /* srovnej */ }
    if (s.inSnow) { inp.down = true; }
}

function botStep() {
    if (G.state === 'road') { roadBot(); }
    else if (G.state === 'ski') { skiBot(); }
    else { G.input.up = G.input.down = G.input.left = G.input.right = false; }
}

// ---------- testy ----------
console.log('Titulní obrazovka');
LH.draw(LH.main.scr); shot('01-title');
check(G.state === 'title', 'start v titulce');
G.press();
check(G.state === 'road', 'title -> road');
shot('02-road');

console.log('Hra s botem');
var seen = {}, maxLevel = 0, frames = 0, levelsDone = 0, lastLevel = 1;
var shotDone = {};
G.lives = 99;                // bot nesmí v tomhle testu umřít natrvalo (ověřujeme dosažitelnost)
var deaths = 0, lastLives = G.lives;
while (frames < 50 * 60 * 25 && G.level <= 3) {
    botStep();
    G.tick(); frames++;
    seen[G.state] = true;
    if (G.lives < lastLives) { deaths++; } lastLives = G.lives;
    if (frames % 25 === 0) { checkNaN(); }
    if (G.state === 'rent' && !shotDone.rent) { shot('03-rent'); shotDone.rent = 1; }
    if (G.state === 'ski' && G.ski.d > 500 && !shotDone.ski) { shot('04-ski'); shotDone.ski = 1; }
    if (G.state === 'ski' && G.ski.air > 10 && !shotDone.air) { shot('05-air'); shotDone.air = 1; }
    if (G.state === 'dying' && !shotDone.dying) { shot('06-dying'); shotDone.dying = 1; }
    if (G.state === 'finish' && !shotDone.fin) { shot('07-finish'); shotDone.fin = 1; }
    if (G.level !== lastLevel) { levelsDone++; lastLevel = G.level; console.log('  kolo ' + (G.level - 1) + ' hotovo po ' + (frames / 50).toFixed(0) + ' s, skóre ' + G.score + ', smrtí celkem ' + deaths); }
}
check(levelsDone >= 2, 'bot dokončil alespoň 2 kola (silnice + sjezd), dokončeno ' + levelsDone);
check(seen.road && seen.rent && seen.ski && seen.finish, 'stavy road, rent, ski, finish navštíveny');
check(G.score > 0, 'skóre > 0: ' + G.score);

console.log('Generování tratí, dosažitelnost');
for (var lv = 1; lv <= 12; lv++) {
    var c = G.buildCourse(lv);
    var okGates = c.gates.every(function (g) { return g.x2 - g.x1 >= 30 && g.x1 >= 8 && g.x2 <= 248; });
    var maxShift = 0;
    for (var gi = 1; gi < c.gates.length; gi++) {
        var a = (c.gates[gi - 1].x1 + c.gates[gi - 1].x2) / 2, b = (c.gates[gi].x1 + c.gates[gi].x2) / 2;
        maxShift = Math.max(maxShift, Math.abs(a - b) / (c.gates[gi].y - c.gates[gi - 1].y));
    }
    // sklon pohybu max h=3: 1.5*(0.6+0.4*vy/v0) px/tick vs vy -> poměr
    check(okGates && maxShift < 0.5 && c.gates.length > 5, 'trať ' + lv + ': L=' + c.L + ', branek ' + c.gates.length + ', překážek ' + c.obs.length + ', max sklon ' + maxShift.toFixed(2));
}

console.log('Smrt, konec hry, restart');
G.state = 'title'; G.press();
G.lives = 1;
check(G.state === 'road', 'nová hra');
// postavit auto na Huga
G.road.cars.push({ lane: 3, w: 20, truck: false, dir: -1, v: -1, x: G.road.hx, col: 2 });
G.road.hy = 98;
G.tick();
check(G.state === 'dying', 'srážka -> dying');
shot('08-dying-road');
for (var i = 0; i < 100; i++) { G.tick(); }
check(G.state === 'over', 'dying -> over, životy ' + G.lives);
shot('09-over');
for (i = 0; i < 60; i++) { G.tick(); }
G.press();
check(G.state === 'title', 'over -> title');
G.press();
check(G.state === 'road' && G.lives === 3 && G.score === 0, 'restart čistý');

console.log('Pauza, okraje');
G.togglePause(); check(G.state === 'paused', 'pauza'); shot('10-pause'); G.togglePause(); check(G.state === 'road', 'pokračování');
G.hide(); check(G.state === 'paused', 'visibilitychange -> pauza'); G.togglePause();
G.input.left = true; G.input.up = true; for (i = 0; i < 400; i++) { G.road.cars.length = 0; G.tick(); }
check(G.road.hx >= 6 && G.road.hy >= 39 && G.state === 'road', 'okraje silnice');
G.input.left = false; G.input.up = false;
['title', 'road', 'ski', 'dying', 'paused', 'over'].forEach(function () { });
// krátké hrubé přehrání s náhodným vstupem
var seed = 7;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
G.state = 'title'; G.press();
for (i = 0; i < 50 * 60 * 5; i++) {
    G.input.left = rnd() < 0.4; G.input.right = rnd() < 0.4; G.input.up = rnd() < 0.3; G.input.down = rnd() < 0.5;
    if (rnd() < 0.05) { G.input.lEdge = true; } if (rnd() < 0.05) { G.input.rEdge = true; }
    if (G.state === 'over') { G.timer = 100; G.press(); G.press(); }
    if (rnd() < 0.001) { G.togglePause(); }
    G.tick();
    if (i % 50 === 0) { checkNaN(); LH.draw(LH.main.scr); }
}
check(fails === 0, 'náhodný vstup bez NaN a výjimek');

console.log(fails ? ('SELHÁNÍ: ' + fails) : 'VŠE V POŘÁDKU');
process.exit(fails ? 1 : 0);
