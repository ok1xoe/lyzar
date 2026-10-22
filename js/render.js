// Vykreslení obrazovky (ZX Spectrum styl, 256x192, atributy po 8x8).
(function (root) {
    'use strict';

    var LH = root.LH = root.LH || {};
    var G = LH.G, SPR = LH.SPR;
    var LANE_Y = G.LANE_Y;

    var HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];

    function pad(n, len) { var s = String(Math.floor(n)); while (s.length < len) { s = '0' + s; } return s; }

    function line(scr, row, str, ink, x) {
        var px = x === undefined ? Math.floor((256 - LH.textWidth(str, 1)) / 2) : x;
        LH.drawText(scr, px, row * 8 - 1, str, ink, 1);
    }

    function box(scr, cx, cy, w, h, ink, paper) {
        scr.block(cx * 8, cy * 8, w * 8, h * 8, 0, 0, false);
        scr.fillCells(cx, cy, w, h, ink, paper, 1);
    }

    function spr(scr, x, y, rows, ink, flip) { scr.sprite(Math.round(x), Math.round(y), rows, ink, flip); }

    function hash(a, b) {
        var h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return (h ^ (h >>> 16)) >>> 0;
    }

    // ---------- HUD ----------
    function hud(scr) {
        scr.block(0, 176, 256, 16, 0, 0, false);
        scr.fillCells(0, 22, 32, 2, 7, 0, 0);
        line(scr, 22, 'SKÓRE ' + pad(G.score, 6) + '   REKORD ' + pad(G.hi, 6), 6, 8);
        var i;
        for (i = 0; i < Math.min(G.lives, 7); i++) { spr(scr, 4 + i * 9, 185, HEART, 10); }
        var t = 'KOLO ' + G.level;
        if (G.phase === 'ski' && G.ski) {
            var s = G.ski;
            t += '  VLAJKY ' + s.flags + '/' + s.gates.length + '  ČAS ' + ((s.ticks + s.penalty) / 50).toFixed(1);
        } else {
            t += '  PŘEJDI SILNICI';
        }
        line(scr, 23, t, 5, 76);
    }

    // ---------- silnice ----------
    function drawRoad(scr) {
        var road = G.road, c, r, x;
        scr.clear(7, 0, false);
        // obchod
        for (r = 0; r < 4; r++) {
            for (c = 4; c < 28; c++) {
                if (r === 0) { scr.setCell(c, r, 1, 7, 0); scr.pattern(c, r, SPR.solid, 1, 4); }
                else { scr.setCell(c, r, 2, 7, 0); scr.pattern(c, r, SPR.brick, 2); }
            }
        }
        scr.fillCells(8, 1, 16, 1, 15, 1, 1);
        scr.block(64, 8, 128, 8, 0, 0, false);
        scr.setCell(8, 1, 15, 1, 1);
        line(scr, 1, 'PŮJČOVNA LYŽÍ', 15, Math.floor((256 - LH.textWidth('PŮJČOVNA LYŽÍ', 1)) / 2) + 0);
        var win = [[6, 2], [7, 2], [6, 3], [7, 3], [9, 2], [10, 2], [9, 3], [10, 3], [20, 2], [21, 2], [20, 3], [21, 3], [23, 2], [24, 2], [23, 3], [24, 3]];
        win.forEach(function (w) {
            scr.setCell(w[0], w[1], 1, 5, 1);
            scr.pattern(w[0], w[1], ['........', '.XXXXXX.', '.X....X.', '.X....X.', '.X....X.', '.X....X.', '.XXXXXX.', '........'].slice(0, 8), 1);
        });
        for (c = 14; c <= 16; c++) { for (r = 2; r <= 3; r++) { scr.setCell(c, r, 6, 0, 1); scr.pattern(c, r, ['........', '........', '........', '........', '........', '........', '........', '........'], 6); } }
        scr.block(113, 17, 14, 1, 1, 6, true);
        scr.block(125, 26, 2, 2, 1, 6, true);
        // chodník nahoře (řada 4) a dole
        scr.fillCells(0, 4, 32, 1, 0, 7, 0);
        for (c = 0; c < 32; c++) { scr.pattern(c, 4, SPR.curb, 0); }
        // vozovka
        scr.fillCells(0, 5, 32, 8, 7, 0, 0);
        for (var l = 1; l < 4; l++) {
            for (x = 0; x < 256; x += 16) { scr.block(x, LANE_Y[l] - 1, 8, 1, 1, 7, false); }
        }
        scr.block(0, 39, 256, 1, 1, 6, false);
        scr.block(0, 104, 256, 1, 1, 6, false);
        // chodník dole se sněhem
        for (r = 13; r < 22; r++) {
            for (c = 0; c < 32; c++) {
                if (hash(c, r) % 5 === 0) { scr.setCell(c, r, 1, 7, 0); scr.pattern(c, r, SPR.dots, 1); }
            }
        }
        // značka
        if (G.state === 'road' && ((G.frame >> 4) & 1)) {
            scr.block(116, 33, 8, 1, 1, 14, true);
            scr.block(117, 34, 6, 1, 1, 14, true);
            scr.block(118, 35, 4, 1, 1, 14, true);
            scr.block(119, 36, 2, 1, 1, 14, true);
        }
        // auta
        road.cars.forEach(function (car) {
            if (car.x > 256 || car.x + car.w < 0) { return; }
            spr(scr, car.x, LANE_Y[car.lane] + 3, car.truck ? SPR.truck : SPR.car, car.col, car.dir < 0);
        });
        // Hugo
        if (G.state === 'dying') {
            if (G.timer & 4) { spr(scr, road.hx - 7, road.hy - 10, SPR.crash, 2); }
        } else if (G.state === 'rent') {
            spr(scr, road.hx - 4, road.hy - 12, SPR.walkSkis, 2);
        } else {
            spr(scr, road.hx - 4, road.hy - 12, SPR.walk[road.moved ? ((road.anim >> 2) & 1) : 1], 2);
        }
    }

    // ---------- sjezd ----------
    function drawSki(scr) {
        var s = G.ski, d = Math.floor(s.d), i, j;
        var SY = G.HUGO_SY;
        scr.clear(7, 1, true);
        // sněhové tečky
        var j0 = Math.floor((d - SY) / 16) - 1, j1 = Math.floor((d - SY + 176) / 16) + 1;
        for (j = j0; j <= j1; j++) {
            for (i = 0; i < 16; i++) {
                var h = hash(i, j + 1000);
                if (h % 3 !== 0) { continue; }
                var px = i * 16 + (h >>> 4) % 14, py = j * 16 + (h >>> 8) % 14 - d + SY;
                if (py < 0 || py >= 176) { continue; }
                scr.block(px, py, (h >>> 12) & 1 ? 2 : 1, 1, 1, 1, false);
            }
        }
        // sněhová pole
        s.snow.forEach(function (sn) {
            var top = sn.y - sn.h - d + SY;
            if (top > 176 || top + sn.h < 0) { return; }
            for (var yy = 0; yy < sn.h; yy += 3) {
                for (var xx = ((yy / 3) & 1) * 2; xx < sn.w; xx += 4) {
                    scr.block(sn.x - sn.w / 2 + xx, top + yy, 2, 1, 1, 5, false);
                }
            }
            scr.block(sn.x - sn.w / 2, top, sn.w, 1, 1, 5, false);
        });
        // skokánky
        s.ramps.forEach(function (rp) {
            var sy = rp.y - d + SY;
            if (sy < -10 || sy > 190) { return; }
            spr(scr, rp.x - 12, sy - 6, SPR.ramp, 2);
        });
        // cíl
        var fy = s.L - d + SY;
        if (fy > -10 && fy < 190) {
            for (j = 0; j < 2; j++) { for (i = 0; i < 64; i++) { scr.block(i * 4, fy - 8 + j * 4, 4, 4, (i + j) & 1, 0, false); } }
            scr.block(0, fy - 8, 256, 1, 1, 0, false);
            line(scr, Math.floor((fy - 20) / 8), 'CÍL', 2, 116);
        }
        // branky
        s.gates.forEach(function (g, gi) {
            var sy = g.y - d + SY;
            if (sy < -2 || sy > 190) { return; }
            var ink = g.state === 1 ? 4 : (g.state === 2 ? 0 : (gi & 1 ? 1 : 2));
            spr(scr, g.x1, sy - 10, SPR.flag, ink, false);
            spr(scr, g.x2 - 5, sy - 10, SPR.flag, ink, true);
        });
        // překážky nad lyžařem
        function drawObs(o) {
            var sy = o.y - d + SY;
            if (sy < -2 || sy > 190) { return; }
            if (o.t === 'tree') { spr(scr, o.x - 8, sy - 14, SPR.tree, 4); }
            else { spr(scr, o.x - 6, sy - 6, SPR.rock, 0); }
        }
        s.obs.forEach(function (o) { if (o.y < s.d) { drawObs(o); } });
        // Hugo
        var k = Math.abs(s.h), flip = s.h < 0;
        if (G.state === 'dying') {
            if (G.timer & 4) { spr(scr, s.x - 7, SY - 12, SPR.crash, 2); }
        } else if (s.air > 0) {
            var f = 1 - s.air / (s.airMax || 1);
            var lift = Math.round(Math.sin(Math.PI * f) * 22);
            scr.block(Math.round(s.x) - 5, SY - 1, 10, 1, 1, 1, false);
            spr(scr, s.x - 7, SY - 14 - lift, SPR.skierAir, 2, false);
        } else {
            spr(scr, s.x - 8, SY - 18, SPR.skier[k], 2, flip);
        }
        s.obs.forEach(function (o) { if (o.y >= s.d) { drawObs(o); } });
        // postup
        scr.block(0, 0, Math.floor(256 * Math.min(1, s.d / s.L)), 1, 1, 4, false);
    }

    // ---------- titulka ----------
    function drawTitle(scr) {
        scr.clear(0, 7, false);
        var f = G.frame, i;
        scr.fillCells(0, 0, 32, 11, 7, 1, 0);
        // hory
        var peaks = [[40, 80, 32], [124, 80, 38], [208, 80, 30]];
        peaks.forEach(function (p) {
            for (var y = 0; y < p[2]; y++) {
                var hw = Math.round(y * 0.8);
                scr.block(p[0] - hw, p[1] - p[2] + y, hw * 2 + 1, 1, 1, 15, true);
            }
        });
        scr.fillCells(0, 10, 32, 3, 1, 7, 1);
        for (i = 0; i < 32; i++) { scr.pattern(i, 10, SPR.dots, 1); }
        var title = 'LYŽAŘ HUGO';
        var x = Math.floor((256 - LH.textWidth(title, 2)) / 2);
        var cols = [10, 14, 12, 13, 11, 9];
        for (i = 0; i < title.length; i++) {
            LH.drawText(scr, x + i * 12, 12, title.charAt(i), cols[(i + (f >> 3)) % cols.length], 2);
        }
        line(scr, 4, 'REKORD ' + pad(G.hi, 6), 14);
        // lyžař jezdí po svahu
        var t = f % 200;
        var sx = 20 + (t < 100 ? t * 2 : (200 - t) * 2);
        var k = Math.min(3, Math.floor(Math.abs(Math.sin(f / 30)) * 3.5));
        spr(scr, sx, 84, SPR.skier[k], 2, t >= 100);
        spr(scr, 12, 88, SPR.tree, 4, false);
        spr(scr, 228, 86, SPR.tree, 4, false);
        scr.fillCells(0, 13, 32, 11, 7, 0, 0);
        scr.block(0, 104, 256, 88, 0, 0, false);
        line(scr, 13, 'PŘEJDI SILNICI A PŮJČ SI LYŽE,', 7);
        line(scr, 14, 'PAK SJEĎ SVAH MEZI VLAJKAMI.', 7);
        line(scr, 16, 'ŠIPKY NEBO WASD - POHYB, ZATÁČENÍ', 5);
        line(scr, 17, 'NAHORU = BRZDA   DOLŮ = RYCHLEJI', 5);
        line(scr, 18, 'P - PAUZA        M - ZVUK', 5);
        line(scr, 20, 'AUTA, STROMY A KAMENY UBÍRAJÍ ŽIVOT', 6);
        if ((f >> 4) & 1) { line(scr, 22, 'STISKNI MEZERNÍK NEBO ENTER', 15); }
    }

    // ---------- celek ----------
    LH.draw = function (scr) {
        var st = G.state;
        if (st === 'title') { drawTitle(scr); return; }
        var ph = st === 'paused' ? G.prev : st;
        if (ph === 'dying') { ph = G.phase; }
        if (G.phase === 'ski' && G.ski && (ph === 'ski' || ph === 'finish' || ph === 'over' || st === 'dying' || st === 'over')) { drawSki(scr); }
        else { drawRoad(scr); }
        hud(scr);
        if (st === 'paused') {
            box(scr, 6, 6, 20, 4, 15, 1);
            LH.drawText(scr, Math.floor((256 - LH.textWidth('PAUZA', 2)) / 2), 52, 'PAUZA', 15, 2);
            line(scr, 9, 'P - POKRAČOVAT', 15);
        } else if (st === 'over') {
            box(scr, 4, 5, 24, 6, 15, 2);
            LH.drawText(scr, Math.floor((256 - LH.textWidth('KONEC HRY', 2)) / 2), 44, 'KONEC HRY', 15, 2);
            line(scr, 8, 'SKÓRE ' + pad(G.score, 6) + '  REKORD ' + pad(G.hi, 6), 15);
            line(scr, 9, 'MEZERNÍK = MENU', 15);
        } else if (st === 'rent') {
            box(scr, 4, 8, 24, 3, 15, 1);
            line(scr, 9, 'LYŽE VYPŮJČENY!', 14);
            line(scr, 10, 'TEĎ DOLŮ ZE SVAHU', 15);
        } else if (st === 'finish') {
            var fn = G.fin;
            box(scr, 3, 3, 26, 11, 15, 1);
            LH.drawText(scr, Math.floor((256 - LH.textWidth('V CÍLI!', 2)) / 2), 32, 'V CÍLI!', 14, 2);
            line(scr, 7, 'ČAS ' + fn.secs.toFixed(1) + ' S  (LIMIT ' + fn.par.toFixed(1) + ')', 15);
            line(scr, 8, 'BONUS ZA ČAS  +' + fn.timeBonus, 15);
            line(scr, 9, 'VLAJKY ' + G.ski.flags + '/' + G.ski.gates.length + '  +' + fn.flagBonus, 15);
            line(scr, 11, 'PROPADLÉ BRANKY: ' + G.ski.missed, 7);
            line(scr, 12, 'DALŠÍ KOLO JE DELŠÍ A RYCHLEJŠÍ', 14);
        }
    };

    LH.borderColor = function () {
        var st = G.state;
        if (st === 'title') { return 0; }
        return G.phase === 'ski' ? 1 : 0;
    };
})(typeof window !== 'undefined' ? window : globalThis);
