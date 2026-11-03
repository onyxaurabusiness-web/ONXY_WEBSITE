/* ONYXAURA wireframe engines.
   Perlin noise, animated contour lines and an interactive terrain study, in plain canvas 2D.
   No dependencies. Every engine pauses off-screen and respects reduced motion. */
(function (g) {
  'use strict';

  var reduce = !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var IVORY = '244,241,236', GOLD = '197,179,88', BG = '#050505';

  /* ---------- noise ---------- */
  var P = new Uint8Array(512);
  (function () {
    var p = [], i, s = 7;
    for (i = 0; i < 256; i++) p[i] = i;
    function rnd() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    for (i = 255; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 512; i++) P[i] = p[i & 255];
  })();
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function grad(h, x, y, z) {
    h &= 15; var u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  function noise(x, y, z) {
    var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    var u = fade(x), v = fade(y), w = fade(z);
    var A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z), u), lerp(grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1), u), lerp(grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  }
  function fbm(x, y, z, oct) {
    var s = 0, a = .5, f = 1;
    for (var i = 0; i < oct; i++) { s += a * noise(x * f, y * f, z * f); f *= 2; a *= .5; }
    return s;
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  /* marching squares over a scalar grid. Calls seg(x1,y1,x2,y2) in grid coordinates (cell units). */
  function isoline(f, cols, rows, level, seg) {
    function t(v0, v1) { return (level - v0) / (v1 - v0); }
    for (var j = 0; j < rows - 1; j++) for (var i = 0; i < cols - 1; i++) {
      var a = f[j * cols + i], b = f[j * cols + i + 1], c = f[(j + 1) * cols + i + 1], d = f[(j + 1) * cols + i];
      var k = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (k === 0 || k === 15) continue;
      var tx = i + t(a, b), ty = j;            // top
      var rx = i + 1, ry = j + t(b, c);        // right
      var bx = i + t(d, c), by = j + 1;        // bottom
      var lx = i, ly = j + t(a, d);            // left
      switch (k) {
        case 1: case 14: seg(lx, ly, bx, by); break;
        case 2: case 13: seg(bx, by, rx, ry); break;
        case 3: case 12: seg(lx, ly, rx, ry); break;
        case 4: case 11: seg(tx, ty, rx, ry); break;
        case 5: seg(lx, ly, tx, ty); seg(bx, by, rx, ry); break;
        case 6: case 9: seg(tx, ty, bx, by); break;
        case 7: case 8: seg(lx, ly, tx, ty); break;
        case 10: seg(tx, ty, rx, ry); seg(lx, ly, bx, by); break;
      }
    }
  }

  /* ======================================================================
     Contours: topographic lines that drift and bend around the pointer.
     ====================================================================== */
  function Contours(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var w = 0, h = 0, cell = 34, cols = 0, rows = 0, field = null;
    var px = -9999, py = -9999, tx = -9999, ty = -9999, bump = 0, tb = 0;
    var raf = 0, running = false, last = 0, minDt = 1000 / (opts.fps || 30);
    var levels = [-.5, -.42, -.34, -.26, -.18, -.1, -.02, .06, .14, .22, .3, .38, .46];

    function resize() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var dpr = Math.min(g.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = w < 700 ? 48 : 34;
      cols = Math.ceil(w / cell) + 2; rows = Math.ceil(h / cell) + 2;
      field = new Float32Array(cols * rows);
    }
    function sample(time) {
      var s = .0022, sig2 = 2 * 150 * 150, amp = bump * .8;
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
        var x = i * cell, y = j * cell;
        var v = fbm(x * s + 3.1, y * s + 7.7, time * .05, 2) * 1.25;
        if (amp > .001) { var dx = x - px, dy = y - py; v += amp * Math.exp(-(dx * dx + dy * dy) / sig2); }
        field[j * cols + i] = v;
      }
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      for (var li = 0; li < levels.length; li++) {
        var index = li % 4 === 2;
        ctx.beginPath();
        isoline(field, cols, rows, levels[li], function (x1, y1, x2, y2) { ctx.moveTo(x1 * cell, y1 * cell); ctx.lineTo(x2 * cell, y2 * cell); });
        ctx.lineWidth = index ? 1.1 : .7;
        ctx.strokeStyle = index ? 'rgba(' + (opts.index || GOLD) + ',' + (opts.indexAlpha || .62) + ')' : 'rgba(' + (opts.base || IVORY) + ',' + (opts.baseAlpha || .24) + ')';
        ctx.stroke();
      }
    }
    function frame(now) {
      if (!running) return;
      raf = g.requestAnimationFrame(frame);
      if (now - last < minDt) return;
      last = now;
      px += (tx - px) * .14; py += (ty - py) * .14; bump += (tb - bump) * .08;
      sample(now / 1000); draw();
    }
    function render() { if (!field) resize(); if (!field) return; sample(2.4); draw(); }
    function start() {
      if (running || reduce) { if (reduce) render(); return; }
      resize(); running = true; raf = g.requestAnimationFrame(frame);
    }
    function stop() { running = false; g.cancelAnimationFrame(raf); }
    function setPointer(x, y, inside) {
      if (inside) { if (px < -9000) { px = x; py = y; } tx = x; ty = y; tb = 1; } else tb = 0;
    }
    if ('ResizeObserver' in g) new ResizeObserver(function () { resize(); if (!running) render(); }).observe(canvas);
    return { start: start, stop: stop, resize: resize, render: render, setPointer: setPointer };
  }

  /* ======================================================================
     Terrain: an interactive wireframe study of land and a stream.
     Drag to turn. Click to send a ripple. Three drawing styles. A light slider.
     Illustrative only: it is not the surveyed site.
     ====================================================================== */
  function Terrain(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var N = 72, M = 48, seed = opts.seed || 11;
    var HT = new Float32Array(N * M);
    var PR = new Float32Array(N * M * 3);
    var w = 0, h = 0, F = 1, cx = 0, cy = 0, D = 3.5;
    var mode = 'mesh', light = .2;
    var baseYaw = -.34, basePitch = .66, yaw = baseYaw, pitch = basePitch, hoverYaw = 0, hoverPitch = 0;
    var drag = null, inside = false, hx = -1, hy = -1, ripples = [];
    var running = false, raf = 0, last = 0, t0 = Date.now() / 1000, minDt = 1000 / 40;
    var label = '';

    function meander(v) { return .17 * Math.sin(v * 5.2 + .6) + .08 * Math.sin(v * 11.3 + 2.1) - .05; }
    function build() {
      for (var j = 0; j < M; j++) {
        var v = j / (M - 1);
        for (var i = 0; i < N; i++) {
          var u = i / (N - 1) * 2 - 1;
          var back = smooth(.12, 1, v);
          var n = fbm(u * 1.8 + seed, v * 2.3 + seed * .7, seed * .3, 4);
          var ridge = back * (.42 + 1.25 * (n + .34)) + .1 * n;
          var d = u - meander(v);
          var valley = Math.exp(-(d * d) / .03);
          var bed = .03 + .4 * v;
          var hgt = ridge * (1 - valley) + bed * valley;
          var edge = smooth(0, .24, 1 - Math.abs(u));
          HT[j * N + i] = hgt * (.32 + .68 * edge);
        }
      }
    }
    function resize() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var dpr = Math.min(g.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      F = Math.min(w * .76, h * 1.18); cx = w * .5; cy = h * .66;
    }
    function ripple(i, j) { ripples.push({ i: i, j: j, t: Date.now() / 1000 }); if (ripples.length > 4) ripples.shift(); }
    function ripH(i, j, time) {
      var s = 0;
      for (var r = 0; r < ripples.length; r++) {
        var rp = ripples[r], age = time - rp.t;
        if (age < 0 || age > 5) continue;
        var dx = i - rp.i, dy = (j - rp.j) * 1.5, d = Math.sqrt(dx * dx + dy * dy), e = d - age * 17;
        s += .2 * Math.exp(-age * .8) * Math.sin(e * .8) * Math.exp(-e * e / 28);
      }
      return s;
    }
    function project(x, y, z, o) {
      var cs = Math.cos(yaw), sn = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var rx = x * cs - z * sn, rz = x * sn + z * cs;
      var yc = y * cp + rz * sp, zc = -y * sp + rz * cp, k = F / (zc + D);
      PR[o] = cx + rx * k; PR[o + 1] = cy - yc * k; PR[o + 2] = zc;
    }
    function vertices(time) {
      var hasR = ripples.length > 0;
      for (var j = 0; j < M; j++) {
        var z = (j / (M - 1)) * 2 - 1;
        for (var i = 0; i < N; i++) {
          var hh = HT[j * N + i] + (hasR ? ripH(i, j, time) : 0);
          project((i / (N - 1) * 2 - 1) * 1.7, hh * 1.15, z, (j * N + i) * 3);
        }
      }
    }
    function streamPt(j, out) {   // projected stream point on row j
      var u = meander(j / (M - 1)), f = (u + 1) / 2 * (N - 1), i0 = Math.floor(f), i1 = Math.min(N - 1, i0 + 1), t = f - i0;
      var a = (j * N + i0) * 3, b = (j * N + i1) * 3;
      out[0] = PR[a] + (PR[b] - PR[a]) * t; out[1] = PR[a + 1] + (PR[b + 1] - PR[a + 1]) * t;
    }
    function rowColor(j, hot) {
      var v = j / (M - 1), a = .2 + .6 * (1 - v);
      if (hot) return 'rgba(' + GOLD + ',.95)';
      var warm = (1 - light) * .5 * (1 - v);
      return 'rgba(' + Math.round(244 - 47 * warm) + ',' + Math.round(241 - 62 * warm) + ',' + Math.round(236 - 148 * warm) + ',' + a.toFixed(3) + ')';
    }
    function nearest() {
      if (!inside || hx < 0) return -1;
      var best = 1e9, bi = -1;
      for (var k = 0; k < N * M; k++) {
        var dx = PR[k * 3] - hx, dy = PR[k * 3 + 1] - hy, d = dx * dx + dy * dy;
        if (d < best) { best = d; bi = k; }
      }
      return best < 4900 ? bi : -1;
    }
    function glow() {
      ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
      var gx = w * (.2 + .6 * light), gy = h * .34, a = .3 - .17 * light;
      var gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, w * .55);
      gr.addColorStop(0, 'rgba(' + GOLD + ',' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + GOLD + ',0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    }
    function drawMesh(time, hot) {
      var tmp = [0, 0], tmp2 = [0, 0], hotJ = hot >= 0 ? Math.floor(hot / N) : -1, i, j;
      for (j = M - 1; j >= 0; j--) {
        if (j < M - 1) {   // connectors and the stream between this row and the farther one
          ctx.beginPath();
          for (i = 0; i < N; i += 3) { ctx.moveTo(PR[((j + 1) * N + i) * 3], PR[((j + 1) * N + i) * 3 + 1]); ctx.lineTo(PR[(j * N + i) * 3], PR[(j * N + i) * 3 + 1]); }
          ctx.strokeStyle = 'rgba(' + IVORY + ',' + (.1 + .12 * (1 - j / M)).toFixed(3) + ')'; ctx.lineWidth = .6; ctx.stroke();
          streamPt(j + 1, tmp); streamPt(j, tmp2);
          ctx.beginPath(); ctx.moveTo(tmp[0], tmp[1]); ctx.lineTo(tmp2[0], tmp2[1]);
          ctx.strokeStyle = 'rgba(' + GOLD + ',.22)'; ctx.lineWidth = 5; ctx.setLineDash([]); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(tmp[0], tmp[1]); ctx.lineTo(tmp2[0], tmp2[1]);
          ctx.strokeStyle = 'rgba(' + GOLD + ',.95)'; ctx.lineWidth = 1.6; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -time * 46; ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.beginPath(); ctx.moveTo(PR[j * N * 3], PR[j * N * 3 + 1]);
        for (i = 1; i < N; i++) ctx.lineTo(PR[(j * N + i) * 3], PR[(j * N + i) * 3 + 1]);
        ctx.lineTo(PR[(j * N + N - 1) * 3], h + 6); ctx.lineTo(PR[j * N * 3], h + 6); ctx.closePath();
        ctx.fillStyle = BG; ctx.fill();
        ctx.beginPath(); ctx.moveTo(PR[j * N * 3], PR[j * N * 3 + 1]);
        for (i = 1; i < N; i++) ctx.lineTo(PR[(j * N + i) * 3], PR[(j * N + i) * 3 + 1]);
        ctx.strokeStyle = rowColor(j, j === hotJ); ctx.lineWidth = j === hotJ ? 1.6 : (1.15 - .5 * (j / M)); ctx.stroke();
      }
    }
    function drawPoints(hot) {
      var buckets = [[], [], []], k;
      for (k = 0; k < N * M; k++) {
        var j = Math.floor(k / N), hh = HT[k], b = hh > .75 ? 2 : (j < M * .5 ? 1 : 0);
        buckets[b].push(k);
      }
      var cols = ['rgba(' + IVORY + ',.38)', 'rgba(' + IVORY + ',.78)', 'rgba(' + GOLD + ',.95)'];
      for (var b2 = 0; b2 < 3; b2++) {
        ctx.fillStyle = cols[b2];
        for (var q = 0; q < buckets[b2].length; q++) { var kk = buckets[b2][q]; ctx.fillRect(PR[kk * 3] - 1, PR[kk * 3 + 1] - 1, 2, 2); }
      }
      if (hot >= 0) { ctx.fillStyle = 'rgba(' + GOLD + ',1)'; ctx.fillRect(PR[hot * 3] - 3, PR[hot * 3 + 1] - 3, 6, 6); }
    }
    function drawContours(time) {
      var o = [0, 0], L, tmp = [0, 0];
      for (L = .08; L < 1.5; L += .08) {
        var idx = Math.round(L / .08), main = idx % 5 === 0;
        ctx.beginPath();
        isoline(HT, N, M, L, function (x1, y1, x2, y2) {
          var u1 = x1 / (N - 1) * 2 - 1, v1 = y1 / (M - 1) * 2 - 1, u2 = x2 / (N - 1) * 2 - 1, v2 = y2 / (M - 1) * 2 - 1;
          project(u1 * 1.7, L * 1.15, v1, 0); var ax = PR[0], ay = PR[1];
          project(u2 * 1.7, L * 1.15, v2, 0); ctx.moveTo(ax, ay); ctx.lineTo(PR[0], PR[1]);
        });
        ctx.strokeStyle = main ? 'rgba(' + GOLD + ',.8)' : 'rgba(' + IVORY + ',' + (.18 + .3 * Math.min(1, L)).toFixed(3) + ')';
        ctx.lineWidth = main ? 1.2 : .8; ctx.stroke();
      }
      // stream
      ctx.beginPath();
      for (var j = 0; j < M; j++) {
        var v = j / (M - 1), u = meander(v), f = (u + 1) / 2 * (N - 1), i0 = Math.round(f);
        project(u * 1.7, HT[j * N + i0] * 1.15, v * 2 - 1, 0);
        if (j) ctx.lineTo(PR[0], PR[1]); else ctx.moveTo(PR[0], PR[1]);
      }
      ctx.strokeStyle = 'rgba(' + GOLD + ',.95)'; ctx.lineWidth = 1.6; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -time * 46; ctx.stroke(); ctx.setLineDash([]);
    }
    function render() {
      if (!w) resize(); if (!w) return;
      var time = Date.now() / 1000;
      // ease the view toward its target
      var ty = baseYaw + hoverYaw, tp = basePitch + hoverPitch;
      if (reduce) { yaw = ty; pitch = tp; } else { yaw += (ty - yaw) * .09; pitch += (tp - pitch) * .09; }
      glow();
      if (mode === 'contours') {
        // vertices are still needed for the hover read-out
        vertices(time); drawContours(time - t0);
      } else {
        vertices(time);
        var hot = nearest();
        if (mode === 'points') drawPoints(hot); else drawMesh(time - t0, hot);
        if (hot >= 0) {
          var hi = hot % N, hj = Math.floor(hot / N);
          label = 'Point ' + (hi / (N - 1)).toFixed(2) + ' / ' + (hj / (M - 1)).toFixed(2) + ' / ' + HT[hot].toFixed(2);
        } else label = '';
      }
      if (label && mode !== 'contours') {
        ctx.font = '600 10px "Hanken Grotesk", Arial, sans-serif'; if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
        ctx.fillStyle = 'rgba(' + GOLD + ',.9)'; ctx.fillText(label.toUpperCase(), 18, 28);
      }
    }
    function frame(now) {
      if (!running) return;
      raf = g.requestAnimationFrame(frame);
      if (now - last < minDt) return; last = now;
      if (!drag && !inside) baseYaw += Math.sin(now / 5200) * .00045;   // a slow sway when idle
      render();
    }
    function start() { if (running) return; resize(); if (reduce) { render(); return; } running = true; raf = g.requestAnimationFrame(frame); }
    function stop() { running = false; g.cancelAnimationFrame(raf); }
    function pick(x, y) {
      var best = 1e9, bi = 0;
      for (var k = 0; k < N * M; k++) { var dx = PR[k * 3] - x, dy = PR[k * 3 + 1] - y, d = dx * dx + dy * dy; if (d < best) { best = d; bi = k; } }
      return bi;
    }
    function pos(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r.width, r.height]; }

    canvas.addEventListener('pointerdown', function (e) {
      var p = pos(e); drag = { x: p[0], y: p[1], by: baseYaw, bp: basePitch, moved: 0 };
      try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
      canvas.classList.add('grab');
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = pos(e); hx = p[0]; hy = p[1]; inside = true;
      if (drag) {
        var dx = p[0] - drag.x, dy = p[1] - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
        baseYaw = clamp(drag.by + dx * .006, -.95, .95); basePitch = clamp(drag.bp - dy * .004, .34, 1.05);
        hoverYaw = 0; hoverPitch = 0;
      } else if (e.pointerType === 'mouse') {
        hoverYaw = (p[0] / p[2] - .5) * .22; hoverPitch = (p[1] / p[3] - .5) * .08;
      }
      if (reduce) render();
    });
    function end(e) {
      if (drag && drag.moved < 5) { var k = pick(drag.x, drag.y); ripple(k % N, Math.floor(k / N)); }
      drag = null; canvas.classList.remove('grab');
      if (reduce) render();
    }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', function () { drag = null; canvas.classList.remove('grab'); });
    canvas.addEventListener('pointerleave', function () { inside = false; hoverYaw = 0; hoverPitch = 0; if (reduce) render(); });
    canvas.addEventListener('keydown', function (e) {
      var used = true;
      if (e.key === 'ArrowLeft') baseYaw = clamp(baseYaw - .08, -.95, .95);
      else if (e.key === 'ArrowRight') baseYaw = clamp(baseYaw + .08, -.95, .95);
      else if (e.key === 'ArrowUp') basePitch = clamp(basePitch + .05, .34, 1.05);
      else if (e.key === 'ArrowDown') basePitch = clamp(basePitch - .05, .34, 1.05);
      else if (e.key === 'Enter' || e.key === ' ') ripple(Math.floor(N / 2), Math.floor(M / 2));
      else used = false;
      if (used) { e.preventDefault(); if (reduce) render(); }
    });
    if ('ResizeObserver' in g) new ResizeObserver(function () { resize(); render(); }).observe(canvas);
    build();
    return {
      start: start, stop: stop, render: render,
      setMode: function (m) { mode = m; render(); },
      setLight: function (v) { light = clamp(v, 0, 1); render(); },
      ripple: function () { ripple(Math.floor(N / 2), Math.floor(M * .55)); render(); },
      state: function () { return { mode: mode, light: light, yaw: yaw, pitch: pitch, running: running }; }
    };
  }

  g.OAWire = { noise: noise, fbm: fbm, Contours: Contours, Terrain: Terrain, reduce: reduce };
})(window);
