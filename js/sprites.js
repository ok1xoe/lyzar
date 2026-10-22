// Sprity jako pole řetězců ('X' = bod). Vše vlastní kresba; lyžaře generuje kód.
(function (root) {
    'use strict';

    var LH = root.LH = root.LH || {};

    function norm(rows) {
        var w = 0;
        rows.forEach(function (r) { if (r.length > w) { w = r.length; } });
        return rows.map(function (r) { while (r.length < w) { r += '.'; } return r; });
    }

    var SPR = {};

    // Hugo pěšky (8x12), dvě fáze chůze
    SPR.walk = [norm([
        '...XX...',
        '..XXXX..',
        '..XXXX..',
        '..X..X..',
        '..XXXX..',
        '.XXXXXX.',
        'XX.XX.XX',
        'X..XX..X',
        '...XX...',
        '...XX...',
        '..XX.X..',
        '..X..XX.'
    ]), norm([
        '...XX...',
        '..XXXX..',
        '..XXXX..',
        '..X..X..',
        '..XXXX..',
        '.XXXXXX.',
        'XX.XX.XX',
        'X..XX..X',
        '...XX...',
        '...XX...',
        '...XX...',
        '..XXXX..'
    ])];

    // Hugo s lyžemi nad hlavou (po vypůjčení) – 8x12
    SPR.walkSkis = norm([
        'X.......',
        'X.XX....',
        'X.XXXX..',
        'XXXXXX..',
        'X.XXXX..',
        'X.XXXX..',
        'XXXXXXX.',
        'X.XXXXXX',
        'X..XX...',
        '...XX...',
        '..XX.X..',
        '..X..XX.'
    ]);

    // lyžař zezadu/shora; k = 0..3 sklon dráhy, kladný = doprava (16x20)
    function skier(k) {
        var W = 16, rows = [], r, i;
        var body = [
            '....XXXX....',
            '...XXXXXX...',
            '...XXXXXX...',
            '...X.XX.X...',
            '...XXXXXX...',
            '..XXXXXXXX..',
            '.XXX.XX.XXX.',
            'XX.X.XX.X.XX',
            'X..XXXXXX..X',
            '...XXXXXX...'
        ];
        var bs = Math.round(k * 0.4);
        for (r = 0; r < 20; r++) {
            var line = [];
            for (i = 0; i < W; i++) { line.push('.'); }
            if (r < body.length) {
                for (i = 0; i < body[r].length; i++) {
                    var px = i + 2 + bs;
                    if (body[r].charAt(i) === 'X' && px < W) { line[px] = 'X'; }
                }
            } else if (r - body.length < 9) {
                var rr = r - body.length;
                var sh = Math.round(k * 0.3 * rr) + bs;
                [4, 9].forEach(function (c) {
                    for (var d = 0; d < 3; d++) { var q = c + d + 2 + sh; if (q >= 0 && q < W) { line[q] = 'X'; } }
                });
            }
            rows.push(line.join(''));
        }
        return norm(rows);
    }
    SPR.skier = [skier(0), skier(1), skier(2), skier(3)];

    // ve vzduchu: lyže roztažené do V
    SPR.skierAir = norm([
        '.....XXXX.....',
        '....XXXXXX....',
        '....XXXXXX....',
        '....X.XX.X....',
        '....XXXXXX....',
        '...XXXXXXXX...',
        '..XX.XXXX.XX..',
        '.XX..XXXX..XX.',
        'X.X..X..X..X.X',
        'X.X.X....X.X.X',
        'X.X.X....X.X.X',
        'XX..X....X..XX',
        'X..X......X..X'
    ]);

    // pád: hvězdice
    SPR.crash = norm([
        'X....X..X....X',
        '.X...XXXX...X.',
        '..X.XXXXXX.X..',
        'XX..X.XX.X..XX',
        '..XXXXXXXXXX..',
        '.X.XXXXXXXX.X.',
        'X..X.XXXX.X..X',
        '....X....X....',
        '...X......X...',
        '..X........X..'
    ]);

    SPR.tree = norm([
        '.......XX.......',
        '......XXXX......',
        '.....XX.XXX.....',
        '....XXXXXXXX....',
        '.....XXXXXX.....',
        '....XXX.XXXX....',
        '...XXXXXXXXXX...',
        '..XXXX.XXXXXXX..',
        '.XXXXXXXXXX.XXX.',
        '..XXXXXXXXXXXX..',
        '.XXXX.XXXXXXXXX.',
        'XXXXXXXXXXXXXXXX',
        '.......XX.......',
        '.......XX.......'
    ]);

    SPR.rock = norm([
        '....XXXX....',
        '..XXXXXXXX..',
        '.XXX.XXXXXX.',
        'XXXXXXXX.XXX',
        'XXX.XXXXXXXX',
        '.XXXXXXXXXX.'
    ]);

    SPR.ramp = norm([
        '....XXXXXXXXXXXXXXXX....',
        '..XXX.XX.XX.XX.XX.XXX...',
        '.XXXXXXXXXXXXXXXXXXXXXX.',
        'XX.XX.XX.XX.XX.XX.XX.XXX',
        'XXXXXXXXXXXXXXXXXXXXXXXX',
        'X.X.X.X.X.X.X.X.X.X.X.XX'
    ]);

    // vlajka (6x10): tyč + praporek
    SPR.flag = norm([
        'XXXXX.',
        'XXXX..',
        'XXX...',
        'XX....',
        'X.....',
        'X.....',
        'X.....',
        'X.....',
        'X.....',
        'X.....'
    ]);

    SPR.car = norm([
        '.....XXXXXXXX.......',
        '....XXX.XX.XXX......',
        '...XXXX.XX.XXXX.....',
        'XXXXXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXXX',
        '.XXXX...XXXXX..XXXX.',
        '..XX.....XXX....XX..',
        '....................'
    ]);

    SPR.truck = norm([
        'XXXXXXXXXXXXXXXXXXXXXX..........',
        'XX.XX.XX.XX.XX.XX.XXXX..XXXXXXX.',
        'XXXXXXXXXXXXXXXXXXXXXX.XXX.XXXXX',
        'XXXXXXXXXXXXXXXXXXXXXX.XX..XXXXX',
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        '.XXX..XXX.XXXXXXXXXXXX.XXX.XXXX.',
        '..X....X...XXXXXXXXXX...X...XX..',
        '................................'
    ]);

    // pahorek na pozadí titulky (8x8 vzory)
    SPR.brick = ['XXXXXXXX', 'X...X...', 'X...X...', 'XXXXXXXX', '..X...X.', '..X...X.', 'XXXXXXXX', 'X...X...'];
    SPR.check = ['XXXX....', 'XXXX....', 'XXXX....', 'XXXX....', '....XXXX', '....XXXX', '....XXXX', '....XXXX'];
    SPR.checkB = ['....XXXX', '....XXXX', '....XXXX', '....XXXX', 'XXXX....', 'XXXX....', 'XXXX....', 'XXXX....'];
    SPR.solid = ['XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX'];
    SPR.dash = ['........', '........', '........', 'XXXX....', 'XXXX....', '........', '........', '........'];
    SPR.roof = ['.......X', '......XX', '.....XXX', '....XXXX', '...XXXXX', '..XXXXXX', '.XXXXXXX', 'XXXXXXXX'];
    SPR.roofB = ['X.......', 'XX......', 'XXX.....', 'XXXX....', 'XXXXX...', 'XXXXXX..', 'XXXXXXX.', 'XXXXXXXX'];
    SPR.curb = ['........', '........', '........', '........', '........', '........', 'XXXXXXXX', '........'];
    SPR.dots = ['........', '........', '..X.....', '........', '........', '.....X..', '........', '........'];

    LH.SPR = SPR;
})(typeof window !== 'undefined' ? window : globalThis);
