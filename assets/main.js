/*
  1) La barra superior es transparente sobre la imagen y pasa a vidrio claro al empezar a bajar.
  2) Pie de pagina: paisaje en caracteres (solo simbolos y mayusculas) con un buho que cruza volando.
     Todo se dibuja en una grilla de celdas: montañas en capas que derivan a distinta velocidad,
     niebla, luna, estrellas, y el buho con las alas batiendo y estela de polvo.
*/
(function () {
  "use strict";

  /* ---------- Barra superior ---------- */
  var top = document.querySelector(".top");
  var hero = document.querySelector(".hero");
  if (top && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      top.classList.toggle("solid", es[0].intersectionRatio < 0.9);
    }, { threshold: [0, 0.9, 1] }).observe(hero);
  } else if (top) { top.classList.add("solid"); }

  /* ---------- Paisaje ASCII ---------- */
  var canvas = document.querySelector(".foot-stage canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)");

  // Densidad de menos a mas (sin minusculas) y glifos sueltos para bordes y detalles.
  var GLYPHS = " .:-=+*#%&8WMB@$/\\_^~|VO";
  var N = 15;                       // indices 0..15 son la rampa de densidad
  var G_SL = 16, G_BS = 17, G_UN = 18, G_UP = 19, G_TI = 20, G_BA = 21, G_V = 22, G_O = 23;

  // Paleta (sale de la pintura: verde azulado de los pinos, naranja de los ojos, marrones del plumaje)
  var PAL = [null, "rgb(58,102,112)", "rgb(214,98,30)", "rgb(110,122,128)", "rgb(122,78,52)",
             "rgb(196,150,98)", "rgb(226,206,172)", "rgb(60,40,30)", "rgb(40,40,44)"];
  var TEAL = 1, ORANGE = 2, STAR = 3, BROWN = 4, TAN = 5, CREAM = 6, DARK = 7, INK = 8;
  var PAPER = "#f1f2f2";

  var w = 0, h = 0, dpr = 1, cols = 0, rows = 0, cw = 6.5, ch = 11, asp = 1;
  var gl, co, al, wash;             // buffers por celda
  var visible = false, raf = 0, last = 0, t0 = performance.now();
  var ptr = { x: -1, y: -1, tx: -1, ty: -1, k: 0, tk: 0 };
  var parts = [];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function hash(a, b) {
    var x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    var small = w < 560;
    cw = small ? 6.6 : 6.5; ch = small ? 11.5 : 11;
    cols = Math.ceil(w / cw); rows = Math.ceil(h / ch); asp = cw / ch;
    var n = cols * rows;
    gl = new Uint8Array(n); co = new Uint8Array(n); al = new Float32Array(n); wash = new Uint8Array(n);
  }

  function put(c, r, g, pal, a) {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return;
    var i = r * cols + c; gl[i] = g; co[i] = pal; al[i] = a;
  }

  /* --- Montañas: crestas periodicas en capas --- */
  var LAYERS = [
    { base: 0.40, amp: 0.34, tone: 0.26, speed: 0.30, f: [6, 14, 31, 67], ph: [0.4, 1.9, 3.1, 5.0] },
    { base: 0.50, amp: 0.32, tone: 0.36, speed: 0.60, f: [8, 17, 37, 73], ph: [2.2, 0.6, 4.1, 1.3] },
    { base: 0.61, amp: 0.28, tone: 0.48, speed: 1.00, f: [9, 21, 43, 83], ph: [5.1, 3.3, 0.9, 2.7] },
    { base: 0.72, amp: 0.22, tone: 0.62, speed: 1.70, f: [11, 25, 51, 97], ph: [1.1, 4.4, 2.0, 0.2] },
    { base: 0.85, amp: 0.15, tone: 0.80, speed: 2.60, f: [13, 29, 59, 109], ph: [3.6, 1.2, 5.5, 3.9] }
  ];
  var PERIOD = 1024;
  function ridge(L, x) {
    // sinusoides suaves (lomas anchas) mezcladas con un poco de cresta aguda
    var v = 0, tot = 0;
    for (var k = 0; k < 4; k++) {
      var a = Math.pow(0.52, k), ang = 6.2832 * L.f[k] * x / PERIOD + L.ph[k], sn = Math.sin(ang);
      v += a * (0.65 * (0.5 + 0.5 * sn) + 0.35 * (1 - Math.abs(sn)));
      tot += a;
    }
    v = v / tot;
    return Math.pow(clamp((v - 0.5) * 2.2 + 0.5, 0, 1), 1.1);
  }

  function drawMountains(t) {
    for (var li = 0; li < LAYERS.length; li++) {
      var L = LAYERS[li], shift = t * L.speed;
      var tops = new Float32Array(cols + 2);
      for (var c = -1; c <= cols; c++) tops[c + 1] = rows * L.base - rows * L.amp * ridge(L, c + shift);
      for (c = 0; c < cols; c++) {
        var tp = tops[c + 1], r0 = Math.max(0, Math.floor(tp));
        for (var r = r0; r < rows; r++) {
          var depth = (r - tp) / rows;
          var tone = L.tone * (1 - 0.86 * smooth(0, 0.30, depth)) + 0.05 * Math.sin(t * 0.9 + c * 0.7 + r * 1.3 + li);
          var g = Math.floor(clamp(tone, 0, 1) * N * 0.95);
          if (r === Math.floor(tp)) {
            var s = tops[c + 2] - tops[c];
            put(c, r, s < -0.7 ? G_SL : s > 0.7 ? G_BS : G_UN, TEAL, 0.9);
          } else if (g >= 1) {
            put(c, r, g, TEAL, 0.3 + 0.5 * tone);
          } else {
            put(c, r, 0, 0, 0);
          }
        }
      }
      // niebla entre capas: puntos dispersos que se desplazan
      if (li === 1 || li === 3) {
        for (c = 0; c < cols; c++) {
          var tp2 = tops[c + 1];
          for (r = Math.max(0, Math.floor(tp2 - rows * 0.16)); r < tp2; r++) {
            var m = Math.sin((c + t * (0.8 + li)) * 0.09 + r * 0.8) * Math.sin((c - t * 1.3) * 0.045 + r * 0.31 + li);
            if (m > 0.42 && hash(c, r + li * 77) < 0.55) put(c, r, hash(c, r) < 0.5 ? 1 : 2, TEAL, 0.22 + 0.2 * m);
          }
        }
      }
    }
  }

  function drawSky(t) {
    // estrellas
    for (var r = 0; r < rows * 0.5; r++) {
      for (var c = 0; c < cols; c++) {
        var hh = hash(c * 3 + 1, r * 7 + 2);
        if (hh < 0.011) {
          var tw = 0.5 + 0.5 * Math.sin(t * 1.6 + hh * 400);
          put(c, r, hh < 0.004 ? 6 : hh < 0.008 ? 1 : 5, STAR, 0.22 + 0.5 * tw);
        }
      }
    }
    // luna (naranja, como los ojos del buho)
    var mc = cols * 0.13, mr = rows * 0.24, R = Math.max(3.2, rows * 0.17);
    var pulse = 0.85 + 0.15 * Math.sin(t * 0.8);
    for (r = Math.floor(mr - R * 2); r <= mr + R * 2; r++) {
      for (var c2 = Math.floor(mc - R * 2 / asp); c2 <= mc + R * 2 / asp; c2++) {
        var dx = (c2 - mc) * asp, dy = r - mr, d = Math.sqrt(dx * dx + dy * dy);
        if (d < R) {
          var sh = 1 - d / R, g = clamp(Math.floor(5 + sh * 9 + 0.6 * Math.sin(t + c2 * 0.4 + r)), 4, N);
          put(c2, r, g, ORANGE, (0.55 + 0.4 * sh) * pulse);
        } else if (d < R * 1.7 && hash(c2, r + 9) < 0.35 * (1 - (d - R) / (R * 0.7))) {
          put(c2, r, 1, ORANGE, 0.35 * pulse);
        }
      }
    }
  }

  /* --- Buho en vuelo: geometria en "unidades de fila" (circulos redondos) --- */
  var owl = { x: 0, y: 0, oy: 0 };
  function wingPoints(t, shoulder, phase, S, flip) {
    var J = 18, L = 13.5 * S, pts = [], x = shoulder[0], y = shoulder[1];
    var phi = t * 6.2832 * 1.55 + phase;
    for (var j = 0; j <= J; j++) {
      pts.push([x, y]);
      var u = j / J;
      var beta = 1.05 * Math.sin(phi - 1.15 * u) * (0.5 + 0.5 * u) + 0.12;
      x += (L / J) * -Math.cos(beta); y += (L / J) * -Math.sin(beta) * flip;
    }
    return pts;
  }
  function paintWing(pts, S, a0, dark) {
    var J = pts.length - 1;
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (var i = 0; i <= J; i++) {
      minX = Math.min(minX, pts[i][0]); maxX = Math.max(maxX, pts[i][0]);
      minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]);
    }
    var pad = 3.2 * S;
    var c0 = Math.floor((minX - pad) / asp), c1 = Math.ceil((maxX + pad) / asp);
    var r0 = Math.floor(minY - pad), r1 = Math.ceil(maxY + pad);
    for (var r = r0; r <= r1; r++) {
      for (var c = c0; c <= c1; c++) {
        var X = (c + 0.5) * asp, Y = r + 0.5, best = 1e9, bu = 0, bv = 0;
        for (i = 0; i < J; i++) {
          var ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
          var dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
          var tt = clamp(((X - ax) * dx + (Y - ay) * dy) / len2, 0, 1);
          var px = ax + dx * tt, py = ay + dy * tt;
          var d2 = (X - px) * (X - px) + (Y - py) * (Y - py);
          if (d2 < best) { best = d2; bu = (i + tt) / J; bv = ((X - ax) * -dy + (Y - ay) * dx) / Math.sqrt(len2) * (1); }
        }
        var d = Math.sqrt(best);
        var width = S * (2.0 * Math.pow(Math.max(0, 1 - Math.pow((bu - 0.3) / 0.76, 2)), 0.75) + 0.3);
        var lead = width * 0.34, trail = width * 0.66 + 0.55 * S * Math.abs(Math.sin(bu * 15)) * smooth(0.3, 1, bu);
        var side = bv; // signo segun el lado del eje
        var inside = side >= 0 ? d <= trail : d <= lead;
        if (!inside || bu > 0.995) continue;
        var edge = side >= 0 ? d / trail : d / lead;
        var bar = Math.sin(bu * 19) > 0.55 ? 0.22 : 0;
        var tone = clamp(0.62 - 0.38 * edge + bar + 0.35 * smooth(0.7, 1, bu), 0.12, 1);
        var pal = bu > 0.78 ? DARK : edge > 0.72 ? TAN : BROWN;
        put(c, r, 4 + Math.floor(tone * (N - 4)), pal, a0 * (dark ? 0.7 : 1));
        wash[r * cols + c] = dark ? 0 : 1;
      }
    }
  }

  function ell(X, Y, cx, cy, rx, ry, rot) {
    var dx = X - cx, dy = Y - cy, cs = Math.cos(rot), sn = Math.sin(rot);
    var u = dx * cs + dy * sn, v = -dx * sn + dy * cs;
    return (u * u) / (rx * rx) + (v * v) / (ry * ry);
  }

  function drawOwl(t) {
    var S = Math.max(0.9, rows / 27);
    var travel = cols * asp + 30 * S;
    var cycle = 20;                               // segundos por cruce
    var ox = ((t / cycle) % 1) * travel - 15 * S; // en unidades de fila
    var phi = t * 6.2832 * 1.55;
    var baseY = rows * 0.34 + Math.sin(t * 0.5) * rows * 0.05;
    owl.oy += ((ptr.tk > 0 ? (ptr.ty / ch - baseY) * 0.28 : 0) - owl.oy) * 0.06;
    var oy = baseY + owl.oy - 0.9 * S * Math.sin(phi + 0.5);

    // ala lejana (mas oscura y detras del cuerpo)
    paintWing(wingPoints(t, [ox + 0.8 * S, oy - 0.9 * S], 0.5, S * 0.9, 1), S * 0.9, 0.6, true);

    // cola
    var tailX = ox - 4.4 * S;
    for (var r = Math.floor(oy - 2.6 * S); r <= oy + 2.6 * S; r++) {
      for (var c = Math.floor((tailX - 4.2 * S) / asp); c <= Math.ceil((tailX + 0.8 * S) / asp); c++) {
        var X = (c + 0.5) * asp, Y = r + 0.5, k = (tailX - X) / (3.6 * S);
        if (k < -0.2 || k > 1) continue;
        var half = S * (0.9 + 1.5 * clamp(k, 0, 1)), dY = Math.abs(Y - (oy + 0.15 * S + 0.25 * S * Math.sin(phi + 1) * k));
        if (dY > half) continue;
        var bars = Math.sin(k * 17) > 0.2 ? 0.2 : 0;
        put(c, r, 6 + Math.floor(clamp(0.45 + 0.3 * k + bars, 0, 1) * 9), k > 0.7 ? DARK : BROWN, 0.95);
        wash[r * cols + c] = 1;
      }
    }

    // cuerpo
    var bx = ox, by = oy, rot = -0.14;
    for (r = Math.floor(by - 3.2 * S); r <= by + 3.2 * S; r++) {
      for (c = Math.floor((bx - 5.4 * S) / asp); c <= Math.ceil((bx + 5.4 * S) / asp); c++) {
        X = (c + 0.5) * asp; Y = r + 0.5;
        var e = ell(X, Y, bx, by, 4.9 * S, 2.7 * S, rot);
        if (e > 1) continue;
        var belly = clamp((Y - by) / (2.7 * S) * 0.5 + 0.5, 0, 1);       // 0 lomo, 1 panza
        var spots = 0.5 + 0.5 * Math.sin(X * 4.1 + Math.sin(Y * 2.3) * 2);
        var tone = clamp(0.78 - 0.5 * belly + 0.18 * spots - 0.12 * e, 0.1, 1);
        put(c, r, 4 + Math.floor(tone * (N - 4)), belly > 0.55 ? CREAM : belly > 0.3 ? TAN : BROWN, 1);
        wash[r * cols + c] = 1;
      }
    }

    // cabeza
    var hx = ox + 4.4 * S, hy = oy - 1.2 * S, hr = 2.6 * S;
    // orejas
    for (var q = 0; q < 2; q++) {
      var ex = hx + (q ? 1.6 : -0.7) * S;
      for (r = Math.floor(hy - hr - 1.8 * S); r < hy - hr + 0.6 * S; r++) {
        var hgt = (hy - hr + 0.6 * S - r) / (1.9 * S);
        if (hgt < 0 || hgt > 1) continue;
        var cc = Math.round((ex + (q ? 0.35 : -0.35) * hgt * S) / asp);
        put(cc, r, q ? G_BS : G_SL, DARK, 1);
      }
    }
    for (r = Math.floor(hy - hr - 0.5); r <= hy + hr + 0.5; r++) {
      for (c = Math.floor((hx - hr) / asp) - 1; c <= Math.ceil((hx + hr) / asp) + 1; c++) {
        X = (c + 0.5) * asp; Y = r + 0.5;
        var d = Math.sqrt((X - hx) * (X - hx) + (Y - hy) * (Y - hy));
        if (d > hr) continue;
        var face = d < hr * 0.82;
        put(c, r, face ? 3 + Math.floor((0.35 + 0.35 * (d / hr)) * 8) : 10, face ? CREAM : BROWN, 1);
        wash[r * cols + c] = 1;
      }
    }
    // ojos (parpadeo cada ~5 s)
    var blink = (t % 5.2) > 5.02;
    var eyes = [[hx - 0.2 * S, hy - 0.35 * S], [hx + 1.35 * S, hy - 0.35 * S]];
    for (var ei = 0; ei < 2; ei++) {
      var er = 0.78 * S;
      for (r = Math.floor(eyes[ei][1] - er); r <= eyes[ei][1] + er; r++) {
        for (c = Math.floor((eyes[ei][0] - er) / asp) - 1; c <= Math.ceil((eyes[ei][0] + er) / asp) + 1; c++) {
          X = (c + 0.5) * asp; Y = r + 0.5;
          var de = Math.sqrt((X - eyes[ei][0]) * (X - eyes[ei][0]) + (Y - eyes[ei][1]) * (Y - eyes[ei][1]));
          if (de > er) continue;
          if (blink) put(c, r, G_UN, DARK, 1);
          else put(c, r, de < er * 0.38 ? 14 : 13, de < er * 0.38 ? DARK : ORANGE, 1);
        }
      }
    }
    // pico
    put(Math.round((hx + 0.55 * S) / asp), Math.round(hy + 0.65 * S), G_V, DARK, 1);

    // ala cercana (encima del cuerpo)
    paintWing(wingPoints(t, [ox - 0.4 * S, oy - 1.3 * S], 0, S, 1), S, 1, false);

    // estela de polvo
    if (!reduce.matches && Math.random() < 0.55) parts.push({ x: ox - 5.5 * S, y: oy + (Math.random() - 0.3) * 1.6 * S, vx: -0.7 - Math.random() * 0.6, vy: 0.25 + Math.random() * 0.4, life: 1 });
    for (var pi = parts.length - 1; pi >= 0; pi--) {
      var p = parts[pi]; p.x += p.vx * 0.05; p.y += p.vy * 0.05; p.life -= 0.012;
      if (p.life <= 0) { parts.splice(pi, 1); continue; }
      put(Math.round(p.x / asp), Math.round(p.y), p.life > 0.55 ? 2 : 1, TAN, p.life * 0.8);
    }
    if (parts.length > 120) parts.splice(0, parts.length - 120);
    return { x: ox, y: oy, S: S };
  }

  function frame(now) {
    var t = reduce.matches ? 7.3 : (now - t0) / 1000;
    gl.fill(0); co.fill(0); al.fill(0); wash.fill(0);
    ptr.x += (ptr.tx - ptr.x) * 0.2; ptr.y += (ptr.ty - ptr.y) * 0.2; ptr.k += (ptr.tk - ptr.k) * 0.1;

    drawSky(t);
    drawMountains(t);
    drawOwl(t);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = "500 " + (ch * 0.9).toFixed(1) + "px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var lensR = Math.max(w, h) * 0.12, i, r, c;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        i = r * cols + c;
        if (!co[i]) continue;
        var a = al[i], g = gl[i];
        if (ptr.k > 0.02) {
          var dx = (c + 0.5) * cw - ptr.x, dy = (r + 0.5) * ch - ptr.y;
          var lk = ptr.k * smooth(lensR, 0, Math.sqrt(dx * dx + dy * dy));
          if (lk > 0.02 && !wash[i]) { a = Math.min(1, a + 0.5 * lk); if (g < N) g = Math.min(N, g + Math.round(3 * lk)); }
        }
        if (wash[i]) { ctx.globalAlpha = 0.93; ctx.fillStyle = PAPER; ctx.fillRect(c * cw, r * ch, cw + 0.6, ch + 0.6); }
        if (g < 1) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = PAL[co[i]];
        ctx.fillText(GLYPHS.charAt(g), (c + 0.5) * cw, (r + 0.56) * ch);
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    if (now - last >= 1000 / 24) { last = now; frame(now); }
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (reduce.matches) { frame(performance.now()); return; }
    if (!raf && visible) raf = requestAnimationFrame(loop);
  }

  var host = canvas.parentElement;
  host.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top; ptr.tk = 1;
  });
  host.addEventListener("pointerleave", function () { ptr.tk = 0; });

  resize();
  new ResizeObserver(function () {
    var r = canvas.getBoundingClientRect();
    if (Math.round(r.width) !== w || Math.round(r.height) !== h) { resize(); if (!raf) frame(performance.now()); }
  }).observe(canvas);
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }, { threshold: 0.05 }).observe(canvas);
  document.addEventListener("visibilitychange", start);
  reduce.addEventListener("change", start);
  var ready = document.fonts && document.fonts.load ? document.fonts.load("500 10px 'IBM Plex Mono'").catch(function () {}) : Promise.resolve();
  ready.then(function () { frame(performance.now()); });
})();
